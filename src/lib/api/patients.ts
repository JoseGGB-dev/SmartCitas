import { supabase } from "@/integrations/supabase/client";
import {
  getOrCreatePatient,
  mapAppointment,
  mapSlotOffer,
  pageResponse,
  PAGE_20,
  writeAudit,
  type JoinedRow,
} from "./supabase-api";
import type {
  Appointment,
  AppointmentRequest,
  AppointmentRequestCreate,
  AppointmentRequestStatus,
  PageResponse,
  PatientPriorityRow,
  PatientProfile,
  PatientProfileInput,
  SlotOffer,
} from "./types";

type AppointmentRequestRow = JoinedRow & {
  id: string;
  specialty?: { name?: string | null } | null;
  preferred_facility?: { name?: string | null } | null;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_time_range: string | null;
  request_date: string;
  status: AppointmentRequestStatus;
  created_at: string;
};

const REQUEST_SELECT = `
  id,
  preferred_date_from,
  preferred_date_to,
  preferred_time_range,
  request_date,
  status,
  created_at,
  specialty:specialties(name),
  preferred_facility:facilities(name)
`;

const APPOINTMENT_SELECT = `
  id,
  status,
  confirmation_date,
  patient:patients(profile:profiles(first_name,last_name,full_name,email)),
  medical_slot:medical_slots(
    start_datetime,
    specialty:specialties(name),
    facility:facilities(name)
  )
`;

const OFFER_SELECT = `
  id,
  medical_slot_id,
  waiting_list_entry_id,
  status,
  offered_at,
  expires_at,
  responded_at,
  patient:patients(profile:profiles(first_name,last_name,full_name,email)),
  medical_slot:medical_slots(
    start_datetime,
    specialty:specialties(name),
    facility:facilities(name)
  )
`;

const PATIENT_PROFILE_SELECT = `
  id,
  profile_id,
  first_name,
  last_name,
  document_number,
  birth_date,
  sex,
  phone,
  address,
  district,
  email,
  disease,
  chronic_condition,
  vulnerability_condition,
  priority_points,
  priority_level,
  registered_at,
  active,
  created_at,
  profile:profiles(first_name,last_name,document_number,phone,email,address,district)
`;

// Lee el perfil del paciente autenticado y reutiliza el registro existente en Supabase.
export async function getPatientProfile(): Promise<PatientProfile> {
  const patient = await getOrCreatePatient();
  const { data, error } = await supabase
    .from("patients")
    .select(PATIENT_PROFILE_SELECT)
    .eq("id", patient.id)
    .single();
  if (error) throw error;
  return mapPatientProfile(data as unknown as JoinedRow);
}

// Actualiza tanto patients como profiles para mantener sincronizados los datos visibles.
export async function updatePatientProfile(
  body: Partial<PatientProfileInput>,
): Promise<PatientProfile> {
  const patient = await getOrCreatePatient();
  const payload = {
    first_name: body.firstName,
    last_name: body.lastName,
    document_number: body.documentNumber,
    birth_date: body.birthDate,
    sex: body.sex,
    phone: body.phone,
    address: body.address,
    district: body.district,
    email: body.email,
    disease: body.disease?.trim() || null,
    chronic_condition: body.chronicCondition,
    vulnerability_condition: body.vulnerabilityCondition,
  };

  const { data, error } = await supabase
    .from("patients")
    .update(payload)
    .eq("id", patient.id)
    .select(PATIENT_PROFILE_SELECT)
    .single();
  if (error) throw error;

  if (patient.profile_id) {
    await supabase
      .from("profiles")
      .update({
        first_name: body.firstName,
        last_name: body.lastName,
        full_name: [body.firstName, body.lastName].filter(Boolean).join(" ") || undefined,
        document_type: "DNI",
        document_number: body.documentNumber,
        phone: body.phone,
        address: body.address,
        district: body.district,
        email: body.email,
      })
      .eq("id", patient.profile_id);
  }

  await writeAudit("PATIENT_PROFILE_UPDATED", "patients", patient.id, data);
  return mapPatientProfile(data as unknown as JoinedRow);
}

