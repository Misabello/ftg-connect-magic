import { createFileRoute } from "@tanstack/react-router";
import { Camera } from "lucide-react";

import { StagePlaceholder } from "@/components/ftg/StagePlaceholder";

export const Route = createFileRoute("/_authenticated/fotografias")({
  head: () => ({
    meta: [
      { title: "Fotografías — FTG ONE" },
      { name: "description", content: "Gestión de fotografías y recuerdos con IA." },
      { property: "og:title", content: "Fotografías — FTG ONE" },
      { property: "og:description", content: "Gestión de fotografías y recuerdos con IA." },
    ],
  }),
  component: () => (
    <StagePlaceholder
      title="Fotografías"
      description="Captura, búsqueda por código o QR y generación de recuerdos tematizados."
      stage="Etapa 4"
      icon={Camera}
      bullets={[
        "Carga de fotografías por sede, puesto, fecha y fotógrafo",
        "Búsqueda por código o QR del visitante",
        "Agente “Crear recuerdo mágico” con plantillas licenciadas",
        "Vista previa con marca de agua y comparación con el original",
        "Consentimiento explícito y política de conservación",
        "Cola de procesamiento con estados y auditoría",
      ]}
    />
  ),
});