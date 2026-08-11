import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MP_API = "https://api.mercadopago.com";

const CreateInput = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  pointOfSaleId: z.string().uuid(),
  cashSessionId: z.string().uuid().nullable().optional(),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  description: z.string().min(1).max(200),
  payerEmail: z.string().email().nullable().optional(),
});

const StatusInput = z.object({ externalReference: z.string().min(1).max(80) });

type MpPreference = { id?: string; init_point?: string; sandbox_init_point?: string };
type MpPayment = { id?: number | string; status?: string; payer?: { email?: string } };

function token() {
  const value = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!value) throw new Error("Falta configurar la credencial de Mercado Pago");
  return value;
}

function mapStatus(status: string | undefined) {
  switch (status) {
    case "approved":
      return "aprobado" as const;
    case "rejected":
      return "rechazado" as const;
    case "cancelled":
      return "cancelado" as const;
    case "refunded":
    case "charged_back":
      return "reembolsado" as const;
    default:
      return "pendiente" as const;
  }
}

/** Crea una preferencia de Checkout Pro y registra el intento de cobro en el punto de venta. */
export const createMercadoPagoCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateInput.parse(data))
  .handler(async ({ data, context }) => {
    const accessToken = token();
    const externalReference = `ftg-${crypto.randomUUID()}`;
    const origin = process.env["PUBLIC_SITE_URL"] ?? "";

    const response = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            title: data.description,
            quantity: 1,
            unit_price: Number(data.amount.toFixed(2)),
            currency_id: data.currency,
          },
        ],
        external_reference: externalReference,
        payer: data.payerEmail ? { email: data.payerEmail } : undefined,
        notification_url: origin ? `${origin}/api/public/webhooks/mercadopago` : undefined,
        binary_mode: true,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as MpPreference & { message?: string };
    if (!response.ok) {
      throw new Error(payload.message ?? `Mercado Pago rechazó la solicitud (${response.status})`);
    }

    const initPoint = payload.init_point ?? payload.sandbox_init_point ?? null;

    // Origen de fondos: la fuente de Mercado Pago más específica (puesto > sede > organización).
    const { data: sources } = await context.supabase
      .from("cash_sources")
      .select("id, name, location_id, point_of_sale_id, sort_order")
      .eq("organization_id", data.organizationId)
      .eq("provider", "mercadopago")
      .eq("is_active", true);
    const cashSource =
      (sources ?? [])
        .filter(
          (s) =>
            (s.point_of_sale_id === null || s.point_of_sale_id === data.pointOfSaleId) &&
            (s.location_id === null || s.location_id === data.locationId),
        )
        .sort(
          (a, b) =>
            Number(b.point_of_sale_id !== null) - Number(a.point_of_sale_id !== null) ||
            Number(b.location_id !== null) - Number(a.location_id !== null) ||
            a.sort_order - b.sort_order,
        )[0] ?? null;

    const { error } = await context.supabase.from("payment_intents").insert({
      organization_id: data.organizationId,
      location_id: data.locationId,
      point_of_sale_id: data.pointOfSaleId,
      cash_session_id: data.cashSessionId ?? null,
      cash_source_id: cashSource?.id ?? null,
      external_reference: externalReference,
      preference_id: payload.id ?? null,
      init_point: initPoint,
      amount: data.amount,
      currency_code: data.currency,
      description: data.description,
      payer_email: data.payerEmail ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);

    return {
      externalReference,
      initPoint,
      preferenceId: payload.id ?? null,
      cashSourceName: cashSource?.name ?? null,
    };
  });

/** Consulta el estado del cobro en Mercado Pago y actualiza el intento local. */
export const checkMercadoPagoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => StatusInput.parse(data))
  .handler(async ({ data, context }) => {
    const accessToken = token();
    const response = await fetch(
      `${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(data.externalReference)}&sort=date_created&criteria=desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new Error(`No se pudo consultar el pago (${response.status})`);
    const payload = (await response.json()) as { results?: MpPayment[] };
    const payment = payload.results?.[0];
    const status = mapStatus(payment?.status);

    await context.supabase
      .from("payment_intents")
      .update({
        status,
        provider_payment_id: payment?.id ? String(payment.id) : null,
        payer_email: payment?.payer?.email ?? null,
        approved_at: status === "aprobado" ? new Date().toISOString() : null,
        raw: (payment ?? {}) as never,
      })
      .eq("external_reference", data.externalReference);

    return { status, providerPaymentId: payment?.id ? String(payment.id) : null };
  });