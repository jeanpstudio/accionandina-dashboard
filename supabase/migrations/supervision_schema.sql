-- ==========================================
-- SCRIPT DE ACTUALIZACIÓN: SUPERVISIÓN AVANZADA
-- ==========================================

-- 1. TABLA PARA CAMPAÑAS GLOBALES DE TEMPORADA
CREATE TABLE IF NOT EXISTS public.season_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.season_campaigns ENABLE ROW LEVEL SECURITY;

-- Políticas para season_campaigns
CREATE POLICY "Lectura pública para season_campaigns"
    ON public.season_campaigns FOR SELECT
    USING (true);

CREATE POLICY "Inserción para admins en season_campaigns"
    ON public.season_campaigns FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

CREATE POLICY "Actualización para admins en season_campaigns"
    ON public.season_campaigns FOR UPDATE
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

CREATE POLICY "Eliminación para admins en season_campaigns"
    ON public.season_campaigns FOR DELETE
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );


-- 2. TABLA PARA CRONOGRAMA DE MILKYWIRE
CREATE TABLE IF NOT EXISTS public.milkywire_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_name TEXT NOT NULL,
    target_month TEXT NOT NULL, -- Junio, Octubre, Marzo, etc.
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Evitar duplicados exactos: El mismo socio no debe ser agendado dos veces para el MISMO mes en la MISMA temporada
    UNIQUE(season_name, target_month, partner_id)
);

-- Habilitar RLS
ALTER TABLE public.milkywire_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas para milkywire_schedules
CREATE POLICY "Lectura pública para milkywire_schedules"
    ON public.milkywire_schedules FOR SELECT
    USING (true);

CREATE POLICY "Inserción para admins en milkywire_schedules"
    ON public.milkywire_schedules FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

CREATE POLICY "Actualización para admins en milkywire_schedules"
    ON public.milkywire_schedules FOR UPDATE
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

CREATE POLICY "Eliminación para admins en milkywire_schedules"
    ON public.milkywire_schedules FOR DELETE
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR edit_supervision = true)
    );

-- INDEXES útiles para rendimiento
CREATE INDEX IF NOT EXISTS idx_season_campaigns_season ON public.season_campaigns(season_name);
CREATE INDEX IF NOT EXISTS idx_milkywire_schedules_season ON public.milkywire_schedules(season_name);
CREATE INDEX IF NOT EXISTS idx_milkywire_schedules_month ON public.milkywire_schedules(target_month);
