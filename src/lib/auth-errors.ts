const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "El correo o la contrasena son incorrectos.",
  "Email not confirmed": "La cuenta todavia requiere confirmacion de correo.",
  "User already registered": "Ya existe una cuenta con este correo.",
  "Password should be at least 6 characters": "La contrasena debe tener al menos 6 caracteres.",
  "Signup requires a valid password": "Ingresa una contrasena valida.",
};

export function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("already") && normalized.includes("registered")) {
    return "Ya existe una cuenta con este correo.";
  }

  if (normalized.includes("password")) {
    return "Revisa la contrasena ingresada. Debe cumplir los requisitos de seguridad.";
  }

  if (normalized.includes("signup") && normalized.includes("disabled")) {
    return "El registro de nuevos usuarios esta deshabilitado en Supabase.";
  }

  return AUTH_ERROR_MESSAGES[message] ?? `No se pudo completar el registro: ${message}`;
}
