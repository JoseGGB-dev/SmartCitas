package com.smartcitas.appointment;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WaitingListEntryRepository extends JpaRepository<WaitingListEntry, UUID> {

  @Query(
      """
      select e from WaitingListEntry e
      where (:status is null or e.status = :status)
        and (:specialtyId is null or e.specialty.id = :specialtyId)
      """)
  Page<WaitingListEntry> search(WaitingListStatus status, Long specialtyId, Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select e from WaitingListEntry e
      where e.specialty.id = :specialtyId and e.status = :status
      """)
  List<WaitingListEntry> findEligibleForUpdate(
      @Param("specialtyId") Long specialtyId, @Param("status") WaitingListStatus status);

  Optional<WaitingListEntry> findByAppointmentRequestId(UUID appointmentRequestId);
}
