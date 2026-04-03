# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar la aplicación de nutrición en **Vercel**.

### 1. Preparación del Repositorio
Asegúrate de que tus cambios estén subidos a un repositorio (GitHub, GitLab o Bitbucket).

### 2. Importar Proyecto en Vercel
1. Dirígete a [Vercel](https://vercel.com/new).
2. Selecciona tu repositorio.
3. **¡IMPORTANTE!**: En la sección de configuración, cambia el **Root Directory** a `frontend`.

### 3. Configuración de Build & Development
- **Framework Preset**: Next.js (se detectará automáticamente).
- **Build Command**: `pnpm run build` o dejar en blanco (Vercel lo detectará por el archivo `pnpm-lock.yaml`).

### 4. Variables de Entorno (Environment Variables)
Agregá las siguientes variables en la sección de Settings > Environment Variables:

- `GROQ_API_KEY`: Tu clave de Groq (se encuentra en tu `.env.local` actual).
- `GLUCOAPP_API_KEY`: Tu clave de GlucoData (se encuentra en tu `.env.local` actual).

### 5. Despliegue
Haz clic en **Deploy**. Vercel se encargará del resto utilizando `pnpm` para instalar las dependencias y compilar el proyecto.

### Notas Adicionales
- La configuración específica de `pnpm` y el framework se ha incluido en el archivo `frontend/vercel.json`.
- El PWA (Progressive Web App) funcionará automáticamente una vez desplegado en HTTPS por Vercel.
