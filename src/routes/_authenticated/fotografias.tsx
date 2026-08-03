import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Camera, ImageIcon, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ftg/PageHeader";
import { StatCard } from "@/components/ftg/StatCard";
import { PhotoFormDialog, type PhotoDraft } from "@/components/ftg/photos/PhotoFormDialog";
import { PhotoGrid, type PhotoRow } from "@/components/ftg/photos/PhotoGrid";
import { type TemplateRow } from "@/components/ftg/photos/SouvenirStudio";
import { MagicStudio } from "@/components/ftg/magic/MagicStudio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";
import { relativeTime } from "@/lib/ftg/format";
import {
  PHOTO_STATUS_LABEL,
  SOUVENIR_STATUS_LABEL,
  SOUVENIR_STATUS_TONE,
  retentionDate,
  type PhotoStatus,
  type SouvenirStatus,
} from "@/lib/ftg/photos";
import { addMagicItem } from "@/lib/ftg/magic-cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fotografias")({
  head: () => ({
    meta: [
      { title: "Fotografías — FTG ONE" },
      {
        name: "description",
        content: "Galería por sede, búsqueda por código de visitante y recuerdos fotográficos con IA.",
      },
      { property: "og:title", content: "Fotografías — FTG ONE" },
      {
        property: "og:description",
        content: "Carga de fotografías, consentimientos y agente de recuerdos mágicos con IA.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Fotografias,
});

type SouvenirRow = {
  id: string;
  status: SouvenirStatus;
  result_url: string | null;
  prompt_used: string | null;
  estimated_cost: number;
  created_at: string;
  photo_id: string;
  photos: { visitor_code: string } | null;
  souvenir_templates: { name: string } | null;
};

function Fotografias() {
  const { activeLocation, locations } = useScope();
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PhotoStatus | "todas">("todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [magicOpen, setMagicOpen] = useState(false);
  /** Fotografía de la galería usada como base del recuerdo mágico. */
  const [magicPhoto, setMagicPhoto] = useState<PhotoRow | null>(null);

  const locationId = activeLocation?.id ?? null;

  const photosQuery = useQuery({
    queryKey: ["photos", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select(
          "id, visitor_code, image_url, status, has_consent, photographer_name, captured_at, retention_until, ai_souvenirs(id)",
        )
        .eq("location_id", locationId!)
        .order("captured_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        visitor_code: row.visitor_code,
        image_url: row.image_url,
        status: row.status as PhotoStatus,
        has_consent: row.has_consent,
        photographer_name: row.photographer_name,
        captured_at: row.captured_at,
        retention_until: row.retention_until,
        souvenirs: (row.ai_souvenirs as { id: string }[] | null)?.length ?? 0,
      })) as PhotoRow[];
    },
  });

  const templatesQuery = useQuery({
    queryKey: ["souvenir-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("souvenir_templates")
        .select("id, code, name, description, style, prompt, license_owner")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as TemplateRow[];
    },
  });

  const souvenirsQuery = useQuery({
    queryKey: ["souvenirs", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_souvenirs")
        .select(
          "id, status, result_url, prompt_used, estimated_cost, created_at, photo_id, photos(visitor_code), souvenir_templates(name)",
        )
        .eq("location_id", locationId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as SouvenirRow[];
    },
  });

  const consentsQuery = useQuery({
    queryKey: ["photo-consents", locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photo_consents")
        .select("id, visitor_code, visitor_name, contact_email, accepts_image_use, signed_at")
        .eq("location_id", locationId!)
        .order("signed_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  /** Producto de catálogo usado al vender la fotografía sin IA. */
  const digitalPhotoQuery = useQuery({
    queryKey: ["photo-product", activeLocation?.currency_code],
    enabled: !!activeLocation,
    queryFn: async () => {
      const { data: lists } = await supabase
        .from("price_lists")
        .select("id")
        .eq("currency_code", activeLocation!.currency_code)
        .eq("is_active", true)
        .limit(1);
      const listId = lists?.[0]?.id ?? null;
      const { data: product } = await supabase
        .from("products")
        .select("id, name, sku")
        .eq("sku", "FOT-DIGITAL")
        .maybeSingle();
      if (!product) return null;
      const { data: price } = listId
        ? await supabase
            .from("product_prices")
            .select("price")
            .eq("price_list_id", listId)
            .eq("product_id", product.id)
            .maybeSingle()
        : { data: null };
      return { ...product, price: Number(price?.price ?? 0) };
    },
  });

  const photos = photosQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return photos.filter((p) => {
      const matchTerm =
        !term ||
        p.visitor_code.toLowerCase().includes(term) ||
        (p.photographer_name ?? "").toLowerCase().includes(term);
      const matchStatus = status === "todas" || p.status === status;
      return matchTerm && matchStatus;
    });
  }, [photos, search, status]);

  const createPhoto = useMutation({
    mutationFn: async (draft: PhotoDraft) => {
      if (!locationId) throw new Error("Seleccioná una sede");
      const { error } = await supabase.from("photos").insert({
        visitor_code: draft.visitor_code,
        location_id: locationId,
        image_url: draft.image_url,
        photographer_name: draft.photographer_name || null,
        photographer_id: user?.id ?? null,
        has_consent: draft.has_consent,
        retention_until: retentionDate(),
        status: "capturada",
      });
      if (error) throw error;
      if (draft.has_consent) {
        await supabase.from("photo_consents").insert({
          visitor_code: draft.visitor_code,
          location_id: locationId,
          visitor_name: draft.visitor_name || null,
          contact_email: draft.contact_email || null,
          accepts_image_use: true,
        });
      }
    },
    onSuccess: () => {
      toast.success("Fotografía cargada");
      queryClient.invalidateQueries({ queryKey: ["photos", locationId] });
      queryClient.invalidateQueries({ queryKey: ["photo-consents", locationId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  /** Agrega la fotografía original (sin IA) al carrito de venta. */
  function addPhotoToCart(photo: PhotoRow) {
    const product = digitalPhotoQuery.data;
    if (!product) {
      toast.error("No encontramos el producto de fotografía digital en el catálogo.");
      return;
    }
    addMagicItem({
      jobId: photo.id,
      outputType: "imagen",
      label: `${product.name} · ${photo.visitor_code}`,
      price: product.price,
      locationId,
      mediaUrl: photo.image_url,
      customerEmail: null,
      customerPhone: null,
      productId: product.id,
      sku: product.sku,
      photoCode: photo.visitor_code,
    });
    toast.success("Agregada al carrito", { description: "Podés cobrarla desde el carrito de la barra superior." });
  }

  const readySouvenirs = (souvenirsQuery.data ?? []).filter((s) => s.status === "listo" || s.status === "entregado");
  const withConsent = photos.filter((p) => p.has_consent).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.fotografias.title")}
        description={`${t("page.fotografias.desc")}${activeLocation ? ` · ${activeLocation.name}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setMagicOpen(true)}>
              <Sparkles className="h-4 w-4" /> Crear recuerdo mágico
            </Button>
            <PhotoFormDialog onSubmit={(d) => createPhoto.mutateAsync(d)} pending={createPhoto.isPending} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fotografías" value={String(photos.length)} icon={Camera} />
        <StatCard label="Con consentimiento" value={String(withConsent)} icon={ShieldCheck} tone="success" />
        <StatCard label="Recuerdos listos" value={String(readySouvenirs.length)} icon={Sparkles} tone="warning" />
        <StatCard
          label="Plantillas activas"
          value={String(templatesQuery.data?.length ?? 0)}
          icon={ImageIcon}
        />
      </div>

      <Tabs defaultValue="galeria" className="space-y-4">
        <TabsList>
          <TabsTrigger value="galeria">Galería</TabsTrigger>
          <TabsTrigger value="recuerdos">Recuerdos IA</TabsTrigger>
          <TabsTrigger value="consentimientos">Consentimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="galeria" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código de visitante o fotógrafo"
              className="max-w-sm"
            />
            <Select value={status} onValueChange={(v) => setStatus(v as PhotoStatus | "todas")}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos los estados</SelectItem>
                {(Object.keys(PHOTO_STATUS_LABEL) as PhotoStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {PHOTO_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PhotoGrid
            photos={filtered}
            selectedId={selectedId}
            onSelect={(p) => setSelectedId(p.id)}
            onCreateSouvenir={(p) => {
              setSelectedId(p.id);
              setMagicPhoto(p);
              setMagicOpen(true);
            }}
            onAddToCart={addPhotoToCart}
            photoPrice={digitalPhotoQuery.data?.price ?? null}
            currency={activeLocation?.currency_code ?? "ARS"}
          />
        </TabsContent>

        <TabsContent value="recuerdos">
          <div className="surface-card divide-y divide-border p-0">
            {(souvenirsQuery.data ?? []).length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Todavía no hay recuerdos generados.</p>
            )}
            {(souvenirsQuery.data ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4">
                <div className="h-14 w-14 overflow-hidden rounded-lg bg-muted">
                  {s.result_url && (
                    <img src={s.result_url} alt="Recuerdo generado" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {s.photos?.visitor_code ?? "—"} · {s.souvenir_templates?.name ?? "Plantilla"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {relativeTime(s.created_at)} · costo estimado USD {Number(s.estimated_cost).toFixed(2)}
                  </p>
                </div>
                <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", SOUVENIR_STATUS_TONE[s.status])}>
                  {SOUVENIR_STATUS_LABEL[s.status]}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="consentimientos">
          <div className="surface-card divide-y divide-border p-0">
            {(consentsQuery.data ?? []).length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">Sin consentimientos registrados.</p>
            )}
            {(consentsQuery.data ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div>
                  <p className="font-mono font-medium">{c.visitor_code}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.visitor_name ?? "Sin nombre"} · {c.contact_email ?? "sin contacto"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{relativeTime(c.signed_at)}</span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <MagicStudio
        open={magicOpen}
        onOpenChange={(o) => {
          setMagicOpen(o);
          if (!o) setMagicPhoto(null);
        }}
        initialPhotoUrl={magicPhoto?.image_url ?? null}
        locationId={locationId}
        organizationId={profile?.organization_id ?? null}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        onAddToCart={(item) => {
          toast.success("Agregado al punto de venta", {
            description: `${item.label} aparece en “Recuerdos IA listos para cobrar”, dentro del punto de venta de la sede.`,
          });
        }}
      />
    </div>
  );
}
