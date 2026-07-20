package com.smartcitas.slot;

import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MedicalSlotRepository extends JpaRepository<MedicalSlot, UUID> {

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from MedicalSlot s where s.id = :id")
  Optional<MedicalSlot> findByIdForUpdate(@Param("id") UUID id);

  @Query(
      """
      select s from MedicalSlot s
      where (:status is null or s.status = :status)
        and (:specialtyId is null or s.specialty.id = :specialtyId)
        and (:facilityId is null or s.facility.id = :facilityId)
        and (:from is null or s.startDatetime >= :from)
        and (:to is null or s.startDatetime <= :to)
      """)
  Page<MedicalSlot> search(
      MedicalSlotStatus status,
      Long specialtyId,
      Long facilityId,
      OffsetDateTime from,
      OffsetDateTime to,
      Pageable pageable);

  Page<MedicalSlot> findByDoctorUserId(UUID userId, Pageable pageable);
}
