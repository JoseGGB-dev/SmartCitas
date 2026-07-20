package com.smartcitas.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

  @Bean
  OpenAPI smartCitasOpenApi() {
    return new OpenAPI()
        .info(
            new Info()
                .title("EsSalud SmartCitas API")
                .version("v1")
                .description("Servicio de referencia para gestion de citas medicas y priorizacion basada en reglas ponderadas.")
                .license(new License().name("Uso institucional")));
  }
}
