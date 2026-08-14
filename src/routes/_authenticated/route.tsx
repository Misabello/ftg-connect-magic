import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { AppSidebar } from "@/components/ftg/AppSidebar";
import { DataAgentDock } from "@/components/ftg/DataAgentDock";
import { TopBar } from "@/components/ftg/TopBar";
import { ScopeProvider } from "@/hooks/useScope";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    void location;
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Acceso abierto: sin verificación de roles ni módulos.
    return { user: data.user };
  },
  component: AppLayout,
});

function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ScopeProvider>
      <div className="flex min-h-screen w-full bg-background">
        <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
          <AppSidebar />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="relative h-full">
              <AppSidebar onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenu={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>

        <DataAgentDock />
      </div>
    </ScopeProvider>
  );
}