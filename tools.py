import os
import re
import logging
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# ─────────────────────────────────────────────
# Logger interno — los detalles técnicos van al log,
# NUNCA al usuario ni al LLM.
# ─────────────────────────────────────────────
logger = logging.getLogger("tools")
logger.setLevel(logging.WARNING)

# Crear handler de archivo para guardar errores detallados
_log_handler = logging.FileHandler("agent_errors.log", encoding="utf-8")
_log_handler.setFormatter(
    logging.Formatter("%(asctime)s | %(levelname)s | %(funcName)s | %(message)s")
)
logger.addHandler(_log_handler)

# ─────────────────────────────────────────────
# Mensajes de error SEGUROS (genéricos, sin detalles internos)
# ─────────────────────────────────────────────
SAFE_ERRORS = {
    "auth": "Error de autenticación con el servicio de calendario. Intenta de nuevo más tarde.",
    "not_found": "No se encontró el evento solicitado. Verifica el ID del evento.",
    "permission": "No tienes permiso para realizar esta acción en el calendario.",
    "rate_limit": "Se excedió el límite de solicitudes. Intenta de nuevo en unos minutos.",
    "invalid_input": "Los datos proporcionados no son válidos. Verifica los parámetros.",
    "calendar_service": "No se pudo conectar con el servicio de calendario. Intenta de nuevo.",
    "unknown": "Ocurrió un error inesperado. Intenta de nuevo más tarde.",
}


def _classify_error(e: Exception) -> str:
    """
    Clasifica una excepción en una categoría segura.
    NUNCA expone el mensaje original de la excepción.
    """
    error_str = str(e).lower()

    if isinstance(e, HttpError):
        status = e.resp.status if hasattr(e, 'resp') else 0
        if status == 401 or status == 403:
            return "permission"
        elif status == 404:
            return "not_found"
        elif status == 429:
            return "rate_limit"
        elif status == 400:
            return "invalid_input"
        else:
            return "calendar_service"

    if isinstance(e, FileNotFoundError):
        return "auth"

    if "credentials" in error_str or "token" in error_str or "auth" in error_str:
        return "auth"

    if "not found" in error_str or "404" in error_str:
        return "not_found"

    if "permission" in error_str or "forbidden" in error_str:
        return "permission"

    if "rate" in error_str or "quota" in error_str:
        return "rate_limit"

    return "unknown"


def _safe_error_response(e: Exception, operation: str) -> dict:
    """
    Genera una respuesta de error SEGURA:
    - Loguea los detalles completos al archivo de log
    - Retorna solo un mensaje genérico al LLM/usuario
    """
    error_category = _classify_error(e)
    safe_message = SAFE_ERRORS[error_category]

    # Log detallado al archivo (NUNCA al usuario)
    logger.error(
        "Operación '%s' falló | Tipo: %s | Categoría: %s | Detalle: %s",
        operation,
        type(e).__name__,
        error_category,
        str(e),  # Solo en el log interno
    )

    return {
        "status": "error",
        "error_code": error_category,
        "message": safe_message,
    }


