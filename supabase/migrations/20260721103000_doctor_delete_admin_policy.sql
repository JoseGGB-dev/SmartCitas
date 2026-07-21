-- Permite que administradores eliminen medicos sin afectar permisos de lectura.
GRANT DELETE ON public.doctors TO authenticated;

DROP POLICY IF EXISTS "Doctors managed by admin operator" ON public.doctors;
DROP POLICY IF EXISTS "Doctors inserted by admin operator" ON public.doctors;
DROP POLICY IF EXISTS "Doctors updated by admin operator" ON public.doctors;
DROP POLICY IF EXISTS "Doctors deleted by admin" ON public.doctors;

-- Registro de medicos desde el panel administrativo y operativo.
CREATE POLICY "Doctors inserted by admin operator" ON public.doctors
FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

-- Actualizacion de datos operativos del medico.
CREATE POLICY "Doctors updated by admin operator" ON public.doctors
FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

-- Eliminacion definitiva limitada al administrador.
CREATE POLICY "Doctors deleted by admin" ON public.doctors
FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin']::public.app_role[]));
