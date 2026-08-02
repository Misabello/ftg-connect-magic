# FTG ONE — Arquitectura (MVP)

## Diagrama simplificado

```text
 ┌──────────────────────────── Cliente (PWA · React + TS) ────────────────────────────┐
 │  Rutas públicas: /  /auth                                                           │
 │  Rutas protegidas: /_authenticated/* → inicio, pos, fotografias, operaciones,       │
 │                    inventario, administracion, clientes, reportes, configuracion    │
 │                                                                                     │
 │  Estado: TanStack Query · Contextos: AuthProvider (sesión, perfil, roles)           │
 │                                      ScopeProvider (sede activa, online, idioma)    │
 │  Offline-first: cola local de ventas (localStorage) + sync por lotes con idempotencia│
 └───────────────┬─────────────────────────────────────────────┬───────────────────────┘
                 │ Supabase JS (RLS como usuario)              │ createServerFn (server)
                 ▼                                             ▼
 ┌────────────────────────── Backend central (Lovable Cloud / Postgres) ───────────────┐
 │  Auth  ·  Storage (fotos)  ·  Postgres con RLS  ·  Auditoría                        │
 │  IA: generación de imágenes vía función segura del servidor (clave nunca en el      │
 │  frontend) con interfaz desacoplada de proveedor                                    │
 │  Capa fiscal: ArgentinaFiscalAdapter · BrazilFiscalAdapter · PortugalFiscalAdapter  │
 │               · GenericFiscalAdapter  (simulados en el MVP)                          │
 └──────────────────────────────────────────────────────────────────────────────────────┘
```

## Tablas creadas en la Etapa 1

`currencies`, `countries`, `organizations`, `locations`, `venues`, `events`,
`points_of_sale`, `devices`, `profiles`, `user_roles`, `audit_logs`.

Funciones: `has_role(user, role)`, `is_admin(user)` (SECURITY DEFINER, evitan recursión en RLS),
`handle_new_user()` (crea perfil + rol inicial), `set_updated_at()`.

## Qué es real y qué está simulado (hoy)

| Elemento | Estado |
| --- | --- |
| Autenticación, perfiles y roles | Real |
| Sedes, parques, eventos, puntos de venta, dispositivos | Real |
| Permisos por rol y módulo | Real (menú y RLS) |
| Auditoría | Real (tabla + registro de operaciones clave) |
| POS: catálogo, carrito, pagos combinados, caja y arqueo | Real |
| Offline-first | Real: si no hay conexión la venta se guarda en el dispositivo y se sincroniza al volver en línea, sin duplicar (clave de idempotencia) |
| Operaciones: jornadas, checklists, personal, incidentes | Real |
| Fotografías, consentimientos y recuerdos con IA | Real (IA vía Lovable AI) |
| Inventario, clientes, administración y reportes | Real |
| Integración fiscal (ARCA, Brasil, Portugal) | No existe integración real; sólo adaptadores previstos |

## Sincronización offline

1. La venta se calcula íntegra en el cliente (totales, impuestos, descuentos) y recibe un UUID de idempotencia.
2. Sin conexión se encola en `ftg.offline.sales` con sus líneas, cobros y auditoría.
3. Al recuperar la conexión (evento `online` o botón *Sincronizar*) se envía por lotes; antes de insertar se verifica la clave de idempotencia, de modo que un reintento nunca duplica la venta.
4. La cola muestra el estado en la barra superior y en el detalle del turno del POS.
