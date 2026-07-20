package com.smartcitas.security;

import com.smartcitas.common.ResourceNotFoundException;
import com.smartcitas.user.User;
import com.smartcitas.user.UserRepository;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

  private final UserRepository users;

  public CurrentUserService(UserRepository users) {
    this.users = users;
  }

  public User requireCurrentUser() {
    Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    if (principal instanceof Jwt jwt) {
      UUID supabaseUserId = UUID.fromString(jwt.getSubject());
      return users
          .findBySupabaseUserId(supabaseUserId)
          .orElseThrow(() -> new ResourceNotFoundException("Usuario no sincronizado"));
    }
    throw new ResourceNotFoundException("Usuario no autenticado");
  }
}
