const ACTION_LABELS: Record<string, string> = {
  APPOINTMENT_COMPLETED: "Cita completada",
  APPOINTMENT_REQUEST_CREATED: "Solicitud de cita registrada",
  DOCTOR_CREATED: "Medico registrado",
  DOCTOR_DELETED: "Medico eliminado",
  DOCTOR_UPDATED: "Actualizacion de medico",
  FACILITY_CREATED: "Sede registrada",
  FACILITY_DELETED: "Sede eliminada",
  FACILITY_UPDATED: "Actualizacion de sede",
  MEDICAL_SLOT_CREATED: "Cupo medico registrado",
  MEDICAL_SLOT_DELETED: "Cupo medico eliminado",
  MEDICAL_SLOT_RELEASED: "Cupo medico liberado",
  OFFER_ACCEPTED: "Oferta de cita aceptada",
  OFFER_REJECTED: "Oferta de cita rechazada",
  PATIENT_CREATED: "Paciente registrado",
  PATIENT_DELETED: "Paciente eliminado",
  PATIENT_PROFILE_UPDATED: "Perfil de paciente actualizado",
  PATIENT_PRIORITY_UPDATED: "Prioridad del paciente actualizada",
  PATIENT_UPDATED: "Actualizacion de paciente",
  SLOT_OFFER_CREATED: "Oferta de cita generada",
  SPECIALTY_CREATED: "Especialidad registrada",
  SPECIALTY_DELETED: "Especialidad eliminada",
  SPECIALTY_UPDATED: "Actualizacion de especialidad",
  USER_DELETED: "Usuario eliminado",
};

const ENTITY_LABELS: Record<string, string> = {
  appointment_requests: "Solicitudes de cita",
  appointments: "Citas",
  doctors: "Medicos",
  facilities: "Sedes",
  medical_slots: "Cupos medicos",
  patients: "Pacientes",
  slot_offers: "Ofertas de cita",
  specialties: "Especialidades",
  profiles: "Usuarios",
};

export function auditActionLabel(action: string) {
  return ACTION_LABELS[action] ?? humanizeCode(action);
}

export function auditEntityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] ?? humanizeCode(entityType);
}

function humanizeCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
