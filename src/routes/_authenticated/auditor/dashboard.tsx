import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSearch, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAuditLogs, getPriorityEvaluations } from "@/lib/api/auditor";
import { auditActionLabel, auditEntityLabel } from "@/lib/audit-labels";

export const Route = createFileRoute("/_authenticated/auditor/dashboard")({
  component: AuditorDashboard,
});

function AuditorDashboard() {
  const queryClient = useQueryClient();
  const audit = useQuery({ queryKey: ["auditor", "audit"], queryFn: getAuditLogs });
  const evaluations = useQuery({
    queryKey: ["auditor", "evaluations"],
    queryFn: getPriorityEvaluations,
  });

  return (
    <AppShell
      title="Auditoria"
      subtitle="Consulta trazabilidad y evaluaciones sin modificar registros operativos."
    >
      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          icon={FileSearch}
          label="Eventos auditados"
          value={audit.data?.content.length ?? 0}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Evaluaciones"
          value={evaluations.data?.content.length ?? 0}
        />
      </section>

      {audit.isError || evaluations.isError ? (
        <ErrorPanel
          error={audit.error ?? evaluations.error}
          retry={() => queryClient.invalidateQueries({ queryKey: ["auditor"] })}
        />
      ) : audit.isLoading || evaluations.isLoading ? (
        <LoadingPanel />
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <div className="border-b p-5">
              <h2 className="font-bold">Historial de eventos</h2>
            </div>
            {audit.data?.content.length ? (
              <div className="divide-y">
                {audit.data.content.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{auditActionLabel(item.action)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">
                      {auditEntityLabel(item.entityType)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.actorEmail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyPanel
                  title="Sin auditoria"
                  body="Los cambios operativos quedaran registrados aqui."
                />
              </div>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b p-5">
              <h2 className="font-bold">Evaluaciones de prioridad</h2>
            </div>
            {evaluations.data?.content.length ? (
              <div className="divide-y">
                {evaluations.data.content.map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{item.rulesVersion}</p>
                      <span className="text-xl font-black text-primary">{item.totalScore}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {item.explanation.join(" / ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyPanel
                  title="Sin evaluaciones"
                  body="Las evaluaciones se guardan cuando el operador asigna un cupo."
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
  icon: typeof FileSearch;
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
