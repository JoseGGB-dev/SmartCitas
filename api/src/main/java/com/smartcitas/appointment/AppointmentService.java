package com.smartcitas.appointment;

import com.smartcitas.audit.AuditService;
import com.smartcitas.common.BusinessRuleException;
import com.smartcitas.common.ResourceNotFoundException;
import com.smartcitas.common.StateTransitionService;
import com.smartcitas.security.CurrentUserService;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppointmentService {

  private final AppointmentRepository appointments;
  private final CurrentUserService currentUser;
  private final AuditService audit;
  private final StateTransitionService transitions;

  public AppointmentService(
      AppointmentRepository appointments,
      CurrentUserService currentUser,
      AuditService audit,
      StateTransitionService transitions) {
    this.appointments = appointments;
    this.currentUser = currentUser;
    this.audit = audit;
    this.transitions = transitions;
  }

  public Page<Appointment> listMine(Pageable pageable) {
    return appointments.findByPatientUserIdOrderByCreatedAtDesc(currentUser.requireCurrentUser().getId(), pageable);
  }

  public Page<Appointment> listForCurrentDoctor(Pageable pageable) {
    return appointments.findByMedicalSlotDoctorUserId(currentUser.requireCurrentUser().getId(), pageable);
  }

  public Page<Appointment> listAll(Pageable pageable) {
    return appointments.findAll(pageable);
  }

  @Transactional
  public Appointment complete(UUID id) {
    Appointment appointment =
        appointments.findById(id).orElseThrow(() -> new ResourceNotFoundException("Cita no encontrada"));
    if (!appointment.getMedicalSlot().getDoctor().getUser().getId().equals(currentUser.requireCurrentUser().getId())) {
      throw new ResourceNotFoundException("Cita no encontrada");
    }
    if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
      throw new BusinessRuleException("APPOINTMENT_NOT_CONFIRMABLE", "La cita no puede marcarse como completada");
    }
    transitions.assertTransition(appointment.getStatus(), AppointmentStatus.COMPLETED);
    appointment.setStatus(AppointmentStatus.COMPLETED);
    audit.record(currentUser.requireCurrentUser(), "APPOINTMENT_COMPLETED", "appointments", appointment.getId().toString(), null, "{\"completedAt\":\"" + OffsetDateTime.now() + "\"}");
    return appointment;
  }
}
