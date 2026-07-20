package com.smartcitas.controller;

import com.smartcitas.admin.AdminService;
import com.smartcitas.audit.AuditLogRepository;
import com.smartcitas.common.dto.ApiDtos.AuditLogResponse;
import com.smartcitas.common.dto.ApiDtos.PageResponse;
import com.smartcitas.common.dto.ApiDtos.RoleUpdateRequest;
import com.smartcitas.common.dto.ApiDtos.StatisticsResponse;
import com.smartcitas.common.dto.ApiDtos.UserSummaryResponse;
import com.smartcitas.common.dto.ApiMapper;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

  private final AdminService admin;
  private final AuditLogRepository auditLogs;
  private final ApiMapper mapper;

  public AdminController(AdminService admin, AuditLogRepository auditLogs, ApiMapper mapper) {
    this.admin = admin;
    this.auditLogs = auditLogs;
    this.mapper = mapper;
  }

  @GetMapping("/users")
  PageResponse<UserSummaryResponse> users(@RequestParam(required = false) String search, Pageable pageable) {
    return PageResponse.from(admin.searchUsers(search, pageable).map(mapper::userSummary));
  }

  @PatchMapping("/users/{id}/roles")
  UserSummaryResponse updateRoles(@PathVariable UUID id, @Valid @RequestBody RoleUpdateRequest request) {
    return mapper.userSummary(admin.updateRoles(id, request));
  }

  @GetMapping("/audit-logs")
  PageResponse<AuditLogResponse> auditLogs(
      @RequestParam(required = false) String action,
      @RequestParam(required = false) String entityType,
      Pageable pageable) {
    return PageResponse.from(auditLogs.search(action, entityType, pageable).map(mapper::auditLog));
  }

  @GetMapping("/statistics")
  StatisticsResponse statistics() {
    return admin.statistics();
  }
}
