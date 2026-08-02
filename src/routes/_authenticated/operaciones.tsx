import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { StagePlaceholder } from "@/components/ftg/StagePlaceholder";

export const Route = createFileRoute("/_authenticated/operaciones")({
  head: () => ({
    meta: [
      { title: "Operaciones — FTG ONE" },
      { name: "description", content: "Planificación y control de parques, eventos y jornadas." },
      { property: "og:title", content: "Operaciones — FTG ONE" },
      { property: "og:description", content: "Planificación y control de parques, eventos y jornadas." },
    ],
  }),
  component: () => (
    <StagePlaceholder
      title="Operaciones"
      description="Tablero operativo, checklists de apertura y cierre, turnos e incidentes."
      stage="Etapa 5"
      icon={ClipboardList}
      bullets={[
        "Tablero: planificado, preparación, listo, en operación, incidente, cerrado",
        "Checklist de apertura y de cierre por punto de venta",
        "Asignación de personal, equipamiento y dispositivos",
        "Registro de incidentes y observaciones",
        "Apertura y cierre de jornada operativa",
        "Objetivos de venta por evento",
      ]}
    />
  ),
});