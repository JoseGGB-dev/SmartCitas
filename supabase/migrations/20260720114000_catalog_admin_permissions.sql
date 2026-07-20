-- Permisos necesarios para que el administrador mantenga catalogos desde la aplicacion.
GRANT SELECT, INSERT, UPDATE ON public.specialties TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.facilities TO authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.specialties_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.facilities_id_seq TO authenticated;
