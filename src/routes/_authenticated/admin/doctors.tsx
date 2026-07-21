import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Stethoscope, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFacilities, getSpecialties } from "@/lib/api/catalogs";
import {
  deleteAdminDoctor,
  getAdminDoctors,
  saveAdminDoctor,
  setDoctorActive,
} from "@/lib/api/admin";
import type { DoctorInput, DoctorSummary } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/admin/doctors")({
  component: AdminDoctorsPage,
});

function AdminDoctorsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<DoctorSummary | null>(null);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("ALL");
  const [facilityFilter, setFacilityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const doctors = useQuery({ queryKey: ["admin", "doctors"], queryFn: getAdminDoctors });
  const specialties = useQuery({ queryKey: ["catalog", "specialties"], queryFn: getSpecialties });
  const facilities = useQuery({ queryKey: ["catalog", "facilities"], queryFn: getFacilities });

  const save = useMutation({
    mutationFn: (body: DoctorInput & { id?: string }) => saveAdminDoctor(body),
    onSuccess: () => {
      toast.success("Medico guardado");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No pudimos guardar el medico.");
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setDoctorActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] }),
    onError: () => toast.error("No pudimos actualizar el estado."),
  });

  const remove = useMutation({
    mutationFn: deleteAdminDoctor,
    onSuccess: () => {
      toast.success("Medico eliminado");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "doctors"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No pudimos eliminar el medico.");
    },
  });

  const rows = useMemo(() => doctors.data?.content ?? [], [doctors.data]);
  const filteredRows = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);
    return rows.filter((doctor) => {
      const fullName = normalizeSearch(doctorName(doctor));
      const specialtyNames = doctor.specialties.map((specialty) => specialty.name);
      const matchesSearch = !normalizedSearch || fullName.includes(normalizedSearch);
      const matchesSpecialty =
        specialtyFilter === "ALL" || specialtyNames.includes(specialtyFilter);
      const matchesFacility = facilityFilter === "ALL" || doctor.facility === facilityFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && doctor.active) ||
        (statusFilter === "INACTIVE" && !doctor.active);
      return matchesSearch && matchesSpecialty && matchesFacility && matchesStatus;
    });
  }, [facilityFilter, rows, search, specialtyFilter, statusFilter]);
  const hasFilters =
    Boolean(search.trim()) ||
    specialtyFilter !== "ALL" ||
    facilityFilter !== "ALL" ||
    statusFilter !== "ALL";

  return (
    <AppShell
      title="Gestion de medicos"
      subtitle="Administra profesionales, sedes asignadas, especialidades y estado operativo."
    >
      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden p-0">
          <div className="border-b p-5">
            <h2 className="font-bold">Medicos registrados</h2>
            <div className="mt-5 grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre o apellido"
                />
              </div>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={specialtyFilter}
                onChange={(event) => setSpecialtyFilter(event.target.value)}
              >
                <option value="ALL">Todas las especialidades</option>
                {specialties.data?.map((specialty) => (
                  <option key={specialty.id} value={specialty.name}>
                    {specialty.name}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={facilityFilter}
                onChange={(event) => setFacilityFilter(event.target.value)}
              >
                <option value="ALL">Todas las sedes</option>
                {facilities.data?.map((facility) => (
                  <option key={facility.id} value={facility.name}>
                    {facility.name}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={!hasFilters}
                onClick={() => {
                  setSearch("");
                  setSpecialtyFilter("ALL");
                  setFacilityFilter("ALL");
                  setStatusFilter("ALL");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
          {doctors.isError ? (
            <div className="p-5">
              <ErrorPanel error={doctors.error} retry={() => doctors.refetch()} />
            </div>
          ) : doctors.isLoading ? (
            <div className="p-5">
              <LoadingPanel />
            </div>
          ) : filteredRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Medico</th>
                    <th className="px-4 py-3">CMP</th>
                    <th className="px-4 py-3">Sede</th>
                    <th className="px-4 py-3">Especialidades</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((doctor) => (
                    <tr key={doctor.id} className="border-t">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{doctorName(doctor)}</p>
                        <p className="text-xs text-muted-foreground">{doctor.email ?? ""}</p>
                      </td>
                      <td className="px-4 py-3">{doctor.professionalLicense ?? "-"}</td>
                      <td className="px-4 py-3">{doctor.facility ?? "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {doctor.specialties.map((specialty) => (
                            <Badge key={specialty.id} variant="outline">
                              {specialty.name}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{doctor.active ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelected(doctor)}>
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={toggle.isPending || remove.isPending}
                            onClick={() => toggle.mutate({ id: doctor.id, active: !doctor.active })}
                          >
                            {doctor.active ? "Desactivar" : "Activar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={toggle.isPending || remove.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Seguro que deseas eliminar este medico? Solo se eliminara si no tiene cupos registrados.",
                                )
                              ) {
                                remove.mutate(doctor.id);
                              }
                            }}
                            className="gap-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            Eliminar
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
                title={hasFilters ? "No se encontraron resultados" : "Sin medicos"}
                body={
                  hasFilters
                    ? "Ajusta la busqueda o limpia los filtros para ver mas registros."
                    : "Agrega medicos para asignar cupos y agenda."
                }
              />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" />
            <h2 className="font-bold">{selected ? "Editar medico" : "Nuevo medico"}</h2>
          </div>
          <DoctorForm
            key={selected?.id ?? "new"}
            doctor={selected}
            facilities={facilities.data ?? []}
            specialties={specialties.data ?? []}
            saving={save.isPending}
            onCancel={() => setSelected(null)}
            onSubmit={(body) => save.mutate(selected ? { ...body, id: selected.id } : body)}
          />
        </Card>
      </section>
    </AppShell>
  );
}

function DoctorForm({
  doctor,
  facilities,
  specialties,
  saving,
  onCancel,
  onSubmit,
}: {
  doctor: DoctorSummary | null;
  facilities: { id: number; name: string }[];
  specialties: { id: number; name: string }[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (body: DoctorInput) => void;
}) {
  const initial = useMemo(
    () => ({
      firstName: doctor?.firstName ?? "",
      lastName: doctor?.lastName ?? "",
      email: doctor?.email ?? "",
      professionalLicense: doctor?.professionalLicense ?? "",
      facilityId: doctor?.facilityId ? String(doctor.facilityId) : "",
      specialtyIds: doctor?.specialties.map((item) => item.id) ?? [],
      active: doctor?.active ?? true,
    }),
    [doctor],
  );
  const [form, setForm] = useState(initial);

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          professionalLicense: form.professionalLicense,
          facilityId: form.facilityId ? Number(form.facilityId) : undefined,
          specialtyIds: form.specialtyIds,
          active: form.active,
        });
      }}
    >
      <TextField
        label="Nombres"
        value={form.firstName}
        onChange={(firstName) => setForm({ ...form, firstName })}
      />
      <TextField
        label="Apellidos"
        value={form.lastName}
        onChange={(lastName) => setForm({ ...form, lastName })}
      />
      <TextField
        type="email"
        label="Correo"
        value={form.email}
        onChange={(email) => setForm({ ...form, email })}
      />
      <TextField
        label="CMP"
        value={form.professionalLicense}
        onChange={(professionalLicense) => setForm({ ...form, professionalLicense })}
      />
      <div className="space-y-2">
        <Label htmlFor="facility">Sede</Label>
        <select
          id="facility"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={form.facilityId}
          onChange={(event) => setForm({ ...form, facilityId: event.target.value })}
        >
          <option value="">Sin sede</option>
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label>Especialidades</Label>
        <div className="grid gap-2 rounded-md border p-3">
          {specialties.map((specialty) => (
            <label key={specialty.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.specialtyIds.includes(specialty.id)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    specialtyIds: event.target.checked
                      ? [...form.specialtyIds, specialty.id]
                      : form.specialtyIds.filter((id) => id !== specialty.id),
                  })
                }
              />
              {specialty.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) => setForm({ ...form, active: event.target.checked })}
        />
        Medico activo
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          Guardar
        </Button>
        {doctor && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function doctorName(doctor: DoctorSummary) {
  return [doctor.firstName, doctor.lastName].filter(Boolean).join(" ") || "Sin nombre";
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}
