package com.smartcitas.audit;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

  @Query(
      """
      select a from AuditLog a
      where (:action is null or a.action = :action)
        and (:entityType is null or a.entityType = :entityType)
      """)
  Page<AuditLog> search(String action, String entityType, Pageable pageable);
}
