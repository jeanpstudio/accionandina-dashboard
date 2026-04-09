-- Migración para agregar comentarios generales a videos y milkywire
-- Fecha: 2026-04-09

ALTER TABLE public.monthly_reports 
ADD COLUMN IF NOT EXISTS video_general_comment TEXT,
ADD COLUMN IF NOT EXISTS milkywire_general_comment TEXT,
ADD COLUMN IF NOT EXISTS web_url TEXT;

COMMENT ON COLUMN public.monthly_reports.video_general_comment IS 'Comentario general para la sección de videos cuando no hay entregas ni justificación específica.';
COMMENT ON COLUMN public.monthly_reports.milkywire_general_comment IS 'Comentario general para la sección de Milkywire cuando no hay entregas ni justificación específica.';
