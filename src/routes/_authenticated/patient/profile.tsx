import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPatientProfile, updatePatientProfile } from "@/lib/api/patients";
import type { PatientProfileInput } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/patient/profile")({
  component: PatientProfilePage,
});

function PatientProfilePage() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["patient", "profile"], queryFn: getPatientProfile });
  const update = useMutation({
    mutationFn: updatePatientProfile,
    onSuccess: () => {
      toast.success("Perfil actualizado");
      queryClient.invalidateQueries({ queryKey: ["patient", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: () => toast.error("No pudimos actualizar tu perfil."),
  });

  return (
    <AppShell
      title="Perfil del paciente"
      subtitle="Consulta y actualiza tus datos personales para mantener la informacion de contacto vigente."
    >
      {profile.isError ? (
        <ErrorPanel error={profile.error} retry={() => profile.refetch()} />
      ) : profile.isLoading ? (
        <LoadingPanel />
      ) : profile.data ? (
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" />
            <h2 className="font-bold">Datos personales</h2>
          </div>
          <ProfileForm
            saving={update.isPending}
            initial={{
              firstName: profile.data.firstName ?? "",
              lastName: profile.data.lastName ?? "",
              documentNumber: profile.data.documentNumber ?? "",
              birthDate: profile.data.birthDate ?? "",
              sex: profile.data.sex ?? "",
              phone: profile.data.phone ?? "",
              address: profile.data.address ?? "",
              district: profile.data.district ?? "",
              email: profile.data.email ?? "",
              disease: profile.data.disease ?? "",
              chronicCondition: profile.data.chronicCondition,
              vulnerabilityCondition: profile.data.vulnerabilityCondition,
              active: profile.data.active,
            }}
            onSubmit={(body) => update.mutate(body)}
          />
        </Card>
      ) : (
        <ErrorPanel
          error={new Error("No encontramos el perfil del paciente.")}
          retry={() => profile.refetch()}
        />
      )}
    </AppShell>
  );
}

function ProfileForm({
  initial,
  saving,
  onSubmit,
}: {
  initial: PatientProfileInput;
  saving: boolean;
  onSubmit: (body: PatientProfileInput) => void;
}) {
  const stableInitial = useMemo(() => initial, [initial]);
  const [form, setForm] = useState(stableInitial);

  return (
    <form
      className="mt-5 grid gap-4 lg:grid-cols-2"
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
      <Field
        label="Nombres"
        value={form.firstName}
        onChange={(firstName) => setForm({ ...form, firstName })}
      />
      <Field
        label="Apellidos"
        value={form.lastName}
        onChange={(lastName) => setForm({ ...form, lastName })}
      />
      <Field
        label="DNI"
        value={form.documentNumber}
        onChange={(documentNumber) => setForm({ ...form, documentNumber })}
      />
      <Field
        label="Fecha nacimiento"
        type="date"
        value={form.birthDate}
        onChange={(birthDate) => setForm({ ...form, birthDate })}
      />
      <div className="space-y-2">
        <Label htmlFor="sexo">Sexo</Label>
        <select
          id="sexo"
          required
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={form.sex}
          onChange={(event) => setForm({ ...form, sex: event.target.value })}
        >
          <option value="">Seleccionar</option>
          <option value="F">Femenino</option>
          <option value="M">Masculino</option>
          <option value="O">Otro</option>
        </select>
      </div>
      <Field
        label="Telefono"
        value={form.phone}
        onChange={(phone) => setForm({ ...form, phone })}
      />
      <Field
        label="Correo"
        type="email"
        value={form.email}
        onChange={(email) => setForm({ ...form, email })}
      />
      <Field
        label="Distrito"
        value={form.district ?? ""}
        onChange={(district) => setForm({ ...form, district })}
      />
      <div className="lg:col-span-2">
        <Field
          label="Direccion"
          value={form.address ?? ""}
          onChange={(address) => setForm({ ...form, address })}
        />
      </div>
      <div className="lg:col-span-2">
        <Field
          label="Enfermedad principal"
          value={form.disease ?? ""}
          onChange={(disease) => setForm({ ...form, disease })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm lg:col-span-2">
        <input
          type="checkbox"
          checked={form.chronicCondition ?? false}
          onChange={(event) => setForm({ ...form, chronicCondition: event.target.checked })}
        />
        Condicion cronica
      </label>
      <label className="flex items-center gap-2 text-sm lg:col-span-2">
        <input
          type="checkbox"
          checked={form.vulnerabilityCondition ?? false}
          onChange={(event) => setForm({ ...form, vulnerabilityCondition: event.target.checked })}
        />
        Condicion de vulnerabilidad
      </label>
      <div className="lg:col-span-2">
        <Button type="submit" disabled={saving}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function Field({
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
