package com.smartcitas.audit;

import com.smartcitas.user.User;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

  private final AuditLogRepository auditLogs;

  public AuditService(AuditLogRepository auditLogs) {
    this.auditLogs = auditLogs;
  }

  public void record(
      User actor, String action, String entityType, String entityId, String previousValue, String newValue) {
    AuditLog log = new AuditLog();
    log.setActorUser(actor);
    log.setAction(action);
    log.setEntityType(entityType);
    log.setEntityId(entityId);
    log.setPreviousValue(previousValue);
    log.setNewValue(newValue);
    log.setCreatedAt(OffsetDateTime.now());
    auditLogs.save(log);
  }
}
