import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function isRegisteredUserError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already") ||
    (normalized.includes("email") && normalized.includes("registered"))
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [sex, setSex] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (error) {
      toast.error(getAuthErrorMessage(error.message));
      return;
    }

    toast.success("Bienvenido a SmartCitas");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{8}$/.test(documentNumber)) {
      toast.error("El DNI debe tener 8 digitos.");
      return;
    }
    if (!/^\+?\d{7,15}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Ingresa un telefono valido.");
      return;
    }
    if (password.length < 8) {
      toast.error("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          document_type: "DNI",
          document_number: documentNumber.trim(),
          sex: sex || null,
          phone: phone.trim(),
          address: address.trim() || null,
          district: district.trim() || null,
        },
      },
    });

    if (error) {
      if (isRegisteredUserError(error.message)) {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        setLoading(false);
        if (!loginError) {
          toast.success("Sesion iniciada correctamente");
          navigate({ to: "/dashboard", replace: true });
          return;
        }

        toast.error(getAuthErrorMessage(error.message));
        return;
      }

      setLoading(false);
      toast.error(getAuthErrorMessage(error.message));
      return;
    }

    setLoading(false);
    if (data.session) {
      toast.success("Cuenta creada correctamente");
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      toast.error("La cuenta fue creada, pero Supabase todavia solicita confirmacion de correo.");
      return;
    }

    toast.success("Cuenta creada correctamente");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-foreground p-10 text-background lg:flex lg:flex-col lg:justify-between">
        <Brand className="relative z-10 text-white [&_span_span:last-child]:text-white/55" />

        <div className="relative z-10 mx-auto max-w-xl py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75">
            <ShieldCheck className="size-3.5 text-primary-glow" /> Acceso seguro
          </div>
          <h1 className="mt-7 text-5xl font-black leading-[1.08] text-white">
            Gestiona la lista de espera con una vision clara y priorizada.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/60">
            Administra solicitudes, prioridad, agenda medica y trazabilidad desde una plataforma
            centralizada.
          </p>

          <div className="mt-10 space-y-4">
            {[
              [ClipboardList, "Priorizacion desacoplada de la interfaz"],
              [CheckCircle2, "Criterios visibles y trazabilidad de cada decision"],
              [LockKeyhole, "Autenticacion administrada mediante Supabase Auth"],
            ].map(([Icon, text]) => {
              const FeatureIcon = Icon as typeof ClipboardList;
              return (
                <div key={text as string} className="flex items-center gap-3 text-sm text-white/75">
                  <span className="grid size-9 place-items-center rounded-xl bg-white/8 text-primary-glow">
                    <FeatureIcon className="size-4" />
                  </span>
                  <span>{text as string}</span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-xs leading-5 text-white/40">
          Plataforma de gestion de citas medicas.
        </p>
      </section>

      <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Brand />
            <Link to="/" aria-label="Volver al inicio">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
          </div>

          <div className="mb-7 hidden lg:block">
            <p className="text-sm font-semibold text-primary">EsSalud SmartCitas</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Bienvenido</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Inicia sesion o crea una cuenta para gestionar tus citas.
            </p>
          </div>

          <Card className="p-5 shadow-[var(--shadow-card)] sm:p-7">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar sesion</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                  <EmailField email={email} setEmail={setEmail} id="signin-email" />
                  <PasswordField
                    password={password}
                    setPassword={setPassword}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    id="signin-password"
                    autoComplete="current-password"
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Iniciar sesion
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="Nombres" value={firstName} onChange={setFirstName} />
                    <TextField label="Apellidos" value={lastName} onChange={setLastName} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField label="DNI" value={documentNumber} onChange={setDocumentNumber} />
                    <TextField label="Telefono" value={phone} onChange={setPhone} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sex">Sexo</Label>
                    <select
                      id="sex"
                      required
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={sex}
                      onChange={(event) => setSex(event.target.value)}
                    >
                      <option value="">Seleccionar</option>
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                      <option value="O">Otro</option>
                    </select>
                  </div>
                  <TextField label="Direccion" value={address} onChange={setAddress} />
                  <TextField label="Distrito" value={district} onChange={setDistrict} />
                  <EmailField email={email} setEmail={setEmail} id="signup-email" />
                  <PasswordField
                    password={password}
                    setPassword={setPassword}
                    showPassword={showPassword}
                    setShowPassword={setShowPassword}
                    id="signup-password"
                    autoComplete="new-password"
                  />
                  <p className="text-xs leading-5 text-muted-foreground">
                    Usa al menos 8 caracteres para proteger tu cuenta.
                  </p>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Crear cuenta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            <Link
              to="/"
              className="inline-flex items-center gap-1 font-medium hover:text-foreground hover:underline"
            >
              <ArrowLeft className="size-3" /> Volver al inicio
            </Link>
          </p>
        </div>
      </main>
    </div>
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

type EmailFieldProps = {
  email: string;
  setEmail: (value: string) => void;
  id: string;
};

function EmailField({ email, setEmail, id }: EmailFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Correo electronico</Label>
      <Input
        id={id}
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="nombre@correo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
    </div>
  );
}

type PasswordFieldProps = {
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  id: string;
  autoComplete: "current-password" | "new-password";
};

function PasswordField({
  password,
  setPassword,
  showPassword,
  setShowPassword,
  id,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Contrasena</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          placeholder="Minimo 8 caracteres"
          className="pr-11"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          type="button"
          aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
          aria-pressed={showPassword}
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-0 top-0 grid h-full w-11 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
