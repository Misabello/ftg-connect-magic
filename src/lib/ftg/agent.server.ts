import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient<any, any, any>;

/** Arma un resumen compacto de la base para dar contexto al agente. */
export async function buildDataSnapshot(supabase: AnyClient) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    locations,
    pos,
    products,
    sales,
    saleItems,
    cashSessions,
    customers,
    stock,
    finance,
    photos,
    souvenirs,
    opsDays,
    incidents,
  ] = await Promise.all([
    supabase.from("locations").select("id,code,name,city,country_code,currency_code,is_active"),
    supabase.from("points_of_sale").select("id,code,name,pos_type,location_id,is_active"),
    supabase.from("products").select("id,sku,name,kind,cost,tax_rate,is_active").limit(200),
    supabase
      .from("sales")
      .select("id,sale_number,location_id,point_of_sale_id,total,currency_code,status,source,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("sale_items").select("description,quantity,line_total,sale_id").limit(500),
    supabase
      .from("cash_sessions")
      .select("id,status,opening_amount,expected_amount,counted_amount,difference_amount,opened_at,location_id")
      .order("opened_at", { ascending: false })
      .limit(50),
    supabase.from("customers").select("id,name,kind,country_code,is_active").limit(100),
    supabase.from("stock_levels").select("product_id,location_id,quantity,min_quantity,damaged_quantity").limit(300),
    supabase
      .from("finance_documents")
      .select("kind,status,concept,amount,paid_amount,currency_code,issued_on,due_on")
      .limit(200),
    supabase.from("photos").select("id,status,has_consent,location_id,captured_at").limit(300),
    supabase.from("ai_souvenirs").select("id,status,estimated_cost,created_at").limit(200),
    supabase
      .from("operation_days")
      .select("id,day,status,manager_name,sales_target,expected_visitors,location_id")
      .order("day", { ascending: false })
      .limit(30),
    supabase.from("operation_incidents").select("title,category,severity,status,created_at").limit(50),
  ]);

  return {
    generado_en: new Date().toISOString(),
    sedes: locations.data ?? [],
    puntos_de_venta: pos.data ?? [],
    productos: products.data ?? [],
    ventas_ultimos_30_dias: sales.data ?? [],
    items_de_venta: saleItems.data ?? [],
    sesiones_de_caja: cashSessions.data ?? [],
    clientes: customers.data ?? [],
    stock: stock.data ?? [],
    documentos_financieros: finance.data ?? [],
    fotografias: photos.data ?? [],
    recuerdos_ia: souvenirs.data ?? [],
    jornadas_operativas: opsDays.data ?? [],
    incidentes: incidents.data ?? [],
  };
}

export const AGENT_SYSTEM_PROMPT = `Sos "FTG Copiloto", el asistente de datos del ERP de Fotográfica (FTG).
Respondés SIEMPRE en español rioplatense, de forma breve y concreta.
Analizás únicamente el snapshot JSON de la base que se te entrega: ventas, sedes, puntos de venta, cajas, stock, clientes, finanzas, fotografías, recuerdos IA y operaciones.
Reglas:
- Si un dato no está en el snapshot, decilo claramente en lugar de inventarlo.
- Usá montos con su moneda (ARS/BRL) y fechas legibles.
- Cuando sirva, respondé con listas o cifras clave en vez de párrafos largos.
- Podés sugerir en qué módulo del ERP ver el detalle (POS, Sedes, Administración, Inventario, Reportes, Fotografías, Operaciones).`;