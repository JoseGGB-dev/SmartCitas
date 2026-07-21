-- Permisos de eliminacion controlados para el panel administrador.
GRANT DELETE ON public.profiles TO authenticated;
GRANT DELETE ON public.user_roles TO authenticated;
GRANT DELETE ON public.patients TO authenticated;
GRANT DELETE ON public.specialties TO authenticated;
GRANT DELETE ON public.facilities TO authenticated;
GRANT DELETE ON public.medical_slots TO authenticated;

DROP POLICY IF EXISTS "Profiles deleted by admin" ON public.profiles;
DROP POLICY IF EXISTS "Patients deleted by admin" ON public.patients;
DROP POLICY IF EXISTS "Medical slots deleted by admin operator" ON public.medical_slots;
DROP POLICY IF EXISTS "Catalog specialties deleted by admin" ON public.specialties;
DROP POLICY IF EXISTS "Catalog facilities deleted by admin" ON public.facilities;

-- Eliminacion de perfiles operativos desde administracion.
CREATE POLICY "Profiles deleted by admin" ON public.profiles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Eliminacion de pacientes desde administracion.
CREATE POLICY "Patients deleted by admin" ON public.patients
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Eliminacion de cupos desde administracion u operacion.
CREATE POLICY "Medical slots deleted by admin operator" ON public.medical_slots
FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

-- Eliminacion de catalogos desde administracion.
CREATE POLICY "Catalog specialties deleted by admin" ON public.specialties
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Catalog facilities deleted by admin" ON public.facilities
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
