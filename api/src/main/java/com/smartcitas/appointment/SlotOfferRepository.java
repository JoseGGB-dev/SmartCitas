package com.smartcitas.appointment;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SlotOfferRepository extends JpaRepository<SlotOffer, UUID> {
  Page<SlotOffer> findByPatientUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

  boolean existsByMedicalSlotIdAndStatus(UUID medicalSlotId, SlotOfferStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select o from SlotOffer o where o.id = :id")
  Optional<SlotOffer> findByIdForUpdate(@Param("id") UUID id);
}
