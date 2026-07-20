package com.smartcitas.appointment;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppointmentRequestRepository extends JpaRepository<AppointmentRequest, UUID> {
  Page<AppointmentRequest> findByPatientUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
