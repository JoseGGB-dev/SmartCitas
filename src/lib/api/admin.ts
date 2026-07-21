import { supabase } from "@/integrations/supabase/client";
import {
  mapAuditLog,
  normalizeRoles,
  pageResponse,
  PAGE_30,
  requireRole,
  splitName,
  toRoleCode,
  writeAudit,
  type JoinedRow,
} from "./supabase-api";
import type {
  AuditLog,
  AdminPriorityInput,
  AdminPriorityRow,
  CatalogInput,
  CatalogItem,
  DoctorInput,
  DoctorSummary,
  PageResponse,
  PatientProfile,
  PatientProfileInput,
  Statistics,
  UserSummary,
} from "./types";

// Trae el paciente junto con su perfil base para mostrar y editar datos administrativos.
const PATIENT_SELECT = `
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

const DOCTOR_SELECT = `
  id,
  profile_id,
  first_name,
  last_name,
  email,
  professional_license,
  facility_id,
  active,
  created_at,
  profile:profiles(first_name,last_name,email),
  facility:facilities(id,code,name,address),
  doctor_specialties(specialty:specialties(id,code,name,description))
`;

function cleanText(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function buildDoctorPayload(body: DoctorInput & { id?: string }): Record<string, unknown> {
  const isUpdate = Boolean(body.id);
  const payload: Record<string, unknown> = {};

  // Normaliza campos de formulario antes de enviarlos a Supabase.
  if (!isUpdate || body.profileId !== undefined) payload.profile_id = cleanText(body.profileId);
  if (!isUpdate || body.firstName !== undefined) payload.first_name = cleanText(body.firstName);
  if (!isUpdate || body.lastName !== undefined) payload.last_name = cleanText(body.lastName);
  if (!isUpdate || body.email !== undefined) payload.email = cleanText(body.email);
  if (!isUpdate || body.professionalLicense !== undefined) {
    payload.professional_license = cleanText(body.professionalLicense);
  }
  if (!isUpdate || body.facilityId !== undefined) payload.facility_id = body.facilityId ?? null;
  if (!isUpdate || body.active !== undefined) payload.active = body.active ?? true;

  return payload;
}

async function assertDoctorUnique(body: DoctorInput & { id?: string }) {
  const professionalLicense = cleanText(body.professionalLicense);
  if (professionalLicense) {
    let licenseQuery = supabase
      .from("doctors")
      .select("id")
      .eq("professional_license", professionalLicense)
      .limit(1);

    if (body.id) licenseQuery = licenseQuery.neq("id", body.id);

    const { data, error } = await licenseQuery;
    if (error) throw error;
    if (data?.length) throw new Error("Ya existe un medico registrado con ese CMP.");
  }

  const profileId = cleanText(body.profileId);
  if (profileId) {
    let profileQuery = supabase.from("doctors").select("id").eq("profile_id", profileId).limit(1);

    if (body.id) profileQuery = profileQuery.neq("id", body.id);

    const { data, error } = await profileQuery;
    if (error) throw error;
    if (data?.length) throw new Error("Ese usuario ya esta asociado a otro medico.");
  }
}

function formatDoctorSaveError(error: unknown): Error {
  const source = error instanceof Error ? error.message : String(error);

  if (source.includes("doctor_specialties")) {
    return new Error("No pudimos guardar las especialidades del medico.");
  }

  if (source.includes("professional_license") || source.includes("doctors_professional_license")) {
    return new Error("Ya existe un medico registrado con ese CMP.");
  }

  if (source.includes("profile_id") || source.includes("doctors_profile_id")) {
    return new Error("Ese usuario ya esta asociado a otro medico.");
  }

  return error instanceof Error ? error : new Error("No pudimos guardar el medico.");
}

function formatCatalogSaveError(error: unknown, label: string): Error {
  const source = error instanceof Error ? error.message : String(error);

  if (source.includes("code")) {
    return new Error(`Ya existe ${label} con ese codigo.`);
  }

  return error instanceof Error ? error : new Error(`No pudimos guardar ${label}.`);
}

function buildCatalogPayload(body: CatalogInput): Record<string, unknown> {
  return {
    code: cleanText(body.code)?.toUpperCase().replace(/\s+/g, "_"),
    name: cleanText(body.name),
    description: cleanText(body.description),
    address: cleanText(body.address),
    active: body.active ?? true,
  };
}

export async function getAdminUsers(): Promise<PageResponse<UserSummary>> {
  await requireRole(["ADMIN"]);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,email,full_name,first_name,last_name,document_number")
    .order("created_at", { ascending: false })
    .limit(PAGE_30.size);
  if (profilesError) throw profilesError;

  const ids = (profiles ?? []).map((profile) => profile.id);
  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id,role")
    .in("user_id", ids);
  if (rolesError) throw rolesError;

  return pageResponse(
    (profiles ?? []).map((profile) => {
      const names = splitName(profile.full_name);
      const roles = normalizeRoles(
        (roleRows ?? [])
          .filter((item) => item.user_id === profile.id)
          .map((item) => toRoleCode(item.role))
          .filter((role): role is UserSummary["roles"][number] => Boolean(role)),
      );

      return {
        id: profile.id,
        email: profile.email ?? "",
        firstName: profile.first_name ?? names.firstName,
        lastName: profile.last_name ?? names.lastName,
        documentNumber: profile.document_number,
        roles: roles.length ? roles : ["PATIENT"],
      };
    }),
    PAGE_30.size,
  );
}

export async function getAdminAuditLogs(): Promise<PageResponse<AuditLog>> {
  await requireRole(["ADMIN"]);
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE_30.size);
  if (error) throw error;
  return pageResponse((data ?? []).map(mapAuditLog), PAGE_30.size);
}

export async function getStatistics(): Promise<Statistics> {
  await requireRole(["ADMIN"]);
  const [
    users,
    patients,
    doctors,
    waitingEntries,
    medicalSlots,
    pendingOffers,
    confirmedAppointments,
    pendingAppointments,
    evaluations,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("doctors").select("id", { count: "exact", head: true }),
    supabase.from("waiting_list_entries").select("id", { count: "exact", head: true }),
    supabase.from("medical_slots").select("id", { count: "exact", head: true }),
    supabase
      .from("slot_offers")
      .select("id", { count: "exact", head: true })
      .eq("status", "PENDING"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "CONFIRMED"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .in("status", ["PENDING_CONFIRMATION", "CONFIRMED"]),
    supabase.from("priority_evaluations").select("total_score"),
  ]);

  const error =
    users.error ??
    patients.error ??
    doctors.error ??
    waitingEntries.error ??
    medicalSlots.error ??
    pendingOffers.error ??
    confirmedAppointments.error ??
    pendingAppointments.error ??
    evaluations.error;
  if (error) throw error;

  const priorityDistribution = (evaluations.data ?? []).reduce(
    (acc, item) => {
      const score = Number(item.total_score ?? 0);
      if (score >= 70) acc.high += 1;
      else if (score >= 35) acc.medium += 1;
      else acc.low += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 },
  );

  return {
    users: users.count ?? 0,
    patients: patients.count ?? 0,
    doctors: doctors.count ?? 0,
    waitingEntries: waitingEntries.count ?? 0,
    medicalSlots: medicalSlots.count ?? 0,
    pendingOffers: pendingOffers.count ?? 0,
    confirmedAppointments: confirmedAppointments.count ?? 0,
    pendingAppointments: pendingAppointments.count ?? 0,
    priorityDistribution,
  };
}

export async function getAdminPatients(search = ""): Promise<PageResponse<PatientProfile>> {
  await requireRole(["ADMIN"]);
  let query = supabase
    .from("patients")
    .select(PATIENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(100);

  const term = search.trim();
  if (term) {
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,document_number.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return pageResponse(((data ?? []) as unknown as JoinedRow[]).map(mapPatientProfile), 100);
}

export async function createAdminPatient(body: PatientProfileInput): Promise<PatientProfile> {
  await requireRole(["ADMIN"]);
  const { data, error } = await supabase
    .from("patients")
    .insert({
      first_name: body.firstName,
      last_name: body.lastName,
      document_number: body.documentNumber,
      birth_date: body.birthDate,
      sex: body.sex,
      phone: body.phone,
      address: body.address ?? null,
      district: body.district ?? null,
      email: body.email,
      disease: body.disease?.trim() || null,
      chronic_condition: body.chronicCondition ?? false,
      vulnerability_condition: body.vulnerabilityCondition ?? false,
      active: body.active ?? true,
    })
    .select(PATIENT_SELECT)
    .single();
  if (error) throw error;
  await writeAudit("PATIENT_CREATED", "patients", data.id, data);
  return mapPatientProfile(data as unknown as JoinedRow);
}

export async function updateAdminPatient(
  id: string,
  body: Partial<PatientProfileInput>,
): Promise<PatientProfile> {
  await requireRole(["ADMIN"]);
  const { data, error } = await supabase
    .from("patients")
    .update({
      first_name: body.firstName,
      last_name: body.lastName,
      document_number: body.documentNumber,
      birth_date: body.birthDate,
      sex: body.sex,
      phone: body.phone,
      address: body.address,
      district: body.district,
      email: body.email,
      disease: body.disease,
      chronic_condition: body.chronicCondition,
      vulnerability_condition: body.vulnerabilityCondition,
      active: body.active,
    })
    .eq("id", id)
    .select(PATIENT_SELECT)
    .single();
  if (error) throw error;
  await writeAudit("PATIENT_UPDATED", "patients", id, data);
  return mapPatientProfile(data as unknown as JoinedRow);
}

export async function getAdminPriorityBoard(): Promise<PageResponse<AdminPriorityRow>> {
  await requireRole(["ADMIN"]);
  const { data, error } = await supabase.rpc("get_patient_priority_board");
  if (error) throw error;

  const rows = (data ?? []).map(mapAdminPriorityRow);
  const patientIds = rows.map((row) => row.patientId);
  if (!patientIds.length) return pageResponse(rows, 100);

  const { data: waitingRows, error: waitingError } = await supabase
    .from("waiting_list_entries")
    .select("patient_id, waiting_since, specialty:specialties(name)")
    .in("patient_id", patientIds)
    .order("waiting_since", { ascending: false });
  if (waitingError) throw waitingError;

  const specialtyByPatient = new Map<string, string>();
  for (const waitingRow of (waitingRows ?? []) as Array<{
    patient_id: string | null;
    specialty?: { name?: string | null } | null;
  }>) {
    if (
      waitingRow.patient_id &&
      waitingRow.specialty?.name &&
      !specialtyByPatient.has(waitingRow.patient_id)
    ) {
      specialtyByPatient.set(waitingRow.patient_id, waitingRow.specialty.name);
    }
  }

  return pageResponse(
    rows.map((row) => ({
      ...row,
      specialty: specialtyByPatient.get(row.patientId) ?? null,
    })),
    100,
  );
}

export async function updateAdminPriority(
  patientId: string,
  body: AdminPriorityInput,
): Promise<AdminPriorityRow> {
  await requireRole(["ADMIN"]);
  const { error } = await supabase
    .from("patients")
    .update({
      disease: body.disease?.trim() || null,
      chronic_condition: body.chronicCondition,
      vulnerability_condition: body.vulnerabilityCondition,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId);
  if (error) throw error;

  await recalculateAdminPriority(patientId);
  await writeAudit("PATIENT_PRIORITY_UPDATED", "patients", patientId, body);

  const board = await getAdminPriorityBoard();
  const row = board.content.find((item) => item.patientId === patientId);
  if (!row) throw new Error("No se encontro el paciente actualizado.");
  return row;
}

export async function recalculateAdminPriority(patientId: string): Promise<AdminPriorityRow> {
  await requireRole(["ADMIN"]);
  const { error } = await supabase.rpc("recalculate_patient_priority", {
    _patient_id: patientId,
  });
  if (error) throw error;

  const board = await getAdminPriorityBoard();
  const row = board.content.find((item) => item.patientId === patientId);
  if (!row) throw new Error("No se encontro el paciente recalculado.");
  return row;
}

export async function getAdminDoctors(): Promise<PageResponse<DoctorSummary>> {
  await requireRole(["ADMIN"]);
  const { data, error } = await supabase
    .from("doctors")
    .select(DOCTOR_SELECT)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return pageResponse(((data ?? []) as unknown as JoinedRow[]).map(mapDoctorSummary), 100);
}

export async function saveAdminDoctor(body: DoctorInput & { id?: string }): Promise<DoctorSummary> {
  await requireRole(["ADMIN"]);
  await assertDoctorUnique(body);
  const payload = buildDoctorPayload(body);

  const request = body.id
    ? supabase
        .from("doctors")
        .update(payload as never)
        .eq("id", body.id)
    : supabase.from("doctors").insert(payload as never);

  const { data, error } = await request.select(DOCTOR_SELECT).single();
  if (error) throw formatDoctorSaveError(error);

  if (body.specialtyIds) {
    const specialtyIds = Array.from(new Set(body.specialtyIds));

    try {
      const { error: deleteSpecialtiesError } = await supabase
        .from("doctor_specialties")
        .delete()
        .eq("doctor_id", data.id);
      if (deleteSpecialtiesError) throw deleteSpecialtiesError;

      if (specialtyIds.length) {
        const { error: specialtyError } = await supabase.from("doctor_specialties").insert(
          specialtyIds.map((specialtyId) => ({
            doctor_id: data.id,
            specialty_id: specialtyId,
          })),
        );
        if (specialtyError) throw specialtyError;
      }
    } catch (specialtyError) {
      if (!body.id) await supabase.from("doctors").delete().eq("id", data.id);
      throw formatDoctorSaveError(specialtyError);
    }
  }

  const { data: fresh, error: freshError } = await supabase
    .from("doctors")
    .select(DOCTOR_SELECT)
    .eq("id", data.id)
    .single();
  if (freshError) throw freshError;
  await writeAudit(body.id ? "DOCTOR_UPDATED" : "DOCTOR_CREATED", "doctors", data.id, fresh);
  return mapDoctorSummary(fresh as unknown as JoinedRow);
}

export async function setDoctorActive(id: string, active: boolean): Promise<DoctorSummary> {
  return saveAdminDoctor({ id, active });
}

export async function deleteAdminDoctor(id: string): Promise<void> {
  await requireRole(["ADMIN"]);

  const { error } = await supabase.from("doctors").update({ active: false }).eq("id", id);
  if (error) throw error;

  await writeAudit("DOCTOR_DELETED", "doctors", id);
}

export async function saveSpecialty(body: CatalogInput): Promise<CatalogItem> {
  await requireRole(["ADMIN"]);
  const { address: _address, ...payload } = buildCatalogPayload(body);
  const request = body.id
    ? supabase
        .from("specialties")
        .update(payload as never)
        .eq("id", body.id)
    : supabase.from("specialties").insert(payload as never);
  const { data, error } = await request.select("id, code, name, description").single();
  if (error) throw formatCatalogSaveError(error, "una especialidad");
  await writeAudit(
    body.id ? "SPECIALTY_UPDATED" : "SPECIALTY_CREATED",
    "specialties",
    String(data.id),
    data,
  );
  return data as CatalogItem;
}

export async function saveFacility(body: CatalogInput): Promise<CatalogItem> {
  await requireRole(["ADMIN"]);
  const payload = buildCatalogPayload(body);
  const request = body.id
    ? supabase
        .from("facilities")
        .update(payload as never)
        .eq("id", body.id)
    : supabase.from("facilities").insert(payload as never);
  const { data, error } = await request.select("id, code, name, description, address").single();
  if (error) throw formatCatalogSaveError(error, "una sede");
  await writeAudit(
    body.id ? "FACILITY_UPDATED" : "FACILITY_CREATED",
    "facilities",
    String(data.id),
    data,
  );
  return data as CatalogItem;
}

function mapPatientProfile(row: JoinedRow): PatientProfile {
  // Normaliza la fila SQL para que las pantallas trabajen siempre con la misma forma de dato.
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

function mapAdminPriorityRow(row: {
  id: string;
  position: number;
  patient_name: string;
  disease: string | null;
  chronic_condition: boolean;
  vulnerability_condition: boolean;
  age: number | null;
  waiting_days: number;
  points: number;
  priority_level: "Alta" | "Media" | "Baja";
  status: AdminPriorityRow["status"];
  registered_at: string;
  is_current_patient: boolean;
}): AdminPriorityRow {
  return {
    id: row.id,
    patientId: row.id,
    specialty: null,
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
  };
}

function mapDoctorSummary(row: JoinedRow): DoctorSummary {
  const profile = row.profile as
    | { first_name?: string | null; last_name?: string | null; email?: string | null }
    | null
    | undefined;
  const facility = row.facility as { id?: number; name?: string | null } | null | undefined;
  const links =
    (row.doctor_specialties as Array<{ specialty?: CatalogItem | null }> | undefined) ?? [];

  return {
    id: row.id ?? "",
    profileId: (row.profile_id as string | null | undefined) ?? null,
    firstName: profile?.first_name ?? (row.first_name as string | null | undefined) ?? null,
    lastName: profile?.last_name ?? (row.last_name as string | null | undefined) ?? null,
    email: profile?.email ?? (row.email as string | null | undefined) ?? null,
    professionalLicense: (row.professional_license as string | null | undefined) ?? null,
    facility: facility?.name ?? null,
    facilityId: (row.facility_id as number | null | undefined) ?? facility?.id ?? null,
    specialties: links
      .map((item) => item.specialty)
      .filter((item): item is CatalogItem => Boolean(item)),
    active: (row.active as boolean | undefined) ?? true,
    createdAt: row.created_at ?? "",
  };
}
