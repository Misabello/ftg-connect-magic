import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMPLOYMENT_STATUSES } from "@/lib/ftg/hr";

const nullableText = z.string().trim().max(300).nullable().optional();
const nullableDate = z.string().trim().min(8).max(10).nullable().optional();

const employeeSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  employee_number: nullableText,
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  document_type: nullableText,
  document_number: nullableText,
  tax_id: nullableText,
  birth_date: nullableDate,
  nationality: nullableText,
  gender: nullableText,
  marital_status: nullableText,
  personal_email: z.string().trim().email().max(255).nullable().optional().or(z.literal("")),
  phone: nullableText,
  address: nullableText,
  city: nullableText,
  region: nullableText,
  country_code: z.string().trim().length(2).nullable().optional(),
  emergency_contact_name: nullableText,
  emergency_contact_phone: nullableText,
  position: nullableText,
  department: nullableText,
  supervisor_employee_id: z.string().uuid().nullable().optional(),
  contract_type: nullableText,
  work_schedule: nullableText,
  work_shift: nullableText,
  hire_date: nullableDate,
  termination_date: nullableDate,
  termination_reason: nullableText,
  employment_status: z.enum(EMPLOYMENT_STATUSES),
  primary_location_id: z.string().uuid().nullable().optional(),
  primary_point_of_sale_id: z.string().uuid().nullable().optional(),
  cost_center: nullableText,
  reference_currency: nullableText,
  notes: z.string().trim().max(2000).nullable().optional(),
});

function clean<T extends Record<string, unknown>>(input: T) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) out[key] = value === "" ? null : value;
  return out;
}

/** Listado de legajos con sus asignaciones. */
export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: employees, error }, { data: assignments }] = await Promise.all([
      context.supabase.from("employees").select("*").order("last_name"),
      context.supabase.from("employee_venue_assignments").select("*"),
    ]);
    if (error) throw new Error(error.message);
    return { employees: employees ?? [], assignments: assignments ?? [] };
  });

/** Alta o edición del legajo. */
export const saveEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => employeeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const payload = clean(rest);
    const table = context.supabase.from("employees");
    const result = id
      ? await table.update(payload).eq("id", id).select("id").single()
      : await table.insert({ ...payload, created_by: context.userId }).select("id").single();
    if (result.error) throw new Error(result.error.message);

    await context.supabase.from("audit_logs").insert({
      organization_id: data.organization_id,
      user_id: context.userId,
      action: id ? "employee.update" : "employee.create",
      entity: "employees",
      entity_id: result.data.id,
      details: { name: `${data.first_name} ${data.last_name}`, status: data.employment_status },
    });
    return { id: result.data.id as string };
  });

/** Asigna un empleado a una sede y punto de venta. */
export const saveEmployeeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        employee_id: z.string().uuid(),
        location_id: z.string().uuid().nullable().optional(),
        point_of_sale_id: z.string().uuid().nullable().optional(),
        valid_from: z.string().min(8).max(10),
        valid_to: z.string().min(8).max(10).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("employee_venue_assignments").insert({
      employee_id: data.employee_id,
      location_id: data.location_id ?? null,
      point_of_sale_id: data.point_of_sale_id ?? null,
      valid_from: data.valid_from,
      valid_to: data.valid_to ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cierra una asignación vigente. */
export const endEmployeeAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), valid_to: z.string().min(8).max(10) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("employee_venue_assignments")
      .update({ valid_to: data.valid_to })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Historial de auditoría del legajo. */
export const listEmployeeHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ employee_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("audit_logs")
      .select("id, action, entity, details, created_at, user_id")
      .eq("entity", "employees")
      .eq("entity_id", data.employee_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
