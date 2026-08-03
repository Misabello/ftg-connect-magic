import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ExternalLink, Loader2, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/ftg/format";
import {
  checkMercadoPagoPayment,
  createMercadoPagoCheckout,
} from "@/lib/ftg/mercadopago.functions";

export type MercadoPagoContext = {
  organizationId: string;
  locationId: string;
  pointOfSaleId: string;
  cashSessionId: string | null;
  description: string;
};

/** Cobro con Mercado Pago (Checkout Pro): genera link + QR y espera la acreditación. */
export function MercadoPagoPanel({
  context,
  amount,
  currency,
  locale,
  payerEmail,
  approved,
  onApproved,
}: {
  context: MercadoPagoContext;
  amount: number;
  currency: string;
  locale: string;
  payerEmail: string;
  approved: boolean;
  onApproved: (info: { reference: string; providerPaymentId: string | null }) => void;
}) {
  const create = useServerFn(createMercadoPagoCheckout);
  const check = useServerFn(checkMercadoPagoPayment);
  const [creating, setCreating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => stopPolling, []);

  const verify = async (ref: string, silent = false) => {
    setChecking(true);
    try {
      const result = await check({ data: { externalReference: ref } });
      if (result.status === "aprobado") {
        stopPolling();
        onApproved({ reference: ref, providerPaymentId: result.providerPaymentId });
        toast.success("Pago acreditado en Mercado Pago");
      } else if (!silent) {
        toast.info(`Pago ${result.status}`);
      }
      return result.status;
    } catch (error) {
      if (!silent) toast.error((error as Error).message);
      return "pendiente";
    } finally {
      setChecking(false);
    }
  };

  const start = async () => {
    setCreating(true);
    try {
      const result = await create({
        data: {
          organizationId: context.organizationId,
          locationId: context.locationId,
          pointOfSaleId: context.pointOfSaleId,
          cashSessionId: context.cashSessionId,
          amount,
          currency,
          description: context.description,
          payerEmail: payerEmail.trim() ? payerEmail.trim() : null,
        },
      });
      setReference(result.externalReference);
      setInitPoint(result.initPoint);
      stopPolling();
      timer.current = setInterval(() => void verify(result.externalReference, true), 5000);
    } catch (error) {
      toast.error("No se pudo generar el cobro", { description: (error as Error).message });
    } finally {
      setCreating(false);
    }
  };

  if (approved) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4" /> Pago acreditado por Mercado Pago
      </div>
    );
  }

  const qrSrc = initPoint
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(initPoint)}`
    : null;

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Cobrar con Mercado Pago</p>
        <span className="text-sm font-semibold">{formatMoney(amount, currency, locale)}</span>
      </div>

      {!reference ? (
        <Button size="sm" className="gap-1.5" onClick={() => void start()} disabled={creating || amount <= 0}>
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
          {creating ? "Generando…" : "Generar QR / link de pago"}
        </Button>
      ) : (
        <div className="space-y-3">
          {qrSrc && (
            <img
              src={qrSrc}
              alt="Código QR de pago de Mercado Pago"
              className="mx-auto h-44 w-44 rounded-lg bg-white p-2"
              loading="lazy"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {initPoint && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={initPoint} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir link
                </a>
              </Button>
            )}
            <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => void verify(reference)} disabled={checking}>
              <RefreshCw className={checking ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Verificar pago
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Mostrale el QR al cliente. Verificamos la acreditación automáticamente cada 5 segundos.
          </p>
        </div>
      )}
    </div>
  );
}