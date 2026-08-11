"""Interfaces desacopladas: la aplicación no queda atada a un único modelo."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import pandas as pd


@dataclass
class ForecastResult:
    """Serie prevista con banda de confianza."""

    index: list[str]
    yhat: list[float]
    lower: list[float]
    upper: list[float]
    model_key: str
    model_version: str
    confidence_level: float = 0.9
    metrics: dict[str, float] = field(default_factory=dict)


class TimeSeriesForecastProvider(ABC):
    """Predicción de series temporales (ventas, costos, demanda)."""

    key: str
    version: str

    @abstractmethod
    def supports(self, history: pd.DataFrame, horizon: int) -> bool: ...

    @abstractmethod
    def forecast(self, history: pd.DataFrame, horizon: int, freq: str) -> ForecastResult: ...


class RegressionProvider(ABC):
    """Regresión supervisada sobre variables tabulares (ticket promedio, margen)."""

    key: str
    version: str

    @abstractmethod
    def fit_predict(self, train: pd.DataFrame, future: pd.DataFrame, target: str) -> pd.Series: ...


class ClusteringProvider(ABC):
    """Agrupamiento de parques, puntos de venta o productos."""

    key: str

    @abstractmethod
    def cluster(self, features: pd.DataFrame) -> pd.Series: ...


class AnomalyDetectionProvider(ABC):
    """Detección de ventas o costos atípicos."""

    key: str

    @abstractmethod
    def detect(self, features: pd.DataFrame) -> pd.Series: ...


class GenerativeReportProvider(ABC):
    """Informe en lenguaje natural: solo puede usar cifras ya calculadas."""

    key: str

    @abstractmethod
    def write(self, payload: dict, language: str = "es") -> dict: ...
