from __future__ import annotations

from rest_framework import serializers

from ubicacion.models import ConfigUbicacion, RegistroUbicacion


class RegistroUbicacionSerializer(serializers.ModelSerializer):
    tiene_gps = serializers.BooleanField(read_only=True)

    class Meta:
        model = RegistroUbicacion
        fields = [
            "id",
            "ip",
            "ciudad",
            "region",
            "pais",
            "lat_ip",
            "lon_ip",
            "lat_gps",
            "lon_gps",
            "precision_gps",
            "tiene_gps",
            "user_agent",
            "created_at",
        ]


class ConfigUbicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigUbicacion
        fields = ["aviso_titulo", "aviso_mensaje", "texto_final"]
