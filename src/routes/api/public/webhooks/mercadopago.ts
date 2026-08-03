import { createFileRoute } from "@tanstack/react-router";

type MpPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string;
  payer?: { email?: string };
};

function mapStatus(status: string | undefined) {
  switch (status) {
    case "approved":
      return "aprobado";
    case "rejected":
      return "rechazado";
    case "cancelled":
      return "cancelado";
    case "refunded":
    case "charged_back":
      return "reembolsado";
    default:
      return "pendiente";
  }
}

/** Notificaciones de Mercado Pago: verifica el pago contra la API antes de actualizar. */
export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
        if (!accessToken) return new Response("not configured", { status: 503 });

        const body = (await request.json().catch(() => ({}))) as {
          data?: { id?: string | number };
          type?: string;
          topic?: string;
        };
        const paymentId = body.data?.id;
        const kind = body.type ?? body.topic;
        if (!paymentId || (kind && kind !== "payment")) return new Response("ignored");

        // La única fuente de verdad es la API de Mercado Pago, no el cuerpo del webhook.
        const lookup = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!lookup.ok) return new Response("payment not found", { status: 202 });
        const payment = (await lookup.json()) as MpPayment;
        if (!payment.external_reference) return new Response("ignored");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const status = mapStatus(payment.status);
        await supabaseAdmin
          .from("payment_intents")
          .update({
            status,
            provider_payment_id: String(payment.id ?? paymentId),
            payer_email: payment.payer?.email ?? null,
            approved_at: status === "aprobado" ? new Date().toISOString() : null,
            raw: payment as never,
          })
          .eq("external_reference", payment.external_reference);

        return new Response("ok");
      },
    },
  },
});