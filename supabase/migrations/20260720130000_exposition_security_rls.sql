-- Reglas RLS reforzadas para la presentacion: menor privilegio en citas y auditoria.
DROP POLICY IF EXISTS "Appointments updated by staff" ON public.appointments;

CREATE POLICY "Appointments updated by authorized staff" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[])
    OR EXISTS (
      SELECT 1
      FROM public.medical_slots slot
      JOIN public.doctors doctor ON doctor.id = slot.doctor_id
      WHERE slot.id = appointments.medical_slot_id
        AND doctor.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[])
    OR EXISTS (
      SELECT 1
      FROM public.medical_slots slot
      JOIN public.doctors doctor ON doctor.id = slot.doctor_id
      WHERE slot.id = appointments.medical_slot_id
        AND doctor.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Audit inserted by authenticated users" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit inserted by staff" ON public.audit_logs;

CREATE POLICY "Audit inserted by staff" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','auditor','doctor','operator']::public.app_role[]));
