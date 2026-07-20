package com.smartcitas.appointment;

import com.smartcitas.common.AuditedUuidEntity;
import com.smartcitas.facility.Facility;
import com.smartcitas.patient.Patient;
import com.smartcitas.specialty.Specialty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "appointment_requests")
public class AppointmentRequest extends AuditedUuidEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "patient_id", nullable = false)
  private Patient patient;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "specialty_id", nullable = false)
  private Specialty specialty;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "preferred_facility_id")
  private Facility preferredFacility;

  @Column(name = "preferred_date_from")
  private LocalDate preferredDateFrom;

  @Column(name = "preferred_date_to")
  private LocalDate preferredDateTo;

  @Column(name = "preferred_time_range")
  private String preferredTimeRange;

  @Column(name = "request_date", nullable = false)
  private OffsetDateTime requestDate;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AppointmentRequestStatus status = AppointmentRequestStatus.WAITING;
}
