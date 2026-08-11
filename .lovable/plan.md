# Sincronización manual de la jornada con un clic

## Diagnóstico previo (estado actual)

- **Cola offline actual**: `src/lib/ftg/offline.ts` guarda solo **ventas** en `localStorage` (clave `ftg.offline.sales`), con `idempotency_key` ya generada en el dispositivo. No hay IndexedDB todavía, ni pagos/caja/stock/fotos en cola.
- **Sincronización automática**: `src/hooks/useOfflineQueue.tsx` reintenta al volver la conexión y desde el botón del `TopBar`. Se mantiene tal cual.
- **POS**: `src/components/ftg/pos/PosWorkspace.tsx` encola la venta completa (venta + ítems + pagos + auditoría) cuando está offline.
- **Tablas centrales**: `sales` (ya tiene `idempotency_key`, `local_created_at`, `synced_at`, `source`, `device_id`), `sale_items`, `sale_payments`, `cash_sessions`, `stock_movements`, `photos`, `photo_consents`, `operation_incidents`, `operation_checklist_items`, `finance_documents`, `audit_logs`, `devices`.
- **Dependencias a respetar**: jornada → caja → venta → ítems → pagos → stock → facturación → archivos → cierre.

## Alcance por etapas

### Etapa 1 — Base de datos y motor de sincronización
- Nuevas tablas: `sync_devices`, `sync_batches`, `sync_batch_items`, `sync_conflicts`, con RLS por organización/sede/punto de venta y auditoría.
- Índices y claves únicas de idempotencia (`idempotency_key` por entidad; único por dispositivo + secuencia local).
- Columnas de idempotencia faltantes en las entidades que hoy no las tienen (pagos, movimientos de caja, movimientos de stock, fotos, consentimientos, incidentes).
- Servidor: `src/lib/ftg/sync.functions.ts` con `pushBatch` (autenticado, valida dispositivo/POS, aplica por sub-lotes y devuelve por operación: recibida / ya existía / rechazada / requiere revisión / error recuperable / error definitivo).

### Etapa 2 — Cola local en IndexedDB
- `src/lib/ftg/offline.db.ts`: almacén IndexedDB con migración automática desde la cola actual de `localStorage` (sin perder ventas pendientes).
- Registro genérico de operación: `uuid`, `entity_type`, `device_id`, `point_of_sale_id`, `business_date`, `local_sequence`, `local_created_at`, `idempotency_key`, `sync_status`, `attempts`, prioridad (alta/media/baja).
- El POS pasa a encolar todas las entidades del listado (caja, ventas, ítems, pagos, descuentos, anulaciones, movimientos de caja y stock, fotos, consentimientos, trabajos de IA, facturas, incidentes, cierre y checklist).
- Manifiesto de jornada con conteos por tipo, importes por moneda, primera/última secuencia y hash de integridad.

### Etapa 3 — Experiencia de usuario
- `SyncDayButton`: botón "Sincronizar operaciones del día" / "Todo está sincronizado", con estados (pendientes, verificando conexión, sincronizando, parcial, completado, sin conexión, error). Se coloca en POS, cierre de caja, cierre diario y centro de sincronización.
- Diálogo previo con el resumen de la jornada (fecha, país, parque, punto de venta, caja, dispositivo, usuario, conteos, importes por moneda, última sincronización).
- Pantalla de progreso por fases, con porcentaje, tiempo transcurrido, enviadas/pendientes y "Trabajar en segundo plano"; aviso al cerrar la app con sincronización activa.
- Resultado: jornada sincronizada o "Algunas operaciones requieren atención", con reintento solo de las pendientes y descarga del comprobante del lote.
- Modo offline: mensaje claro, solicitud en "Esperando conexión", acciones Reintentar / Continuar trabajando / Ver pendientes, y aviso al recuperar la conexión.

### Etapa 4 — Centro de sincronización, archivos y cierre
- Ruta `/_authenticated/sincronizacion`: estado de conexión, jornada, última sincronización, pendientes por tipo, errores, dispositivo, espacio local, historial de lotes y acciones (sincronizar, reintentar, ver errores, comprobante, exportar lote de emergencia).
- Archivos pesados en cola aparte y con reanudación: primero datos financieros, luego metadatos, luego fotos/videos; una foto fallida no invalida su venta.
- Cierre de caja: bloqueo suave "Cierre pendiente de sincronización" mientras falten operaciones, verificación de secuencias y totales, recálculo y alerta al supervisor ante diferencias.
- Conflictos: se conservan ambas versiones, se marca "Requiere revisión" y se notifica; nunca se resuelven automáticamente diferencias financieras.
- Exportación/importación de lote de emergencia: archivo cifrado y firmado, con identificador único y sin credenciales, más registro de quién exportó y desde qué dispositivo.
- Modo automático/manual configurable, manteniendo siempre el botón manual.

## Componentes que se modifican o crean

Modificados: `src/lib/ftg/offline.ts`, `src/hooks/useOfflineQueue.tsx`, `src/components/ftg/pos/PosWorkspace.tsx`, `src/components/ftg/pos/CashSessionCard.tsx`, `src/components/ftg/TopBar.tsx`, `src/routes/_authenticated/supervisores.cierre.tsx`, `src/lib/ftg/nav.ts`, `src/lib/ftg/i18n.ts`.

Nuevos: `src/lib/ftg/offline.db.ts`, `src/lib/ftg/sync.manifest.ts`, `src/lib/ftg/sync.functions.ts`, `src/lib/ftg/sync.server.ts`, `src/lib/ftg/sync.emergency.ts`, `src/hooks/useDaySync.tsx`, `src/components/ftg/sync/SyncDayButton.tsx`, `SyncPreviewDialog.tsx`, `SyncProgressDialog.tsx`, `SyncResultDialog.tsx`, `SyncCenter.tsx`, ruta `src/routes/_authenticated/sincronizacion.tsx`.

Pruebas (Vitest): desconexión, recuperación, duplicados (doble clic), interrupción y sincronización parcial, además del manifiesto y el hash de integridad.

## Notas

- No se generan datos ficticios: todo sale de operaciones reales del dispositivo.
- No se reconstruye el POS ni se reemplaza la sincronización automática.
- Las cargas reanudables de archivos usan el almacenamiento privado ya existente.
