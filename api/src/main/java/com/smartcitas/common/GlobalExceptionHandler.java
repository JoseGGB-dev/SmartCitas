package com.smartcitas.common;

import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
    List<String> details =
        exception.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .toList();
    return build(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_ERROR",
        "Los datos enviados no son validos",
        request,
        details);
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  ResponseEntity<ApiError> notFound(ResourceNotFoundException exception, HttpServletRequest request) {
    return build(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(BusinessRuleException.class)
  ResponseEntity<ApiError> business(BusinessRuleException exception, HttpServletRequest request) {
    return build(HttpStatus.CONFLICT, exception.getCode(), exception.getMessage(), request, List.of());
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ApiError> forbidden(AccessDeniedException exception, HttpServletRequest request) {
    return build(HttpStatus.FORBIDDEN, "FORBIDDEN", "No tienes permisos para realizar esta operacion", request, List.of());
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> unexpected(Exception exception, HttpServletRequest request) {
    return build(
        HttpStatus.INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "No pudimos completar la operacion. Intentalo nuevamente",
        request,
        List.of());
  }

  private ResponseEntity<ApiError> build(
      HttpStatus status, String error, String message, HttpServletRequest request, List<String> details) {
    return ResponseEntity.status(status)
        .body(new ApiError(OffsetDateTime.now(), status.value(), error, message, request.getRequestURI(), details));
  }

  public record ApiError(
      OffsetDateTime timestamp,
      int status,
      String error,
      String message,
      String path,
      List<String> details) {}
}
