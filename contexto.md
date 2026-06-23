# Contexto del Sistema: Dashboard de Administración - Acción Andina

Este documento describe la arquitectura, características clave, módulos, parámetros, funciones y esquema de base de datos de la aplicación **dashboard-aa-comms**. Su propósito es servir como la fuente única de verdad para el contexto del sistema y para registrar el historial de cambios del proyecto.

---

## 1. Arquitectura General y Tecnologías

La aplicación es un panel de control administrativo y de reportería técnica para el equipo de comunicaciones de **Acción Andina**.

*   **Frontend**: React (v19), Vite (v7), React Router DOM (v7) para enrutamiento de páginas.
*   **Estilos**: TailwindCSS (v4) para un diseño responsivo y moderno, e iconos de Lucide-React.
*   **Base de Datos y Autenticación**: Supabase JS SDK para base de datos PostgreSQL, autenticación de usuarios y almacenamiento de recursos (Storage).
*   **Librerías Clave**:
    *   `xlsx` para exportación masiva de datos a archivos Excel.
    *   `jspdf` y `jspdf-autotable` para reportes PDF (cuando aplique).
    *   `@hello-pangea/dnd` para drag & drop interactivo.

---

## 2. Control de Accesos y Seguridad (RBAC)

El acceso al panel está regulado mediante políticas de base de datos y un sistema dinámico de roles en la aplicación:

1.  **ADMIN**:
    *   Acceso total a todos los módulos: creación de socios (Partners), configuración de paisajes (Projects), asignación de permisos, visualización global y configuraciones de temporada.
2.  **EDITOR**:
    *   Acceso intermedio basado en permisos específicos configurados en su perfil (`profiles`):
        *   `edit_supervision`: Habilita edición/creación de reportes mensuales e historial de paisajes en el módulo de supervisión.
        *   `edit_campaigns`: Habilita edición, creación y avance en el tablero Kanban de campañas.
3.  **PARTNERS (Socios / ONGs)**:
    *   Acceso restringido de solo lectura o escritura enfocado únicamente a sus paisajes.
    *   La tabla puente `user_project_access` mapea qué usuario tiene acceso a qué `project_id`. Si no es admin, la aplicación filtra el árbol de datos para ocultar socios y paisajes no permitidos.

---

## 3. Módulos y Enrutamiento Principal (`src/App.jsx`)

### Públicas
*   `/login`: Pantalla de inicio de sesión. Si hay sesión activa redirige a `/`.

### Privadas (Envueltas en `MainLayout` y `Sidebar`)
*   `/`: Panel de control principal (`HomeDashboard`).
*   `/supervision`: Dashboard maestro de supervisión y gestión de socios/usuarios.
*   `/supervision/nuevo-reporte/:projectId`: Formulario de creación de KPI mensual.
*   `/supervision/editar-reporte/:projectId/:reportId`: Formulario de edición de KPI mensual.
*   `/supervision/ver-reporte/:projectId/:reportId`: Formulario de visualización de KPI mensual (modo lectura).
*   `/supervision/historial/:projectId`: Historial de progreso acumulado y auditoría de un paisaje.
*   `/new-project/:partnerId` y `/edit-project/:projectId`: Formulario de configuración técnica de paisajes.
*   `/new-partner` y `/edit-partner/:partnerId`: Formulario de datos básicos del socio.
*   `/global-report`: Vista macro de métricas agregadas y cumplimiento de la red.
*   `/campaigns`: Tablero Kanban estratégico de campañas y plan de trabajo.
*   `/videos`: Dashboard de gestión y reproducción de material de video.
*   `/mailing`: Creador interactivo de boletines de correo (MailingBuilder).
*   `/prensa`: Dashboard de monitoreo de prensa y medios.
*   `/historias`: Historias de socios de ONGs locales.
*   `/admin-users`: Gestión avanzada de perfiles de usuario.
*   `/admin`: Dashboard de configuraciones globales y base de datos.

---

## 4. Detalle de Módulos Críticos

### A. Módulo de Supervisión (`src/features/supervision/`)
Es el núcleo técnico de cumplimiento para las metas de comunicaciones.

