-- =========================================================
-- Predicciones con IA — Módulo Supervisores
-- =========================================================

CREATE TYPE public.ml_target_family AS ENUM ('ventas','costos','productos');
CREATE TYPE public.ml_granularity AS ENUM ('diario','semanal','mensual');
CREATE TYPE public.ml_job_status AS ENUM ('pendiente','en_cola','preparando_datos','entrenando','evaluando','generando_informe','completado','datos_insuficientes','error','cancelado');
CREATE TYPE public.ml_model_kind AS ENUM ('series_temporales','regresion','gradient_boosting','baseline','clustering','anomalias','asociacion','generativo');
CREATE TYPE public.ml_recommendation_action AS ENUM ('aumentar_stock','mantener','reducir','transferir','promocion','revisar_manual');
CREATE TYPE public.ml_recommendation_decision AS ENUM ('pendiente','aprobada','descartada','ajustada','reposicion_solicitada');

-- 1. Catálogo de objetivos ---------------------------------
CREATE TABLE public.ml_prediction_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  family public.ml_target_family NOT NULL,
  display_name text NOT NULL,
  display_name_pt text,
  description text,
  unit text NOT NULL DEFAULT 'moneda',
  min_history_days integer NOT NULL DEFAULT 60,
  min_observations integer NOT NULL DEFAULT 30,
  supports_product_detail boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ml_prediction_targets TO authenticated;
GRANT ALL ON public.ml_prediction_targets TO service_role;
ALTER TABLE public.ml_prediction_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_targets_read" ON public.ml_prediction_targets FOR SELECT TO authenticated USING (true);

-- 2. Modelos -----------------------------------------------
CREATE TABLE public.ml_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  version text NOT NULL DEFAULT 'v1',
  kind public.ml_model_kind NOT NULL,
  provider text NOT NULL DEFAULT 'huggingface',
  reference text,
  display_name text NOT NULL,
  is_baseline boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, version)
);
GRANT SELECT ON public.ml_models TO authenticated;
GRANT ALL ON public.ml_models TO service_role;
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_models_read" ON public.ml_models FOR SELECT TO authenticated USING (true);

-- 3. Trabajos de predicción --------------------------------
CREATE TABLE public.ml_prediction_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  country_code text,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  target_key text NOT NULL REFERENCES public.ml_prediction_targets(key),
  granularity public.ml_granularity NOT NULL DEFAULT 'diario',
  horizon_from date NOT NULL,
  horizon_to date NOT NULL,
  history_from date,
  history_to date,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency_code text NOT NULL DEFAULT 'ARS',
  status public.ml_job_status NOT NULL DEFAULT 'pendiente',
  status_message text,
  selected_model_id uuid REFERENCES public.ml_models(id) ON DELETE SET NULL,
  observations_used integer,
  history_days integer,
  metrics jsonb,
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  saved boolean NOT NULL DEFAULT false,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ml_jobs_org_idx ON public.ml_prediction_jobs (organization_id, requested_at DESC);
CREATE INDEX ml_jobs_loc_idx ON public.ml_prediction_jobs (location_id, requested_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.ml_prediction_jobs TO authenticated;
GRANT ALL ON public.ml_prediction_jobs TO service_role;
ALTER TABLE public.ml_prediction_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_jobs_read" ON public.ml_prediction_jobs FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id) OR requested_by = auth.uid());
CREATE POLICY "ml_jobs_insert" ON public.ml_prediction_jobs FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND (public.user_can_access_org(organization_id) OR public.user_can_access_location(location_id)));
CREATE POLICY "ml_jobs_update" ON public.ml_prediction_jobs FOR UPDATE TO authenticated
  USING (requested_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (requested_by = auth.uid() OR public.is_admin(auth.uid()));

-- 4. Evaluaciones de modelos -------------------------------
CREATE TABLE public.ml_model_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES public.ml_prediction_jobs(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.ml_models(id) ON DELETE CASCADE,
  target_key text NOT NULL REFERENCES public.ml_prediction_targets(key),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  backtest_from date,
  backtest_to date,
  folds integer,
  mae numeric,
  rmse numeric,
  wape numeric,
  mape numeric,
  bias numeric,
  interval_coverage numeric,
  beats_baseline boolean,
  is_selected boolean NOT NULL DEFAULT false,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ml_eval_job_idx ON public.ml_model_evaluations (job_id);
GRANT SELECT ON public.ml_model_evaluations TO authenticated;
GRANT ALL ON public.ml_model_evaluations TO service_role;
ALTER TABLE public.ml_model_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_eval_read" ON public.ml_model_evaluations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_prediction_jobs j WHERE j.id = job_id
    AND (public.user_can_access_org(j.organization_id) OR public.user_can_access_location(j.location_id) OR j.requested_by = auth.uid())));

