import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, Medal, Send, XCircle } from "lucide-react";
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
  acceptOffer,
  createPatientRequest,
  getPatientAppointments,
  getPatientOffers,
  getPatientRequests,
  rejectOffer,
} from "@/lib/api/patients";
import type { AppointmentRequestCreate, SlotOffer } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/patient/dashboard")({
  component: PatientDashboard,
});

function PatientDashboard() {
  const queryClient = useQueryClient();
  const requests = useQuery({ queryKey: ["patient", "requests"], queryFn: getPatientRequests });
  const appointments = useQuery({
    queryKey: ["patient", "appointments"],
    queryFn: getPatientAppointments,
  });
  const offers = useQuery({ queryKey: ["patient", "offers"], queryFn: getPatientOffers });
  const specialties = useQuery({ queryKey: ["catalog", "specialties"], queryFn: getSpecialties });
  const facilities = useQuery({ queryKey: ["catalog", "facilities"], queryFn: getFacilities });

  const pendingOffer = useMemo(
    () => offers.data?.content.find((offer) => offer.status === "PENDING") ?? null,
    [offers.data],
  );

  const createRequestMutation = useMutation({
    mutationFn: createPatientRequest,
    onSuccess: () => {
      toast.success("Solicitud registrada");
      queryClient.invalidateQueries({ queryKey: ["patient"] });
    },
    onError: () => toast.error("No pudimos registrar la solicitud."),
  });

  const acceptMutation = useMutation({
    mutationFn: acceptOffer,
    onSuccess: () => {
      toast.success("Cita confirmada");
      queryClient.invalidateQueries({ queryKey: ["patient"] });
    },
    onError: () => toast.error("No pudimos confirmar la cita."),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectOffer,
    onSuccess: () => {
      toast.info("Oferta rechazada. El cupo se ofrecera al siguiente paciente elegible.");
      queryClient.invalidateQueries({ queryKey: ["patient"] });
    },
    onError: () => toast.error("No pudimos rechazar la oferta."),
  });

  return (
    <AppShell
      title="Portal del paciente"
      subtitle="Consulta tus solicitudes, ofertas y citas. Los puntajes completos se muestran solo al personal autorizado."
    >
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={Clock3}
          label="Solicitudes activas"
          value={requests.data?.content.length ?? 0}
        />
        <MetricCard icon={Send} label="Ofertas pendientes" value={pendingOffer ? 1 : 0} />
        <MetricCard
          icon={CalendarCheck}
          label="Citas registradas"
          value={appointments.data?.content.length ?? 0}
        />
      </section>

      {/* Entrada directa a la vista de prioridad para que el paciente la encuentre desde el inicio. */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Medal className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">Mi prioridad</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Consulta tus puntos acumulados, nivel y posicion dentro de la tabla de espera.
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/patient/priority">Ver tabla</Link>
          </Button>
        </div>
      </Card>

      {requests.isError || offers.isError || appointments.isError ? (
        <ErrorPanel
          error={requests.error ?? offers.error ?? appointments.error}
          retry={() => queryClient.invalidateQueries({ queryKey: ["patient"] })}
        />
      ) : requests.isLoading || offers.isLoading || appointments.isLoading ? (
        <LoadingPanel />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <Card className="p-5">
            <h2 className="font-bold">Nueva solicitud</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Registra una necesidad de cita. La prioridad se actualiza segun tus datos y el tiempo
              de espera.
            </p>
            {/* Formulario que alimenta la lista de espera y dispara el calculo de prioridad. */}
            <RequestForm
              disabled={createRequestMutation.isPending}
              specialties={specialties.data ?? []}
              facilities={facilities.data ?? []}
              onSubmit={(body) => createRequestMutation.mutate(body)}
            />
          </Card>

          <div className="space-y-6">
            <PendingOfferCard
              offer={pendingOffer}
              accepting={acceptMutation.isPending}
              rejecting={rejectMutation.isPending}
              onAccept={(id) => acceptMutation.mutate(id)}
              onReject={(id) => rejectMutation.mutate(id)}
            />
            <Card className="overflow-hidden p-0">
              <div className="border-b p-5">
                <h2 className="font-bold">Solicitudes recientes</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Estado persistente de tus solicitudes.
                </p>
              </div>
              {requests.data?.content.length ? (
                <div className="divide-y">
                  {requests.data.content.map((request) => (
                    <div
                      key={request.id}
                      className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <div>
                        <p className="font-semibold">{request.specialty}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {request.preferredFacility ?? "Sede flexible"} /{" "}
                          {formatDate(request.requestDate)}
                        </p>
                      </div>
                      <Badge variant="outline">{request.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5">
                  <EmptyPanel
                    title="Sin solicitudes"
                    body="Crea una solicitud para ingresar a la lista de espera."
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

function RequestForm({
  specialties,
  facilities,
  disabled,
  onSubmit,
}: {
  specialties: { id: number; name: string }[];
  facilities: { id: number; name: string }[];
  disabled: boolean;
  onSubmit: (body: AppointmentRequestCreate) => void;
}) {
  const [specialtyId, setSpecialtyId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [disease, setDisease] = useState("");
  const [chronicCondition, setChronicCondition] = useState(false);
  const [vulnerabilityCondition, setVulnerabilityCondition] = useState(false);

  return (
    <form
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!specialtyId) return;
        onSubmit({
          specialtyId: Number(specialtyId),
          preferredFacilityId: facilityId ? Number(facilityId) : undefined,
          birthDate: birthDate || undefined,
          disease: disease || undefined,
          chronicCondition,
          vulnerabilityCondition,
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="specialty">Especialidad</Label>
        <select
          id="specialty"
          required
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={specialtyId}
          onChange={(event) => setSpecialtyId(event.target.value)}
        >
          <option value="">Selecciona una especialidad</option>
          {specialties.map((specialty) => (
            <option key={specialty.id} value={specialty.id}>
              {specialty.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="facility">Sede preferida</Label>
        <select
          id="facility"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={facilityId}
          onChange={(event) => setFacilityId(event.target.value)}
        >
          <option value="">Flexible</option>
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="birth-date">Fecha de nacimiento</Label>
        <Input
          id="birth-date"
          type="date"
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="disease">Enfermedad principal</Label>
        <Input
          id="disease"
          required
          value={disease}
          onChange={(event) => setDisease(event.target.value)}
        />
      </div>
      <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={chronicCondition}
          onChange={(event) => setChronicCondition(event.target.checked)}
        />
        <span>Declaro que existe una condicion cronica registrada.</span>
      </label>
      <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={vulnerabilityCondition}
          onChange={(event) => setVulnerabilityCondition(event.target.checked)}
        />
        <span>Declaro una condicion de vulnerabilidad.</span>
      </label>
      <Button
        type="submit"
        disabled={disabled || !specialtyId || !disease}
        className="w-full gap-2"
      >
        <Send className="size-4" />
        Registrar solicitud
      </Button>
    </form>
  );
}

function PendingOfferCard({
  offer,
  accepting,
  rejecting,
  onAccept,
  onReject,
}: {
  offer: SlotOffer | null;
  accepting: boolean;
  rejecting: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (!offer) {
    return (
      <EmptyPanel
        title="Sin oferta pendiente"
        body="Cuando el sistema seleccione tu solicitud, veras aqui la opcion para confirmar o rechazar."
      />
    );
  }
  return (
    <Card className="border-primary/20 bg-primary/5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge>Oferta pendiente</Badge>
          <h2 className="mt-3 text-xl font-black">{offer.specialty}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {offer.facility} / {formatDate(offer.startDatetime)}. Responde antes de{" "}
            {formatDate(offer.expiresAt)}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            disabled={accepting || rejecting}
            onClick={() => onAccept(offer.id)}
            className="gap-2"
          >
            <CheckCircle2 className="size-4" />
            Confirmar
          </Button>
          <Button
            variant="outline"
            disabled={accepting || rejecting}
            onClick={() => onReject(offer.id)}
            className="gap-2"
          >
            <XCircle className="size-4" />
            Rechazar
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
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
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
