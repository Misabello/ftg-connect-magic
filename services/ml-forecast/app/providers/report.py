"""Informe generativo vía Lovable AI Gateway, restringido a cifras ya calculadas."""
from __future__ import annotations

import json
import os

import httpx

from .base import GenerativeReportProvider

GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions"

SYSTEM = (
    "Sos analista de negocio de la empresa Fotográfica. Redactás informes para supervisores no técnicos. "
    "Usás EXCLUSIVAMENTE las cifras del JSON recibido: está prohibido inventar números, causas o comparaciones. "
    "Si un dato no está en el JSON, escribí que no está disponible. "
    "Distinguí explícitamente dato histórico, predicción, inferencia y recomendación. "
    "No menciones nombres de algoritmos, hiperparámetros ni detalles técnicos. "
    "Cerrá siempre con: 'Las predicciones son estimaciones basadas en información histórica y no garantizan resultados futuros.'"
)

SECTIONS = [
    "resumen_ejecutivo",
    "resultados_previstos",
    "variacion_periodo_anterior",
    "parques_destacados",
    "factores",
    "productos_mayor_demanda",
    "costos_esperados",
    "riesgos",
    "oportunidades",
    "recomendaciones",
    "nivel_de_confianza",
    "limitaciones",
]


class LovableGatewayReportProvider(GenerativeReportProvider):
    key = "lovable_ai"

    def __init__(self, model: str | None = None):
        self.model = model or os.environ.get("REPORT_MODEL", "google/gemini-3.6-flash")

    def write(self, payload: dict, language: str = "es") -> dict:
        key = os.environ.get("LOVABLE_API_KEY")
        if not key:
            raise RuntimeError("LOVABLE_API_KEY no configurada")
        idioma = "portugués de Brasil" if language == "pt" else "español rioplatense"
        body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f"Redactá el informe en {idioma}. Devolvé un JSON con las claves {SECTIONS}. "
                        f"Datos calculados:\n{json.dumps(payload, ensure_ascii=False, default=str)}"
                    ),
                },
            ],
            "response_format": {"type": "json_object"},
        }
        with httpx.Client(timeout=120) as client:
            res = client.post(GATEWAY, headers={"Lovable-API-Key": key}, json=body)
            if res.status_code == 429:
                raise RuntimeError("Límite de solicitudes alcanzado, reintentá en unos minutos.")
            if res.status_code == 402:
                raise RuntimeError("Créditos de IA agotados.")
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
        return {"language": language, "model": self.model, "sections": json.loads(content)}