-- 5. Predicciones ------------------------------------------
CREATE TABLE public.ml_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ml_prediction_jobs(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  is_history boolean NOT NULL DEFAULT false,
  actual_value numeric,
  predicted_value numeric,
  lower_bound numeric,
  upper_bound numeric,
  confidence_level numeric NOT NULL DEFAULT 0.8,
  target_value numeric,
  currency_code text,
  model_id uuid REFERENCES public.ml_models(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ml_pred_job_idx ON public.ml_predictions (job_id, period_start);
GRANT SELECT ON public.ml_predictions TO authenticated;
GRANT ALL ON public.ml_predictions TO service_role;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_pred_read" ON public.ml_predictions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_prediction_jobs j WHERE j.id = job_id
    AND (public.user_can_access_org(j.organization_id) OR public.user_can_access_location(j.location_id) OR j.requested_by = auth.uid())));

-- 6. Recomendaciones de productos --------------------------
CREATE TABLE public.ml_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ml_prediction_jobs(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  point_of_sale_id uuid REFERENCES public.points_of_sale(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  historical_sales numeric,
  forecast_demand numeric,
  stock_on_hand numeric,
  stock_in_transit numeric,
  coverage_days numeric,
  recommended_quantity numeric,
  estimated_margin numeric,
  stockout_risk numeric,
  overstock_risk numeric,
  confidence numeric,
  reason text,
  action public.ml_recommendation_action NOT NULL DEFAULT 'revisar_manual',
  decision public.ml_recommendation_decision NOT NULL DEFAULT 'pendiente',
  decided_quantity numeric,
  decided_by uuid,
  decided_at timestamptz,
  decision_comment text,
  currency_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ml_reco_job_idx ON public.ml_recommendations (job_id);
GRANT SELECT, UPDATE ON public.ml_recommendations TO authenticated;
GRANT ALL ON public.ml_recommendations TO service_role;
ALTER TABLE public.ml_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_reco_read" ON public.ml_recommendations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_prediction_jobs j WHERE j.id = job_id
    AND (public.user_can_access_org(j.organization_id) OR public.user_can_access_location(j.location_id) OR j.requested_by = auth.uid())));
CREATE POLICY "ml_reco_decide" ON public.ml_recommendations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_prediction_jobs j WHERE j.id = job_id
    AND (public.user_can_access_org(j.organization_id) OR public.user_can_access_location(j.location_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ml_prediction_jobs j WHERE j.id = job_id
    AND (public.user_can_access_org(j.organization_id) OR public.user_can_access_location(j.location_id))));

