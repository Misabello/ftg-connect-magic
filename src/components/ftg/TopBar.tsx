import { Bell, CloudOff, CloudUpload, HelpCircle, LogOut, Menu, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useScope } from "@/hooks/useScope";
import { relativeTime } from "@/lib/ftg/format";
import { ROLE_LABELS } from "@/lib/ftg/roles";

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { profile, roles, user, signOut } = useAuth();
  const { locations, activeLocationId, setActiveLocation, online, lastSyncAt, language, setLanguage } =
    useScope();
  const { pendingCount, syncing, sync } = useOfflineQueue();

  const initials = (profile?.full_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Abrir menú">
        <Menu className="h-5 w-5" />
      </Button>

      <Select {...(activeLocationId ? { value: activeLocationId } : {})} onValueChange={setActiveLocation}>
        <SelectTrigger className="h-9 w-[230px]">
          <SelectValue placeholder="Seleccionar sede" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name} · {loc.country_code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <span
          className={
            online
              ? "flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success"
              : "flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive"
          }
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
          {online ? "En línea" : "Offline"}
        </span>

        {pendingCount > 0 ? (
          <Button
            variant="ghost"
            className="h-9 gap-1.5 rounded-full bg-warning/15 px-3 text-xs font-medium text-warning hover:bg-warning/25"
            onClick={() => void sync()}
            disabled={syncing}
          >
            <RefreshCw className={syncing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
            {syncing ? "Sincronizando…" : `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}`}
          </Button>
        ) : (
          <span className="hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground sm:flex">
            <CloudUpload className="h-3.5 w-3.5" />
            Sinc. {relativeTime(lastSyncAt)}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificaciones"
          onClick={() => toast.info("Sin notificaciones nuevas")}
        >
          <Bell className="h-[18px] w-[18px]" />
        </Button>

        <Select value={language} onValueChange={(v) => setLanguage(v as "es" | "pt")}>
          <SelectTrigger className="h-9 w-[74px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">ES</SelectItem>
            <SelectItem value="pt">PT</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Ayuda"
          onClick={() => toast.info("Centro de ayuda disponible en la próxima etapa")}
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" className="h-9 gap-2 px-2.5">
              <span className="brand-gradient flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">
                {initials}
              </span>
              <span className="hidden max-w-[140px] truncate text-sm md:inline">
                {profile?.full_name || user?.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="space-y-1">
              <p className="text-sm font-medium">{profile?.full_name || "Usuario"}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {roles.length ? roles.map((r) => ROLE_LABELS[r]).join(", ") : "Sin rol asignado"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}