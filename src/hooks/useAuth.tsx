import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { modulesForRoles, type AppRole, type ModuleKey } from "@/lib/ftg/roles";

type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  language: string;
  default_location_id: string | null;
  organization_id: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  roles: AppRole[];
  modules: Set<ModuleKey>;
  can: (mod: ModuleKey) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const userId = session?.user.id ?? null;

  const { data } = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, language, default_location_id, organization_id")
          .eq("id", userId!)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      return {
        profile: (profile ?? null) as Profile | null,
        roles: ((roles ?? []) as { role: AppRole }[]).map((r) => r.role),
      };
    },
  });

  const roles = useMemo(() => data?.roles ?? [], [data]);
  const modules = useMemo(() => modulesForRoles(roles), [roles]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    profile: data?.profile ?? null,
    roles,
    modules,
    can: (mod) => modules.has(mod),
    signOut: async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}