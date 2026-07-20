package com.smartcitas.appointment;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PriorityEvaluationRepository extends JpaRepository<PriorityEvaluation, UUID> {
  Page<PriorityEvaluation> findByWaitingListEntryId(UUID waitingListEntryId, Pageable pageable);
}
