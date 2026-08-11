import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Estados de cuenta del usuario en la plataforma. */
export const USER_STATUSES = [
  "invitado",
  "activo",
  "suspendido",
  "baja_programada",
  "inactivo",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

const createSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9._-]+$/i, "Usuario inválido").nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  tax_id: z.string().trim().max(20).nullable().optional(),
  document_number: z.string().trim().max(30).nullable().optional(),
  birth_date: z.string().trim().min(8).max(10).nullable().optional(),
  job_title: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(600).nullable().optional(),
  role: z.string().trim().min(2).max(40),
  organization_id: z.string().uuid().nullable().optional(),
  country_code: z.string().trim().length(2).nullable().optional(),
  default_location_id: z.string().uuid().nullable().optional(),
  point_of_sale_ids: z.array(z.string().uuid()).max(50).default([]),
  start_date: z.string().trim().min(8).max(10),
  end_date: z.string().trim().min(8).max(10).nullable().optional(),
  send_invite: z.boolean().default(true),
  employee_id: z.string().uuid().nullable().optional(),
});

/** Verifica en el servidor que el llamador pueda administrar usuarios. */
async function assertUserAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("can_manage_users", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo un Administrador puede gestionar usuarios.");
}

async function writeAudit(
  admin: any,
  entry: { user_id: string; action: string; entity_id: string; details: Record<string, unknown> },
) {
  await admin.from("audit_logs").insert({
    user_id: entry.user_id,
    action: entry.action,
    entity: "users",
    entity_id: entry.entity_id,
    details: entry.details,
  });
}

/** Listado de usuarios con rol, alcance, estado y último acceso. */
export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: profiles, error }, { data: roles }, { data: employees }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, first_name, last_name, username, email, phone, tax_id, document_number, birth_date, job_title, notes, status, country_code, organization_id, default_location_id, start_date, end_date, deactivated_at, last_sign_in_at, created_at, is_active",
        )
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id, user_id, role, location_id, point_of_sale_id, valid_from, valid_to"),
      supabase.from("employees").select("id, user_id, first_name, last_name, employee_number, employment_status"),
    ]);
    if (error) throw new Error(error.message);
    return {
      profiles: profiles ?? [],
      roles: roles ?? [],
      employees: employees ?? [],
    };
  });

/** Alta de usuario mediante Admin API (nunca desde el navegador). */
export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertUserAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const siteUrl = process.env["PUBLIC_SITE_URL"] ?? undefined;

    const meta = { full_name: `${data.first_name} ${data.last_name}`.trim() };
    let userId: string | null = null;

    if (data.send_invite) {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: meta,
        ...(siteUrl ? { redirectTo: siteUrl } : {}),
      });
      if (error) throw new Error(error.message);
      userId = invited.user?.id ?? null;
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: meta,
      });
      if (error) throw new Error(error.message);
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("No se pudo crear la cuenta.");

    const today = new Date().toISOString().slice(0, 10);
    const status: UserStatus = data.send_invite
      ? "invitado"
      : data.start_date > today
        ? "invitado"
        : "activo";

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        full_name: meta.full_name,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        username: data.username ?? null,
        phone: data.phone ?? null,
        tax_id: data.tax_id ?? null,
        document_number: data.document_number ?? null,
        birth_date: data.birth_date ?? null,
        job_title: data.job_title ?? null,
        notes: data.notes ?? null,
        organization_id: data.organization_id ?? null,
        country_code: data.country_code ?? null,
        default_location_id: data.default_location_id ?? null,
        start_date: data.start_date,
        end_date: data.end_date ?? null,
        status,
        is_active: true,
      });
    if (profileError)
      throw new Error(
        profileError.message.includes("profiles_username_key")
          ? "Ese nombre de usuario ya está en uso."
          : profileError.message,
      );

    // Rol principal + alcance por punto de venta
    const roleRows =
      data.point_of_sale_ids.length > 0
        ? data.point_of_sale_ids.map((posId) => ({
            user_id: userId!,
            role: data.role,
            organization_id: data.organization_id ?? null,
            country_code: data.country_code ?? null,
            location_id: data.default_location_id ?? null,
            point_of_sale_id: posId,
            valid_from: data.start_date,
            valid_to: data.end_date ?? null,
            assigned_by: context.userId,
          }))
        : [
            {
              user_id: userId,
              role: data.role,
              organization_id: data.organization_id ?? null,
              country_code: data.country_code ?? null,
              location_id: data.default_location_id ?? null,
              valid_from: data.start_date,
              valid_to: data.end_date ?? null,
              assigned_by: context.userId,
            },
          ];
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert(roleRows as never);
    if (roleError) throw new Error(roleError.message);

    if (data.employee_id) {
      await supabaseAdmin.from("employees").update({ user_id: userId }).eq("id", data.employee_id);
    }

    await writeAudit(supabaseAdmin, {
      user_id: context.userId,
      action: "user.create",
      entity_id: userId,
      details: { email: data.email, role: data.role, start_date: data.start_date, end_date: data.end_date ?? null },
    });

    return { userId, status };
  });