#### 1. Supervision Dashboard (`Supervision.jsx`)
*   **Pestañas**: "Socios" (Partners) y "Accesos de Usuarios" (Users).
*   **Funciones Clave**:
    *   Visualizar la lista de socios activos y sus proyectos asociados.
    *   **Configuración de Temporada (Settings Modal)**:
        *   Crear temporadas (Formato `AAAA-AAAA`).
        *   Definir campañas globales de la temporada y sus meses de duración (Ene - Dic).
        *   Configurar los meses globales en los que se exige la entrega de video (por defecto: Junio, Octubre, Marzo).
        *   Duplicar la configuración de campañas globales y cronogramas Milkywire de una temporada a otra.
        *   *Vaciar Datos de Temporada*: Elimina reportes, campañas y milkywire de la temporada activa sin borrar el registro base de la temporada.
        *   **Algoritmo Milkywire (Chocolateo)**: Genera un cronograma equitativo anual asignando aleatoriamente (mediante mezcla Fisher-Yates) exactamente 3 socios por mes cubriendo los 36 cupos anuales.
        *   *Feature Toggle*: Permite desactivar visualmente el módulo de Milkywire en toda la app a través de un interruptor que escribe en `localStorage` mediante utilidades en `src/lib/milkywireFeature.js`.

#### 2. History (`History.jsx`)
*   **Funciones Clave**:
    *   **Semáforo de cumplimiento (Health Indicator)**: Calcula la desviación entre el avance real acumulado de fotos/publicaciones versus la meta teórica esperada a la fecha.
    *   **Copiado Rápido Numérico y Comentarios**: Permite copiar en formato de texto plano el historial de fotos/posts, o ver y copiar comentarios de fotos, posts o web mediante menús desplegables integrados.
    *   **Generador de Correo HTML**: Compila una plantilla HTML responsiva con tablas de avance acumulado, estado del sitio web, videos de corte y Milkywire de la temporada, lista para copiar y pegar en Gmail/Outlook.
    *   **Exportación Excel**: Descarga a Excel el listado de reportes históricos del paisaje actual.

#### 3. ReportForm (`ReportForm.jsx`)
*   **Funciones Clave**:
    *   **Smart Pre-population (JIT - Just-In-Time)**: Al crear un nuevo reporte, busca el último reporte existente de la misma temporada y precarga datos de la URL web, porcentaje de avance anterior y enlaces a redes sociales.
    *   **Validaciones de Reglas de Comunicación**:
        *   *Límite de Meses*: Impide registrar reportes si el mes del reporte supera la duración configurada en el proyecto.
        *   *Regla de Video*: Si el reporte cae en un mes marcado como mes de video (global o personalizado), bloquea el guardado a menos que se registre un video o se justifique su omisión en los comentarios.
        *   *Regla de Milkywire*: Si es el mes asignado al socio para Milkywire (según el chocolateo) y la función de Milkywire está activa, bloquea el guardado si no se sube material o se provee justificación escrita.
    *   **Historial de Correcciones**: En modo edición, rastrea cambios en KPIs clave (fotos, posts, avance web) y comentarios principales, y los guarda en un array JSONB (`corrections`) con marca de tiempo para auditoría.

#### 4. ProjectForm (`ProjectForm.jsx`)
*   **Funciones Clave**:
    *   Configura el nombre del paisaje, tipo de ecosistema, fecha de inicio y duración de la temporada (en meses).
    *   Define las metas mensuales requeridas de fotos y posts.
    *   **Productos Manuales (Override)**: Permite anular las reglas globales de la temporada para ese proyecto en específico, habilitando la selección de meses de video y campañas con rangos de meses personalizados.

---

## 5. Esquema de Base de Datos (Tablas Clave de Supabase)

### Perfiles de Usuario (`profiles`)
*   `id` (uuid, PK) -> Relaciona con Auth de Supabase.
*   `email` (text)
*   `role` (text) -> 'admin', 'editor', 'PARTNER'.
*   `partner_id` (uuid, FK -> `partners.id`) -> Asigna un usuario al socio.
*   `edit_supervision` (boolean) -> Permiso del Editor en supervisión.
*   `edit_campaigns` (boolean) -> Permiso del Editor en campañas.

### Socios (`partners`)
*   `id` (uuid, PK)
*   `name` (text) -> Nombre de la ONG.
*   `country` (text)
*   `contact_email` (text)
*   `logo_url` (text)
*   `is_active` (boolean)

### Paisajes / Proyectos (`projects`)
*   `id` (uuid, PK)
*   `partner_id` (uuid, FK -> `partners.id`)
*   `name` (text) -> Nombre del paisaje.
*   `landscape` (text) -> Ecosistema.
*   `status` (text) -> 'ACTIVO', 'PAUSADO', 'CERRADO'.
*   `start_date` (date) -> Fecha de inicio de temporada.
*   `season_duration_months` (integer) -> Duración en meses.
*   `monthly_photos_target` (integer) -> Meta mensual de fotos.
*   `monthly_posts_target` (integer) -> Meta mensual de posts.
*   `override_season_rules` (boolean) -> Si tiene reglas personalizadas.
*   `custom_video_months` (jsonb) -> Array de meses de video personalizados.
*   `custom_campaign_requirements` (jsonb) -> Array de campañas personalizadas.

