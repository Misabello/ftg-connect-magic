# Mercado Pago Point Smart — revisión previa y plan

## 1. Qué ya existe (se reutiliza, no se reconstruye)

| Pieza actual | Uso en la integración |
|---|---|
| `sales`, `sale_items`, `sale_payments` | Venta y pagos mixtos: cada cobro Point será una fila más en `sale_payments` |
| `payment_methods` (enum `payment_kind`) | Se agrega el medio "Mercado Pago Point" mapeado a tarjeta/QR |
| `cash_sessions`, `cash_sources`, `resolve_cash_source()` | Ruteo automático del cobro a la caja/fuente Mercado Pago del puesto |
| `payment_intents` (Checkout Pro/QR ya hecho) | Queda para cobros por link/QR remoto; Point usa su propio ciclo de vida |
| `points_of_sale`, `locations`, `organizations`, `countries`, `devices` | Jerarquía país → empresa → parque → punto de venta → caja/terminal |
| `journal_entries` + triggers de venta y cobro | Asiento contable automático al aprobar el pago |
| `/api/public/webhooks/mercadopago` | Se amplía: verificación de firma, idempotencia y registro de eventos |
| `PosWorkspace` + `CheckoutDialog` + `MercadoPagoPanel` | Punto de entrada del nuevo medio de pago presencial |

## 2. Flujo de cobro actual

Carrito → `CheckoutDialog` (medios de pago mixtos) → alta de `sales` + `sale_items` + `sale_payments` → triggers contables → comprobante/envío. Mercado Pago hoy sólo genera una preferencia de Checkout Pro y espera un webhook: **no hay terminal física ni bloqueo de confirmación hasta la aprobación**. Eso es lo que cambia.

## 3. Datos nuevos (sólo lo que no existe)

`payment_provider_accounts`, `payment_terminals`, `payment_attempts`, `payment_webhook_events`, `payment_refunds`, `payment_reconciliations`, con RLS por organización/sede y sin guardar credenciales (sólo `secret_reference`).

## 4. Backend necesario (server functions + rutas)

- `payments/providers.ts`: interfaz `PaymentTerminalProvider` (createOrder, getOrderStatus, cancelOrder, refundPayment, getTerminals, verifyWebhook).
- `MercadoPagoPointProvider` (Orders API real, AR/BR), `MockTerminalProvider` (pruebas), `Stripe/Adyen/Generic` declarados como "no configurado" — sin simular funcionamiento.
- Funciones seguras: crear intento (con clave de idempotencia), consultar estado, cancelar, devolver, listar terminales, probar conexión, conciliar.
- Webhook endurecido: validación de firma `x-signature`, deduplicación por `provider_event_id`, reconsulta a Mercado Pago, respuesta rápida.

## 5. Secretos

Un token por empresa legal, con nombre derivado (ej. `MP_ACCESS_TOKEN_<EMPRESA>`), más `MP_WEBHOOK_SECRET_<EMPRESA>`. La tabla sólo guarda el nombre del secreto. Empezamos en entorno **PRUEBA** con credenciales de test; no se activa producción sin la checklist de validación.

## 6. Interfaz

- Configuración → **Pagos** (Proveedores, Cuentas, Terminales, Webhooks, Conciliación, Entorno).
- POS: medio "Mercado Pago Point" con selección de terminal, estados en vivo (enviado, esperando cliente, procesando, aprobado, rechazado, pendiente de verificación) y botón bloqueado mientras haya un intento abierto.
- Administración → **Conciliación Mercado Pago**. Supervisores → panel de medios electrónicos por parque.

## 7. Pruebas automáticas

Aprobación, rechazo, cancelación, webhook duplicado, doble clic (idempotencia), pérdida de conexión (queda "pendiente de verificación"), devolución total y parcial, pagos mixtos que suman el total.

## 8. Etapas

1. **Etapa 1 (a implementar ahora)**: modelo de datos, adaptadores, configuración segura, ABM de terminales, entorno de prueba.
2. Etapa 2: órdenes, envío a terminal, estados y webhooks.
3. Etapa 3: pagos mixtos, cancelaciones, devoluciones, conciliación.
4. Etapa 4: supervisión, alertas, adaptadores internacionales.

Se trabaja siempre en entorno de prueba; no se usan credenciales reales en esta implementación.
