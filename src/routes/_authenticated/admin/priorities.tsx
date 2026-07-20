import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, RefreshCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getAdminPriorityBoard,
  recalculateAdminPriority,
  updateAdminPriority,
} from "@/lib/api/admin";
import type { AdminPriorityInput, AdminPriorityRow } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/admin/priorities")({
  component: AdminPrioritiesPage,
});

function AdminPrioritiesPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<AdminPriorityRow | null>(null);
  const priorities = useQuery({
    queryKey: ["admin", "priorities"],
    queryFn: getAdminPriorityBoard,
  });

  const update = useMutation({
    mutationFn: (body: AdminPriorityInput & { patientId: string }) =>
      updateAdminPriority(body.patientId, body),
    onSuccess: () => {
      toast.success("Prioridad actualizada");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "priorities"] });
      queryClient.invalidateQueries({ queryKey: ["patient", "priority"] });
    },
    onError: () => toast.error("No pudimos actualizar la prioridad."),
  });

  const recalculate = useMutation({
    mutationFn: recalculateAdminPriority,
    onSuccess: () => {
      toast.success("Prioridad recalculada");
      queryClient.invalidateQueries({ queryKey: ["admin", "priorities"] });
      queryClient.invalidateQueries({ queryKey: ["patient", "priority"] });
    },
    onError: () => toast.error("No pudimos recalcular la prioridad."),
  });

  const rows = priorities.data?.content ?? [];

  return (
    <AppShell
      title="Gestion de prioridades"
      subtitle="Administra los datos clinicos usados para calcular el ranking de pacientes."
    >
      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b p-5">
            <ClipboardList className="size-5 text-primary" />
            <div>
              <h2 className="font-bold">Tabla de prioridades</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ordenada por puntaje, tiempo de registro y posicion actual.
              </p>
            </div>
          </div>

          {priorities.isError ? (
            <div className="p-5">
              <ErrorPanel error={priorities.error} retry={() => priorities.refetch()} />
            </div>
          ) : priorities.isLoading ? (
            <div className="p-5">
              <LoadingPanel />
            </div>
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Posicion</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Edad</th>
                    <th className="px-4 py-3">Enfermedad</th>
                    <th className="px-4 py-3">Cronica</th>
                    <th className="px-4 py-3">Espera</th>
                    <th className="px-4 py-3">Puntaje</th>
                    <th className="px-4 py-3">Prioridad</th>
                    <th className="px-4 py-3">Fecha registro</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.patientId} className="border-t">
                      <td className="px-4 py-3 text-lg font-black text-primary">{row.position}</td>
                      <td className="px-4 py-3 font-semibold">{row.patientName}</td>
                      <td className="px-4 py-3">{row.age ?? "-"}</td>
                      <td className="px-4 py-3">{row.disease ?? "-"}</td>
                      <td className="px-4 py-3">{row.chronicCondition ? "Si" : "No"}</td>
                      <td className="px-4 py-3">{row.waitingDays} dias</td>
                      <td className="px-4 py-3 font-black">{row.points}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{row.priorityLevel}</Badge>
                      </td>
                      <td className="px-4 py-3">{formatDate(row.registeredAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelected(row)}>
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={recalculate.isPending}
                            onClick={() => recalculate.mutate(row.patientId)}
                          >
                            <RefreshCcw className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <EmptyPanel
                title="Sin pacientes"
                body="Cuando existan pacientes registrados, apareceran en esta tabla."
              />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-bold">{selected ? "Editar prioridad" : "Selecciona un paciente"}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Solo el administrador puede modificar datos que afectan el puntaje.
          </p>
          {selected ? (
            <PriorityForm
              key={selected.patientId}
              priority={selected}
              saving={update.isPending}
              onCancel={() => setSelected(null)}
              onSubmit={(body) => update.mutate({ ...body, patientId: selected.patientId })}
            />
          ) : (
            <div className="mt-5 rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
              Usa el boton Editar de la tabla para actualizar enfermedad, condicion cronica o
              vulnerabilidad.
            </div>
          )}
        </Card>
      </section>
    </AppShell>
  );
}

function PriorityForm({
  priority,
  saving,
  onCancel,
  onSubmit,
}: {
  priority: AdminPriorityRow;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (body: AdminPriorityInput) => void;
}) {
  const initial = useMemo<AdminPriorityInput>(
    () => ({
      disease: priority.disease ?? "",
      chronicCondition: priority.chronicCondition,
      vulnerabilityCondition: priority.vulnerabilityCondition,
    }),
    [priority],
  );
  const [form, setForm] = useState(initial);

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="disease">Enfermedad</Label>
        <Input
          id="disease"
          required
          value={form.disease ?? ""}
          onChange={(event) => setForm({ ...form, disease: event.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.chronicCondition ?? false}
          onChange={(event) => setForm({ ...form, chronicCondition: event.target.checked })}
        />
        Condicion cronica
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.vulnerabilityCondition ?? false}
          onChange={(event) => setForm({ ...form, vulnerabilityCondition: event.target.checked })}
        />
        Condicion de vulnerabilidad
      </label>
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-semibold">{priority.patientName}</p>
        <p className="mt-1 text-muted-foreground">
          Puntaje actual: {priority.points} / Prioridad {priority.priorityLevel}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          <Save className="size-4" />
          Guardar y recalcular
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(value));
}
