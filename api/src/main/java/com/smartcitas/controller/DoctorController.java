package com.smartcitas.controller;

import com.smartcitas.appointment.AppointmentService;
import com.smartcitas.common.dto.ApiDtos.AppointmentResponse;
import com.smartcitas.common.dto.ApiDtos.MedicalSlotResponse;
import com.smartcitas.common.dto.ApiDtos.PageResponse;
import com.smartcitas.common.dto.ApiMapper;
import com.smartcitas.slot.MedicalSlotService;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/doctor")
@PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
public class DoctorController {

  private final MedicalSlotService slots;
  private final AppointmentService appointments;
  private final ApiMapper mapper;

  public DoctorController(MedicalSlotService slots, AppointmentService appointments, ApiMapper mapper) {
    this.slots = slots;
    this.appointments = appointments;
    this.mapper = mapper;
  }

  @GetMapping("/schedule")
  PageResponse<MedicalSlotResponse> schedule(Pageable pageable) {
    return PageResponse.from(slots.scheduleForCurrentDoctor(pageable).map(mapper::medicalSlot));
  }

  @GetMapping("/appointments")
  PageResponse<AppointmentResponse> appointments(Pageable pageable) {
    return PageResponse.from(appointments.listForCurrentDoctor(pageable).map(mapper::appointment));
  }

  @PatchMapping("/appointments/{id}/complete")
  AppointmentResponse complete(@PathVariable UUID id) {
    return mapper.appointment(appointments.complete(id));
  }
}
