import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAdminPatient, getAdminPatients, updateAdminPatient } from "@/lib/api/admin";
import type { PatientProfile, PatientProfileInput } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/admin/patients")({
  component: AdminPatientsPage,
});

const EMPTY_FORM: PatientProfileInput = {
  firstName: "",
  lastName: "",
  documentNumber: "",
  birthDate: "",
  sex: "",
  phone: "",
  address: "",
  district: "",
  email: "",
  disease: "",
  chronicCondition: false,
  vulnerabilityCondition: false,
  active: true,
};

function AdminPatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PatientProfile | null>(null);
  const patients = useQuery({
    queryKey: ["admin", "patients", search],
    queryFn: () => getAdminPatients(search),
  });

  const save = useMutation({
    mutationFn: (body: PatientProfileInput & { id?: string }) =>
      body.id ? updateAdminPatient(body.id, body) : createAdminPatient(body),
    onSuccess: () => {
      toast.success("Paciente guardado");
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "patients"] });
    },
    onError: () => toast.error("No pudimos guardar el paciente."),
  });

  const rows = patients.data?.content ?? [];

  return (
    <AppShell
      title="Gestion de pacientes"
      subtitle="Administra pacientes registrados, completa informacion y controla su estado operativo."
    >
      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 border-b p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-bold">Pacientes registrados</h2>
              <p className="mt-1 text-sm text-muted-foreground">Busca por nombre, DNI o correo.</p>
            </div>
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar paciente"
              />
            </div>
          </div>

          {patients.isError ? (
            <div className="p-5">
              <ErrorPanel error={patients.error} retry={() => patients.refetch()} />
            </div>
          ) : patients.isLoading ? (
            <div className="p-5">
              <LoadingPanel />
            </div>
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">DNI</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Distrito</th>
                    <th className="px-4 py-3">Registro</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((patient) => (
                    <tr key={patient.id} className="border-t">
                      <td className="px-4 py-3 font-semibold">{patientName(patient)}</td>
                      <td className="px-4 py-3">{patient.documentNumber ?? "-"}</td>
                      <td className="px-4 py-3">
                        <p>{patient.phone ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">{patient.email ?? ""}</p>
                      </td>
                      <td className="px-4 py-3">{patient.district ?? "-"}</td>
                      <td className="px-4 py-3">{formatDate(patient.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{patient.active ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelected(patient)}>
                          Editar
                        </Button>
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
                body="Registra el primer paciente para iniciar la gestion."
              />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            <h2 className="font-bold">{selected ? "Editar paciente" : "Nuevo paciente"}</h2>
          </div>
          <PatientForm
            key={selected?.id ?? "new"}
            patient={selected}
            saving={save.isPending}
            onCancel={() => setSelected(null)}
            onSubmit={(body) => save.mutate(selected ? { ...body, id: selected.id } : body)}
          />
        </Card>
      </section>
    </AppShell>
  );
}

function PatientForm({
  patient,
  saving,
  onCancel,
  onSubmit,
}: {
  patient: PatientProfile | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (body: PatientProfileInput) => void;
}) {
  const initial = useMemo<PatientProfileInput>(
    () =>
      patient
        ? {
            firstName: patient.firstName ?? "",
            lastName: patient.lastName ?? "",
            documentNumber: patient.documentNumber ?? "",
            birthDate: patient.birthDate ?? "",
            sex: patient.sex ?? "",
            phone: patient.phone ?? "",
            address: patient.address ?? "",
            district: patient.district ?? "",
            email: patient.email ?? "",
            disease: patient.disease ?? "",
            chronicCondition: patient.chronicCondition,
            vulnerabilityCondition: patient.vulnerabilityCondition,
            active: patient.active,
          }
        : EMPTY_FORM,
    [patient],
  );
  const [form, setForm] = useState(initial);

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!/^\d{8}$/.test(form.documentNumber)) {
          toast.error("El DNI debe tener 8 digitos.");
          return;
        }
        if (!/^\+?\d{7,15}$/.test(form.phone.replace(/\s/g, ""))) {
          toast.error("Ingresa un telefono valido.");
          return;
        }
        onSubmit(form);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="DNI"
          value={form.documentNumber}
          onChange={(documentNumber) => setForm({ ...form, documentNumber })}
        />
        <TextField
          label="Telefono"
          value={form.phone}
          onChange={(phone) => setForm({ ...form, phone })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          type="date"
          label="Fecha nacimiento"
          value={form.birthDate}
          onChange={(birthDate) => setForm({ ...form, birthDate })}
        />
        <SelectField label="Sexo" value={form.sex} onChange={(sex) => setForm({ ...form, sex })} />
      </div>
      <TextField
        type="email"
        label="Correo"
        value={form.email}
        onChange={(email) => setForm({ ...form, email })}
      />
      <TextField
        label="Direccion"
        value={form.address ?? ""}
        onChange={(address) => setForm({ ...form, address })}
      />
      <TextField
        label="Distrito"
        value={form.district ?? ""}
        onChange={(district) => setForm({ ...form, district })}
      />
      <TextField
        label="Enfermedad principal"
        value={form.disease ?? ""}
        onChange={(disease) => setForm({ ...form, disease })}
      />
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
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) => setForm({ ...form, active: event.target.checked })}
        />
        Paciente activo
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          Guardar
        </Button>
        {patient && (
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
  const id = label.toLowerCase().replace(/\s+/g, "-");
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

function SelectField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase();
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
        <option value="F">Femenino</option>
        <option value="M">Masculino</option>
        <option value="O">Otro</option>
      </select>
    </div>
  );
}

function patientName(patient: PatientProfile) {
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ") || "Sin nombre";
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(value));
}
