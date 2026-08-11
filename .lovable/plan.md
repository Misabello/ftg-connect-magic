# Mejora del reporte de Predicciones con IA

## Diagnóstico previo (lo pedido en "antes de implementar")

1. **Componente actual del reporte**: `src/routes/_authenticated/supervisores.predicciones.tsx` (440 líneas) — formulario de generación + detalle del job (resumen, gráfico, tabla, recomendaciones).
2. **Librería de gráficos**: `recharts` (ya instalada, usada en esa misma ruta).
3. **Cómo se generan las métricas**: `backtest()` en `src/lib/ftg/predictions.engine.ts`; se persisten en `ml_model_evaluations` desde `src/lib/ftg/predictions.run.server.ts` (mae, rmse, mape, wape, bias, interval_coverage, folds, beats_baseline).
4. **Cálculo del total**: suma de `forecast[i].value` por período en `predictions.run.server.ts`; se guarda en `ml_generated_reports.content.total_estimado`. Se validará contra la suma de filas de `ml_predictions`.
5. **Por qué los intervalos son tan amplios**: `spread = 1.28 * sigma * sqrt(1 + h/period)` donde `sigma` es el desvío de los residuos de la serie **diaria con ceros rellenados** (`fillDaily`). Los días sin venta inflan la varianza, `sigma` supera al nivel previsto y entonces `lower` queda truncado en 0 y `upper` se dispara. Se corrige calculando la incertidumbre sobre residuos relativos/robustos (MAD) y usando cuantiles P10/P50/P90 con piso en 0 marcado como "truncado".
6. **Componentes a modificar/crear**: ver abajo.
7. **Sin datos ficticios**: todo sale de `ml_predictions`, `ml_model_evaluations`, `ml_generated_reports`, `ml_recommendations` y del histórico real.

## Cambios

### Motor y backend
- `predictions.engine.ts`: incertidumbre robusta (MAD sobre residuos), cuantiles P10/P50/P90, ancho relativo del intervalo, flag `lowerClamped`, degradación del nivel de confianza cuando el rango es excesivo.
- `predictions.run.server.ts`: guardar cuantiles y ancho relativo, calcular el nivel de confiabilidad (Alta/Media/Baja/No confiable) según `beatsBaseline` + WAPE + ancho de intervalos + cantidad de datos, y reescribir el prompt del informe con la estructura pedida (resumen, resultados, confiabilidad, patrones, riesgos, recomendaciones, limitaciones, próximos pasos) y tono profesional. Recomendaciones conservadoras si `beatsBaseline = false`.

### Nuevos módulos front
- `src/lib/ftg/predictions.report.ts`: formato local (ARS sin decimales, fechas `12 ago 2026`, porcentajes), cálculo de KPIs, reglas de confiabilidad, hallazgos automáticos y validaciones (totales, fechas consecutivas, intervalos inválidos, duplicados, moneda mezclada).
- `src/lib/ftg/predictions.export.ts`: XLSX multi-hoja (Resumen, Predicción diaria, Predicción semanal, Histórico, Métricas, Recomendaciones, Configuración), CSV configurable, JSON técnico, PNG del gráfico y PDF ejecutivo.
- Componentes en `src/components/ftg/predicciones/`: `ReportHeader`, `KpiCards`, `ReliabilityCard`, `MetricsExplainer`, `ForecastChart` (histórico vs predicción, banda, objetivo, línea de corte, controles diario/semanal/mensual, zoom, toggles), `ResultsTable` (orden, filtros, búsqueda, paginación, agrupación, totales, datos técnicos), `FindingsSection`, `RecommendationsBoard`, `ExportMenu`, `ShareMenu`, `ModelComparison`.

### Ruta
- `supervisores.predicciones.tsx` pasa a componer estos bloques (sin duplicar tablas ni jobs).

### Google Sheets
- Opción visible en el menú Exportar con flujo OAuth. Mientras el conector de Google no esté habilitado en el proyecto, muestra "Conexión con Google Sheets pendiente" y ofrece XLSX/CSV; no simula éxito.

### Pruebas
- Vitest para formatos, KPIs, reglas de confiabilidad, validaciones y coherencia de totales exportados.

## Nota
Google Sheets requiere activar el conector de Google (OAuth por usuario). Lo dejo preparado y te aviso para conectarlo.
