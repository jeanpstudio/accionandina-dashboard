-- Registro explícito de temporadas (además de las inferidas por reportes/campañas/milkywire).
-- Permite "crear" una temporada nueva sin duplicar campañas ni historial.

CREATE TABLE IF NOT EXISTS public.season_registry (
    season_name TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT season_registry_name_format CHECK (season_name ~ '^\d{4}-\d{4}$')
);

CREATE INDEX IF NOT EXISTS idx_season_registry_created ON public.season_registry (created_at DESC);

ALTER TABLE public.season_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season_registry_select_all"
    ON public.season_registry FOR SELECT
    USING (true);

CREATE POLICY "season_registry_insert_staff"
    ON public.season_registry FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.profiles
            WHERE role = 'admin' OR edit_supervision = true
        )
    );

CREATE POLICY "season_registry_delete_staff"
    ON public.season_registry FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM public.profiles
            WHERE role = 'admin' OR edit_supervision = true
        )
    );
