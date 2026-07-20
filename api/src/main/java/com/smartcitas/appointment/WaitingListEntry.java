package com.smartcitas.appointment;

import com.smartcitas.common.AuditedUuidEntity;
import com.smartcitas.patient.Patient;
import com.smartcitas.specialty.Specialty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "waiting_list_entries")
public class WaitingListEntry extends AuditedUuidEntity {

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "appointment_request_id", nullable = false)
  private AppointmentRequest appointmentRequest;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "patient_id", nullable = false)
  private Patient patient;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "specialty_id", nullable = false)
  private Specialty specialty;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private WaitingListStatus status = WaitingListStatus.ACTIVE;

  @Column(name = "waiting_since", nullable = false)
  private OffsetDateTime waitingSince;

  @Column(name = "current_position")
  private Integer currentPosition;
}
