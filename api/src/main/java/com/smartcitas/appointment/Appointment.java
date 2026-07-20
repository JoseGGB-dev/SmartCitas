package com.smartcitas.appointment;

import com.smartcitas.common.AuditedUuidEntity;
import com.smartcitas.patient.Patient;
import com.smartcitas.slot.MedicalSlot;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "appointments")
public class Appointment extends AuditedUuidEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "patient_id", nullable = false)
  private Patient patient;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "medical_slot_id", nullable = false)
  private MedicalSlot medicalSlot;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "appointment_request_id")
  private AppointmentRequest appointmentRequest;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AppointmentStatus status = AppointmentStatus.CONFIRMED;

  @Column(name = "confirmation_date")
  private OffsetDateTime confirmationDate;

  @Column(name = "cancellation_date")
  private OffsetDateTime cancellationDate;

  @Column(name = "cancellation_reason")
  private String cancellationReason;

  @Column(name = "idempotency_key")
  private String idempotencyKey;
}
