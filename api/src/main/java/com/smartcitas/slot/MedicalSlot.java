package com.smartcitas.slot;

import com.smartcitas.common.AuditedUuidEntity;
import com.smartcitas.doctor.Doctor;
import com.smartcitas.facility.Facility;
import com.smartcitas.specialty.Specialty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "medical_slots")
public class MedicalSlot extends AuditedUuidEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "doctor_id")
  private Doctor doctor;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "facility_id", nullable = false)
  private Facility facility;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "specialty_id", nullable = false)
  private Specialty specialty;

  @Column(name = "start_datetime", nullable = false)
  private OffsetDateTime startDatetime;

  @Column(name = "end_datetime", nullable = false)
  private OffsetDateTime endDatetime;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private MedicalSlotStatus status = MedicalSlotStatus.AVAILABLE;

  @Column(nullable = false)
  private int capacity;

  @Column(name = "available_capacity", nullable = false)
  private int availableCapacity;

  @Version
  private int version;
}
