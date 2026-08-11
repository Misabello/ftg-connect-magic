import { createFileRoute } from "@tanstack/react-router";

import { SyncCenter } from "@/components/ftg/sync/SyncCenter";

export const Route = createFileRoute("/_authenticated/sincronizacion")({
  head: () => ({
    meta: [
      { title: "Centro de sincronización — FTG ONE" },
      {
        name: "description",
        content: "Estado de la jornada offline: operaciones pendientes, lotes enviados, errores y exportación de emergencia.",
      },
      { property: "og:title", content: "Centro de sincronización — FTG ONE" },
      { property: "og:description", content: "Sincronizá las operaciones del día del punto de venta con un solo clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SyncPage,
});

function SyncPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Centro de sincronización</h1>
        <p className="text-muted-foreground">
          Subí a la base central todas las operaciones pendientes de este punto de venta con un solo clic.
        </p>
      </div>
      <SyncCenter />
    </div>
  );
}
