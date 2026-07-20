import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { completeAppointment, getDoctorAppointments, getDoctorSchedule } from "@/lib/api/doctor";

export const Route = createFileRoute("/_authenticated/doctor/dashboard")({
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const queryClient = useQueryClient();
  const schedule = useQuery({ queryKey: ["doctor", "schedule"], queryFn: getDoctorSchedule });
  const appointments = useQuery({
    queryKey: ["doctor", "appointments"],
    queryFn: getDoctorAppointments,
  });
  const complete = useMutation({
    mutationFn: completeAppointment,
    onSuccess: () => {
      toast.success("Cita marcada como completada");
      queryClient.invalidateQueries({ queryKey: ["doctor"] });
    },
    onError: () => toast.error("No pudimos actualizar la cita."),
  });

  return (
    <AppShell
      title="Agenda medica"
      subtitle="Consulta la agenda asignada y marca la atencion realizada con informacion minima necesaria."
    >
      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          icon={CalendarDays}
          label="Cupos asignados"
          value={schedule.data?.content.length ?? 0}
        />
        <MetricCard
          icon={Stethoscope}
          label="Citas visibles"
          value={appointments.data?.content.length ?? 0}
        />
      </section>

      {schedule.isError || appointments.isError ? (
        <ErrorPanel
          error={schedule.error ?? appointments.error}
          retry={() => queryClient.invalidateQueries({ queryKey: ["doctor"] })}
        />
      ) : schedule.isLoading || appointments.isLoading ? (
        <LoadingPanel />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="border-b p-5">
            <h2 className="font-bold">Proximas citas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No se muestran diagnosticos ni informacion clinica innecesaria.
            </p>
          </div>
          {appointments.data?.content.length ? (
            <div className="divide-y">
              {appointments.data.content.map((appointment) => (
                <div
                  key={appointment.id}
                  className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="font-semibold">{appointment.patientName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {appointment.specialty} / {appointment.facility} /{" "}
                      {formatDate(appointment.startDatetime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{appointment.status}</Badge>
                    <Button
                      size="sm"
                      disabled={appointment.status !== "CONFIRMED" || complete.isPending}
                      onClick={() => complete.mutate(appointment.id)}
                      className="gap-2"
                    >
                      <CheckCircle2 className="size-4" />
                      Completar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyPanel
                title="Sin citas asignadas"
                body="Las citas confirmadas apareceran aqui."
              />
            </div>
          )}
        </Card>
      )}
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
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
