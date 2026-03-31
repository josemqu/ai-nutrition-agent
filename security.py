"""
Módulo de seguridad para el agente de calendario.

Funcionalidades:
1. Confirmación obligatoria antes de acciones destructivas
2. Filtro de prompt injection en inputs del usuario
3. Límite de tool calls por turno
4. Sanitización de datos de herramientas (anti prompt injection indirecto)
"""

import re
import json
import logging

_security_logger = logging.getLogger("security")
_security_logger.setLevel(logging.WARNING)
_sec_log_handler = logging.FileHandler("agent_errors.log", encoding="utf-8")
_sec_log_handler.setFormatter(
    logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
)
_security_logger.addHandler(_sec_log_handler)

# ─────────────────────────────────────────────
# ANSI Colors (para mensajes de seguridad)
# ─────────────────────────────────────────────
class _Colors:
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"

_C = _Colors()

# ─────────────────────────────────────────────
# 1. CONFIRMACIÓN DE ACCIONES DESTRUCTIVAS
# ─────────────────────────────────────────────

# Acciones que requieren confirmación del usuario
DESTRUCTIVE_ACTIONS = {"delete_event", "update_event", "move_event"}

# Descripciones legibles para cada acción
ACTION_DESCRIPTIONS = {
    "delete_event": "🗑️  ELIMINAR evento",
    "update_event": "✏️  MODIFICAR evento",
    "move_event":   "📦 MOVER evento",
}


def describe_action(func_name: str, args: dict) -> str:
    """Genera una descripción legible de la acción destructiva que se va a ejecutar."""
    prefix = ACTION_DESCRIPTIONS.get(func_name, func_name)
    details = []

    if "event_id" in args:
        details.append(f"ID: {args['event_id']}")
    if "summary" in args:
        details.append(f"Título: {args['summary']}")
    if "time_ini" in args:
        details.append(f"Inicio: {args['time_ini']}")
    if "time_end" in args:
        details.append(f"Fin: {args['time_end']}")
    if "new_time_ini" in args:
        details.append(f"Nuevo inicio: {args['new_time_ini']}")
    if "new_time_end" in args:
        details.append(f"Nuevo fin: {args['new_time_end']}")
    if "description" in args and args["description"]:
        details.append(f"Descripción: {args['description'][:50]}")

    detail_str = ", ".join(details) if details else "sin detalles"
    return f"{prefix} ({detail_str})"


def request_confirmation(func_name: str, args: dict) -> bool:
    """
    Pide confirmación al usuario antes de ejecutar una acción destructiva.
    Retorna True si el usuario confirma, False en caso contrario.
    """
    description = describe_action(func_name, args)
    print()
    print(f"{_C.YELLOW}{_C.BOLD}{'='*60}{_C.RESET}")
    print(f"{_C.YELLOW}{_C.BOLD}⚠️  CONFIRMACIÓN REQUERIDA{_C.RESET}")
    print(f"{_C.YELLOW}{_C.BOLD}{'='*60}{_C.RESET}")
    print(f"{_C.YELLOW}  Acción: {description}{_C.RESET}")
    print(f"{_C.YELLOW}{_C.BOLD}{'='*60}{_C.RESET}")

    while True:
        try:
            response = input(
                f"{_C.YELLOW}  ¿Confirmar? (s/n): {_C.RESET}"
            ).strip().lower()
        except (EOFError, KeyboardInterrupt):
            print(f"\n{_C.RED}  ❌ Acción cancelada.{_C.RESET}")
            return False

        if response in ("s", "si", "sí", "y", "yes"):
            print(f"{_C.YELLOW}{_C.DIM}  ✅ Confirmado. Ejecutando...{_C.RESET}")
            return True
        elif response in ("n", "no"):
            print(f"{_C.RED}  ❌ Acción cancelada por el usuario.{_C.RESET}")
            return False
        else:
            print(f"{_C.RED}  Por favor responde 's' o 'n'.{_C.RESET}")


# ─────────────────────────────────────────────
# 2. FILTRO DE PROMPT INJECTION
# ─────────────────────────────────────────────

