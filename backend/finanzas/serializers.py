from __future__ import annotations

from rest_framework import serializers

from finanzas import models
from finanzas.conceptos import homogenizar


class MovimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Movimiento
        fields = ["id", "fecha", "tipo", "concepto", "valor", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_concepto(self, valor: str) -> str:
        # "mt15" se guarda como "Mt15" y "Mercado " como "Mercado": así el
        # dashboard suma junto todo lo de un mismo concepto.
        limpio = homogenizar(valor)
        if not limpio:
            raise serializers.ValidationError("Escribe el concepto.")
        return limpio
