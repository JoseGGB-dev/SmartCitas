package com.smartcitas.security;

import java.util.Arrays;
import java.util.List;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(SupabaseProperties.class)
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http, SupabaseJwtAuthenticationConverter authenticationConverter)
      throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/actuator/health", "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(authenticationConverter)));

    return http.build();
  }

  @Bean
  JwtDecoder jwtDecoder(SupabaseProperties properties) {
    if (properties.jwtIssuer() == null || properties.jwtIssuer().isBlank()) {
      return token -> {
        throw new JwtException("SUPABASE_JWT_ISSUER es obligatorio para validar tokens");
      };
    }
    NimbusJwtDecoder decoder = (NimbusJwtDecoder) JwtDecoders.fromIssuerLocation(properties.jwtIssuer());
    OAuth2TokenValidator<Jwt> issuer = JwtValidators.createDefaultWithIssuer(properties.jwtIssuer());
    OAuth2TokenValidator<Jwt> audience = audienceValidator(properties.jwtAudience());
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuer, audience));
    return decoder;
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(
      org.springframework.core.env.Environment environment) {
    String configured = environment.getProperty(
        "smartcitas.cors.allowed-origins",
        "https://tu-dominio-frontend");
    CorsConfiguration config = new CorsConfiguration();
    List<String> origins =
        Arrays.stream(configured.split(",")).map(String::trim).filter(origin -> !origin.isBlank()).toList();
    config.setAllowedOrigins(origins);
    config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
    config.setExposedHeaders(List.of("Idempotency-Key"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  private OAuth2TokenValidator<Jwt> audienceValidator(String expectedAudience) {
    return jwt -> {
      if (expectedAudience == null || expectedAudience.isBlank()) {
        return OAuth2TokenValidatorResult.success();
      }
      if (jwt.getAudience().contains(expectedAudience)) {
        return OAuth2TokenValidatorResult.success();
      }
      return OAuth2TokenValidatorResult.failure(
          new OAuth2Error("invalid_token", "El token no contiene la audiencia esperada", null));
    };
  }
}
