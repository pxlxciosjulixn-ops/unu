from __future__ import annotations

from rest_framework import serializers

from finanzas import models


class MovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Movimiento
        fields = ["id", "fecha", "tipo", "concepto", "valor", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_concepto(self, valor: str) -> str:
        # Sin espacios de sobra, para que "Mercado" y "Mercado " cuenten como
        # el mismo concepto en el dashboard.
        limpio = " ".join(valor.split())
        if not limpio:
            raise serializers.ValidationError("Escribe el concepto.")
        return limpio
