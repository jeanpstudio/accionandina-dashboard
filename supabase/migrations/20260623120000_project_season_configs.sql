-- ==========================================
-- SCRIPT DE ACTUALIZACIÓN: CONFIGURACIÓN DE PROYECTOS POR TEMPORADA
-- ==========================================

CREATE TABLE IF NOT EXISTS public.project_season_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    season_name TEXT NOT NULL,
    start_date DATE,
    season_duration_months INTEGER DEFAULT 12,
    monthly_photos_target INTEGER DEFAULT 10,
    monthly_posts_target INTEGER DEFAULT 4,
    override_season_rules BOOLEAN DEFAULT false,
    custom_video_months JSONB,
    custom_campaign_requirements JSONB,
    status TEXT DEFAULT 'activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint: Un solo registro de configuración por proyecto por temporada
    CONSTRAINT project_season_configs_project_season_unique UNIQUE(project_id, season_name)
);

-- Habilitar RLS
ALTER TABLE public.project_season_configs ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (RLS)
CREATE POLICY "Lectura pública para project_season_configs"
    ON public.project_season_configs FOR SELECT
    USING (true);

CREATE POLICY "Inserción para admins en project_season_configs"
    ON public.project_season_configs FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

CREATE POLICY "Actualización para admins en project_season_configs"
    ON public.project_season_configs FOR UPDATE
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

CREATE POLICY "Eliminación para admins en project_season_configs"
    ON public.project_season_configs FOR DELETE
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_project_season_configs_lookup ON public.project_season_configs(project_id, season_name);
