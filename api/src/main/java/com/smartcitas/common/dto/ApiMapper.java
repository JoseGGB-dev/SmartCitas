package com.smartcitas.common.dto;

import com.smartcitas.appointment.Appointment;
import com.smartcitas.appointment.AppointmentRequest;
import com.smartcitas.appointment.PriorityEvaluation;
import com.smartcitas.appointment.SlotOffer;
import com.smartcitas.appointment.WaitingListEntry;
import com.smartcitas.audit.AuditLog;
import com.smartcitas.common.dto.ApiDtos.AppointmentRequestResponse;
import com.smartcitas.common.dto.ApiDtos.AppointmentResponse;
import com.smartcitas.common.dto.ApiDtos.AuditLogResponse;
import com.smartcitas.common.dto.ApiDtos.CatalogResponse;
import com.smartcitas.common.dto.ApiDtos.MedicalSlotResponse;
import com.smartcitas.common.dto.ApiDtos.PatientProfileResponse;
import com.smartcitas.common.dto.ApiDtos.PriorityEvaluationResponse;
import com.smartcitas.common.dto.ApiDtos.SlotOfferResponse;
import com.smartcitas.common.dto.ApiDtos.UserProfileResponse;
import com.smartcitas.common.dto.ApiDtos.UserSummaryResponse;
import com.smartcitas.common.dto.ApiDtos.WaitingListEntryResponse;
import com.smartcitas.facility.Facility;
import com.smartcitas.patient.Patient;
import com.smartcitas.role.Role;
import com.smartcitas.slot.MedicalSlot;
import com.smartcitas.specialty.Specialty;
import com.smartcitas.user.User;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

@Component
public class ApiMapper {

  public UserProfileResponse userProfile(User user) {
    return new UserProfileResponse(
        user.getId(),
        user.getSupabaseUserId(),
        user.getEmail(),
        user.getFirstName(),
        user.getLastName(),
        user.getDocumentType(),
        user.getDocumentNumber(),
        user.getPhone(),
        roleCodes(user));
  }

  public UserSummaryResponse userSummary(User user) {
    return new UserSummaryResponse(
        user.getId(),
        user.getEmail(),
        user.getFirstName(),
        user.getLastName(),
        user.getDocumentNumber(),
        roleCodes(user));
  }

  public PatientProfileResponse patient(Patient patient) {
    return new PatientProfileResponse(
        patient.getId(),
        patient.getUser().getId(),
        patient.getInsuranceNumber(),
        patient.getBirthDate(),
        patient.getSex(),
        patient.getPhone(),
        patient.getPreferredContactChannel(),
        patient.isChronicCondition(),
        patient.isActive());
  }

  public CatalogResponse specialty(Specialty specialty) {
    return new CatalogResponse(
        specialty.getId(), specialty.getCode(), specialty.getName(), specialty.getDescription(), null);
  }

  public CatalogResponse facility(Facility facility) {
    return new CatalogResponse(
        facility.getId(), facility.getCode(), facility.getName(), null, facility.getAddress());
  }

  public AppointmentRequestResponse appointmentRequest(AppointmentRequest request) {
    return new AppointmentRequestResponse(
        request.getId(),
        request.getSpecialty().getName(),
        request.getPreferredFacility() == null ? null : request.getPreferredFacility().getName(),
        request.getPreferredDateFrom(),
        request.getPreferredDateTo(),
        request.getPreferredTimeRange(),
        request.getRequestDate(),
        request.getStatus(),
        request.getCreatedAt());
  }

  public WaitingListEntryResponse waitingListEntry(
      WaitingListEntry entry, PriorityEvaluationResponse lastEvaluation) {
    User user = entry.getPatient().getUser();
    return new WaitingListEntryResponse(
        entry.getId(),
        entry.getAppointmentRequest().getId(),
        displayName(user),
        entry.getSpecialty().getName(),
        entry.getStatus(),
        entry.getWaitingSince(),
        entry.getCurrentPosition(),
        lastEvaluation);
  }

  public PriorityEvaluationResponse priorityEvaluation(PriorityEvaluation evaluation) {
    return new PriorityEvaluationResponse(
        evaluation.getId(),
        evaluation.getRulesVersion(),
        evaluation.getAgePoints(),
        evaluation.getChronicConditionPoints(),
        evaluation.getWaitingDaysPoints(),
        evaluation.getAdditionalPoints(),
        evaluation.getTotalScore(),
        evaluation.getExplanation(),
        evaluation.getEvaluatedAt());
  }

  public MedicalSlotResponse medicalSlot(MedicalSlot slot) {
    return new MedicalSlotResponse(
        slot.getId(),
        slot.getDoctor() == null || slot.getDoctor().getUser() == null
            ? "Medico por asignar"
            : displayName(slot.getDoctor().getUser()),
        slot.getFacility().getName(),
        slot.getSpecialty().getName(),
        slot.getStartDatetime(),
        slot.getEndDatetime(),
        slot.getStatus(),
        slot.getCapacity(),
        slot.getAvailableCapacity(),
        slot.getVersion());
  }

  public SlotOfferResponse slotOffer(SlotOffer offer) {
    return new SlotOfferResponse(
        offer.getId(),
        offer.getMedicalSlot().getId(),
        offer.getWaitingListEntry().getId(),
        displayName(offer.getPatient().getUser()),
        offer.getMedicalSlot().getSpecialty().getName(),
        offer.getMedicalSlot().getFacility().getName(),
        offer.getMedicalSlot().getStartDatetime(),
        offer.getStatus(),
        offer.getOfferedAt(),
        offer.getExpiresAt(),
        offer.getRespondedAt());
  }

  public AppointmentResponse appointment(Appointment appointment) {
    MedicalSlot slot = appointment.getMedicalSlot();
    return new AppointmentResponse(
        appointment.getId(),
        displayName(appointment.getPatient().getUser()),
        slot.getSpecialty().getName(),
        slot.getFacility().getName(),
        slot.getStartDatetime(),
        appointment.getStatus(),
        appointment.getConfirmationDate());
  }

  public AuditLogResponse auditLog(AuditLog log) {
    return new AuditLogResponse(
        log.getId(),
        log.getActorUser() == null ? "system" : log.getActorUser().getEmail(),
        log.getAction(),
        log.getEntityType(),
        log.getEntityId(),
        log.getPreviousValue(),
        log.getNewValue(),
        log.getCreatedAt());
  }

  private Set<com.smartcitas.role.RoleCode> roleCodes(User user) {
    return user.getRoles().stream().map(Role::getCode).collect(Collectors.toCollection(java.util.LinkedHashSet::new));
  }

  private String displayName(User user) {
    String first = user.getFirstName() == null ? "" : user.getFirstName();
    String last = user.getLastName() == null ? "" : user.getLastName();
    String full = (first + " " + last).trim();
    return full.isBlank() ? user.getEmail() : full;
  }

}
