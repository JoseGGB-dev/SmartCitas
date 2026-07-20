CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS document_number TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  display_name text;
BEGIN
  display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (id, email, full_name, first_name, avatar_url)
  VALUES (NEW.id, NEW.email, display_name, display_name, NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    first_name = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.specialties (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.facilities (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  insurance_number TEXT UNIQUE,
  birth_date DATE,
  sex TEXT,
  phone TEXT,
  preferred_contact_channel TEXT,
  chronic_condition BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  professional_license TEXT UNIQUE,
  facility_id BIGINT REFERENCES public.facilities(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_specialties (
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  specialty_id BIGINT NOT NULL REFERENCES public.specialties(id),
  PRIMARY KEY (doctor_id, specialty_id)
);

CREATE TABLE IF NOT EXISTS public.medical_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id),
  facility_id BIGINT NOT NULL REFERENCES public.facilities(id),
  specialty_id BIGINT NOT NULL REFERENCES public.specialties(id),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'RESERVED', 'FULL', 'CANCELLED', 'COMPLETED')),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  available_capacity INTEGER NOT NULL CHECK (available_capacity >= 0),
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_medical_slots_available_capacity CHECK (available_capacity <= capacity),
  CONSTRAINT chk_medical_slots_dates CHECK (end_datetime > start_datetime)
);

CREATE TABLE IF NOT EXISTS public.appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  specialty_id BIGINT NOT NULL REFERENCES public.specialties(id),
  preferred_facility_id BIGINT REFERENCES public.facilities(id),
  preferred_date_from DATE,
  preferred_date_to DATE,
  preferred_time_range TEXT,
  request_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'WAITING', 'OFFERED', 'SCHEDULED', 'CANCELLED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.waiting_list_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_request_id UUID NOT NULL UNIQUE REFERENCES public.appointment_requests(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  specialty_id BIGINT NOT NULL REFERENCES public.specialties(id),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'TEMPORARILY_OFFERED', 'ASSIGNED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  waiting_since TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.priority_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiting_list_entry_id UUID NOT NULL REFERENCES public.waiting_list_entries(id) ON DELETE CASCADE,
  rules_version TEXT NOT NULL,
  age_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  chronic_condition_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  waiting_days_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  additional_points NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  explanation JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  medical_slot_id UUID NOT NULL REFERENCES public.medical_slots(id),
  appointment_request_id UUID REFERENCES public.appointment_requests(id),
  status TEXT NOT NULL CHECK (status IN ('PENDING_CONFIRMATION', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW')),
  confirmation_date TIMESTAMPTZ,
  cancellation_date TIMESTAMPTZ,
  cancellation_reason TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.slot_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_slot_id UUID NOT NULL REFERENCES public.medical_slots(id),
  waiting_list_entry_id UUID NOT NULL REFERENCES public.waiting_list_entries(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
  offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  unique_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_offer_id UUID NOT NULL REFERENCES public.slot_offers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  destination_masked TEXT,
  status TEXT NOT NULL,
  provider_reference TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  previous_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_appointment_patient_slot
  ON public.appointments (patient_id, medical_slot_id)
  WHERE status IN ('PENDING_CONFIRMATION', 'CONFIRMED');
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_idempotency
  ON public.appointments (patient_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_offer_per_slot
  ON public.slot_offers (medical_slot_id)
  WHERE status = 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_offer_per_entry
  ON public.slot_offers (waiting_list_entry_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_patients_profile ON public.patients (profile_id);
CREATE INDEX IF NOT EXISTS idx_slots_status ON public.medical_slots (status);
CREATE INDEX IF NOT EXISTS idx_slots_specialty_date ON public.medical_slots (specialty_id, start_datetime);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.appointment_requests (status);
CREATE INDEX IF NOT EXISTS idx_waiting_specialty_status ON public.waiting_list_entries (specialty_id, status);
CREATE INDEX IF NOT EXISTS idx_priority_score ON public.priority_evaluations (total_score DESC);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.slot_offers (status);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments (status);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON public.audit_logs (action, created_at DESC);

ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.priority_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles visible by owner or staff" ON public.profiles;
DROP POLICY IF EXISTS "Roles visible by owner or admin" ON public.user_roles;
CREATE POLICY "Profiles visible by owner or staff" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_any_role(auth.uid(), ARRAY['admin','auditor','doctor','operator']::public.app_role[]));
CREATE POLICY "Roles visible by owner or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Catalogs readable by authenticated users" ON public.specialties;
DROP POLICY IF EXISTS "Catalog facilities readable by authenticated users" ON public.facilities;
CREATE POLICY "Catalogs readable by authenticated users" ON public.specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Catalog facilities readable by authenticated users" ON public.facilities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Patients readable by owner or staff" ON public.patients;
DROP POLICY IF EXISTS "Patients insert own row" ON public.patients;
DROP POLICY IF EXISTS "Patients update own row or staff" ON public.patients;
CREATE POLICY "Patients readable by owner or staff" ON public.patients FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','auditor','doctor','operator']::public.app_role[]));
CREATE POLICY "Patients insert own row" ON public.patients FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Patients update own row or staff" ON public.patients FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() OR public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

DROP POLICY IF EXISTS "Doctors readable by authenticated users" ON public.doctors;
DROP POLICY IF EXISTS "Doctors managed by admin operator" ON public.doctors;
CREATE POLICY "Doctors readable by authenticated users" ON public.doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Doctors managed by admin operator" ON public.doctors FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

DROP POLICY IF EXISTS "Doctor specialties readable by authenticated users" ON public.doctor_specialties;
CREATE POLICY "Doctor specialties readable by authenticated users" ON public.doctor_specialties FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Slots readable by authenticated users" ON public.medical_slots;
DROP POLICY IF EXISTS "Slots managed by staff" ON public.medical_slots;
CREATE POLICY "Slots readable by authenticated users" ON public.medical_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Slots managed by staff" ON public.medical_slots FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

DROP POLICY IF EXISTS "Requests readable by owner or staff" ON public.appointment_requests;
DROP POLICY IF EXISTS "Requests insert own patient" ON public.appointment_requests;
DROP POLICY IF EXISTS "Requests update by owner or staff" ON public.appointment_requests;
CREATE POLICY "Requests readable by owner or staff" ON public.appointment_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','auditor','doctor','operator']::public.app_role[]));
CREATE POLICY "Requests insert own patient" ON public.appointment_requests FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid()));
CREATE POLICY "Requests update by owner or staff" ON public.appointment_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

DROP POLICY IF EXISTS "Waiting list readable by owner or staff" ON public.waiting_list_entries;
DROP POLICY IF EXISTS "Waiting list insert by owner or staff" ON public.waiting_list_entries;
DROP POLICY IF EXISTS "Waiting list update by staff" ON public.waiting_list_entries;
CREATE POLICY "Waiting list readable by owner or staff" ON public.waiting_list_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','auditor','doctor','operator']::public.app_role[]));
CREATE POLICY "Waiting list insert by owner or staff" ON public.waiting_list_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));
CREATE POLICY "Waiting list update by staff" ON public.waiting_list_entries FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

