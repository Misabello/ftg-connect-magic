"""Clustering y detección de anomalías: complementan la predicción."""
from __future__ import annotations

import pandas as pd

from .base import AnomalyDetectionProvider, ClusteringProvider


class KMeansClusteringProvider(ClusteringProvider):
    key = "kmeans"

    def cluster(self, features: pd.DataFrame) -> pd.Series:
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler

        if len(features) < 3:
            return pd.Series([0] * len(features), index=features.index)
        k = min(4, max(2, len(features) // 3))
        scaled = StandardScaler().fit_transform(features.fillna(0))
        return pd.Series(KMeans(n_clusters=k, n_init=10, random_state=7).fit_predict(scaled), index=features.index)


class IsolationForestAnomalyProvider(AnomalyDetectionProvider):
    key = "isolation_forest"

    def detect(self, features: pd.DataFrame) -> pd.Series:
        from sklearn.ensemble import IsolationForest

        if len(features) < 12:
            return pd.Series([False] * len(features), index=features.index)
        flags = IsolationForest(contamination=0.05, random_state=7).fit_predict(features.fillna(0))
        return pd.Series(flags == -1, index=features.index)