const updateSchema = z.object({
  user_id: z.string().uuid(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  username: z.string().trim().min(3).max(40).regex(/^[a-z0-9._-]+$/i, "Usuario inválido").nullable().optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).nullable().optional(),
  tax_id: z.string().trim().max(20).nullable().optional(),
  document_number: z.string().trim().max(30).nullable().optional(),
  birth_date: z.string().trim().min(8).max(10).nullable().optional(),
  job_title: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(600).nullable().optional(),
  country_code: z.string().trim().length(2).nullable().optional(),
  default_location_id: z.string().uuid().nullable().optional(),
  start_date: z.string().trim().min(8).max(10),
  end_date: z.string().trim().min(8).max(10).nullable().optional(),
});

/** Modificación de la ficha de un usuario existente (ABM). */
export const updateUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertUserAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fullName = `${data.first_name} ${data.last_name}`.trim();

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        full_name: fullName,
        username: data.username ?? null,
        email: data.email,
        phone: data.phone ?? null,
        tax_id: data.tax_id ?? null,
        document_number: data.document_number ?? null,
        birth_date: data.birth_date ?? null,
        job_title: data.job_title ?? null,
        notes: data.notes ?? null,
        country_code: data.country_code ?? null,
        default_location_id: data.default_location_id ?? null,
        start_date: data.start_date,
        end_date: data.end_date ?? null,
      })
      .eq("id", data.user_id);
    if (error) {
      throw new Error(
        error.message.includes("profiles_username_key")
          ? "Ese nombre de usuario ya está en uso."
          : error.message,
      );
    }

    await supabaseAdmin.auth.admin
      .updateUserById(data.user_id, { email: data.email, user_metadata: { full_name: fullName } })
      .catch(() => undefined);

    await writeAudit(supabaseAdmin, {
      user_id: context.userId,
      action: "user.update",
      entity_id: data.user_id,
      details: { email: data.email, username: data.username ?? null, job_title: data.job_title ?? null },
    });
    return { ok: true };
  });

/** Cambia el estado de la cuenta; suspender o dar de baja revoca las sesiones activas. */
export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        status: z.enum(USER_STATUSES),
        end_date: z.string().min(8).max(10).nullable().optional(),
        reason: z.string().trim().max(400).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertUserAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const blocked = data.status === "suspendido" || data.status === "inactivo";

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        status: data.status,
        is_active: !blocked,
        ...(data.end_date === undefined ? {} : { end_date: data.end_date }),
        deactivated_at: blocked ? new Date().toISOString() : null,
      })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);

    // Revoca sesiones activas sin borrar historial operativo ni financiero.
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: blocked ? "876000h" : "none",
    });
    if (blocked) await supabaseAdmin.auth.admin.signOut(data.user_id, "global").catch(() => undefined);

    await writeAudit(supabaseAdmin, {
      user_id: context.userId,
      action: `user.${data.status}`,
      entity_id: data.user_id,
      details: { reason: data.reason ?? null, end_date: data.end_date ?? null },
    });
    return { ok: true };
  });

/** Asigna o quita un rol a un usuario. */
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: z.string().trim().min(2).max(40),
        enabled: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertUserAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role, assigned_by: context.userId } as never);
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role as never);
      if (error) throw new Error(error.message);
    }
    await writeAudit(supabaseAdmin, {
      user_id: context.userId,
      action: data.enabled ? "user.role_granted" : "user.role_revoked",
      entity_id: data.user_id,
      details: { role: data.role },
    });
    return { ok: true };
  });

/** Envía un enlace de restablecimiento de acceso. */
export const resetUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ user_id: z.string().uuid(), email: z.string().email() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertUserAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${process.env["PUBLIC_SITE_URL"] ?? ""}/auth`,
    });
    if (error) throw new Error(error.message);
    await writeAudit(supabaseAdmin, {
      user_id: context.userId,
      action: "user.reset_access",
      entity_id: data.user_id,
      details: { email: data.email },
    });
    return { ok: true };
  });

/** Historial de auditoría de un usuario. */
export const listUserHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ user_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, entity, entity_id, details, created_at, user_id")
      .or(`entity_id.eq.${data.user_id},user_id.eq.${data.user_id}`)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Aplica las bajas programadas cuya fecha ya venció. */
export const applyScheduledDeactivations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertUserAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data: due } = await supabaseAdmin
      .from("profiles")
      .select("id, email, end_date, status")
      .not("end_date", "is", null)
      .lte("end_date", today)
      .neq("status", "inactivo");

    let processed = 0;
    for (const row of due ?? []) {
      await supabaseAdmin
        .from("profiles")
        .update({ status: "inactivo", is_active: false, deactivated_at: new Date().toISOString() })
        .eq("id", row.id);
      await supabaseAdmin.auth.admin.updateUserById(row.id, { ban_duration: "876000h" });
      await supabaseAdmin.auth.admin.signOut(row.id, "global").catch(() => undefined);
      await writeAudit(supabaseAdmin, {
        user_id: context.userId,
        action: "user.auto_deactivated",
        entity_id: row.id,
        details: { end_date: row.end_date },
      });
      processed += 1;
    }
    return { processed };
  });