DROP POLICY IF EXISTS "Evaluations readable by staff" ON public.priority_evaluations;
DROP POLICY IF EXISTS "Evaluations inserted by staff" ON public.priority_evaluations;
CREATE POLICY "Evaluations readable by staff" ON public.priority_evaluations FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','auditor','doctor','operator']::public.app_role[]));
CREATE POLICY "Evaluations inserted by staff" ON public.priority_evaluations FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

DROP POLICY IF EXISTS "Appointments readable by owner or staff" ON public.appointments;
DROP POLICY IF EXISTS "Appointments inserted by owner or staff" ON public.appointments;
DROP POLICY IF EXISTS "Appointments updated by staff" ON public.appointments;
CREATE POLICY "Appointments readable by owner or staff" ON public.appointments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','auditor','doctor','operator']::public.app_role[]));
CREATE POLICY "Appointments inserted by owner or staff" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));
CREATE POLICY "Appointments updated by staff" ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','doctor','operator']::public.app_role[]));

DROP POLICY IF EXISTS "Offers readable by owner or staff" ON public.slot_offers;
DROP POLICY IF EXISTS "Offers inserted by staff" ON public.slot_offers;
DROP POLICY IF EXISTS "Offers updated by owner or staff" ON public.slot_offers;
CREATE POLICY "Offers readable by owner or staff" ON public.slot_offers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','auditor','doctor','operator']::public.app_role[]));
CREATE POLICY "Offers inserted by staff" ON public.slot_offers FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));
CREATE POLICY "Offers updated by owner or staff" ON public.slot_offers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.profile_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin','operator']::public.app_role[]));

DROP POLICY IF EXISTS "Audit readable by auditors and admins" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit inserted by authenticated users" ON public.audit_logs;
CREATE POLICY "Audit readable by auditors and admins" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin','auditor']::public.app_role[]));
CREATE POLICY "Audit inserted by authenticated users" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

GRANT SELECT ON public.specialties, public.facilities TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.patients, public.appointment_requests, public.waiting_list_entries, public.appointments, public.slot_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.doctors, public.doctor_specialties, public.medical_slots, public.priority_evaluations, public.audit_logs TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(uuid, public.app_role[]) TO authenticated;

INSERT INTO public.specialties (name, code, description, active) VALUES
  ('Cardiologia', 'CARDIOLOGIA', 'Atencion cardiovascular', true),
  ('Medicina General', 'MEDICINA_GENERAL', 'Consulta general', true),
  ('Dermatologia', 'DERMATOLOGIA', 'Atencion dermatologica', true),
  ('Traumatologia', 'TRAUMATOLOGIA', 'Atencion traumatologica', true),
  ('Neurologia', 'NEUROLOGIA', 'Atencion neurologica', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.facilities (name, code, address, active) VALUES
  ('Hospital Central', 'HDC', 'Av. Salud 100, Lima', true),
  ('Policlinico Norte', 'PND', 'Jr. Integracion 245, Lima', true),
  ('Centro Medico Sur', 'CMSD', 'Av. Progreso 530, Lima', true)
ON CONFLICT (code) DO NOTHING;
