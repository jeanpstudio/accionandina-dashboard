-- Migración para añadir soporte de historial de correcciones a los reportes mensuales
ALTER TABLE public.monthly_reports ADD COLUMN corrections JSONB DEFAULT '[]'::jsonb;

-- Comentario para documentación
COMMENT ON COLUMN public.monthly_reports.corrections IS 'Historial de cambios realizados en el reporte (anterior vs nuevo)';