### Reportes Mensuales (`monthly_reports`)
*   `id` (uuid, PK)
*   `project_id` (uuid, FK -> `projects.id`)
*   `report_month` (text)
*   `report_year` (integer)
*   `season_name` (text) -> Ej: "2025-2026".
*   `photo_count` (integer)
*   `photo_comment` (text)
*   `post_count` (integer)
*   `post_comment` (text)
*   `web_progress_percent` (integer)
*   `web_url` (text)
*   `web_comment` (text)
*   `social_links` (jsonb) -> Array de URLs de redes sociales.
*   `campaigns` (jsonb) -> Participaciones en campañas `[{title, comment, date}]`.
*   `videos` (jsonb) -> Entregas de video `[{topic, comment, date}]`.
*   `milkywire_material` (jsonb) -> Entregas de Milkywire `[{topic, comment, date}]`.
*   `video_comment` / `video_general_comment` (text) -> Justificación de videos.
*   `milkywire_comment` / `milkywire_general_comment` (text) -> Justificación de Milkywire.
*   `season_comment` (text) -> Nota de conclusión del reporte.
*   `is_season_start` (boolean)
*   `is_last_month` (boolean)
*   `corrections` (jsonb) -> Historial de auditoría visual de cambios en edición.

### Registro de Temporadas (`season_registry`)
*   `season_name` (text, PK) -> Formato "AAAA-AAAA".
*   `video_months` (jsonb) -> Meses en los que se exige video (Global).

### Campañas Globales de Temporada (`season_campaigns`)
*   `id` (uuid, PK)
*   `season_name` (text)
*   `title` (text)
*   `start_month` (text)
*   `end_month` (text)

### Cronograma de Milkywire (`milkywire_schedules`)
*   `id` (uuid, PK)
*   `season_name` (text)
*   `partner_id` (uuid, FK -> `partners.id`)
*   `target_month` (text)

---

## 6. Historial de Cambios y Mejoras del Proyecto

### [2026-06-23] Estado Inicial de Contexto
*   Creación del archivo `contexto.md` para asentar la lógica operativa actual y base de datos.
*   Asegurado el soporte para la validación inteligente Just-In-Time (JIT) en reportes y el control RBAC.

### [2026-06-23] Corrección de Herencia y Acumulación de Campañas/Videos
*   **ReportForm.jsx**: Modificado el pre-poblado inteligente (JIT) para que los nuevos reportes hereden los arrays `campaigns`, `videos` y `milkywire_material` del mes anterior en lugar de inicializarse vacíos.
*   **History.jsx**: Modificada la generación de correo HTML (`getMailHTML`) para ordenar cronológicamente los reportes y acumular dinámicamente las campañas, videos y material Milkywire únicos de toda la temporada hasta el mes del reporte seleccionado. Esto corrige reportes retroactivamente y soluciona desórdenes cronológicos.

### [2026-06-23] Corrección de Restricción de Estado en Proyectos
*   **Supervision.jsx**: Se convirtió a minúsculas (`toLowerCase`) el estado del proyecto en la función `updateProjectStatus` antes de enviarlo a Supabase. Esto evita la violación de la restricción de validación `projects_status_check` de la base de datos (que solo acepta valores en minúsculas: `'activo'`, `'pausado'`, `'cerrado'`). El frontend sigue normalizando el valor en mayúsculas para la UI de forma correcta.

### [2026-06-23] Simplificación de Botones y Auto-Selección del Primer Reporte
*   **Supervision.jsx**: Se eliminaron los botones redundantes de "Pausar" y "Reactivar/Continuar" del paisaje. Se mantuvieron consolidados bajo el mismo bloque de seguridad únicamente los botones de "Cerrar Proyecto" (cambia estado a `'cerrado'`), "Extender un mes más" y "Configurar Paisaje".
*   **ReportForm.jsx**: Modificado `fetchInitialDataForNew` y el controlador `onChange` de temporadas para que, en caso de no existir reportes previos en la temporada seleccionada (es decir, al crear el primer reporte del paisaje), se auto-seleccionen el mes y año de inicio basados en `start_date` del proyecto, y se active por defecto la bandera de inicio de temporada (`is_season_start = true`). Esto sincroniza el cronograma y mantiene consistentes las métricas y los porcentajes acumulados del paisaje.