// Devuelve la tabla completa de prioridad ya ordenada por Supabase.
export async function getPatientPriority(): Promise<PageResponse<PatientPriorityRow>> {
  await getOrCreatePatient();
  const { data, error } = await supabase.rpc("get_patient_priority_board");
  if (error) throw error;

  return pageResponse(
    (data ?? []).map((row) => ({
      id: row.id,
      position: row.position,
      patientName: row.patient_name,
      disease: row.disease,
      chronicCondition: row.chronic_condition,
      vulnerabilityCondition: row.vulnerability_condition,
      age: row.age,
      waitingDays: row.waiting_days,
      points: Number(row.points),
      priorityLevel: row.priority_level,
      status: row.status,
      registeredAt: row.registered_at,
      isCurrentPatient: row.is_current_patient,
    })),
    data?.length ?? 0,
  );
}

export async function getPatientRequests(): Promise<PageResponse<AppointmentRequest>> {
  const patient = await getOrCreatePatient();
  const { data, error } = await supabase
    .from("appointment_requests")
    .select(REQUEST_SELECT)
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_20.size);
  if (error) throw error;

  const rows = (data ?? []) as unknown as AppointmentRequestRow[];
  return pageResponse(rows.map(mapAppointmentRequest), PAGE_20.size);
}

export async function createPatientRequest(
  body: AppointmentRequestCreate,
): Promise<AppointmentRequest> {
  const patient = await getOrCreatePatient(body);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("appointment_requests")
    .insert({
      patient_id: patient.id,
      specialty_id: body.specialtyId,
      preferred_facility_id: body.preferredFacilityId ?? null,
      preferred_date_from: body.preferredDateFrom ?? null,
      preferred_date_to: body.preferredDateTo ?? null,
      preferred_time_range: body.preferredTimeRange ?? null,
      request_date: now,
      status: "WAITING",
    })
    .select(REQUEST_SELECT)
    .single();
  if (error) throw error;

  const { error: waitingError } = await supabase.from("waiting_list_entries").insert({
    appointment_request_id: data.id,
    patient_id: patient.id,
    specialty_id: body.specialtyId,
    status: "ACTIVE",
    waiting_since: now,
  });
  if (waitingError) throw waitingError;

  await writeAudit("APPOINTMENT_REQUEST_CREATED", "appointment_requests", data.id, data);

  return mapAppointmentRequest(data as unknown as AppointmentRequestRow);
}

export async function getPatientAppointments(): Promise<PageResponse<Appointment>> {
  const patient = await getOrCreatePatient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_20.size);
  if (error) throw error;
  return pageResponse(((data ?? []) as unknown as JoinedRow[]).map(mapAppointment), PAGE_20.size);
}

export async function getPatientOffers(): Promise<PageResponse<SlotOffer>> {
  const patient = await getOrCreatePatient();
  const { data, error } = await supabase
    .from("slot_offers")
    .select(OFFER_SELECT)
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_20.size);
  if (error) throw error;
  return pageResponse(((data ?? []) as unknown as JoinedRow[]).map(mapSlotOffer), PAGE_20.size);
}

