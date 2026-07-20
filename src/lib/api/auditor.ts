import { supabase } from "@/integrations/supabase/client";
import {
  mapAuditLog,
  mapPriorityEvaluation,
  pageResponse,
  PAGE_30,
  requireRole,
} from "./supabase-api";
import type { AuditLog, PageResponse, PriorityEvaluation } from "./types";

export async function getAuditLogs(): Promise<PageResponse<AuditLog>> {
  await requireRole(["AUDITOR", "ADMIN"]);
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(PAGE_30.size);
  if (error) throw error;
  return pageResponse((data ?? []).map(mapAuditLog), PAGE_30.size);
}

export async function getPriorityEvaluations(): Promise<PageResponse<PriorityEvaluation>> {
  await requireRole(["AUDITOR", "ADMIN"]);
  const { data, error } = await supabase
    .from("priority_evaluations")
    .select("*")
    .order("evaluated_at", { ascending: false })
    .limit(PAGE_30.size);
  if (error) throw error;
  return pageResponse((data ?? []).map(mapPriorityEvaluation), PAGE_30.size);
}
