import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Logo } from "@/components/ftg/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Ingresar — FTG ONE" },
      { name: "description", content: "Acceso al Sistema Integral de Operaciones de Fotográfica." },
      { property: "og:title", content: "Ingresar — FTG ONE" },
      { property: "og:description", content: "Acceso al Sistema Integral de Operaciones de Fotográfica." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email({ message: "Correo electrónico inválido" }).max(255),
  password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres" }).max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (session) void navigate({ to: "/inicio", replace: true });
  }, [session, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sesión iniciada");
    void navigate({ to: "/inicio", replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      ...parsed.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Cuenta creada");
      void navigate({ to: "/inicio", replace: true });
    } else {
      toast.success("Revisá tu correo para confirmar la cuenta");
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="ink-gradient hidden flex-col justify-between p-12 text-sidebar-foreground lg:flex">
        <Logo />
        <div>
          <h1 className="max-w-md text-3xl leading-tight font-semibold">
            Punto de venta, operaciones y administración en un solo lugar
          </h1>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/70">
            Diseñado para parques, acuarios, museos, ferias y eventos de Argentina y Brasil, con operación
            garantizada aun sin conexión.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">FTG ONE · MVP interno · Datos de demostración</p>
      </section>

      <section className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h2 className="mt-8 text-2xl font-semibold">Acceder</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ingresá con tu cuenta corporativa.</p>

          <Tabs defaultValue="signin" className="mt-8">
            <Button
              type="button"
              variant="outline"
              className="mb-4 w-full"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) toast.error(result.error.message ?? "No se pudo ingresar con Google");
              }}
            >
              Continuar con Google
            </Button>

            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4 pt-4" onSubmit={handleSignIn}>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@fotografica.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Ingresando…" : "Ingresar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4 pt-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre y apellido</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={100}
                    placeholder="Ana Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Correo</Label>
                  <Input
                    id="email-up"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-up">Contraseña</Label>
                  <Input
                    id="password-up"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creando…" : "Crear cuenta"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Las cuentas nuevas se crean con rol Cajero/Vendedor. Un superadministrador puede ampliar los
                  permisos desde Configuración.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}