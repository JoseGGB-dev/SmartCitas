package com.smartcitas.security;

import com.smartcitas.role.Role;
import com.smartcitas.user.User;
import com.smartcitas.user.UserSynchronizationService;
import java.util.Collection;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component
public class SupabaseJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

  private final UserSynchronizationService users;

  public SupabaseJwtAuthenticationConverter(UserSynchronizationService users) {
    this.users = users;
  }

  @Override
  public AbstractAuthenticationToken convert(Jwt jwt) {
    User user = users.synchronize(jwt);
    Collection<GrantedAuthority> authorities =
        user.getRoles().stream()
            .map(Role::getCode)
            .map(code -> new SimpleGrantedAuthority("ROLE_" + code.name()))
            .map(GrantedAuthority.class::cast)
            .toList();
    return new JwtAuthenticationToken(jwt, authorities, user.getEmail());
  }
}
