import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarPlus, ClipboardList, Play, RefreshCcw, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getFacilities, getSpecialties } from "@/lib/api/catalogs";
import {
  assignNextPatient,
  createMedicalSlot,
  getMedicalSlots,
  getWaitingList,
  releaseMedicalSlot,
} from "@/lib/api/operator";
import type { MedicalSlotCreate } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/operator/dashboard")({
  component: OperatorDashboard,
});

function OperatorDashboard() {
  const queryClient = useQueryClient();
  const waitingList = useQuery({ queryKey: ["operator", "waiting-list"], queryFn: getWaitingList });
  const slots = useQuery({ queryKey: ["operator", "slots"], queryFn: getMedicalSlots });
  const specialties = useQuery({ queryKey: ["catalog", "specialties"], queryFn: getSpecialties });
  const facilities = useQuery({ queryKey: ["catalog", "facilities"], queryFn: getFacilities });

  const createSlot = useMutation({
    mutationFn: createMedicalSlot,
    onSuccess: (result) => {
      toast.success(
        result.offer
          ? `Cupo registrado y oferta creada para ${result.offer.patientName}`
          : "Cupo registrado. No hay pacientes elegibles por ahora.",
      );
      queryClient.invalidateQueries({ queryKey: ["operator"] });
    },
    onError: () => toast.error("No pudimos registrar el cupo."),
  });

  const assignNext = useMutation({
    mutationFn: assignNextPatient,
    onSuccess: (offer) => {
      toast.success(
        offer ? `Oferta creada para ${offer.patientName}` : "No hay pacientes elegibles.",
      );
      queryClient.invalidateQueries({ queryKey: ["operator"] });
    },
    onError: () => toast.error("No pudimos ejecutar la reasignacion."),
  });

  const releaseSlot = useMutation({
    mutationFn: releaseMedicalSlot,
    onSuccess: () => {
      toast.success("Cupo liberado");
      queryClient.invalidateQueries({ queryKey: ["operator"] });
    },
    onError: () => toast.error("No pudimos liberar el cupo."),
  });

  const activeWaiting =
    waitingList.data?.content.filter((entry) => entry.status === "ACTIVE").length ?? 0;
  const pendingOffers =
    waitingList.data?.content.filter((entry) => entry.status === "TEMPORARILY_OFFERED").length ?? 0;

  return (
    <AppShell
      title="Panel operativo"
      subtitle="Gestiona cupos, lista de espera y reasignacion con prioridad persistida en Supabase."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={UsersRound} label="Pacientes esperando" value={activeWaiting} />
        <MetricCard icon={ClipboardList} label="Ofertas en curso" value={pendingOffers} />
        <MetricCard
          icon={CalendarPlus}
          label="Cupos visibles"
          value={slots.data?.content.length ?? 0}
        />
      </section>

      {waitingList.isError || slots.isError ? (
        <ErrorPanel
          error={waitingList.error ?? slots.error}
          retry={() => queryClient.invalidateQueries({ queryKey: ["operator"] })}
        />
      ) : waitingList.isLoading || slots.isLoading ? (
        <LoadingPanel />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <Card className="p-5">
            <h2 className="font-bold">Registrar cupo</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Crea disponibilidad operativa. El sistema ofrecera el cupo al paciente elegible con
              mayor prioridad.
            </p>
            <SlotForm
              disabled={createSlot.isPending}
              specialties={specialties.data ?? []}
              facilities={facilities.data ?? []}
              onSubmit={(body) => createSlot.mutate(body)}
            />
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden p-0">
              <div className="border-b p-5">
                <h2 className="font-bold">Cupos medicos</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Libera cupos o reintenta la asignacion para cupos disponibles.
                </p>
              </div>
              {slots.data?.content.length ? (
                <div className="divide-y">
                  {slots.data.content.map((slot) => (
                    <div
                      key={slot.id}
                      className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{slot.specialty}</p>
                          <Badge variant="outline">{slot.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {slot.facility} / {formatDate(slot.startDatetime)} /{" "}
                          {slot.availableCapacity}/{slot.capacity} disponibles
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => releaseSlot.mutate(slot.id)}
                          className="gap-2"
                        >
                          <RefreshCcw className="size-4" />
                          Liberar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => assignNext.mutate(slot.id)}
                          className="gap-2"
                        >
                          <Play className="size-4" />
                          Asignar siguiente
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5">
                  <EmptyPanel
                    title="Sin cupos"
                    body="Registra un cupo para iniciar la reasignacion."
                  />
                </div>
              )}
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="border-b p-5">
                <h2 className="font-bold">Lista de espera</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  El personal puede ver el detalle explicable del calculo.
                </p>
              </div>
              {waitingList.data?.content.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Paciente</th>
                        <th className="px-4 py-3">Especialidad</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Explicacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitingList.data.content.map((entry) => (
                        <tr key={entry.id} className="border-t">
                          <td className="px-4 py-3 font-semibold">{entry.patientName}</td>
                          <td className="px-4 py-3">{entry.specialty}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{entry.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-lg font-black text-primary">
                            {entry.lastEvaluation?.totalScore ?? "Pendiente"}
                          </td>
                          <td className="px-4 py-3 text-xs leading-5 text-muted-foreground">
                            {entry.lastEvaluation?.explanation.join(" / ") ??
                              "Se calculara al asignar cupo."}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5">
                  <EmptyPanel
                    title="Sin pacientes en espera"
                    body="Las solicitudes nuevas apareceran aqui."
                  />
                </div>
              )}
            </Card>
          </div>
        </section>
      )}
    </AppShell>
  );
}

function SlotForm({
  specialties,
  facilities,
  disabled,
  onSubmit,
}: {
  specialties: { id: number; name: string }[];
  facilities: { id: number; name: string }[];
  disabled: boolean;
  onSubmit: (body: MedicalSlotCreate) => void;
}) {
  const [specialtyId, setSpecialtyId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [capacity, setCapacity] = useState(1);

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!specialtyId || !facilityId || !start || !end) return;
        onSubmit({
          specialtyId: Number(specialtyId),
          facilityId: Number(facilityId),
          startDatetime: new Date(start).toISOString(),
          endDatetime: new Date(end).toISOString(),
          capacity,
        });
      }}
    >
      <SelectField
        id="slot-specialty"
        label="Especialidad"
        value={specialtyId}
        onChange={setSpecialtyId}
        options={specialties}
      />
      <SelectField
        id="slot-facility"
        label="Sede"
        value={facilityId}
        onChange={setFacilityId}
        options={facilities}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="slot-start">Inicio</Label>
          <input
            id="slot-start"
            type="datetime-local"
            required
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slot-end">Fin</Label>
          <input
            id="slot-end"
            type="datetime-local"
            required
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="slot-capacity">Capacidad</Label>
        <input
          id="slot-capacity"
          type="number"
          min={1}
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={capacity}
          onChange={(event) => setCapacity(Number(event.target.value))}
        />
      </div>
      <Button type="submit" disabled={disabled} className="w-full gap-2">
        <CalendarPlus className="size-4" />
        Registrar cupo
      </Button>
    </form>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { id: number; name: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        required
        className="h-10 w-full rounded-md border bg-background px-3 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
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
