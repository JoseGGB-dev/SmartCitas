CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL UNIQUE,
  first_name VARCHAR(120),
  last_name VARCHAR(120),
  document_type VARCHAR(30),
  document_number VARCHAR(40) UNIQUE,
  phone VARCHAR(40),
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  insurance_number VARCHAR(60) UNIQUE,
  birth_date DATE,
  sex VARCHAR(20),
  phone VARCHAR(40),
  preferred_contact_channel VARCHAR(40),
  chronic_condition BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE facilities (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  address VARCHAR(240),
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE specialties (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  professional_license VARCHAR(80) UNIQUE,
  facility_id BIGINT REFERENCES facilities(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE doctor_specialties (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  specialty_id BIGINT NOT NULL REFERENCES specialties(id),
  PRIMARY KEY (doctor_id, specialty_id)
);

CREATE TABLE medical_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id),
  facility_id BIGINT NOT NULL REFERENCES facilities(id),
  specialty_id BIGINT NOT NULL REFERENCES specialties(id),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  status VARCHAR(40) NOT NULL,
  capacity INTEGER NOT NULL,
  available_capacity INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_slot_capacity_positive CHECK (capacity > 0),
  CONSTRAINT chk_slot_available_non_negative CHECK (available_capacity >= 0),
  CONSTRAINT chk_slot_available_not_over_capacity CHECK (available_capacity <= capacity),
  CONSTRAINT chk_slot_dates CHECK (end_datetime > start_datetime)
);

CREATE TABLE appointment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  specialty_id BIGINT NOT NULL REFERENCES specialties(id),
  preferred_facility_id BIGINT REFERENCES facilities(id),
  preferred_date_from DATE,
  preferred_date_to DATE,
  preferred_time_range VARCHAR(60),
  request_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE waiting_list_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_request_id UUID NOT NULL UNIQUE REFERENCES appointment_requests(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  specialty_id BIGINT NOT NULL REFERENCES specialties(id),
  status VARCHAR(40) NOT NULL,
  waiting_since TIMESTAMPTZ NOT NULL,
  current_position INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE priority_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiting_list_entry_id UUID NOT NULL REFERENCES waiting_list_entries(id) ON DELETE CASCADE,
  rules_version VARCHAR(40) NOT NULL,
  age_points NUMERIC(10,2) NOT NULL,
  chronic_condition_points NUMERIC(10,2) NOT NULL,
  waiting_days_points NUMERIC(10,2) NOT NULL,
  additional_points NUMERIC(10,2) NOT NULL,
  total_score NUMERIC(10,2) NOT NULL,
  explanation JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id),
  medical_slot_id UUID NOT NULL REFERENCES medical_slots(id),
  appointment_request_id UUID REFERENCES appointment_requests(id),
  status VARCHAR(40) NOT NULL,
  confirmation_date TIMESTAMPTZ,
  cancellation_date TIMESTAMPTZ,
  cancellation_reason TEXT,
  idempotency_key VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE slot_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_slot_id UUID NOT NULL REFERENCES medical_slots(id),
  waiting_list_entry_id UUID NOT NULL REFERENCES waiting_list_entries(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  status VARCHAR(40) NOT NULL,
  offered_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  unique_token VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_offer_id UUID NOT NULL REFERENCES slot_offers(id) ON DELETE CASCADE,
  channel VARCHAR(40) NOT NULL,
  destination_masked VARCHAR(120),
  status VARCHAR(40) NOT NULL,
  provider_reference VARCHAR(160),
  attempts INTEGER NOT NULL DEFAULT 1,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  previous_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(80),
  user_agent VARCHAR(240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_active_appointment_patient_slot
  ON appointments (patient_id, medical_slot_id)
  WHERE status IN ('PENDING_CONFIRMATION', 'CONFIRMED');

CREATE UNIQUE INDEX uq_appointment_idempotency
  ON appointments (patient_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX uq_pending_offer_per_slot
  ON slot_offers (medical_slot_id)
  WHERE status = 'PENDING';

CREATE UNIQUE INDEX uq_pending_offer_per_entry
  ON slot_offers (waiting_list_entry_id)
  WHERE status = 'PENDING';

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_document ON users (document_type, document_number);
CREATE INDEX idx_users_supabase ON users (supabase_user_id);
CREATE INDEX idx_patients_user ON patients (user_id);
CREATE INDEX idx_slots_status ON medical_slots (status);
CREATE INDEX idx_slots_specialty_date ON medical_slots (specialty_id, start_datetime);
CREATE INDEX idx_slots_facility ON medical_slots (facility_id);
CREATE INDEX idx_requests_status ON appointment_requests (status);
CREATE INDEX idx_waiting_specialty_status ON waiting_list_entries (specialty_id, status);
CREATE INDEX idx_waiting_since ON waiting_list_entries (waiting_since);
CREATE INDEX idx_priority_score ON priority_evaluations (total_score DESC);
CREATE INDEX idx_offers_status ON slot_offers (status);
CREATE INDEX idx_appointments_status ON appointments (status);
CREATE INDEX idx_audit_action_created ON audit_logs (action, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id);
