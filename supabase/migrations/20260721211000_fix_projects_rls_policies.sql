-- ==========================================
-- SCRIPT DE ACTUALIZACIÓN: CORRECCIÓN DE POLÍTICAS RLS EN TABLA PROJECTS
-- ==========================================

-- Habilitar RLS en public.projects (por si acaso)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas si existen para evitar conflictos con nombres conocidos o genéricos
DROP POLICY IF EXISTS "Lectura pública para projects" ON public.projects;
DROP POLICY IF EXISTS "Inserción para admins en projects" ON public.projects;
DROP POLICY IF EXISTS "Actualización para admins en projects" ON public.projects;
DROP POLICY IF EXISTS "Eliminación para admins en projects" ON public.projects;

DROP POLICY IF EXISTS "Allow select for all" ON public.projects;
DROP POLICY IF EXISTS "Allow insert for admin" ON public.projects;
DROP POLICY IF EXISTS "Allow update for admin" ON public.projects;
DROP POLICY IF EXISTS "Allow delete for admin" ON public.projects;

DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;

-- Crear nuevas políticas que permitan a admins y editores con permiso de supervisión
CREATE POLICY "Lectura pública para projects"
    ON public.projects FOR SELECT
    USING (true);

CREATE POLICY "Inserción para admins y editores en projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

CREATE POLICY "Actualización para admins y editores en projects"
    ON public.projects FOR UPDATE
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    )
    WITH CHECK (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

CREATE POLICY "Eliminación para admins y editores en projects"
    ON public.projects FOR DELETE
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );
