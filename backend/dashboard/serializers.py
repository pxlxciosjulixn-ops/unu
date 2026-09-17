from rest_framework import serializers

from dashboard import models


class OrderSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source="customer.name", read_only=True)
    country = serializers.CharField(source="customer.country", read_only=True)
    country_code = serializers.CharField(source="customer.country_code", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    payment_method_label = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )

    class Meta:
        model = models.Order
        fields = [
            "code",
            "customer",
            "country",
            "country_code",
            "status",
            "status_label",
            "payment_method",
            "payment_method_label",
            "total",
            "placed_at",
        ]


class ProductOverviewSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    # Vienen anotadas desde la vista.
    units_sold = serializers.IntegerField(read_only=True)
    revenue = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = models.Product
        fields = [
            "sku",
            "name",
            "category",
            "price",
            "status",
            "status_label",
            "units_sold",
            "revenue",
        ]
