import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, HeartPulse, Medal, TrendingUp, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPatientPriority } from "@/lib/api/patients";
import type { PatientPriorityRow } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/patient/priority")({
  component: PatientPriorityPage,
});

function PatientPriorityPage() {
  const priority = useQuery({ queryKey: ["patient", "priority"], queryFn: getPatientPriority });

  return (
    <AppShell
      title="Mi prioridad"
      subtitle="Consulta tus puntos acumulados, nivel de prioridad y posicion actual en la tabla de espera."
    >
      {priority.isError ? (
        <ErrorPanel error={priority.error} retry={() => priority.refetch()} />
      ) : priority.isLoading ? (
        <LoadingPanel />
      ) : (
        <PriorityContent rows={priority.data?.content ?? []} />
      )}
    </AppShell>
  );
}

function PriorityContent({ rows }: { rows: PatientPriorityRow[] }) {
  const mine = rows.find((row) => row.isCurrentPatient) ?? null;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={UserRound} label="Paciente" value={mine?.patientName ?? "Sin registro"} />
        <MetricCard icon={HeartPulse} label="Enfermedad" value={mine?.disease ?? "Sin registro"} />
        <MetricCard icon={TrendingUp} label="Puntos acumulados" value={`${mine?.points ?? 0}`} />
        <MetricCard
          icon={ClipboardList}
          label="Nivel de prioridad"
          value={mine?.priorityLevel ?? "-"}
        />
        <MetricCard icon={Medal} label="Posicion actual" value={mine ? `${mine.position}` : "-"} />
      </section>

      <Card className="p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <StatusItem label="Condicion cronica" value={mine?.chronicCondition ? "Si" : "No"} />
          <StatusItem
            label="Condicion de vulnerabilidad"
            value={mine?.vulnerabilityCondition ? "Si" : "No"}
          />
          <StatusItem label="Tiempo en espera" value={`${mine?.waitingDays ?? 0} dias`} />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b p-5">
          <ClipboardList className="size-5 text-primary" />
          <h2 className="font-bold">Tabla de posiciones</h2>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Posicion</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Enfermedad</th>
                  <th className="px-4 py-3">Puntos</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  // Resalta al paciente autenticado para que ubique su puesto con rapidez.
                  <tr
                    key={row.id}
                    className={row.isCurrentPatient ? "border-t bg-primary/5" : "border-t"}
                  >
                    <td className="px-4 py-3 text-lg font-black text-primary">{row.position}</td>
                    <td className="px-4 py-3 font-semibold">
                      {row.isCurrentPatient ? row.patientName : `Paciente ${row.position}`}
                      {row.isCurrentPatient && (
                        <Badge className="ml-2" variant="outline">
                          Yo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.isCurrentPatient ? (row.disease ?? "-") : "-"}
                    </td>
                    <td className="px-4 py-3 font-black">{row.points} puntos</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{row.priorityLevel}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyPanel
              title="Sin solicitudes en espera"
              body="Cuando existan solicitudes activas, veras aqui la tabla de prioridad."
            />
          </div>
        )}
      </Card>
    </>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-black">{value}</p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}
