import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { PosWorkspace } from "@/components/ftg/pos/PosWorkspace";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sedes/$locationId/pos/$posId")({
  head: () => ({
    meta: [
      { title: "Caja y cobros — FTG ONE" },
      { name: "description", content: "Operá caja, catálogo y cobros del punto de venta de la sede." },
      { property: "og:title", content: "Caja y cobros — FTG ONE" },
      { property: "og:description", content: "Apertura de caja, carrito, cobros combinados y arqueo por puesto." },
    ],
  }),
  component: SedePos,
});

function SedePos() {
  const { locationId, posId } = Route.useParams();

  const { data: pos } = useQuery({
    queryKey: ["pos-single", posId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_of_sale")
        .select("id, code, name")
        .eq("id", posId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <PosWorkspace
      locationId={locationId}
      posId={posId}
      title={pos?.name ?? "Punto de venta"}
      description={`Caja, catálogo y cobros del puesto ${pos?.code ?? ""}`}
      headerActions={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sedes/$locationId" params={{ locationId }}>
            <ArrowLeft className="h-4 w-4" /> Volver a la sede
          </Link>
        </Button>
      }
    />
  );
}
