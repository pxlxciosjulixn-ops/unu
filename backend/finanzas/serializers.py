from __future__ import annotations

from rest_framework import serializers

from finanzas import models
from finanzas.conceptos import clave, homogenizar


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


class SugerenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Sugerencia
        fields = ["id", "nombre", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_nombre(self, valor: str) -> str:
        limpio = " ".join(valor.split())
        if not limpio:
            raise serializers.ValidationError("Escribe el concepto.")
        # `clave` es único en la tabla, pero el choque se avisa aquí para que
        # el mensaje diga qué pasó en vez de reventar con un IntegrityError.
        repetida = models.Sugerencia.objects.filter(clave=clave(limpio))
        if self.instance is not None:
            repetida = repetida.exclude(pk=self.instance.pk)
        if repetida.exists():
            raise serializers.ValidationError("Esa sugerencia ya está en la lista.")
        return limpio