-- 7. Resultados reales -------------------------------------
CREATE TABLE public.ml_actual_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid REFERENCES public.ml_predictions(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.ml_prediction_jobs(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.ml_recommendations(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  actual_value numeric,
  predicted_value numeric,
  absolute_error numeric,
  percentage_error numeric,
  currency_code text,
  measured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ml_actual_results TO authenticated;
GRANT ALL ON public.ml_actual_results TO service_role;
ALTER TABLE public.ml_actual_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_actuals_read" ON public.ml_actual_results FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id) OR public.is_admin(auth.uid()));

-- 8. Informes generativos ----------------------------------
CREATE TABLE public.ml_generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.ml_prediction_jobs(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'es',
  model_reference text,
  summary text,
  content jsonb,
  disclaimer text NOT NULL DEFAULT 'Las predicciones son estimaciones basadas en información histórica y no garantizan resultados futuros.',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ml_reports_job_idx ON public.ml_generated_reports (job_id);
GRANT SELECT ON public.ml_generated_reports TO authenticated;
GRANT ALL ON public.ml_generated_reports TO service_role;
ALTER TABLE public.ml_generated_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_reports_read" ON public.ml_generated_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ml_prediction_jobs j WHERE j.id = job_id
    AND (public.user_can_access_org(j.organization_id) OR public.user_can_access_location(j.location_id) OR j.requested_by = auth.uid())));

-- 9. Escenarios --------------------------------------------
CREATE TABLE public.ml_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  base_job_id uuid REFERENCES public.ml_prediction_jobs(id) ON DELETE SET NULL,
  compare_job_id uuid REFERENCES public.ml_prediction_jobs(id) ON DELETE SET NULL,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency_code text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_scenarios TO authenticated;
GRANT ALL ON public.ml_scenarios TO service_role;
ALTER TABLE public.ml_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ml_scenarios_read" ON public.ml_scenarios FOR SELECT TO authenticated
  USING (public.user_can_access_org(organization_id) OR created_by = auth.uid());
CREATE POLICY "ml_scenarios_write" ON public.ml_scenarios FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.user_can_access_org(organization_id));
CREATE POLICY "ml_scenarios_update" ON public.ml_scenarios FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "ml_scenarios_delete" ON public.ml_scenarios FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- Triggers de updated_at -----------------------------------
CREATE TRIGGER ml_targets_upd BEFORE UPDATE ON public.ml_prediction_targets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ml_models_upd BEFORE UPDATE ON public.ml_models FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ml_jobs_upd BEFORE UPDATE ON public.ml_prediction_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ml_reco_upd BEFORE UPDATE ON public.ml_recommendations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER ml_scenarios_upd BEFORE UPDATE ON public.ml_scenarios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Catálogo inicial de objetivos ----------------------------
INSERT INTO public.ml_prediction_targets (key, family, display_name, display_name_pt, unit, min_history_days, min_observations, supports_product_detail, sort_order) VALUES
('ventas_totales_parque','ventas','Ventas totales por parque','Vendas totais por parque','moneda',60,30,false,10),
('ventas_punto_venta','ventas','Ventas por punto de venta','Vendas por ponto de venda','moneda',60,30,false,20),
('ventas_producto','ventas','Ventas por producto','Vendas por produto','moneda',90,40,true,30),
('ventas_categoria','ventas','Ventas por categoría','Vendas por categoria','moneda',90,40,true,40),
('ventas_fotografias','ventas','Ventas de fotografías','Vendas de fotografias','moneda',60,30,false,50),
('ventas_merchandising','ventas','Ventas de merchandising','Vendas de merchandising','moneda',60,30,false,60),
('cantidad_tickets','ventas','Cantidad de tickets','Quantidade de tickets','unidades',60,30,false,70),
('ticket_promedio','ventas','Ticket promedio','Ticket médio','moneda',60,30,false,80),
('costos_operativos','costos','Costos operativos','Custos operacionais','moneda',90,20,false,110),
('costos_parque','costos','Costos por parque','Custos por parque','moneda',90,20,false,120),
('costos_punto_venta','costos','Costos por punto de venta','Custos por ponto de venda','moneda',90,20,false,130),
('costos_productos','costos','Costos de productos','Custos de produtos','moneda',90,20,true,140),
('costos_impresion','costos','Costos de impresión','Custos de impressão','moneda',90,20,false,150),
('costos_logisticos','costos','Costos logísticos','Custos logísticos','moneda',90,20,false,160),
('costos_ia','costos','Costos de generación con IA','Custos de geração com IA','moneda',60,20,false,170),
('costos_personal','costos','Costos de personal','Custos de pessoal','moneda',120,20,false,180),
('demanda_producto','productos','Demanda futura por producto','Demanda futura por produto','unidades',90,40,true,210),
('productos_probables','productos','Productos con mayor probabilidad de venta','Produtos com maior probabilidade de venda','unidades',90,40,true,220),
('cantidad_recomendada','productos','Cantidad recomendada','Quantidade recomendada','unidades',90,40,true,230),
('productos_reponer','productos','Productos a reponer','Produtos a repor','unidades',60,30,true,240),
('riesgo_quiebre','productos','Riesgo de quiebre de stock','Risco de ruptura de estoque','porcentaje',60,30,true,250),
('riesgo_sobrestock','productos','Riesgo de sobrestock','Risco de excesso de estoque','porcentaje',60,30,true,260),
('productos_por_parque','productos','Productos sugeridos por parque','Produtos sugeridos por parque','unidades',90,40,true,270),
('productos_por_temporada','productos','Productos sugeridos por temporada','Produtos sugeridos por temporada','unidades',180,60,true,280),
('combinaciones_recomendadas','productos','Promociones o combinaciones recomendadas','Promoções ou combinações recomendadas','unidades',90,40,true,290);

-- Modelos candidatos registrados ---------------------------
INSERT INTO public.ml_models (key, version, kind, provider, reference, display_name, is_baseline) VALUES
('baseline_estacional','v1','baseline','interno',NULL,'Referencia estacional',true),
('chronos_bolt_base','v1','series_temporales','huggingface','amazon/chronos-bolt-base','Modelo fundacional de series temporales A',false),
('timesfm','v1','series_temporales','huggingface','google/timesfm-2.0-500m-pytorch','Modelo fundacional de series temporales B',false),
('patchtst','v1','series_temporales','huggingface','ibm-granite/granite-timeseries-patchtst','Transformer de series temporales',false),
('gradient_boosting','v1','gradient_boosting','scikit-learn',NULL,'Modelo de comparación por atributos',false),
('kmeans_parques','v1','clustering','scikit-learn',NULL,'Agrupamiento de parques y productos',false),
('isolation_forest','v1','anomalias','scikit-learn',NULL,'Detección de comportamientos atípicos',false);