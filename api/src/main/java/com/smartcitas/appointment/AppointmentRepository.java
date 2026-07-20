package com.smartcitas.appointment;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
  Page<Appointment> findByPatientUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

  Page<Appointment> findByMedicalSlotDoctorUserId(UUID userId, Pageable pageable);

  Optional<Appointment> findByPatientIdAndIdempotencyKey(UUID patientId, String idempotencyKey);
}
