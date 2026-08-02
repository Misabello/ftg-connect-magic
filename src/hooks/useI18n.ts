import { useScope } from "@/hooks/useScope";
import { roleLabel, translate, type Language } from "@/lib/ftg/i18n";
import type { AppRole } from "@/lib/ftg/roles";

export function useI18n() {
  const { language, setLanguage } = useScope();
  return {
    language: language as Language,
    setLanguage,
    t: (key: string) => translate(language as Language, key),
    tRole: (role: AppRole) => roleLabel(language as Language, role),
  };
}
