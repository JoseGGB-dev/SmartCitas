import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/api/auth";
import type { RoleCode } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type DashboardPath =
  | "/patient/dashboard"
  | "/patient/profile"
  | "/patient/priority"
  | "/operator/dashboard"
  | "/doctor/dashboard"
  | "/auditor/dashboard"
  | "/admin/dashboard"
  | "/admin/patients"
  | "/admin/priorities"
  | "/admin/doctors"
  | "/admin/catalogs";

const ROLE_NAV: Record<
  RoleCode,
  { to: DashboardPath; label: string; icon: typeof LayoutDashboard }[]
> = {
  PATIENT: [
    { to: "/patient/dashboard", label: "Paciente", icon: CalendarClock },
    { to: "/patient/profile", label: "Perfil", icon: UsersRound },
    { to: "/patient/priority", label: "Prioridad", icon: ClipboardList },
  ],
  OPERATOR: [{ to: "/operator/dashboard", label: "Operador", icon: ClipboardList }],
  DOCTOR: [{ to: "/doctor/dashboard", label: "Medico", icon: Stethoscope }],
  AUDITOR: [{ to: "/auditor/dashboard", label: "Auditoria", icon: ShieldCheck }],
  ADMIN: [
    { to: "/admin/dashboard", label: "Admin", icon: LayoutDashboard },
    { to: "/admin/patients", label: "Pacientes", icon: UsersRound },
    { to: "/admin/priorities", label: "Prioridades", icon: ClipboardList },
    { to: "/admin/doctors", label: "Medicos", icon: Stethoscope },
    { to: "/admin/catalogs", label: "Catalogos", icon: ClipboardList },
  ],
};

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, retry: 1 });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const roles = me.data?.roles ?? [];
  const navItems = roles.flatMap((role) => ROLE_NAV[role] ?? []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <Brand compact className="sm:hidden" />
          <Brand className="hidden sm:inline-flex" />
          <div className="flex items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="max-w-56 truncate text-sm font-semibold">
                {me.data?.email ?? "Cargando usuario"}
              </p>
              <p className="text-xs text-muted-foreground">{roles.join(" / ") || "Sin rol"}</p>
            </div>
            <Badge
              variant="outline"
              className="hidden border-primary/20 bg-primary/5 text-primary sm:inline-flex"
            >
              Sistema de citas
            </Badge>
            <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Cerrar sesion</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <nav className="grid gap-2 rounded-lg border bg-card p-2 shadow-[var(--shadow-card)]">
            {navItems.length === 0 ? (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                Sin roles operativos asignados.
              </div>
            ) : (
              navItems.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })
            )}
          </nav>
          <div className="mt-4 rounded-lg border border-warning/25 bg-warning/8 p-3 text-xs leading-5 text-muted-foreground">
            Acceso protegido por roles. La informacion se consulta segun los permisos asignados.
          </div>
        </aside>

        <main className="min-w-0 space-y-6">
          <section className="rounded-lg border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="size-5 text-primary" />
                  <p className="text-sm font-semibold text-primary">EsSalud SmartCitas</p>
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
              </div>
              <Badge className="w-fit">Operativo</Badge>
            </div>
          </section>
          {children}
        </main>
      </div>
    </div>
  );
}
