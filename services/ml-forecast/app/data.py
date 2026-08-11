"""Lectura de datos históricos desde la base central."""
from __future__ import annotations

import os
from datetime import date, timedelta

import pandas as pd
from supabase import Client, create_client

MIN_DAYS = {"diario": 60, "semanal": 120, "mensual": 365}
FREQ = {"diario": "D", "semanal": "W-MON", "mensual": "MS"}


def client() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def load_sales(sb: Client, location_id: str | None, since: date) -> pd.DataFrame:
    q = sb.table("sales").select("created_at, total, subtotal, location_id, point_of_sale_id, status")
    q = q.eq("status", "completada").gte("created_at", since.isoformat())
    if location_id:
        q = q.eq("location_id", location_id)
    rows = q.execute().data or []
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df["created_at"] = pd.to_datetime(df["created_at"], utc=True).dt.tz_localize(None)
    return df


def to_series(df: pd.DataFrame, granularity: str, value: str = "total") -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["ds", "y"])
    freq = FREQ[granularity]
    grouped = df.set_index("created_at")[value].astype(float).resample(freq).sum()
    grouped = grouped.asfreq(freq, fill_value=0.0)
    return pd.DataFrame({"ds": grouped.index, "y": grouped.to_numpy()})


def sufficiency(series: pd.DataFrame, granularity: str) -> dict:
    required = MIN_DAYS[granularity]
    observed = len(series)
    needed = {"diario": 60, "semanal": 18, "mensual": 12}[granularity]
    return {
        "ok": observed >= needed,
        "observed_points": observed,
        "required_points": needed,
        "required_days": required,
    }


def default_window(granularity: str) -> date:
    return date.today() - timedelta(days=MIN_DAYS[granularity] * 3)
