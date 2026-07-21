import { supabase } from "@/integrations/supabase/client";
import { calculatePriorityScore, PRIORITY_RULES_VERSION } from "@/lib/priority";
import {
  mapAppointment,
  mapMedicalSlot,
  mapSlotOffer,
  mapWaitingListEntry,
  pageResponse,
  PAGE_30,
  requireRole,
  writeAudit,
  type JoinedRow,
} from "./supabase-api";
import type {
  Appointment,
  MedicalSlot,
  MedicalSlotCreate,
  MedicalSlotCreateResult,
  PageResponse,
  SlotOffer,
  WaitingListEntry,
} from "./types";

const WAITING_SELECT = `
  id,
  appointment_request_id,
  status,
  waiting_since,
  current_position,
  specialty:specialties(name),
  patient:patients(profile:profiles(first_name,last_name,full_name,email)),
  priority_evaluations(
    id,
    rules_version,
    age_points,
    chronic_condition_points,
    waiting_days_points,
    additional_points,
    total_score,
    explanation,
    evaluated_at
  )
`;

const SLOT_SELECT = `
  id,
  doctor_id,
  start_datetime,
  end_datetime,
  status,
  capacity,
  available_capacity,
  version,
  facility:facilities(name),
  specialty:specialties(name),
  doctor:doctors(profile:profiles(first_name,last_name,full_name,email))
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

export async function getWaitingList(): Promise<PageResponse<WaitingListEntry>> {
  await requireRole(["OPERATOR", "ADMIN"]);
  const { data, error } = await supabase
    .from("waiting_list_entries")
    .select(WAITING_SELECT)
    .order("waiting_since")
    .limit(PAGE_30.size);
  if (error) throw error;
  return pageResponse(
    ((data ?? []) as unknown as JoinedRow[]).map(mapWaitingListEntry),
    PAGE_30.size,
  );
}

export async function getMedicalSlots(): Promise<PageResponse<MedicalSlot>> {
  await requireRole(["OPERATOR", "ADMIN"]);
  const { data, error } = await supabase
    .from("medical_slots")
    .select(SLOT_SELECT)
    .order("start_datetime")
    .limit(PAGE_30.size);
  if (error) throw error;
  return pageResponse(((data ?? []) as unknown as JoinedRow[]).map(mapMedicalSlot), PAGE_30.size);
}

export async function createMedicalSlot(body: MedicalSlotCreate): Promise<MedicalSlotCreateResult> {
  await requireRole(["OPERATOR", "ADMIN"]);
  const { data, error } = await supabase
    .from("medical_slots")
    .insert({
      doctor_id: body.doctorId ?? null,
      facility_id: body.facilityId,
      specialty_id: body.specialtyId,
      start_datetime: body.startDatetime,
      end_datetime: body.endDatetime,
      capacity: body.capacity,
      available_capacity: body.capacity,
      status: "AVAILABLE",
    })
    .select(SLOT_SELECT)
    .single();
  if (error) throw error;
  await writeAudit("MEDICAL_SLOT_CREATED", "medical_slots", data.id, data);

  // Al crear disponibilidad se ofrece automaticamente al paciente elegible con mayor prioridad.
  const offer = await assignNextPatient(data.id);
  return {
    slot: mapMedicalSlot(data as unknown as JoinedRow),
    offer,
  };
}

export async function releaseMedicalSlot(id: string): Promise<MedicalSlot> {
  await requireRole(["OPERATOR", "ADMIN"]);
  const { data: slot, error: slotError } = await supabase
    .from("medical_slots")
    .select("available_capacity, capacity, version")
    .eq("id", id)
    .single();
  if (slotError) throw slotError;

  const availableCapacity = Math.min((slot.available_capacity ?? 0) + 1, slot.capacity);
  const { data, error } = await supabase
    .from("medical_slots")
    .update({
      available_capacity: availableCapacity,
      status: availableCapacity > 0 ? "AVAILABLE" : "FULL",
      version: (slot.version ?? 0) + 1,
    })
    .eq("id", id)
    .select(SLOT_SELECT)
    .single();
  if (error) throw error;
  await writeAudit("MEDICAL_SLOT_RELEASED", "medical_slots", id, data);
  return mapMedicalSlot(data as unknown as JoinedRow);
}

export async function assignNextPatient(id: string): Promise<SlotOffer | null> {
  await requireRole(["OPERATOR", "ADMIN"]);
  const { data: slot, error: slotError } = await supabase
    .from("medical_slots")
    .select("id, specialty_id, available_capacity")
    .eq("id", id)
    .single();
  if (slotError) throw slotError;
  if (!slot.available_capacity || slot.available_capacity <= 0) return null;

  const { data: candidates, error: candidatesError } = await supabase
    .from("waiting_list_entries")
    .select(
      "*, patient:patients(birth_date,chronic_condition,vulnerability_condition), appointment_request:appointment_requests(id)",
    )
    .eq("specialty_id", slot.specialty_id)
    .eq("status", "ACTIVE")
    .order("waiting_since")
    .limit(20);
  if (candidatesError) throw candidatesError;
  if (!candidates?.length) return null;

  const evaluated = (
    (candidates ?? []) as unknown as Array<
      JoinedRow & {
        id: string;
        appointment_request_id: string;
        patient_id: string;
        specialty_id: number;
        waiting_since: string;
        patient: {
          birth_date: string | null;
          chronic_condition: boolean;
          vulnerability_condition: boolean;
        } | null;
      }
    >
  )
    .map((entry) => ({ entry, evaluation: calculatePriority(entry) }))
    .sort((a, b) => b.evaluation.totalScore - a.evaluation.totalScore)[0];

  const { data: evaluation, error: evaluationError } = await supabase
    .from("priority_evaluations")
    .insert({
      waiting_list_entry_id: evaluated.entry.id,
      rules_version: PRIORITY_RULES_VERSION,
      age_points: evaluated.evaluation.agePoints,
      chronic_condition_points: evaluated.evaluation.chronicConditionPoints,
      waiting_days_points: evaluated.evaluation.waitingDaysPoints,
      additional_points: evaluated.evaluation.vulnerabilityPoints,
      total_score: evaluated.evaluation.totalScore,
      explanation: evaluated.evaluation.explanation,
      evaluated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (evaluationError) throw evaluationError;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { data: offer, error } = await supabase
    .from("slot_offers")
    .insert({
      medical_slot_id: id,
      waiting_list_entry_id: evaluated.entry.id,
      patient_id: evaluated.entry.patient_id,
      status: "PENDING",
      offered_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      unique_token: crypto.randomUUID(),
    })
    .select(OFFER_SELECT)
    .single();
  if (error) throw error;

  await supabase
    .from("waiting_list_entries")
    .update({ status: "TEMPORARILY_OFFERED" })
    .eq("id", evaluated.entry.id);
  await supabase
    .from("appointment_requests")
    .update({ status: "OFFERED" })
    .eq("id", evaluated.entry.appointment_request_id);
  await writeAudit("SLOT_OFFER_CREATED", "slot_offers", offer.id, {
    evaluationId: evaluation.id,
    totalScore: evaluated.evaluation.totalScore,
  });

  return mapSlotOffer(offer as unknown as JoinedRow);
}

export async function getOperatorAppointments(): Promise<PageResponse<Appointment>> {
  await requireRole(["OPERATOR", "ADMIN"]);
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(PAGE_30.size);
  if (error) throw error;
  return pageResponse(((data ?? []) as unknown as JoinedRow[]).map(mapAppointment), PAGE_30.size);
}

function calculatePriority(entry: {
  waiting_since: string;
  patient: {
    birth_date: string | null;
    chronic_condition: boolean;
    vulnerability_condition: boolean;
  } | null;
}) {
  const score = calculatePriorityScore({
    birthDate: entry.patient?.birth_date,
    chronicCondition: entry.patient?.chronic_condition,
    vulnerabilityCondition: entry.patient?.vulnerability_condition,
    waitingSince: entry.waiting_since,
  });

  return {
    agePoints: score.agePoints,
    chronicConditionPoints: score.chronicConditionPoints,
    vulnerabilityPoints: score.vulnerabilityPoints,
    waitingDaysPoints: score.waitingDaysPoints,
    totalScore: score.totalScore,
    explanation: score.explanation,
  };
}
