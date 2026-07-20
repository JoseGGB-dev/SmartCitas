package com.smartcitas.controller;

import com.smartcitas.appointment.AppointmentRequestService;
import com.smartcitas.appointment.AppointmentService;
import com.smartcitas.appointment.SlotOfferService;
import com.smartcitas.common.dto.ApiDtos.AppointmentRequestCreateRequest;
import com.smartcitas.common.dto.ApiDtos.AppointmentRequestResponse;
import com.smartcitas.common.dto.ApiDtos.AppointmentResponse;
import com.smartcitas.common.dto.ApiDtos.PageResponse;
import com.smartcitas.common.dto.ApiDtos.SlotOfferResponse;
import com.smartcitas.common.dto.ApiMapper;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/patient")
@PreAuthorize("hasRole('PATIENT')")
public class PatientController {

  private final AppointmentRequestService requests;
  private final AppointmentService appointments;
  private final SlotOfferService offers;
  private final ApiMapper mapper;

  public PatientController(
      AppointmentRequestService requests,
      AppointmentService appointments,
      SlotOfferService offers,
      ApiMapper mapper) {
    this.requests = requests;
    this.appointments = appointments;
    this.offers = offers;
    this.mapper = mapper;
  }

  @PostMapping("/appointment-requests")
  AppointmentRequestResponse createRequest(@Valid @RequestBody AppointmentRequestCreateRequest request) {
    return mapper.appointmentRequest(requests.create(request));
  }

  @GetMapping("/appointment-requests")
  PageResponse<AppointmentRequestResponse> appointmentRequests(Pageable pageable) {
    return PageResponse.from(requests.listMine(pageable).map(mapper::appointmentRequest));
  }

  @GetMapping("/appointment-requests/{id}")
  AppointmentRequestResponse appointmentRequest(@PathVariable UUID id) {
    return mapper.appointmentRequest(requests.getMine(id));
  }

  @GetMapping("/appointments")
  PageResponse<AppointmentResponse> appointments(Pageable pageable) {
    return PageResponse.from(appointments.listMine(pageable).map(mapper::appointment));
  }

  @GetMapping("/offers")
  PageResponse<SlotOfferResponse> offers(Pageable pageable) {
    return PageResponse.from(offers.listMine(pageable).map(mapper::slotOffer));
  }

  @PostMapping("/offers/{id}/accept")
  AppointmentResponse accept(@PathVariable UUID id, @RequestHeader("Idempotency-Key") String idempotencyKey) {
    return mapper.appointment(offers.accept(id, idempotencyKey));
  }

  @PostMapping("/offers/{id}/reject")
  SlotOfferResponse reject(@PathVariable UUID id) {
    return offers.reject(id).map(mapper::slotOffer).orElse(null);
  }
}