class Tools:
    
    def __init__(self):
        self.SCOPES = ["https://www.googleapis.com/auth/calendar"]
        self.CREDENTIALS_FILE = "credentials.json"
        self.TOKEN_FILE = "token.json"
        
    def get_calendar_service(self):
        """
        Obtiene el servicio de Google Calendar.
        Las excepciones se propagan para que cada método las capture con su contexto.
        """
        creds = None

        if os.path.exists(self.TOKEN_FILE):
            creds = Credentials.from_authorized_user_file(self.TOKEN_FILE, self.SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.CREDENTIALS_FILE):
                    raise FileNotFoundError("Archivo de credenciales no disponible")
                flow = InstalledAppFlow.from_client_secrets_file(self.CREDENTIALS_FILE, self.SCOPES)
                creds = flow.run_local_server(port=0)

            with open(self.TOKEN_FILE, "w", encoding="utf-8") as f:
                f.write(creds.to_json())

        return build("calendar", "v3", credentials=creds)
    
    def check_availability(self, time_ini: str, time_end: str):
        print(f"\033[93m\033[2m🔧 check_availability({time_ini}, {time_end})\033[0m")
        try:
            body = {
                "timeMin": time_ini,
                "timeMax": time_end,
                "items": [{"id": "primary"}]
            }
            service = self.get_calendar_service()
            result = service.freebusy().query(body=body).execute()
            busy = result.get("calendars", {}).get("primary", {}).get("busy", [])
            
            return {
                "calendar_id": "primary",
                "time_ini": time_ini,
                "time_end": time_end,
                "busy": busy,
                "is_free": (len(busy) == 0)
            }
        except Exception as e:
            return _safe_error_response(e, "check_availability")
        
    def list_events(self, time_ini: str, time_end: str, max_results: int = 10):
        print(f"\033[93m\033[2m🔧 list_events({time_ini}, {time_end})\033[0m")
        try:
            service = self.get_calendar_service()
            events_result = service.events().list(
                calendarId='primary', timeMin=time_ini, timeMax=time_end,
                maxResults=max_results, singleEvents=True,
                orderBy='startTime').execute()
            events = events_result.get('items', [])
            result = []
            for event in events:
                result.append({
                    "id": event["id"],
                    "summary": event.get("summary", ""),
                    "start": event["start"].get("dateTime", event["start"].get("date")),
                    "end": event["end"].get("dateTime", event["end"].get("date")),
                    "description": event.get("description", "")
                })
            return result
        except Exception as e:
            return _safe_error_response(e, "list_events")

    def search_events(self, query: str, time_ini: str, time_end: str, max_results: int = 20):
        """Search events by name (partial, case-insensitive) within a date range."""
        print(f"\033[93m\033[2m🔧 search_events(query='{query}', {time_ini}, {time_end})\033[0m")
        try:
            all_events = self.list_events(time_ini, time_end, max_results=max_results)
            
            # Si list_events retornó un error, propagarlo
            if isinstance(all_events, dict) and all_events.get("status") == "error":
                return all_events
            
            query_lower = query.lower()
            query_words = query_lower.split()
            matched = []
            for event in all_events:
                summary_lower = event["summary"].lower()
                if all(word in summary_lower for word in query_words):
                    matched.append(event)
            return {
                "query": query,
                "total_events_in_range": len(all_events),
                "matched_events": matched,
                "all_events_in_range": all_events
            }
        except Exception as e:
            return _safe_error_response(e, "search_events")

    def move_event(self, event_id: str, new_time_ini: str, new_time_end: str):
        """Move an event to a new time slot (atomic update, no delete+create)."""
        print(f"\033[93m\033[2m🔧 move_event(id={event_id})\033[0m")
        try:
            service = self.get_calendar_service()
            original_event = service.events().get(calendarId='primary', eventId=event_id).execute()
            old_start = original_event['start'].get('dateTime', original_event['start'].get('date'))
            old_end = original_event['end'].get('dateTime', original_event['end'].get('date'))
        except Exception as e:
            return _safe_error_response(e, "move_event.get_original")
        
        result = self.update_event(event_id, time_ini=new_time_ini, time_end=new_time_end)
        
        # Si update_event falló, retornar su error
        if result.get("status") == "error":
            return result
            
        result["old_start"] = old_start
        result["old_end"] = old_end
        result["action"] = "moved"
        return result

    def create_event(self, summary: str, time_ini: str, time_end: str, description: str = ""):
        if summary: summary = summary.encode("ascii", "ignore").decode("ascii")
        if description: description = description.encode("ascii", "ignore").decode("ascii")
        print(f"\033[93m\033[2m🔧 create_event('{summary}')\033[0m")
        try:
            service = self.get_calendar_service()
            event = {
                'summary': summary,
                'description': description,
                'start': {'dateTime': time_ini},
                'end': {'dateTime': time_end},
            }
            created_event = service.events().insert(calendarId='primary', body=event).execute()
            return {
                "id": created_event.get("id"),
                "summary": created_event.get("summary"),
                "start": created_event.get("start"),
                "end": created_event.get("end"),
                "status": "success"
            }
        except Exception as e:
            return _safe_error_response(e, "create_event")

    def delete_event(self, event_id: str):
        print(f"\033[93m\033[2m🔧 delete_event(id={event_id})\033[0m")
        try:
            service = self.get_calendar_service()
            service.events().delete(calendarId='primary', eventId=event_id).execute()
            return {"status": "success", "message": "Event deleted successfully"}
        except Exception as e:
            return _safe_error_response(e, "delete_event")

    def update_event(self, event_id: str, summary: str = None, time_ini: str = None, time_end: str = None, description: str = None):
        if summary is not None: summary = summary.encode("ascii", "ignore").decode("ascii")
        if description is not None: description = description.encode("ascii", "ignore").decode("ascii")
        print(f"\033[93m\033[2m🔧 update_event(id={event_id})\033[0m")
        try:
            service = self.get_calendar_service()
            event = service.events().get(calendarId='primary', eventId=event_id).execute()
            if summary is not None:
                event['summary'] = summary
            if description is not None:
                event['description'] = description
            if time_ini is not None:
                event['start']['dateTime'] = time_ini
                if 'date' in event['start']: del event['start']['date']
            if time_end is not None:
                event['end']['dateTime'] = time_end
                if 'date' in event['end']: del event['end']['date']

            updated_event = service.events().update(calendarId='primary', eventId=event_id, body=event).execute()
            return {
                "id": updated_event.get("id"),
                "summary": updated_event.get("summary"),
                "start": updated_event.get("start"),
                "end": updated_event.get("end"),
                "status": "success"
            }
        except Exception as e:
            return _safe_error_response(e, "update_event")
    
if __name__ == "__main__":
    tools = Tools()
    time_ini = "2026-03-03T09:00:00-03:00"
    time_end = "2026-03-03T10:00:00-03:00"
    result = tools.check_availability(time_ini, time_end)
    print(result)
