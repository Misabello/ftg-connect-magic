"""Modelos candidatos de series temporales, del más simple al fundacional."""
from __future__ import annotations

import os

import numpy as np
import pandas as pd

from .base import ForecastResult, TimeSeriesForecastProvider

Z_90 = 1.645


def _index(last: pd.Timestamp, horizon: int, freq: str) -> list[str]:
    return [d.date().isoformat() for d in pd.date_range(last, periods=horizon + 1, freq=freq)[1:]]


class SeasonalNaiveProvider(TimeSeriesForecastProvider):
    """Predicción base obligatoria: todo modelo debe superarla para ser elegido."""

    key = "seasonal_naive"
    version = "1.0"

    def supports(self, history: pd.DataFrame, horizon: int) -> bool:
        return len(history) >= 7

    def forecast(self, history: pd.DataFrame, horizon: int, freq: str) -> ForecastResult:
        y = history["y"].to_numpy(dtype=float)
        season = 7 if freq == "D" else 4 if freq == "W" else 12
        season = min(season, len(y))
        pattern = y[-season:]
        yhat = np.array([pattern[i % season] for i in range(horizon)], dtype=float)
        sigma = float(np.std(y[-season * 2:] if len(y) >= season * 2 else y)) or 0.0
        return ForecastResult(
            index=_index(history["ds"].iloc[-1], horizon, freq),
            yhat=yhat.tolist(),
            lower=(yhat - Z_90 * sigma).clip(min=0).tolist(),
            upper=(yhat + Z_90 * sigma).tolist(),
            model_key=self.key,
            model_version=self.version,
        )


class GradientBoostingProvider(TimeSeriesForecastProvider):
    """Comparador tabular con variables de calendario y rezagos."""

    key = "gradient_boosting"
    version = "1.0"

    def supports(self, history: pd.DataFrame, horizon: int) -> bool:
        return len(history) >= 45

    def _features(self, df: pd.DataFrame) -> pd.DataFrame:
        out = pd.DataFrame({"dow": df["ds"].dt.dayofweek, "dom": df["ds"].dt.day, "month": df["ds"].dt.month})
        for lag in (1, 7, 14):
            out[f"lag_{lag}"] = df["y"].shift(lag)
        out["roll_7"] = df["y"].shift(1).rolling(7).mean()
        return out

    def forecast(self, history: pd.DataFrame, horizon: int, freq: str) -> ForecastResult:
        from sklearn.ensemble import HistGradientBoostingRegressor

        df = history.copy()
        feats = self._features(df)
        mask = feats.notna().all(axis=1)
        model = HistGradientBoostingRegressor(max_iter=250)
        model.fit(feats[mask], df.loc[mask, "y"])
        resid = df.loc[mask, "y"] - model.predict(feats[mask])
        sigma = float(np.std(resid))

        preds: list[float] = []
        work = df.copy()
        for step in _index(df["ds"].iloc[-1], horizon, freq):
            work = pd.concat([work, pd.DataFrame({"ds": [pd.Timestamp(step)], "y": [np.nan]})], ignore_index=True)
            row = self._features(work).iloc[[-1]].fillna(work["y"].mean())
            value = float(model.predict(row)[0])
            preds.append(max(value, 0.0))
            work.iloc[-1, work.columns.get_loc("y")] = value

        yhat = np.array(preds)
        return ForecastResult(
            index=_index(df["ds"].iloc[-1], horizon, freq),
            yhat=yhat.tolist(),
            lower=(yhat - Z_90 * sigma).clip(min=0).tolist(),
            upper=(yhat + Z_90 * sigma).tolist(),
            model_key=self.key,
            model_version=self.version,
        )


class HuggingFaceForecastProvider(TimeSeriesForecastProvider):
    """
    Modelo fundacional de series temporales descargado de Hugging Face Hub.
    El identificador se configura por variable de entorno: la aplicación
    no queda atada a un modelo puntual.
    """

    key = "hf_timeseries"

    def __init__(self, repo_id: str | None = None):
        self.repo_id = repo_id or os.environ.get("HF_FORECAST_MODEL", "amazon/chronos-bolt-small")
        self.version = self.repo_id
        self._pipeline = None

    def supports(self, history: pd.DataFrame, horizon: int) -> bool:
        return len(history) >= 60 and os.environ.get("ENABLE_HF_FORECAST", "false").lower() == "true"

    def _load(self):
        if self._pipeline is None:
            from chronos import BaseChronosPipeline  # dependencia del modelo elegido

            self._pipeline = BaseChronosPipeline.from_pretrained(self.repo_id)
        return self._pipeline

    def forecast(self, history: pd.DataFrame, horizon: int, freq: str) -> ForecastResult:
        import torch

        pipeline = self._load()
        context = torch.tensor(history["y"].to_numpy(dtype="float32"))
        quantiles, _ = pipeline.predict_quantiles(
            context=context, prediction_length=horizon, quantile_levels=[0.05, 0.5, 0.95]
        )
        q = quantiles[0].numpy()
        return ForecastResult(
            index=_index(history["ds"].iloc[-1], horizon, freq),
            yhat=q[:, 1].tolist(),
            lower=q[:, 0].clip(min=0).tolist(),
            upper=q[:, 2].tolist(),
            model_key=self.key,
            model_version=self.version,
        )


def candidates() -> list[TimeSeriesForecastProvider]:
    return [SeasonalNaiveProvider(), GradientBoostingProvider(), HuggingFaceForecastProvider()]
