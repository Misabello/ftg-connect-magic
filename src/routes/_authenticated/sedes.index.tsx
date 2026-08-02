import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronRight, Store } from "lucide-react";

import { PageHeader } from "@/components/ftg/PageHeader";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/sedes/")({
  head: () => ({
    meta: [
      { title: "Sedes — FTG ONE" },
      { name: "description", content: "Sedes de Fotográfica con sus puntos de venta, cajas y cobros." },
      { property: "og:title", content: "Sedes — FTG ONE" },
      { property: "og:description", content: "Gestioná cada sede y sus puntos de venta." },
    ],
  }),
  component: SedesIndex,
});

function SedesIndex() {
  const { locations } = useScope();
  const { t } = useI18n();

  const { data: posCounts = {} } = useQuery({
    queryKey: ["pos-count-by-location"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("points_of_sale")
        .select("id, location_id")
        .eq("is_active", true);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) map[row.location_id] = (map[row.location_id] ?? 0) + 1;
      return map;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sedes"
        description="Entrá a una sede para administrar sus puntos de venta, cajas y cobros."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {locations.map((l) => (
          <Link
            key={l.id}
            to="/sedes/$locationId"
            params={{ locationId: l.id }}
            className="surface-card group flex items-center justify-between gap-4 p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {l.code} · {l.city ?? l.country_code} · {l.currency_code}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Store className="h-3.5 w-3.5" /> {posCounts[l.id] ?? 0} puntos de venta
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