export async function acceptOffer(id: string): Promise<Appointment> {
  const patient = await getOrCreatePatient();
  const { data: offer, error: offerError } = await supabase
    .from("slot_offers")
    .select("*, medical_slot:medical_slots(*)")
    .eq("id", id)
    .eq("patient_id", patient.id)
    .eq("status", "PENDING")
    .single();
  if (offerError) throw offerError;

  const joinedOffer = offer as unknown as JoinedRow & {
    medical_slot?: { available_capacity?: number; version?: number } | null;
    medical_slot_id: string;
    waiting_list_entry_id: string;
  };
  const slot = joinedOffer.medical_slot;
  const availableCapacity = Math.max((slot?.available_capacity ?? 1) - 1, 0);
  const now = new Date().toISOString();
  const { data: waitingEntry } = await supabase
    .from("waiting_list_entries")
    .select("appointment_request_id")
    .eq("id", joinedOffer.waiting_list_entry_id)
    .maybeSingle();

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      patient_id: patient.id,
      medical_slot_id: joinedOffer.medical_slot_id,
      appointment_request_id: waitingEntry?.appointment_request_id ?? null,
      status: "CONFIRMED",
      confirmation_date: now,
      idempotency_key: crypto.randomUUID(),
    })
    .select(APPOINTMENT_SELECT)
    .single();
  if (appointmentError) throw appointmentError;

  await supabase
    .from("medical_slots")
    .update({
      available_capacity: availableCapacity,
      status: availableCapacity === 0 ? "FULL" : "AVAILABLE",
      version: (slot?.version ?? 0) + 1,
    })
    .eq("id", joinedOffer.medical_slot_id);
  await supabase.from("slot_offers").update({ status: "ACCEPTED", responded_at: now }).eq("id", id);
  await supabase
    .from("waiting_list_entries")
    .update({ status: "ASSIGNED" })
    .eq("id", joinedOffer.waiting_list_entry_id);
  if (waitingEntry?.appointment_request_id) {
    await supabase
      .from("appointment_requests")
      .update({ status: "SCHEDULED" })
      .eq("id", waitingEntry.appointment_request_id);
  }
  await writeAudit("OFFER_ACCEPTED", "slot_offers", id, { appointmentId: appointment.id });

  return mapAppointment(appointment as unknown as JoinedRow);
}

export async function rejectOffer(id: string): Promise<SlotOffer | null> {
  const patient = await getOrCreatePatient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("slot_offers")
    .update({ status: "REJECTED", responded_at: now })
    .eq("id", id)
    .eq("patient_id", patient.id)
    .select(OFFER_SELECT)
    .single();
  if (error) throw error;

  await supabase
    .from("waiting_list_entries")
    .update({ status: "REJECTED" })
    .eq("id", data.waiting_list_entry_id);
  await writeAudit("OFFER_REJECTED", "slot_offers", id, data);
  return mapSlotOffer(data as unknown as JoinedRow);
}

function mapAppointmentRequest(row: AppointmentRequestRow): AppointmentRequest {
  return {
    id: row.id,
    specialty: row.specialty?.name ?? "Especialidad no registrada",
    preferredFacility: row.preferred_facility?.name ?? null,
    preferredDateFrom: row.preferred_date_from,
    preferredDateTo: row.preferred_date_to,
    preferredTimeRange: row.preferred_time_range,
    requestDate: row.request_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapPatientProfile(row: JoinedRow): PatientProfile {
  const profile = row.profile as
    | {
        first_name?: string | null;
        last_name?: string | null;
        document_number?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        district?: string | null;
      }
    | null
    | undefined;

  return {
    id: row.id ?? "",
    profileId: (row.profile_id as string | null | undefined) ?? null,
    firstName: (row.first_name as string | null | undefined) ?? profile?.first_name ?? null,
    lastName: (row.last_name as string | null | undefined) ?? profile?.last_name ?? null,
    documentNumber:
      (row.document_number as string | null | undefined) ?? profile?.document_number ?? null,
    birthDate: (row.birth_date as string | null | undefined) ?? null,
    sex: (row.sex as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? profile?.phone ?? null,
    address: (row.address as string | null | undefined) ?? profile?.address ?? null,
    district: (row.district as string | null | undefined) ?? profile?.district ?? null,
    email: (row.email as string | null | undefined) ?? profile?.email ?? null,
    disease: (row.disease as string | null | undefined) ?? null,
    chronicCondition: (row.chronic_condition as boolean | undefined) ?? false,
    vulnerabilityCondition: (row.vulnerability_condition as boolean | undefined) ?? false,
    priorityPoints: Number(row.priority_points ?? 0),
    priorityLevel: (row.priority_level as "Alta" | "Media" | "Baja" | undefined) ?? "Baja",
    registeredAt: (row.registered_at as string | undefined) ?? row.created_at ?? "",
    active: (row.active as boolean | undefined) ?? true,
    createdAt: row.created_at ?? "",
  };
}
