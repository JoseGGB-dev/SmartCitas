import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { LoadingPanel, ErrorPanel } from "@/components/data-states";
import { getMe } from "@/lib/api/auth";
import type { RoleCode } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRedirect,
});

type DashboardPath =
  | "/admin/dashboard"
  | "/auditor/dashboard"
  | "/doctor/dashboard"
  | "/operator/dashboard"
  | "/patient/dashboard";

const ROLE_DESTINATIONS: Record<RoleCode, DashboardPath> = {
  ADMIN: "/admin/dashboard",
  AUDITOR: "/auditor/dashboard",
  DOCTOR: "/doctor/dashboard",
  OPERATOR: "/operator/dashboard",
  PATIENT: "/patient/dashboard",
};

const ROLE_PRIORITY: RoleCode[] = ["ADMIN", "AUDITOR", "DOCTOR", "OPERATOR", "PATIENT"];

function DashboardRedirect() {
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, retry: 1 });

  useEffect(() => {
    if (!me.data) return;
    const role = ROLE_PRIORITY.find((candidate) => me.data.roles.includes(candidate)) ?? "PATIENT";
    navigate({ to: ROLE_DESTINATIONS[role], replace: true });
  }, [me.data, navigate]);

  if (me.isLoading) return <LoadingPanel label="Preparando tu panel" />;
  if (me.isError) return <ErrorPanel error={me.error} retry={() => me.refetch()} />;
  return <LoadingPanel label="Redirigiendo segun tu rol" />;
}