# Patrones sospechosos de prompt injection (case-insensitive)
INJECTION_PATTERNS = [
    # Intentos de cambiar el rol / identidad del sistema
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"ignora\s+(todas?\s+)?(las?\s+)?instrucciones?\s+(anteriores|previas)",
    r"olvida\s+(todas?\s+)?(las?\s+)?instrucciones?\s+(anteriores|previas)",
    r"forget\s+(all\s+)?previous\s+instructions",
    r"disregard\s+(all\s+)?previous",
    r"you\s+are\s+now\s+a",
    r"ahora\s+eres\s+un",
    r"act\s+as\s+(a\s+)?",
    r"actúa\s+como\s+(un\s+)?",
    r"new\s+instructions?\s*:",
    r"nuevas?\s+instrucciones?\s*:",
    r"system\s*:\s*",
    r"sistema\s*:\s*",

    # Intentos de inyectar roles en el prompt
    r"\[system\]",
    r"\[assistant\]",
    r"\[user\]",
    r"<\s*system\s*>",
    r"<\s*assistant\s*>",
    r"<\s*/?\s*system\s*>",

    # Intentos de extractar el system prompt
    r"(show|print|display|reveal|tell)\s+me\s+(the\s+)?(system\s+)?prompt",
    r"(muestra|dime|revela|muéstrame)\s+(el\s+)?(prompt\s+)?(del?\s+)?sistema",
    r"what\s+(are|is)\s+your\s+(system\s+)?(instructions|prompt)",
    r"cuáles?\s+son\s+tus\s+instrucciones",
    r"repeat\s+(your\s+)?(system\s+)?(prompt|instructions)",
    r"repite\s+(tu\s+)?(prompt|instrucciones)",

    # Comandos peligrosos embebidos
    r"execute\s+(this\s+)?(code|command|script)",
    r"ejecuta\s+(este\s+)?(código|comando|script)",
    r"run\s+(this\s+)?(code|command|script)",
    r"import\s+os\b",
    r"subprocess\.",
    r"__import__",
    r"eval\s*\(",
    r"exec\s*\(",

    # Intentos de manipulación de herramientas
    r"call\s+(the\s+)?tool\s+with",
    r"llama\s+(a\s+)?(la\s+)?herramienta\s+con",
    r"override\s+(the\s+)?tool",
    r"bypass\s+(the\s+)?(security|confirmation|filter)",
    r"salta(r|te)?\s+(la\s+)?(seguridad|confirmación|filtro)",
    r"skip\s+(the\s+)?(confirmation|security|filter)",

    # Jailbreak clásicos
    r"DAN\s+mode",
    r"do\s+anything\s+now",
    r"jailbreak",
    r"developer\s+mode",
    r"modo\s+(desarrollador|developer)",
]

# Compilar patrones para eficiencia
_COMPILED_PATTERNS = [
    re.compile(pattern, re.IGNORECASE | re.UNICODE)
    for pattern in INJECTION_PATTERNS
]


def check_prompt_injection(user_input: str) -> tuple[bool, str]:
    """
    Verifica si el input del usuario contiene patrones de prompt injection.

    Returns:
        (is_safe, message): 
            - is_safe=True si el input es seguro
            - is_safe=False si se detectó un patrón sospechoso, con message describiendo cuál
    """
    for pattern in _COMPILED_PATTERNS:
        match = pattern.search(user_input)
        if match:
            matched_text = match.group()
            return False, f"Patrón sospechoso detectado: '{matched_text}'"

    return True, ""


def print_injection_warning(message: str):
    """Muestra un warning de prompt injection al usuario."""
    print()
    print(f"{_C.RED}{_C.BOLD}{'='*60}{_C.RESET}")
    print(f"{_C.RED}{_C.BOLD}🛡️  ALERTA DE SEGURIDAD - PROMPT INJECTION{_C.RESET}")
    print(f"{_C.RED}{_C.BOLD}{'='*60}{_C.RESET}")
    print(f"{_C.RED}  {message}{_C.RESET}")
    print(f"{_C.RED}  Tu mensaje fue bloqueado por contener instrucciones")
    print(f"  potencialmente maliciosas. Si fue un error, intenta")
    print(f"  reformular tu solicitud.{_C.RESET}")
    print(f"{_C.RED}{_C.BOLD}{'='*60}{_C.RESET}")
    print()


# ─────────────────────────────────────────────
# 3. LÍMITE DE TOOL CALLS POR TURNO
# ─────────────────────────────────────────────

DEFAULT_MAX_TOOL_CALLS = 6


