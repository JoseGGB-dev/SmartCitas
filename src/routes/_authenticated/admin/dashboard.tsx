import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAdminAuditLogs, getAdminUsers, getStatistics } from "@/lib/api/admin";
import { auditActionLabel, auditEntityLabel } from "@/lib/audit-labels";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: getAdminUsers });
  const audit = useQuery({ queryKey: ["admin", "audit"], queryFn: getAdminAuditLogs });
  const statistics = useQuery({ queryKey: ["admin", "statistics"], queryFn: getStatistics });

  return (
    <AppShell
      title="Administracion"
      subtitle="Gestiona usuarios, pacientes, medicos, catalogos, estadisticas y auditoria con control por roles."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard icon={UsersRound} label="Pacientes" value={statistics.data?.patients ?? 0} />
        <MetricCard icon={Stethoscope} label="Medicos" value={statistics.data?.doctors ?? 0} />
        <MetricCard
          icon={ClipboardList}
          label="En espera"
          value={statistics.data?.waitingEntries ?? 0}
        />
        <MetricCard
          icon={CalendarClock}
          label="Pendientes"
          value={statistics.data?.pendingAppointments ?? 0}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Realizadas"
          value={statistics.data?.confirmedAppointments ?? 0}
        />
        <MetricCard
          icon={BarChart3}
          label="Prioridad alta"
          value={statistics.data?.priorityDistribution.high ?? 0}
        />
      </section>

      {users.isError || audit.isError || statistics.isError ? (
        <ErrorPanel
          error={users.error ?? audit.error ?? statistics.error}
          retry={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}
        />
      ) : users.isLoading || audit.isLoading || statistics.isLoading ? (
        <LoadingPanel />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <Card className="overflow-hidden p-0">
            <div className="border-b p-5">
              <h2 className="font-bold">Usuarios</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Perfiles sincronizados desde Supabase Auth.
              </p>
            </div>
            {users.data?.content.length ? (
              <div className="divide-y">
                {users.data.content.map((user) => (
                  <div
                    key={user.id}
                    className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"
                  >
                    <div>
                      <p className="font-semibold">{user.email}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Sin nombre"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="outline">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyPanel
                  title="Sin usuarios"
                  body="Los usuarios apareceran al iniciar sesion con Supabase."
                />
              </div>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b p-5">
              <h2 className="font-bold">Auditoria reciente</h2>
            </div>
            {audit.data?.content.length ? (
              <div className="divide-y">
                {audit.data.content.slice(0, 10).map((item) => (
                  <div key={item.id} className="p-4">
                    <Badge variant="outline">{auditActionLabel(item.action)}</Badge>
                    <p className="mt-2 text-sm font-semibold">
                      {auditEntityLabel(item.entityType)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.actorEmail} / {formatDate(item.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyPanel
                  title="Sin eventos"
                  body="La actividad administrativa y operativa quedara trazada."
                />
              </div>
            )}
          </Card>
        </section>
      )}
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersRound;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
        </div>
        <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
