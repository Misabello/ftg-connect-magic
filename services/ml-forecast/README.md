# Servicio de predicción FTG

Servicio Python (FastAPI) que genera predicciones de ventas, costos y demanda de productos
para la plataforma FTG, y redacta el informe ejecutivo en lenguaje natural.

## Principios

- **Nada de datos inventados.** Si no hay historial suficiente el servicio responde
  `datos_insuficientes` y la aplicación muestra el estado correspondiente.
- **Baseline obligatorio.** Todo modelo compite contra una predicción estacional simple
  mediante validación temporal (backtesting); gana el de menor error.
- **Proveedores desacoplados.** `app/providers/base.py` define las interfaces
  (series temporales, regresión, clustering, anomalías, informe generativo).
  Cambiar de modelo es agregar una clase, no reescribir la aplicación.
- **El texto no calcula.** El informe generativo solo redacta sobre cifras ya calculadas.

## Modelos

| Uso | Implementación |
| --- | --- |
| Referencia base | `SeasonalNaiveProvider` |
| Comparador tabular | `GradientBoostingProvider` (scikit-learn) |
| Modelo fundacional | `HuggingFaceForecastProvider` (`HF_FORECAST_MODEL`, por defecto `amazon/chronos-bolt-small`) |
| Agrupamiento | `KMeansClusteringProvider` |
| Anomalías | `IsolationForestAnomalyProvider` |
| Informe | `LovableGatewayReportProvider` |

El modelo de Hugging Face queda desactivado salvo que se defina `ENABLE_HF_FORECAST=true`,
para que el servicio arranque liviano.

## Variables de entorno

```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   # lectura del historial
ML_SERVICE_TOKEN                          # token que envía la aplicación
LOVABLE_API_KEY                           # informe generativo
HF_FORECAST_MODEL, ENABLE_HF_FORECAST     # modelo fundacional opcional
REPORT_MODEL                              # modelo de redacción
```

## Ejecución

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Despliegue: `docker build -t ftg-ml . && docker run -p 8080:8080 --env-file .env ftg-ml`
(compatible con Cloud Run, Fly.io o cualquier contenedor).

## Endpoints

- `GET /health`
- `POST /predict` → `{ target, granularity, horizon, location_id, language, with_report }`

La aplicación consume este servicio desde `src/lib/ftg/predictions.functions.ts`
usando `ML_SERVICE_URL` y `ML_SERVICE_TOKEN`.
