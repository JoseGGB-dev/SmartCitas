package com.smartcitas.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "smartcitas.supabase")
public record SupabaseProperties(String url, String jwtIssuer, String jwtAudience) {}
