import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: Landing,
});

const modules = [
  {
    icon: UsersRound,
    title: "Pacientes",
    body: "Registro, solicitudes, perfil personal, ofertas de cita y posicion de prioridad.",
  },
  {
    icon: ClipboardList,
    title: "Operacion",
    body: "Gestion de cupos, lista de espera y asignacion del siguiente paciente elegible.",
  },
  {
    icon: Stethoscope,
    title: "Medicos",
    body: "Agenda por profesional y cierre de atenciones realizadas.",
  },
  {
    icon: ShieldCheck,
    title: "Administracion",
    body: "Control de pacientes, medicos, catalogos, estadisticas y auditoria.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Link to="/auth">
            <Button size="sm" className="gap-2">
              Ingresar <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-center lg:py-28">
          <div>
            <p className="text-sm font-semibold text-primary">EsSalud SmartCitas</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Gestion integral de citas medicas y listas de espera.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Centraliza solicitudes, cupos, prioridad, confirmaciones y auditoria en una plataforma
              conectada a Supabase con acceso protegido por roles.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  Abrir plataforma <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#modulos">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver modulos
                </Button>
              </a>
            </div>
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
                <CalendarClock className="size-6" />
              </span>
              <div>
                <p className="font-bold">Panel operativo</p>
                <p className="text-sm text-muted-foreground">Estado de atencion y disponibilidad</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                "Solicitudes activas",
                "Pacientes en espera",
                "Cupos disponibles",
                "Citas confirmadas",
              ].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm font-semibold">{item}</span>
                  <span className="h-2 w-20 rounded-full bg-primary/20" />
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section id="modulos" className="border-y bg-card/60 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className="text-2xl font-black tracking-tight">Modulos principales</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {modules.map((module) => (
                <Card key={module.title} className="p-5">
                  <module.icon className="size-6 text-primary" />
                  <h3 className="mt-4 font-bold">{module.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{module.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
