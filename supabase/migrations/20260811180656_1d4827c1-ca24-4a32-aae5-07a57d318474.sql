-- 1) Deduplicar clientes por (organizacion, nombre normalizado)
WITH ranked AS (
  SELECT id, organization_id, lower(btrim(name)) AS key,
         first_value(id) OVER (PARTITION BY organization_id, lower(btrim(name)) ORDER BY created_at, id) AS keeper
  FROM public.customers
), dupes AS (
  SELECT id, keeper FROM ranked WHERE id <> keeper
)
UPDATE public.sales s SET customer_id = d.keeper FROM dupes d WHERE s.customer_id = d.id;

WITH ranked AS (
  SELECT id, organization_id, first_value(id) OVER (PARTITION BY organization_id, lower(btrim(name)) ORDER BY created_at, id) AS keeper
  FROM public.customers
), dupes AS (SELECT id, keeper FROM ranked WHERE id <> keeper)
UPDATE public.finance_documents f SET customer_id = d.keeper FROM dupes d WHERE f.customer_id = d.id;

WITH ranked AS (
  SELECT id, organization_id, first_value(id) OVER (PARTITION BY organization_id, lower(btrim(name)) ORDER BY created_at, id) AS keeper
  FROM public.customers
), dupes AS (SELECT id, keeper FROM ranked WHERE id <> keeper)
UPDATE public.invoice_documents i SET customer_id = d.keeper FROM dupes d WHERE i.customer_id = d.id;

WITH ranked AS (
  SELECT id, organization_id, first_value(id) OVER (PARTITION BY organization_id, lower(btrim(name)) ORDER BY created_at, id) AS keeper
  FROM public.customers
), dupes AS (SELECT id FROM ranked WHERE id <> keeper)
DELETE FROM public.customers c USING dupes d WHERE c.id = d.id;

-- Los clientes conservados quedan disponibles para toda la organizacion
UPDATE public.customers SET location_id = NULL WHERE kind = 'consumidor_final';

-- 2) Deduplicar proveedores por (organizacion, nombre normalizado)
WITH ranked AS (
  SELECT id, organization_id, first_value(id) OVER (PARTITION BY organization_id, lower(btrim(name)) ORDER BY created_at, id) AS keeper
  FROM public.suppliers
), dupes AS (SELECT id, keeper FROM ranked WHERE id <> keeper)
UPDATE public.finance_documents f SET supplier_id = d.keeper FROM dupes d WHERE f.supplier_id = d.id;

WITH ranked AS (
  SELECT id, organization_id, first_value(id) OVER (PARTITION BY organization_id, lower(btrim(name)) ORDER BY created_at, id) AS keeper
  FROM public.suppliers
), dupes AS (SELECT id, keeper FROM ranked WHERE id <> keeper)
UPDATE public.invoice_documents i SET supplier_id = d.keeper FROM dupes d WHERE i.supplier_id = d.id;

WITH ranked AS (
  SELECT id, organization_id, first_value(id) OVER (PARTITION BY organization_id, lower(btrim(name)) ORDER BY created_at, id) AS keeper
  FROM public.suppliers
), dupes AS (SELECT id FROM ranked WHERE id <> keeper)
DELETE FROM public.suppliers s USING dupes d WHERE s.id = d.id;

-- 3) Evitar que vuelvan a duplicarse
CREATE UNIQUE INDEX IF NOT EXISTS customers_org_name_uniq ON public.customers (organization_id, lower(btrim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS suppliers_org_name_uniq ON public.suppliers (organization_id, lower(btrim(name)));