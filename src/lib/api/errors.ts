import type { ApiErrorPayload } from "./types";

export class ApiError extends Error {
  status: number;
  code: string;
  details: string[];

  constructor(payload: ApiErrorPayload | null, fallbackStatus: number) {
    super(payload?.message ?? "No pudimos completar la operacion. Intentalo nuevamente");
    this.name = "ApiError";
    this.status = payload?.status ?? fallbackStatus;
    this.code = payload?.error ?? "REQUEST_ERROR";
    this.details = payload?.details ?? [];
  }
}

export function friendlyApiMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Tu sesion expiro. Inicia sesion nuevamente.";
    if (error.status === 403) return "No tienes permisos para realizar esta accion.";
    if (error.status === 404) return "No encontramos el registro solicitado.";
    return error.message;
  }
  return "No pudimos completar la operacion. Intentalo nuevamente.";
}
