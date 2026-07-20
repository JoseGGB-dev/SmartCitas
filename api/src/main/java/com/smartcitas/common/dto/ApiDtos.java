package com.smartcitas.common.dto;

import com.smartcitas.appointment.AppointmentRequestStatus;
import com.smartcitas.appointment.AppointmentStatus;
import com.smartcitas.appointment.SlotOfferStatus;
import com.smartcitas.appointment.WaitingListStatus;
import com.smartcitas.role.RoleCode;
import com.smartcitas.slot.MedicalSlotStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;

public final class ApiDtos {

  private ApiDtos() {}

  public record PageResponse<T>(
      List<T> content, int page, int size, long totalElements, int totalPages) {
    public static <T> PageResponse<T> from(Page<T> page) {
      return new PageResponse<>(
          page.getContent(),
          page.getNumber(),
          page.getSize(),
          page.getTotalElements(),
          page.getTotalPages());
    }
  }

  public record RoleDto(RoleCode code, String name) {}

  public record UserProfileResponse(
      UUID id,
      UUID supabaseUserId,
      String email,
      String firstName,
      String lastName,
      String documentType,
      String documentNumber,
      String phone,
      Set<RoleCode> roles) {}

  public record UpdateMeRequest(
      @Size(max = 120) String firstName,
      @Size(max = 120) String lastName,
      @Size(max = 30) String documentType,
      @Size(max = 40) String documentNumber,
      @Size(max = 40) String phone) {}

  public record UserSummaryResponse(
      UUID id,
      @Email String email,
      String firstName,
      String lastName,
      String documentNumber,
      Set<RoleCode> roles) {}

  public record RoleUpdateRequest(@NotNull Set<RoleCode> roles) {}

  public record CatalogResponse(Long id, String code, String name, String description, String address) {}

  public record PatientProfileResponse(
      UUID id,
      UUID userId,
      String insuranceNumber,
      LocalDate birthDate,
      String sex,
      String phone,
      String preferredContactChannel,
      boolean chronicCondition,
      boolean active) {}

  public record AppointmentRequestCreateRequest(
      @NotNull Long specialtyId,
      Long preferredFacilityId,
      @FutureOrPresent LocalDate preferredDateFrom,
      @FutureOrPresent LocalDate preferredDateTo,
      @Size(max = 60) String preferredTimeRange,
      LocalDate birthDate,
      Boolean chronicCondition) {}

  public record AppointmentRequestResponse(
      UUID id,
      String specialty,
      String preferredFacility,
      LocalDate preferredDateFrom,
      LocalDate preferredDateTo,
      String preferredTimeRange,
      OffsetDateTime requestDate,
      AppointmentRequestStatus status,
      OffsetDateTime createdAt) {}

  public record WaitingListEntryResponse(
      UUID id,
      UUID appointmentRequestId,
      String patientName,
      String specialty,
      WaitingListStatus status,
      OffsetDateTime waitingSince,
      Integer currentPosition,
      PriorityEvaluationResponse lastEvaluation) {}

  public record PriorityEvaluationResponse(
      UUID id,
      String rulesVersion,
      BigDecimal agePoints,
      BigDecimal chronicConditionPoints,
      BigDecimal waitingDaysPoints,
      BigDecimal additionalPoints,
      BigDecimal totalScore,
      List<String> explanation,
      OffsetDateTime evaluatedAt) {}

  public record MedicalSlotCreateRequest(
      UUID doctorId,
      @NotNull Long facilityId,
      @NotNull Long specialtyId,
      @NotNull @Future OffsetDateTime startDatetime,
      @NotNull @Future OffsetDateTime endDatetime,
      @Min(1) int capacity) {}

  public record MedicalSlotUpdateRequest(
      MedicalSlotStatus status,
      @Min(0) Integer availableCapacity,
      @Future OffsetDateTime startDatetime,
      @Future OffsetDateTime endDatetime) {}

  public record MedicalSlotResponse(
      UUID id,
      String doctorName,
      String facility,
      String specialty,
      OffsetDateTime startDatetime,
      OffsetDateTime endDatetime,
      MedicalSlotStatus status,
      int capacity,
      int availableCapacity,
      int version) {}

  public record SlotOfferResponse(
      UUID id,
      UUID medicalSlotId,
      UUID waitingListEntryId,
      String patientName,
      String specialty,
      String facility,
      OffsetDateTime startDatetime,
      SlotOfferStatus status,
      OffsetDateTime offeredAt,
      OffsetDateTime expiresAt,
      OffsetDateTime respondedAt) {}

  public record AppointmentResponse(
      UUID id,
      String patientName,
      String specialty,
      String facility,
      OffsetDateTime startDatetime,
      AppointmentStatus status,
      OffsetDateTime confirmationDate) {}

  public record AuditLogResponse(
      UUID id,
      String actorEmail,
      String action,
      String entityType,
      String entityId,
      String previousValue,
      String newValue,
      OffsetDateTime createdAt) {}

  public record StatisticsResponse(
      long users,
      long waitingEntries,
      long medicalSlots,
      long pendingOffers,
      long confirmedAppointments) {}
}
