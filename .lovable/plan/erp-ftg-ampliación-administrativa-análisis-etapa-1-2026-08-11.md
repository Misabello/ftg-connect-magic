# ERP FTG — Ampliación administrativa (análisis + Etapa 1)

## 1. Qué ya existe y se reutiliza

| Necesidad del pedido | Tabla/módulo existente | Uso |
|---|---|---|
| Usuarios | `profiles` (+ Supabase Auth) | Se mantiene como ficha de acceso |
| Roles | `user_roles` con enum `app_role` (10 roles) | Se conserva; se mapean los 5 roles nuevos |
| Empresas / países | `organizations`, `countries`, `currencies` | Sin cambios |
| Sedes, parques, PDV | `locations`, `venues`, `points_of_sale` | Sin cambios |
| Clientes / proveedores | `customers`, `suppliers` | Base de CxC y CxP |
| Facturas | `invoice_documents`, `finance_documents` | CxP/CxC se construyen sobre estas |
| Contabilidad | `ledger_accounts`, `journal_entries`, `journal_lines` + triggers de partida doble | Se extienden, no se reemplazan |
| Auditoría | `audit_logs` | Registro de acciones sensibles |

No se crean tablas duplicadas de facturas, asientos, clientes ni plan de cuentas.

## 2. Tablas nuevas (Etapa 1 únicamente)

- `roles` — catálogo editable: `code` (admin, management, supervisor, executive, seller), nombre, descripción, activo, mapeo al enum actual.
- `permissions` — módulo, submódulo, acción (ver, crear, editar, aprobar, anular, exportar, administrar, sensible).
- `role_permissions` — rol × permiso × permitido (todo en `true` en esta etapa).
- `employees` — legajo completo: datos personales, laborales, supervisor, sede principal, centro de costos, estado laboral, fechas de ingreso/baja, `user_id` opcional.
- `employee_venue_assignments` — sedes y puntos de venta asignados con vigencia.
- Ampliación de `user_roles`: `valid_from`, `valid_to`, `assigned_by`, `role_id`.
- Ampliación de `profiles`: `status` (invitado, activo, suspendido, baja programada, inactivo), `first_name`, `last_name`, `country_code`, `start_date`, `end_date`, `last_sign_in_at` (sincronizado), `deactivated_at`.

Las tablas de vacaciones, plan de cuentas extendido, períodos contables y mapeos de estados quedan para las Etapas 2, 4 y 5.

## 3. Reglas de acceso (RLS)

- Todos los roles siguen viendo los módulos operativos actuales (sin restricción nueva).
- Solo `admin` (y el actual `superadmin`) puede crear usuarios, asignar roles, dar de baja y reactivar.
- Empleados: lectura para roles administrativos y de gerencia; cada usuario ve su propio legajo; escritura solo administración.
- `roles`, `permissions`, `role_permissions`: lectura autenticada, escritura solo admin.
- Toda alta, baja, cambio de rol y edición de legajo escribe en `audit_logs`.

## 4. Backend real (no solo UI)

- `src/lib/ftg/admin-users.functions.ts`: crear usuario con invitación vía Admin API en el servidor (nunca en el navegador), suspender, reactivar, revocar sesiones, restablecer acceso, asignar rol. Cada función verifica que el llamador sea admin antes de usar privilegios.
- `src/lib/ftg/hr.functions.ts`: alta/edición de legajo, asignaciones a sedes y PDV, historial.
- Job de bajas programadas: al llegar `end_date` el usuario queda inactivo, se revocan sesiones y se conserva todo el historial operativo y financiero.

## 5. Frontend a modificar

- `src/components/ftg/AppSidebar.tsx`: menú jerárquico con submenús y breadcrumbs.
- `src/routes/_authenticated/configuracion.tsx`: pasa a ser índice con los submenús Usuarios, Roles y permisos, Empleados, Vacaciones, Empresas y países, Sedes y PDV, Parámetros, Auditoría (los de etapas futuras quedan visibles con aviso de próxima etapa).
- Nuevas rutas: `configuracion/usuarios`, `configuracion/roles`, `configuracion/empleados` (+ ficha con pestañas), `configuracion/auditoria`.
- Leyenda en Configuración: "Actualmente los módulos operativos están habilitados para todos los roles. Los permisos específicos podrán configurarse en una próxima etapa."
- `src/lib/ftg/roles.ts`: agrega los 5 roles nuevos manteniendo los existentes.

## 6. Riesgos de compatibilidad

- El enum `app_role` está en uso por RLS y por `has_role`/`is_admin`: se agregan valores nuevos sin quitar los actuales, y `is_admin` incluirá `admin` y `management` según corresponda.
- Los triggers contables actuales seguirán funcionando; las Etapas 4 y 5 los amplían (estados de asiento, reversión, monedas) sin romper POS ni tickets.
- Ampliar `profiles` requiere ajustar `useAuth`, `configuracion` y el copiloto de datos: se hace en la misma etapa.
- La creación de usuarios depende de la Admin API; se ejecuta solo en el servidor.

## 7. Alcance de esta entrega (Etapa 1)

Roles, permisos base, administración de usuarios (alta con fecha de alta/baja, baja, reactivación, cambio de rol, historial) y legajo de empleado con asignaciones. Vacaciones, CxP/CxC, contabilidad ampliada y estados contables se implementan en las etapas siguientes, una por vez.
