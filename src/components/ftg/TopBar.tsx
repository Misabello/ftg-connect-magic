import { Bell, CloudOff, CloudUpload, HelpCircle, LogOut, Menu, Wifi } from "lucide-react";
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
import { useI18n } from "@/hooks/useI18n";
import { useScope } from "@/hooks/useScope";
import { relativeTime } from "@/lib/ftg/format";
import { LANGUAGES } from "@/lib/ftg/i18n";
import { CartDock } from "./CartDock";
import { SyncDayButton } from "@/components/ftg/sync/SyncDayButton";
import { useDaySync } from "@/hooks/useDaySync";

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const { profile, roles, user, signOut } = useAuth();
  const { locations, activeLocationId, setActiveLocation, online, lastSyncAt } =
    useScope();
  const { pendingCount } = useDaySync();
  const { t, tRole, language, setLanguage } = useI18n();

  const initials = (profile?.full_name || user?.email || "?").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label={t("top.menu")}>
        <Menu className="h-5 w-5" />
      </Button>

      <Select {...(activeLocationId ? { value: activeLocationId } : {})} onValueChange={setActiveLocation}>
        <SelectTrigger className="h-9 w-[230px]">
          <SelectValue placeholder={t("top.selectLocation")} />
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
        <CartDock />
        <span
          className={
            online
              ? "flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success"
              : "flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive"
          }
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
          {online ? t("top.online") : t("top.offline")}
        </span>

        {pendingCount > 0 ? (
          <SyncDayButton size="sm" variant="secondary" className="rounded-full" />
        ) : (
          <span className="hidden items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground sm:flex">
            <CloudUpload className="h-3.5 w-3.5" />
            {t("top.lastSync")} {relativeTime(lastSyncAt)}
          </span>
        )}

        <Button
          variant="ghost"
          size="icon"
          aria-label={t("top.notifications")}
          onClick={() => toast.info(t("top.noNotifications"))}
        >
          <Bell className="h-[18px] w-[18px]" />
        </Button>

        <Select value={language} onValueChange={(v) => setLanguage(v as "es" | "pt")}>
          <SelectTrigger className="h-9 w-[74px]" aria-label={t("top.language")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.flag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          aria-label={t("top.help")}
          onClick={() => toast.info(t("top.helpSoon"))}
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
              <p className="text-sm font-medium">{profile?.full_name || t("top.user")}</p>
              <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {roles.length ? roles.map((r) => tRole(r)).join(", ") : t("top.noRole")}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> {t("top.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}