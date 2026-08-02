import { Link, createFileRoute } from "@tanstack/react-router";
import { Camera, CloudOff, LayoutDashboard, Sparkles } from "lucide-react";

import { Logo } from "@/components/ftg/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FTG ONE — Plataforma operativa de Fotográfica" },
      {
        name: "description",
        content:
          "Un solo sistema para punto de venta offline-first, operaciones de parques y eventos, administración y recuerdos fotográficos con IA.",
      },
      { property: "og:title", content: "FTG ONE — Plataforma operativa de Fotográfica" },
      {
        property: "og:description",
        content: "Un solo sistema para punto de venta offline-first, operaciones de parques y eventos, administración y recuerdos fotográficos con IA.",
      },
    ],
  }),
  component: Index,
});

const HIGHLIGHTS = [
  {
    icon: CloudOff,
    title: "POS offline-first",
    text: "Vender durante toda la jornada sin Internet y sincronizar por lotes sin duplicar operaciones.",
  },
  {
    icon: Camera,
    title: "Recuerdos fotográficos",
    text: "Capturar, buscar por código y ofrecer versiones tematizadas creadas con IA.",
  },
  {
    icon: LayoutDashboard,
    title: "Operación unificada",
    text: "Punto de venta, administración y operaciones sobre una única base de datos central.",
  },
];

function Index() {
  const { session, loading } = useAuth();

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Button asChild size="sm">
          <Link to={session ? "/inicio" : "/auth"}>{session ? "Ir a la plataforma" : "Iniciar sesión"}</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3.5 w-3.5" /> MVP · Etapa 1 disponible
        </span>
        <h1 className="mt-6 max-w-3xl text-4xl leading-tight font-semibold sm:text-5xl">
          Una sola plataforma para toda la operación de Fotográfica
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          FTG ONE reemplaza gradualmente los sistemas de punto de venta, administración y operaciones con
          módulos conectados a una base de datos central, preparados para Argentina, Brasil y Portugal.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" disabled={loading}>
            <Link to={session ? "/inicio" : "/auth"}>
              {session ? "Abrir dashboard" : "Ingresar a FTG ONE"}
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <article key={item.title} className="surface-card p-6">
              <item.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-base font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
