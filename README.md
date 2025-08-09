# Aplicación de análisis de comentarios de Instagram con Supabase

Esta versión de la aplicación utiliza **Supabase** como base de datos en la nube. Permite importar archivos XLSX con comentarios de Instagram, almacenarlos de manera estructurada con índices de búsqueda, realizar búsquedas con filtros combinados, comparar subconjuntos de datos y generar informes en PDF, PPTX y XLSX. También incluye un tablero de KPI con gráficos interactivos.

## Requisitos previos

- Tener una cuenta en [Supabase](https://supabase.com/) para crear un proyecto nuevo.
- Node.js 18 o superior instalado en tu máquina (solo para ejecutar el front‑end en local). Para despliegue en la nube (Vercel, Netlify, etc.) no necesitas instalar nada localmente.

## Paso 1 — Crear el proyecto en Supabase

1. Inicia sesión en [app.supabase.com](https://app.supabase.com/) y crea un **nuevo proyecto**. Anota el `URL` y las `API Keys` (clave anónima y clave de servicio) que encontrarás en la sección **Project Settings → API**.
2. En el panel de Supabase, navega a **SQL Editor** y copia el contenido de [`supabase/schema.sql`](./supabase/schema.sql) en una nueva consulta. Ejecuta la consulta para crear la tabla `comments`, los índices de búsqueda y el trigger de actualización de fechas.
3. Opcionalmente, habilita la extensión `pg_trgm` para mejorar la búsqueda difusa (no es necesaria para las consultas básicas).

## Paso 2 — Configurar las variables de entorno

En la raíz del proyecto hay un archivo `.env.example`. Cópialo a `.env` y rellena los valores obtenidos en el paso anterior:

```bash
cp .env.example .env
```

Edita el archivo `.env` y define:

```ini
NEXT_PUBLIC_SUPABASE_URL="https://<tu‑id‑de‑supabase>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<tu‑clave‑anónima>"
SUPABASE_SERVICE_ROLE_KEY="<tu‑clave‑de‑servicio>" # Opcional pero recomendado para operaciones en API
```

La clave de servicio (`SUPABASE_SERVICE_ROLE_KEY`) es necesaria para que los endpoints del servidor puedan insertar o actualizar datos. Si prefieres no incluirla, la aplicación usará la clave anónima, pero tendrás que configurar las políticas de RLS en Supabase para permitir inserciones y actualizaciones.

## Paso 3 — Ejecutar en modo de desarrollo

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

3. Abre tu navegador en [http://localhost:3000](http://localhost:3000). Verás la interfaz con la barra lateral y modo claro/oscuro.

### Importar datos

Ve a la sección **Importar**, arrastra o selecciona uno o varios archivos `.xlsx` que contengan las columnas estándar (`User Id`, `Username`, `Comment Id`, `Comment Text`, `Profile URL`, `Date`) y las columnas de clasificación opcionales. Selecciona un nombre de `videoSource` (si deseas asociar el archivo a un video) y confirma. La API `/api/import` se encargará de insertar los comentarios en Supabase y evitar duplicados por `comment_id`.

### Explorador y búsqueda

En **Explorar** puedes introducir una consulta de texto completo (usa morfología en español), filtrar por usuario, rango de niveles de agresión, si es ataque, rango de fechas o video. Los resultados están paginados y resaltan el nivel de agresión con colores. El endpoint utilizado es `/api/search`.

### Comparador de conjuntos

La página **Comparar** te permite crear hasta cinco filtros diferentes y compararlos. Por ejemplo, puedes comparar comentarios de dos videos distintos o de dos rangos de fecha. La API `/api/compare` calcula las métricas para cada conjunto (total, ataques y distribución por nivel).

### Tablero de KPIs

En la sección **Tablero** se obtienen los contadores globales y se muestran gráficos de barras para la distribución de niveles y el número de comentarios por video. Esta vista utiliza el endpoint `/api/facets`.

### Generación de informes

En **Informes** puedes generar documentos en PDF, PPTX o XLSX a partir de filtros personalizados. Rellena el título, selecciona el tipo de archivo y los filtros deseados. Al hacer clic en “Generar informe”, la API `/api/export` generará el archivo y te proporcionará un enlace de descarga.

## Paso 4 — Desplegar la aplicación

Puedes desplegar esta aplicación en Vercel o cualquier hosting de Next.js. Los pasos para Vercel son:

1. Sube el código a un repositorio (GitHub, GitLab o Bitbucket).
2. En [vercel.com](https://vercel.com/), crea un nuevo proyecto y selecciona tu repositorio.
3. Durante la configuración, define las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) en la sección de “Environment Variables”.
4. Vercel detectará automáticamente que es un proyecto Next.js y lo desplegará. Una vez en producción, tu aplicación usará la base de datos Supabase en la nube.

## API Routes

Este proyecto expone varias rutas API en `/pages/api/` que interactúan con Supabase:

- `POST /api/import` — importa comentarios desde uno o varios archivos XLSX.
- `GET /api/search` — búsqueda avanzada con filtros y paginación.
- `GET /api/facets` — devuelve totales y distribuciones para el tablero.
- `GET /api/compare` — compara hasta cinco conjuntos de filtros.
- `GET /api/export` — genera un informe en formato PDF, PPTX o XLSX y devuelve el archivo.

Estas rutas están implementadas utilizando `@supabase/supabase-js` con claves de servidor para que las operaciones de lectura y escritura sean seguras. Todas las peticiones se hacen lado servidor para ocultar las claves sensibles.

## Estructura de carpetas

```
ig-moderation-supabase/
├─ src/
│  ├─ components/     ← Layout y componentes reutilizables
│  ├─ lib/            ← Inicialización de Supabase y servicio de comentarios
│  ├─ pages/          ← Páginas de Next.js (import, explorer, compare, report, dashboard)
│  └─ pages/api/      ← Endpoints API que llaman a Supabase
├─ supabase/
│  └─ schema.sql      ← Script SQL para crear la tabla e índices en Supabase
├─ .env.example       ← Plantilla de variables de entorno
└─ README.md          ← Este documento
```

## Notas finales

Esta versión en Supabase es ideal para mantener todos tus datos en la nube sin necesidad de hospedar tu propia base de datos. Supabase se encarga de la persistencia, la escalabilidad y el control de acceso. La aplicación Next.js incluye un diseño inspirado en ChatGPT con modo claro/oscuro, navegación en barra lateral y micro‑interacciones modernas.

Si deseas extender la funcionalidad (por ejemplo, análisis de n‑grams, alertas por picos de agresión o detección de bots), puedes utilizar las API y funciones de Supabase (PostgreSQL) para crear vistas materializadas o añadir nuevas columnas. También puedes consumir los datos desde otras aplicaciones o dashboards usando la API de Supabase.