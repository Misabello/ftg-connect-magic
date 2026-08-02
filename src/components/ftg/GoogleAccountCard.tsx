import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";

export function GoogleAccountCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const googleIdentity = user?.identities?.find((identity) => identity.provider === "google");
  const linked = Boolean(googleIdentity);

  async function linkGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        toast.error(result.error.message ?? "No se pudo vincular la cuenta de Google");
        return;
      }
      if (result.redirected) return;
      toast.success("Cuenta de Google vinculada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo vincular la cuenta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface-card space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Cuenta de Google</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Vinculá tu cuenta corporativa de Google para ingresar a FTG ONE sin contraseña. Se
            asocia al mismo usuario si el correo coincide.
          </p>
        </div>
        <Badge variant={linked ? "default" : "secondary"}>
          {linked ? "Vinculada" : "Sin vincular"}
        </Badge>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">Usuario actual</p>
        <p className="font-medium">{user?.email ?? "—"}</p>
        {linked && googleIdentity?.identity_data?.email && (
          <p className="mt-1 text-xs text-muted-foreground">
            Google: {String(googleIdentity.identity_data.email)}
          </p>
        )}
      </div>

      <Button onClick={linkGoogle} disabled={loading || linked} variant={linked ? "outline" : "default"}>
        {linked ? "Cuenta vinculada" : loading ? "Abriendo Google…" : "Vincular con Google"}
      </Button>
    </section>
  );
}