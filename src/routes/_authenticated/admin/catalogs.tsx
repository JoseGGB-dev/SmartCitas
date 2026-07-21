import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ListPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ErrorPanel, LoadingPanel } from "@/components/data-states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteFacility, deleteSpecialty, saveFacility, saveSpecialty } from "@/lib/api/admin";
import { getFacilities, getSpecialties } from "@/lib/api/catalogs";
import type { CatalogInput, CatalogItem } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/admin/catalogs")({
  component: AdminCatalogsPage,
});

function AdminCatalogsPage() {
  const queryClient = useQueryClient();
  const specialties = useQuery({ queryKey: ["catalog", "specialties"], queryFn: getSpecialties });
  const facilities = useQuery({ queryKey: ["catalog", "facilities"], queryFn: getFacilities });
  const [specialty, setSpecialty] = useState<CatalogItem | null>(null);
  const [facility, setFacility] = useState<CatalogItem | null>(null);

  const saveSpecialtyMutation = useMutation({
    mutationFn: saveSpecialty,
    onSuccess: () => {
      toast.success("Especialidad guardada");
      setSpecialty(null);
      queryClient.invalidateQueries({ queryKey: ["catalog", "specialties"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No pudimos guardar la especialidad.");
    },
  });

  const saveFacilityMutation = useMutation({
    mutationFn: saveFacility,
    onSuccess: () => {
      toast.success("Sede guardada");
      setFacility(null);
      queryClient.invalidateQueries({ queryKey: ["catalog", "facilities"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No pudimos guardar la sede.");
    },
  });

  const deleteSpecialtyMutation = useMutation({
    mutationFn: deleteSpecialty,
    onSuccess: () => {
      toast.success("Especialidad eliminada");
      setSpecialty(null);
      queryClient.invalidateQueries({ queryKey: ["catalog", "specialties"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No pudimos eliminar la especialidad.");
    },
  });

  const deleteFacilityMutation = useMutation({
    mutationFn: deleteFacility,
    onSuccess: () => {
      toast.success("Sede eliminada");
      setFacility(null);
      queryClient.invalidateQueries({ queryKey: ["catalog", "facilities"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No pudimos eliminar la sede.");
    },
  });

  return (
    <AppShell
      title="Gestion de catalogos"
      subtitle="Administra especialidades y sedes disponibles para solicitudes y cupos medicos."
    >
      <section className="grid gap-6 xl:grid-cols-2">
        <CatalogSection
          icon="specialty"
          title="Especialidades"
          items={specialties.data ?? []}
          loading={specialties.isLoading}
          error={specialties.error}
          selected={specialty}
          onSelect={setSpecialty}
          onDelete={(id) => deleteSpecialtyMutation.mutate(id)}
          onSubmit={(body) => saveSpecialtyMutation.mutate(body)}
          saving={saveSpecialtyMutation.isPending || deleteSpecialtyMutation.isPending}
        />
        <CatalogSection
          icon="facility"
          title="Sedes"
          items={facilities.data ?? []}
          loading={facilities.isLoading}
          error={facilities.error}
          selected={facility}
          onSelect={setFacility}
          onDelete={(id) => deleteFacilityMutation.mutate(id)}
          onSubmit={(body) => saveFacilityMutation.mutate(body)}
          saving={saveFacilityMutation.isPending || deleteFacilityMutation.isPending}
          withAddress
        />
      </section>
    </AppShell>
  );
}

function CatalogSection({
  icon,
  title,
  items,
  loading,
  error,
  selected,
  saving,
  withAddress = false,
  onSelect,
  onDelete,
  onSubmit,
}: {
  icon: "specialty" | "facility";
  title: string;
  items: CatalogItem[];
  loading: boolean;
  error: unknown;
  selected: CatalogItem | null;
  saving: boolean;
  withAddress?: boolean;
  onSelect: (item: CatalogItem | null) => void;
  onDelete: (id: number) => void;
  onSubmit: (body: CatalogInput) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        {icon === "specialty" ? (
          <ListPlus className="size-5 text-primary" />
        ) : (
          <Building2 className="size-5 text-primary" />
        )}
        <h2 className="font-bold">{title}</h2>
      </div>
      {error ? (
        <div className="mt-4">
          <ErrorPanel error={error} />
        </div>
      ) : loading ? (
        <div className="mt-4">
          <LoadingPanel />
        </div>
      ) : (
        <div className="mt-4 divide-y rounded-md border">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.code}
                  {item.address ? ` / ${item.address}` : ""}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onSelect(item)}>
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    if (window.confirm(`Seguro que deseas eliminar ${item.name}?`)) {
                      onDelete(item.id);
                    }
                  }}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <CatalogForm
        key={selected?.id ?? title}
        selected={selected}
        saving={saving}
        withAddress={withAddress}
        onCancel={() => onSelect(null)}
        onSubmit={onSubmit}
      />
    </Card>
  );
}

function CatalogForm({
  selected,
  saving,
  withAddress,
  onCancel,
  onSubmit,
}: {
  selected: CatalogItem | null;
  saving: boolean;
  withAddress: boolean;
  onCancel: () => void;
  onSubmit: (body: CatalogInput) => void;
}) {
  const [form, setForm] = useState({
    code: selected?.code ?? "",
    name: selected?.name ?? "",
    description: selected?.description ?? "",
    address: selected?.address ?? "",
  });

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          id: selected?.id,
          code: form.code.trim().toUpperCase().replace(/\s+/g, "_"),
          name: form.name,
          description: form.description || null,
          address: withAddress ? form.address || null : null,
          active: true,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Codigo" value={form.code} onChange={(code) => setForm({ ...form, code })} />
        <Field label="Nombre" value={form.name} onChange={(name) => setForm({ ...form, name })} />
      </div>
      <Field
        label="Descripcion"
        value={form.description}
        onChange={(description) => setForm({ ...form, description })}
        required={false}
      />
      {withAddress && (
        <Field
          label="Direccion"
          value={form.address}
          onChange={(address) => setForm({ ...form, address })}
          required={false}
        />
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          Guardar
        </Button>
        {selected && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const id = label.toLowerCase();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
