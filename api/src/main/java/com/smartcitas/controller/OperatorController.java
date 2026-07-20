package com.smartcitas.controller;

import com.smartcitas.appointment.AppointmentService;
import com.smartcitas.appointment.PriorityEvaluationRepository;
import com.smartcitas.appointment.SlotOfferService;
import com.smartcitas.appointment.WaitingListEntryRepository;
import com.smartcitas.appointment.WaitingListStatus;
import com.smartcitas.common.dto.ApiDtos.AppointmentResponse;
import com.smartcitas.common.dto.ApiDtos.MedicalSlotCreateRequest;
import com.smartcitas.common.dto.ApiDtos.MedicalSlotResponse;
import com.smartcitas.common.dto.ApiDtos.MedicalSlotUpdateRequest;
import com.smartcitas.common.dto.ApiDtos.PageResponse;
import com.smartcitas.common.dto.ApiDtos.SlotOfferResponse;
import com.smartcitas.common.dto.ApiDtos.WaitingListEntryResponse;
import com.smartcitas.common.dto.ApiMapper;
import com.smartcitas.slot.MedicalSlotService;
import com.smartcitas.slot.MedicalSlotStatus;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/operator")
@PreAuthorize("hasAnyRole('OPERATOR','ADMIN')")
public class OperatorController {

  private final WaitingListEntryRepository waitingList;
  private final PriorityEvaluationRepository evaluations;
  private final MedicalSlotService slots;
  private final SlotOfferService offers;
  private final AppointmentService appointments;
  private final ApiMapper mapper;

  public OperatorController(
      WaitingListEntryRepository waitingList,
      PriorityEvaluationRepository evaluations,
      MedicalSlotService slots,
      SlotOfferService offers,
      AppointmentService appointments,
      ApiMapper mapper) {
    this.waitingList = waitingList;
    this.evaluations = evaluations;
    this.slots = slots;
    this.offers = offers;
    this.appointments = appointments;
    this.mapper = mapper;
  }

  @GetMapping("/waiting-list")
  PageResponse<WaitingListEntryResponse> waitingList(
      @RequestParam(required = false) WaitingListStatus status,
      @RequestParam(required = false) Long specialtyId,
      Pageable pageable) {
    return PageResponse.from(
        waitingList.search(status, specialtyId, pageable).map(entry -> mapper.waitingListEntry(entry, latestEvaluation(entry.getId()))));
  }

  @GetMapping("/medical-slots")
  PageResponse<MedicalSlotResponse> medicalSlots(
      @RequestParam(required = false) MedicalSlotStatus status,
      @RequestParam(required = false) Long specialtyId,
      @RequestParam(required = false) Long facilityId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
      Pageable pageable) {
    return PageResponse.from(slots.search(status, specialtyId, facilityId, from, to, pageable).map(mapper::medicalSlot));
  }

  @PostMapping("/medical-slots")
  MedicalSlotResponse createSlot(@Valid @RequestBody MedicalSlotCreateRequest request) {
    return mapper.medicalSlot(slots.create(request));
  }

  @PatchMapping("/medical-slots/{id}")
  MedicalSlotResponse updateSlot(@PathVariable UUID id, @Valid @RequestBody MedicalSlotUpdateRequest request) {
    return mapper.medicalSlot(slots.update(id, request));
  }

  @PostMapping("/medical-slots/{id}/release")
  MedicalSlotResponse release(@PathVariable UUID id) {
    return mapper.medicalSlot(slots.release(id));
  }

  @PostMapping("/medical-slots/{id}/assign-next")
  SlotOfferResponse assignNext(@PathVariable UUID id) {
    return offers.assignNext(id).map(mapper::slotOffer).orElse(null);
  }

  @GetMapping("/appointments")
  PageResponse<AppointmentResponse> appointments(Pageable pageable) {
    return PageResponse.from(appointments.listAll(pageable).map(mapper::appointment));
  }

  private com.smartcitas.common.dto.ApiDtos.PriorityEvaluationResponse latestEvaluation(UUID entryId) {
    return evaluations
        .findByWaitingListEntryId(entryId, PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "evaluatedAt")))
        .stream()
        .findFirst()
        .map(mapper::priorityEvaluation)
        .orElse(null);
  }
}
