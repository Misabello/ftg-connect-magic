"""Orquestación: validar datos, elegir modelo por backtesting y explicar el resultado."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .metrics import evaluate
from .providers.timeseries import candidates
from .providers.unsupervised import IsolationForestAnomalyProvider


def backtest(provider, series: pd.DataFrame, horizon: int, freq: str) -> dict[str, float] | None:
    """Validación temporal: se entrena con el pasado y se evalúa contra el futuro conocido."""
    holdout = min(horizon, max(3, len(series) // 5))
    if len(series) - holdout < 10 or not provider.supports(series.iloc[:-holdout], holdout):
        return None
    train, test = series.iloc[:-holdout], series.iloc[-holdout:]
    result = provider.forecast(train, holdout, freq)
    return evaluate(test["y"].to_numpy(), np.asarray(result.yhat), result.lower, result.upper)


def select_model(series: pd.DataFrame, horizon: int, freq: str):
    """Devuelve (proveedor, métricas, comparativa). El baseline es la referencia a superar."""
    scoreboard = []
    for provider in candidates():
        if not provider.supports(series, horizon):
            continue
        metrics = backtest(provider, series, horizon, freq)
        if metrics is None:
            continue
        scoreboard.append((provider, metrics))
    if not scoreboard:
        return None, None, []
    scoreboard.sort(key=lambda item: item[1]["wape"] if not np.isnan(item[1]["wape"]) else item[1]["rmse"])
    best_provider, best_metrics = scoreboard[0]
    comparison = [{"model": p.key, "version": p.version, **m} for p, m in scoreboard]
    return best_provider, best_metrics, comparison


def anomalies(series: pd.DataFrame) -> list[str]:
    flags = IsolationForestAnomalyProvider().detect(series[["y"]])
    return [d.date().isoformat() for d, flag in zip(series["ds"], flags) if flag]


def run(series: pd.DataFrame, horizon: int, freq: str) -> dict:
    provider, metrics, comparison = select_model(series, horizon, freq)
    if provider is None:
        return {"status": "datos_insuficientes"}
    forecast = provider.forecast(series, horizon, freq)
    history_mean = float(series["y"].tail(horizon).mean()) if len(series) else 0.0
    expected = float(np.mean(forecast.yhat))
    return {
        "status": "ok",
        "model": {"key": provider.key, "version": provider.version},
        "metrics": metrics,
        "model_comparison": comparison,
        "confidence_level": forecast.confidence_level,
        "forecast": [
            {"period": p, "expected": y, "lower": lo, "upper": up}
            for p, y, lo, up in zip(forecast.index, forecast.yhat, forecast.lower, forecast.upper)
        ],
        "history_tail": [
            {"period": d.date().isoformat(), "value": float(v)}
            for d, v in zip(series["ds"].tail(horizon * 2), series["y"].tail(horizon * 2))
        ],
        "variation_vs_previous": {
            "previous_average": history_mean,
            "expected_average": expected,
            "change_ratio": (expected - history_mean) / history_mean if history_mean else None,
        },
        "anomalies": anomalies(series),
    }
