export type RoleCode = "PATIENT" | "OPERATOR" | "DOCTOR" | "AUDITOR" | "ADMIN";

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type ApiErrorPayload = {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  details: string[];
};

export type UserProfile = {
  id: string;
  supabaseUserId: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  phone: string | null;
  roles: RoleCode[];
};

export type UserSummary = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  documentNumber: string | null;
  roles: RoleCode[];
};

export type PatientProfile = {
  id: string;
  profileId: string | null;
  firstName: string | null;
  lastName: string | null;
  documentNumber: string | null;
  birthDate: string | null;
  sex: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  email: string | null;
  disease: string | null;
  chronicCondition: boolean;
  vulnerabilityCondition: boolean;
  priorityPoints: number;
  priorityLevel: "Alta" | "Media" | "Baja";
  registeredAt: string;
  active: boolean;
  createdAt: string;
};

export type PatientProfileInput = {
  firstName: string;
  lastName: string;
  documentNumber: string;
  birthDate: string;
  sex: string;
  phone: string;
  address?: string;
  district?: string;
  email: string;
  disease?: string;
  chronicCondition?: boolean;
  vulnerabilityCondition?: boolean;
  active?: boolean;
};

export type DoctorSummary = {
  id: string;
  profileId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  professionalLicense: string | null;
  facility: string | null;
  facilityId: number | null;
  specialties: CatalogItem[];
  active: boolean;
  createdAt: string;
};

export type DoctorInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileId?: string;
  professionalLicense?: string;
  facilityId?: number;
  specialtyIds?: number[];
  active?: boolean;
};

export type CatalogItem = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
};

export type CatalogInput = {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  active?: boolean;
};

export type AppointmentRequestStatus =
  "DRAFT" | "SUBMITTED" | "WAITING" | "OFFERED" | "SCHEDULED" | "CANCELLED" | "CLOSED";

export type WaitingListStatus =
  "ACTIVE" | "TEMPORARILY_OFFERED" | "ASSIGNED" | "REJECTED" | "EXPIRED" | "CANCELLED";

export type MedicalSlotStatus = "AVAILABLE" | "RESERVED" | "FULL" | "CANCELLED" | "COMPLETED";

export type SlotOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";

export type AppointmentStatus =
  "PENDING_CONFIRMATION" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export type AppointmentRequest = {
  id: string;
  specialty: string;
  preferredFacility: string | null;
  preferredDateFrom: string | null;
  preferredDateTo: string | null;
  preferredTimeRange: string | null;
  requestDate: string;
  status: AppointmentRequestStatus;
  createdAt: string;
};

export type AppointmentRequestCreate = {
  specialtyId: number;
  preferredFacilityId?: number;
  preferredDateFrom?: string;
  preferredDateTo?: string;
  preferredTimeRange?: string;
  birthDate?: string;
  disease?: string;
  chronicCondition?: boolean;
  vulnerabilityCondition?: boolean;
};

export type PriorityEvaluation = {
  id: string;
  rulesVersion: string;
  agePoints: number;
  chronicConditionPoints: number;
  waitingDaysPoints: number;
  additionalPoints: number;
  totalScore: number;
  explanation: string[];
  evaluatedAt: string;
};

export type WaitingListEntry = {
  id: string;
  appointmentRequestId: string;
  patientName: string;
  specialty: string;
  status: WaitingListStatus;
  waitingSince: string;
  currentPosition: number | null;
  lastEvaluation: PriorityEvaluation | null;
};

export type MedicalSlot = {
  id: string;
  doctorName: string;
  facility: string;
  specialty: string;
  startDatetime: string;
  endDatetime: string;
  status: MedicalSlotStatus;
  capacity: number;
  availableCapacity: number;
  version: number;
};

export type MedicalSlotCreate = {
  doctorId?: string;
  facilityId: number;
  specialtyId: number;
  startDatetime: string;
  endDatetime: string;
  capacity: number;
};

export type SlotOffer = {
  id: string;
  medicalSlotId: string;
  waitingListEntryId: string;
  patientName: string;
  specialty: string;
  facility: string;
  startDatetime: string;
  status: SlotOfferStatus;
  offeredAt: string;
  expiresAt: string;
  respondedAt: string | null;
};

export type Appointment = {
  id: string;
  patientName: string;
  specialty: string;
  facility: string;
  startDatetime: string;
  status: AppointmentStatus;
  confirmationDate: string | null;
};

export type AuditLog = {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: string;
};

export type Statistics = {
  users: number;
  patients: number;
  doctors: number;
  waitingEntries: number;
  medicalSlots: number;
  pendingOffers: number;
  confirmedAppointments: number;
  pendingAppointments: number;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
};

export type PatientPriorityRow = {
  id: string;
  position: number;
  patientName: string;
  disease: string | null;
  chronicCondition: boolean;
  vulnerabilityCondition: boolean;
  age: number | null;
  waitingDays: number;
  points: number;
  priorityLevel: "Alta" | "Media" | "Baja";
  status: WaitingListStatus | "SIN_SOLICITUD";
  registeredAt: string;
  isCurrentPatient: boolean;
};

export type AdminPriorityRow = PatientPriorityRow & {
  patientId: string;
};

export type AdminPriorityInput = {
  disease?: string;
  chronicCondition?: boolean;
  vulnerabilityCondition?: boolean;
};
