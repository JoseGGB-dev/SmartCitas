package com.smartcitas.user;

import com.smartcitas.audit.AuditService;
import com.smartcitas.common.dto.ApiDtos.UpdateMeRequest;
import com.smartcitas.security.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {

  private final CurrentUserService currentUser;
  private final AuditService audit;

  public ProfileService(CurrentUserService currentUser, AuditService audit) {
    this.currentUser = currentUser;
    this.audit = audit;
  }

  public User current() {
    return currentUser.requireCurrentUser();
  }

  @Transactional
  public User updateCurrent(UpdateMeRequest request) {
    User user = currentUser.requireCurrentUser();
    user.setFirstName(request.firstName());
    user.setLastName(request.lastName());
    user.setDocumentType(request.documentType());
    user.setDocumentNumber(request.documentNumber());
    user.setPhone(request.phone());
    audit.record(user, "PROFILE_UPDATED", "users", user.getId().toString(), null, "{\"fields\":\"profile\"}");
    return user;
  }
}
