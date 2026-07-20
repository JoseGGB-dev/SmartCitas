import { supabase } from "@/integrations/supabase/client";
import {
  currentDoctor,
  mapAppointment,
  mapMedicalSlot,
  pageResponse,
  PAGE_30,
  writeAudit,
  type JoinedRow,
} from "./supabase-api";
import type { Appointment, MedicalSlot, PageResponse } from "./types";

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

const APPOINTMENT_SELECT = `
  id,
  status,
  confirmation_date,
  patient:patients(profile:profiles(first_name,last_name,full_name,email)),
  medical_slot:medical_slots(
    start_datetime,
    doctor_id,
    specialty:specialties(name),
    facility:facilities(name)
  )
`;

export async function getDoctorSchedule(): Promise<PageResponse<MedicalSlot>> {
  const doctor = await currentDoctor();
  if (!doctor) return pageResponse([], PAGE_30.size);

  const { data, error } = await supabase
    .from("medical_slots")
    .select(SLOT_SELECT)
    .eq("doctor_id", doctor.id)
    .order("start_datetime")
    .limit(PAGE_30.size);
  if (error) throw error;
  return pageResponse(((data ?? []) as unknown as JoinedRow[]).map(mapMedicalSlot), PAGE_30.size);
}

export async function getDoctorAppointments(): Promise<PageResponse<Appointment>> {
  const doctor = await currentDoctor();
  if (!doctor) return pageResponse([], PAGE_30.size);

  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("medical_slot.doctor_id", doctor.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_30.size);
  if (error) throw error;
  return pageResponse(
    ((data ?? []) as unknown as JoinedRow[])
      .filter((row) => row.medical_slot?.doctor_id === doctor.id)
      .map(mapAppointment),
    PAGE_30.size,
  );
}

export async function completeAppointment(id: string): Promise<Appointment> {
  const doctor = await currentDoctor();
  if (!doctor) throw new Error("No existe perfil medico para este usuario.");

  const { data: current, error: currentError } = await supabase
    .from("appointments")
    .select(APPOINTMENT_SELECT)
    .eq("id", id)
    .single();
  if (currentError) throw currentError;

  const currentRow = current as unknown as JoinedRow;
  if (currentRow.medical_slot?.doctor_id !== doctor.id) {
    throw new Error("No tienes permisos para completar esta cita.");
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "COMPLETED" })
    .eq("id", id)
    .select(APPOINTMENT_SELECT)
    .single();
  if (error) throw error;
  const row = data as unknown as JoinedRow;

  await writeAudit("APPOINTMENT_COMPLETED", "appointments", id, data);
  return mapAppointment(row);
}
