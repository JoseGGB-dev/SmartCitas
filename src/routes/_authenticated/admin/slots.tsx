import { createFileRoute } from "@tanstack/react-router";
import { OperatorDashboard } from "../operator/dashboard";

export const Route = createFileRoute("/_authenticated/admin/slots")({
  component: AdminSlotsPage,
});

function AdminSlotsPage() {
  return (
    <OperatorDashboard
      title="Gestion de cupos"
      subtitle="Administra cupos medicos y ofertas automaticas para pacientes en lista de espera."
    />
  );
}
