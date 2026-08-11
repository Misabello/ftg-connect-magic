import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/configuracion/vacaciones")({
  head: () => ({
    meta: [
      { title: "Vacaciones y licencias — FTG ONE" },
      { name: "description", content: "Solicitudes de vacaciones, licencias y ausencias del personal FTG." },
      { property: "og:title", content: "Vacaciones y licencias — FTG ONE" },
      { property: "og:description", content: "Gestión de ausencias del personal FTG." },
    ],
  }),
  component: () => (
    <div className="surface-card p-8 text-center text-sm text-muted-foreground">
      El módulo de vacaciones y licencias se habilita en la Etapa 2, junto con la reestructuración de Administración y
      Finanzas.
    </div>
  ),
});
