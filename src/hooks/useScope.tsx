import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type LocationRow = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  country_code: string;
  currency_code: string;
  timezone: string;
};

const STORAGE_KEY = "ftg.active_location";
const LANG_KEY = "ftg.language";

type ScopeContextValue = {
  locations: LocationRow[];
  activeLocationId: string | null;
  activeLocation: LocationRow | null;
  setActiveLocation: (id: string) => void;
  online: boolean;
  lastSyncAt: Date | null;
  language: "es" | "pt";
  setLanguage: (lang: "es" | "pt") => void;
};

const ScopeContext = createContext<ScopeContextValue | null>(null);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [language, setLanguageState] = useState<"es" | "pt">("es");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("id, code, name, city, country_code, currency_code, timezone")
        .order("name");
      if (error) throw error;
      return data as LocationRow[];
    },
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveLocationId(stored);
    const storedLang = window.localStorage.getItem(LANG_KEY);
    if (storedLang === "es" || storedLang === "pt") setLanguageState(storedLang);
    else if (navigator.language?.toLowerCase().startsWith("pt")) setLanguageState("pt");
    setOnline(navigator.onLine);
    setLastSyncAt(new Date());
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (!activeLocationId && locations.length > 0) {
      setActiveLocationId(locations[0]!.id);
    }
  }, [locations, activeLocationId]);

  const setActiveLocation = (id: string) => {
    setActiveLocationId(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  };

  const setLanguage = (lang: "es" | "pt") => {
    setLanguageState(lang);
    window.localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang === "pt" ? "pt-BR" : "es";
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void supabase.from("profiles").update({ language: lang }).eq("id", data.user.id);
    });
  };

  const activeLocation = locations.find((l) => l.id === activeLocationId) ?? null;

  return (
    <ScopeContext.Provider
      value={{
        locations,
        activeLocationId,
        activeLocation,
        setActiveLocation,
        online,
        lastSyncAt,
        language,
        setLanguage,
      }}
    >
      {children}
    </ScopeContext.Provider>
  );
}

export function useScope() {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useScope debe usarse dentro de ScopeProvider");
  return ctx;
}