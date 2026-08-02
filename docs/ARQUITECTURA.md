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
 │  Etapa 3: IndexedDB (Dexie) + cola de sincronización por lotes (UUID + idempotencia)│
 └───────────────┬─────────────────────────────────────────────┬───────────────────────┘
                 │ Supabase JS (RLS como usuario)              │ createServerFn (server)
                 ▼                                             ▼
 ┌────────────────────────── Backend central (Lovable Cloud / Postgres) ───────────────┐
 │  Auth  ·  Storage (fotos)  ·  Postgres con RLS  ·  Auditoría                        │
 │  Etapa 4: generación de imágenes vía función segura del servidor (clave nunca en el │
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
| Sedes, parques, eventos, puntos de venta, dispositivos | Real (CRUD de sedes + lectura del resto) |
| Permisos por rol y módulo | Real (menú y RLS) |
| Auditoría | Real (tabla + registro de altas de sedes) |
| Indicadores del dashboard | Reales sobre estructura; los comerciales llegan con la Etapa 2 |
| POS, offline, IA, inventario, administración | Aún no implementados (Etapas 2 a 5) |
| Integración fiscal (ARCA, Brasil, Portugal) | No existe integración real; sólo adaptadores previstos |