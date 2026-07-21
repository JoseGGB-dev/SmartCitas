import { supabase } from "@/integrations/supabase/client";
import { ApiError } from "./errors";
import type {
  Appointment,
  AuditLog,
  MedicalSlot,
  PageResponse,
  PriorityEvaluation,
  RoleCode,
  SlotOffer,
  UserProfile,
  WaitingListEntry,
} from "./types";

export type AppRole =
  "admin" | "auditor" | "doctor" | "operator" | "patient" | "medico" | "paciente";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
};

type SpecialtyRow = { name?: string | null };
type FacilityRow = { name?: string | null };
type UserRoleRow = { role: AppRole };
type PatientRow = {
  id: string;
  profile_id: string | null;
  disease: string | null;
  chronic_condition: boolean;
  vulnerability_condition: boolean;
  birth_date: string | null;
};
type DoctorRow = { id: string; profile_id: string };
export type JoinedRow = {
  [key: string]: unknown;
  id?: string;
  doctor_id?: string | null;
  medical_slot_id?: string;
  waiting_list_entry_id?: string;
  appointment_request_id?: string;
  actor_email?: string | null;
  action?: string;
  entity_type?: string;
  entity_id?: string | null;
  previous_value?: unknown;
  new_value?: unknown;
  facility?: FacilityRow | null;
  specialty?: SpecialtyRow | null;
  start_datetime?: string;
  end_datetime?: string;
  status?:
    | MedicalSlot["status"]
    | Appointment["status"]
    | SlotOffer["status"]
    | WaitingListEntry["status"];
  capacity?: number;
  available_capacity?: number;
  version?: number;
  doctor?: { profile?: Partial<ProfileRow> | null } | null;
  patient?: { profile?: Partial<ProfileRow> | null } | null;
  medical_slot?: {
    doctor_id?: string | null;
    specialty?: SpecialtyRow | null;
    facility?: FacilityRow | null;
    start_datetime?: string;
  } | null;
  priority_evaluations?: JoinedRow[];
  rules_version?: string;
  age_points?: number;
  chronic_condition_points?: number;
  waiting_days_points?: number;
  additional_points?: number;
  total_score?: number;
  explanation?: unknown;
  evaluated_at?: string;
  offered_at?: string;
  expires_at?: string;
  responded_at?: string | null;
  confirmation_date?: string | null;
  waiting_since?: string;
  current_position?: number | null;
  disease?: string | null;
  chronic_condition?: boolean;
  vulnerability_condition?: boolean;
  priority_points?: number;
  priority_level?: "Alta" | "Media" | "Baja";
  registered_at?: string;
  created_at?: string;
};

export const PAGE_20 = { page: 0, size: 20 };
export const PAGE_30 = { page: 0, size: 30 };

const ROLE_TO_DB: Record<RoleCode, AppRole> = {
  ADMIN: "admin",
  AUDITOR: "auditor",
  DOCTOR: "doctor",
  OPERATOR: "operator",
  PATIENT: "patient",
};

const DB_TO_ROLE: Record<string, RoleCode> = {
  admin: "ADMIN",
  auditor: "AUDITOR",
  doctor: "DOCTOR",
  operator: "OPERATOR",
  patient: "PATIENT",
  medico: "DOCTOR",
  paciente: "PATIENT",
};

export function pageResponse<T>(content: T[], size = content.length): PageResponse<T> {
  return {
    content,
    page: 0,
    size,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
  };
}

export function toRoleCode(value: unknown): RoleCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (["ADMIN", "AUDITOR", "DOCTOR", "OPERATOR", "PATIENT"].includes(normalized)) {
    return normalized as RoleCode;
  }
  return DB_TO_ROLE[normalized.toLowerCase()] ?? null;
}

export function toDbRole(role: RoleCode) {
  return ROLE_TO_DB[role];
}

export function normalizeRoles(roles: RoleCode[]): RoleCode[] {
  const uniqueRoles = Array.from(new Set(roles));
  return uniqueRoles.includes("ADMIN") ? ["ADMIN"] : uniqueRoles;
}

export function getProfileName(profile?: Partial<ProfileRow> | null) {
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.full_name ||
    profile?.email ||
    "Usuario"
  );
}

export function splitName(fullName: string | null | undefined) {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) ?? null };
}

export function mapProfile(
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  },
  profile: Partial<ProfileRow> | null,
  roles: RoleCode[],
): UserProfile {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;
  const fallbackName = profile?.full_name ?? metadataName ?? "";
  const names = splitName(fallbackName);

  const firstName = profile?.first_name ?? names.firstName;
  const lastName = profile?.last_name ?? names.lastName;
  const name = [firstName, lastName].filter(Boolean).join(" ") || fallbackName || user.email || "";

  return {
    id: user.id,
    supabaseUserId: user.id,
    email: profile?.email ?? user.email ?? "",
    name,
    firstName,
    lastName,
    documentType: profile?.document_type ?? null,
    documentNumber: profile?.document_number ?? null,
    phone: profile?.phone ?? null,
    roles: normalizeRoles(roles.length ? roles : ["PATIENT"]),
  };
}

export async function currentAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw unauthorized();
  return user;
}

export async function currentProfile() {
  const user = await currentAuthUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return { user, profile: data as ProfileRow | null };
}

export async function currentRoles(userId?: string): Promise<RoleCode[]> {
  const id = userId ?? (await currentAuthUser()).id;
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", id);
  if (error) throw error;

  return normalizeRoles(
    ((data ?? []) as UserRoleRow[])
      .map((item) => toRoleCode(item.role))
      .filter((role): role is RoleCode => Boolean(role)),
  );
}

