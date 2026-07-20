package com.smartcitas.controller;

import com.smartcitas.appointment.PriorityEvaluationRepository;
import com.smartcitas.audit.AuditLogRepository;
import com.smartcitas.common.dto.ApiDtos.AuditLogResponse;
import com.smartcitas.common.dto.ApiDtos.PageResponse;
import com.smartcitas.common.dto.ApiDtos.PriorityEvaluationResponse;
import com.smartcitas.common.dto.ApiMapper;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auditor")
@PreAuthorize("hasAnyRole('AUDITOR','ADMIN')")
public class AuditorController {

  private final AuditLogRepository auditLogs;
  private final PriorityEvaluationRepository evaluations;
  private final ApiMapper mapper;

  public AuditorController(
      AuditLogRepository auditLogs, PriorityEvaluationRepository evaluations, ApiMapper mapper) {
    this.auditLogs = auditLogs;
    this.evaluations = evaluations;
    this.mapper = mapper;
  }

  @GetMapping("/audit-logs")
  PageResponse<AuditLogResponse> auditLogs(
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String entityType,
      Pageable pageable) {
    return PageResponse.from(auditLogs.search(action, entityType, pageable).map(mapper::auditLog));
  }

  @GetMapping("/priority-evaluations")
  PageResponse<PriorityEvaluationResponse> priorityEvaluations(Pageable pageable) {
    return PageResponse.from(evaluations.findAll(pageable).map(mapper::priorityEvaluation));
  }
}
