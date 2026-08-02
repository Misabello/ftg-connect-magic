import { useMemo, useState } from "react";
import { Search, Sparkles, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CHARACTER_FALLBACK_IMAGES, CHARACTER_PLACEHOLDER, type OutputType } from "@/lib/ftg/magic";

export type CharacterRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  location_id: string | null;
  venue_id: string | null;
  styles: string[];
  supports_image: boolean;
  supports_video: boolean;
  usage_count: number;
};

export function characterImage(character: Pick<CharacterRow, "name">) {
  return CHARACTER_FALLBACK_IMAGES[character.name] ?? CHARACTER_PLACEHOLDER;
}

export function CharacterLibrary({
  characters,
  outputType,
  selectedId,
  onSelect,
  locationOptions,
}: {
  characters: CharacterRow[];
  outputType: OutputType;
  selectedId: string | null;
  onSelect: (character: CharacterRow) => void;
  locationOptions: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todas");
  const [locationId, setLocationId] = useState("todas");

  const categories = useMemo(
    () => Array.from(new Set(characters.map((c) => c.category))).sort(),
    [characters],
  );

  const filtered = characters.filter((c) => {
    if (outputType === "video" ? !c.supports_video : !c.supports_image) return false;
    if (category !== "todas" && c.category !== category) return false;
    if (locationId !== "todas" && c.location_id && c.location_id !== locationId) return false;
    const q = search.trim().toLowerCase();
    if (q && !`${c.name} ${c.description ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar personaje"
            className="pl-8"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Sede" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las sedes</SelectItem>
            {locationOptions.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay personajes aprobados para este formato.
        </p>
      )}

      <div className="grid max-h-[320px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
        {filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className={cn(
              "overflow-hidden rounded-xl border border-border text-left transition-all hover:border-primary",
              selectedId === c.id && "border-primary ring-2 ring-primary/30",
            )}
          >
            <div className="aspect-square overflow-hidden bg-muted">
              <img src={characterImage(c)} alt={c.name} className="h-full w-full object-cover" />
            </div>
            <div className="space-y-1 p-2">
              <p className="text-sm leading-tight font-medium">{c.name}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{c.description ?? c.category}</p>
              <div className="flex gap-1 pt-0.5">
                {c.supports_image && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Sparkles className="h-3 w-3" /> Foto
                  </Badge>
                )}
                {c.supports_video && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Video className="h-3 w-3" /> Video
                  </Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