class ToolCallLimiter:
    """
    Controla el número máximo de llamadas a herramientas por turno del usuario.
    Previene loops infinitos o uso excesivo de herramientas.
    """

    def __init__(self, max_calls: int = DEFAULT_MAX_TOOL_CALLS):
        self.max_calls = max_calls
        self._count = 0

    def reset(self):
        """Reinicia el contador al inicio de un nuevo turno del usuario."""
        self._count = 0

    def increment(self, n: int = 1) -> bool:
        """
        Incrementa el contador de tool calls.
        
        Args:
            n: Número de llamadas a registrar.
            
        Returns:
            True si aún estamos dentro del límite DESPUÉS del incremento.
            False si se excedió el límite.
        """
        self._count += n
        return self._count <= self.max_calls

    @property
    def count(self) -> int:
        return self._count

    @property
    def remaining(self) -> int:
        return max(0, self.max_calls - self._count)

    @property
    def limit_reached(self) -> bool:
        return self._count >= self.max_calls

    def print_limit_warning(self):
        """Muestra un warning cuando se alcanza el límite de tool calls."""
        print()
        print(f"{_C.RED}{_C.BOLD}{'='*60}{_C.RESET}")
        print(f"{_C.RED}{_C.BOLD}🚫  LÍMITE DE TOOL CALLS ALCANZADO{_C.RESET}")
        print(f"{_C.RED}{_C.BOLD}{'='*60}{_C.RESET}")
        print(f"{_C.RED}  Se alcanzó el máximo de {self.max_calls} llamadas a")
        print(f"  herramientas en este turno ({self._count} ejecutadas).{_C.RESET}")
        print(f"{_C.RED}  Esto es una medida de seguridad para prevenir loops.{_C.RESET}")
        print(f"{_C.RED}{_C.BOLD}{'='*60}{_C.RESET}")
        print()


# ─────────────────────────────────────────────
# 4. SANITIZACIÓN DE DATOS DE HERRAMIENTAS
#    (Defensa contra prompt injection indirecto)
# ─────────────────────────────────────────────

# Campos de texto en respuestas de herramientas que podrían
# contener inyecciones (títulos, descripciones de eventos)
_TEXT_FIELDS_TO_SANITIZE = {"summary", "description", "query", "message"}


def _sanitize_string(value: str, field_name: str) -> str:
    """
    Sanitiza un string proveniente de datos del calendario.
    1. Detecta patrones de injection dentro del texto.
    2. Si encuentra alguno, reemplaza el match con [CONTENIDO FILTRADO].
    3. Envuelve el resultado en delimitadores [DATO] para que el LLM
       lo trate como dato, no como instrucción.
    """
    sanitized = value
    injection_found = False

    for pattern in _COMPILED_PATTERNS:
        match = pattern.search(sanitized)
        if match:
            injection_found = True
            _security_logger.warning(
                "Prompt injection indirecto detectado en campo '%s': "
                "patrón '%s' encontrado en valor: '%s'",
                field_name,
                match.group(),
                value[:200],  # Solo primeros 200 chars en el log
            )
            # Reemplazar el fragmento malicioso
            sanitized = pattern.sub("[CONTENIDO FILTRADO]", sanitized)

    if injection_found:
        print(
            f"{_C.YELLOW}{_C.DIM}   ⚠️  Contenido sospechoso detectado y "
            f"neutralizado en campo '{field_name}'{_C.RESET}"
        )

    # Envolver en delimitadores de datos
    return f"[DATO]{sanitized}[/DATO]"


def _sanitize_dict(data: dict) -> dict:
    """Sanitiza recursivamente un diccionario de respuesta de herramienta."""
    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str) and key in _TEXT_FIELDS_TO_SANITIZE:
            sanitized[key] = _sanitize_string(value, key)
        elif isinstance(value, dict):
            sanitized[key] = _sanitize_dict(value)
        elif isinstance(value, list):
            sanitized[key] = _sanitize_list(value)
        else:
            sanitized[key] = value
    return sanitized


def _sanitize_list(data: list) -> list:
    """Sanitiza recursivamente una lista de respuesta de herramienta."""
    sanitized = []
    for item in data:
        if isinstance(item, dict):
            sanitized.append(_sanitize_dict(item))
        elif isinstance(item, list):
            sanitized.append(_sanitize_list(item))
        else:
            sanitized.append(item)
    return sanitized


def sanitize_tool_response(response_data) -> object:
    """
    Sanitiza la respuesta de una herramienta antes de pasarla al LLM.

    Protege contra prompt injection indirecto:
    - Un atacante crea un evento con título/descripción maliciosa
    - Cuando list_events/search_events devuelve esos datos, se inyectan al LLM
    - Esta función neutraliza el contenido malicioso y delimita los datos

    Args:
        response_data: dict o list devuelto por una herramienta

    Returns:
        Datos sanitizados con campos de texto delimitados y patrones
        de injection neutralizados.
    """
    if isinstance(response_data, dict):
        return _sanitize_dict(response_data)
    elif isinstance(response_data, list):
        return _sanitize_list(response_data)
    return response_data