export async function requireRole(roles: RoleCode[]) {
  const actual = await currentRoles();
  if (!roles.some((role) => actual.includes(role))) {
    throw forbidden();
  }
}

export async function getOrCreatePatient() {
  const user = await currentAuthUser();
  const { data: existing, error: existingError } = await supabase
    .from("patients")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing as PatientRow;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      profile_id: user.id,
      birth_date: null,
      disease: null,
      chronic_condition: false,
      vulnerability_condition: false,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as PatientRow;
}

export async function currentDoctor() {
  const user = await currentAuthUser();
  const { data, error } = await supabase
    .from("doctors")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data as DoctorRow | null;
}

export function mapMedicalSlot(row: JoinedRow): MedicalSlot {
  return {
    id: row.id ?? "",
    doctorName: getProfileName(row.doctor?.profile) || "Medico por asignar",
    facility: row.facility?.name ?? "Sede no registrada",
    specialty: row.specialty?.name ?? "Especialidad no registrada",
    startDatetime: row.start_datetime ?? "",
    endDatetime: row.end_datetime ?? "",
    status: (row.status as MedicalSlot["status"]) ?? "AVAILABLE",
    capacity: row.capacity ?? 0,
    availableCapacity: row.available_capacity ?? 0,
    version: row.version ?? 0,
  };
}

export function mapPriorityEvaluation(row: JoinedRow): PriorityEvaluation {
  return {
    id: row.id ?? "",
    rulesVersion: row.rules_version ?? "",
    agePoints: Number(row.age_points ?? 0),
    chronicConditionPoints: Number(row.chronic_condition_points ?? 0),
    waitingDaysPoints: Number(row.waiting_days_points ?? 0),
    additionalPoints: Number(row.additional_points ?? 0),
    totalScore: Number(row.total_score ?? 0),
    explanation: Array.isArray(row.explanation) ? row.explanation.map(String) : [],
    evaluatedAt: row.evaluated_at ?? "",
  };
}

export function mapWaitingListEntry(row: JoinedRow): WaitingListEntry {
  const evaluations = row.priority_evaluations ?? [];
  const lastEvaluation =
    evaluations
      .map(mapPriorityEvaluation)
      .sort((a: PriorityEvaluation, b: PriorityEvaluation) =>
        b.evaluatedAt.localeCompare(a.evaluatedAt),
      )[0] ?? null;

  return {
    id: row.id ?? "",
    appointmentRequestId: row.appointment_request_id ?? "",
    patientName: getProfileName(row.patient?.profile),
    specialty: row.specialty?.name ?? "Especialidad no registrada",
    status: (row.status as WaitingListEntry["status"]) ?? "ACTIVE",
    waitingSince: row.waiting_since ?? "",
    currentPosition: row.current_position ?? null,
    lastEvaluation,
  };
}

export function mapSlotOffer(row: JoinedRow): SlotOffer {
  return {
    id: row.id ?? "",
    medicalSlotId: row.medical_slot_id ?? "",
    waitingListEntryId: row.waiting_list_entry_id ?? "",
    patientName: getProfileName(row.patient?.profile),
    specialty: row.medical_slot?.specialty?.name ?? "Especialidad no registrada",
    facility: row.medical_slot?.facility?.name ?? "Sede no registrada",
    startDatetime: row.medical_slot?.start_datetime ?? row.offered_at ?? "",
    status: (row.status as SlotOffer["status"]) ?? "PENDING",
    offeredAt: row.offered_at ?? "",
    expiresAt: row.expires_at ?? "",
    respondedAt: row.responded_at ?? null,
  };
}

export function mapAppointment(row: JoinedRow): Appointment {
  return {
    id: row.id ?? "",
    patientName: getProfileName(row.patient?.profile),
    specialty: row.medical_slot?.specialty?.name ?? "Especialidad no registrada",
    facility: row.medical_slot?.facility?.name ?? "Sede no registrada",
    startDatetime: row.medical_slot?.start_datetime ?? row.confirmation_date ?? "",
    status: (row.status as Appointment["status"]) ?? "CONFIRMED",
    confirmationDate: row.confirmation_date ?? null,
  };
}

export function mapAuditLog(row: JoinedRow): AuditLog {
  return {
    id: row.id ?? "",
    actorEmail: row.actor_email ?? "sistema",
    action: row.action ?? "",
    entityType: row.entity_type ?? "",
    entityId: row.entity_id ?? null,
    previousValue: row.previous_value == null ? null : JSON.stringify(row.previous_value),
    newValue: row.new_value == null ? null : JSON.stringify(row.new_value),
    createdAt: row.created_at ?? "",
  };
}

export async function writeAudit(
  action: string,
  entityType: string,
  entityId: string | null,
  next?: unknown,
) {
  const { user, profile } = await currentProfile();
  await supabase.from("audit_logs").insert({
    actor_user_id: user.id,
    actor_email: profile?.email ?? user.email ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    new_value: (next ?? null) as never,
  });
}

export function unauthorized() {
  return new ApiError(
    {
      timestamp: new Date().toISOString(),
      status: 401,
      error: "UNAUTHORIZED",
      message: "Usuario no autenticado",
      path: "supabase",
      details: [],
    },
    401,
  );
}

export function forbidden() {
  return new ApiError(
    {
      timestamp: new Date().toISOString(),
      status: 403,
      error: "FORBIDDEN",
      message: "No tienes permisos para realizar esta accion.",
      path: "supabase",
      details: [],
    },
    403,
  );
}
