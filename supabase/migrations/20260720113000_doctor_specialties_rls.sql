-- Permite administrar las especialidades asignadas a cada medico desde el panel interno.
DROP POLICY IF EXISTS "Doctor specialties managed by admin operator" ON public.doctor_specialties;

CREATE POLICY "Doctor specialties managed by admin operator" ON public.doctor_specialties
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

GRANT DELETE ON public.doctor_specialties TO authenticated;
