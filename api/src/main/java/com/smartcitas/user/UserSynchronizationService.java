package com.smartcitas.user;

import com.smartcitas.audit.AuditService;
import com.smartcitas.common.ResourceNotFoundException;
import com.smartcitas.patient.Patient;
import com.smartcitas.patient.PatientRepository;
import com.smartcitas.role.Role;
import com.smartcitas.role.RoleCode;
import com.smartcitas.role.RoleRepository;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserSynchronizationService {

  private final UserRepository users;
  private final RoleRepository roles;
  private final PatientRepository patients;
  private final AuditService audit;

  public UserSynchronizationService(
      UserRepository users, RoleRepository roles, PatientRepository patients, AuditService audit) {
    this.users = users;
    this.roles = roles;
    this.patients = patients;
    this.audit = audit;
  }

  @Transactional
  public User synchronize(Jwt jwt) {
    UUID supabaseId = parseSupabaseId(jwt.getSubject());
    return users
        .findBySupabaseUserId(supabaseId)
        .map(existing -> updateEmailIfNeeded(existing, jwt))
        .orElseGet(() -> createFromJwt(jwt, supabaseId));
  }

  private User updateEmailIfNeeded(User user, Jwt jwt) {
    String email = emailFrom(jwt);
    if (email != null && !email.equalsIgnoreCase(user.getEmail())) {
      user.setEmail(email);
      audit.record(user, "USER_SYNCED", "users", user.getId().toString(), null, "{\"email\":\"updated\"}");
    }
    return user;
  }

  private User createFromJwt(Jwt jwt, UUID supabaseId) {
    Role patientRole =
        roles
            .findByCode(RoleCode.PATIENT)
            .orElseThrow(() -> new ResourceNotFoundException("Rol PATIENT no encontrado"));
    User user = new User();
    user.setSupabaseUserId(supabaseId);
    user.setEmail(emailFrom(jwt));
    applyNames(jwt, user);
    user.getRoles().add(patientRole);
    users.save(user);

    Patient patient = new Patient();
    patient.setUser(user);
    patient.setPhone(user.getPhone());
    patient.setPreferredContactChannel("EMAIL");
    patients.save(patient);

    audit.record(user, "USER_PROFILE_CREATED", "users", user.getId().toString(), null, "{\"source\":\"supabase\"}");
    audit.record(user, "LOGIN_SYNCED", "users", user.getId().toString(), null, "{\"provider\":\"supabase\"}");
    return user;
  }

  private void applyNames(Jwt jwt, User user) {
    Map<String, Object> metadata = jwt.getClaim("user_metadata");
    Object fullName = metadata == null ? null : metadata.get("full_name");
    String name = fullName == null ? null : fullName.toString().trim();
    if (name == null || name.isBlank()) {
      user.setFirstName("Paciente");
      user.setLastName("");
      return;
    }
    String[] parts = name.split("\\s+", 2);
    user.setFirstName(parts[0]);
    user.setLastName(parts.length > 1 ? parts[1] : "");
  }

  private String emailFrom(Jwt jwt) {
    String email = jwt.getClaimAsString("email");
    return email == null || email.isBlank() ? jwt.getSubject() + "@smartcitas.local" : email.toLowerCase();
  }

  private UUID parseSupabaseId(String subject) {
    try {
      return UUID.fromString(subject);
    } catch (IllegalArgumentException exception) {
      return UUID.nameUUIDFromBytes(subject.getBytes(StandardCharsets.UTF_8));
    }
  }
}
