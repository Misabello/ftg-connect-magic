"""Servicio de predicción de la plataforma FTG."""
from __future__ import annotations

import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .data import FREQ, client, default_window, load_sales, sufficiency, to_series
from .pipeline import run
from .providers.report import LovableGatewayReportProvider

app = FastAPI(title="FTG ML Forecast", version="1.0")


class PredictRequest(BaseModel):
    target: str = Field(description="ventas_totales | costos | demanda_producto")
    granularity: str = Field(default="diario")
    horizon: int = Field(default=14, ge=1, le=180)
    location_id: str | None = None
    language: str = "es"
    with_report: bool = True


def authorize(token: str | None) -> None:
    expected = os.environ.get("ML_SERVICE_TOKEN")
    if not expected or token != f"Bearer {expected}":
        raise HTTPException(status_code=401, detail="No autorizado")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/predict")
def predict(req: PredictRequest, authorization: str | None = Header(default=None)) -> dict:
    authorize(authorization)
    if req.granularity not in FREQ:
        raise HTTPException(status_code=422, detail="Granularidad inválida")

    sb = client()
    raw = load_sales(sb, req.location_id, default_window(req.granularity))
    value = "subtotal" if req.target == "costos" else "total"
    series = to_series(raw, req.granularity, value)
    check = sufficiency(series, req.granularity)
    if not check["ok"]:
        return {
            "status": "datos_insuficientes",
            "sufficiency": check,
            "message": "No hay suficiente información histórica para generar una predicción confiable.",
        }

    result = run(series, req.horizon, FREQ[req.granularity])
    if result["status"] != "ok":
        return {**result, "sufficiency": check}
    result["sufficiency"] = check
    result["target"] = req.target
    result["granularity"] = req.granularity

    if req.with_report:
        try:
            result["report"] = LovableGatewayReportProvider().write(result, req.language)
        except Exception as exc:  # el informe es complementario, nunca bloquea la predicción
            result["report_error"] = str(exc)
    return result
