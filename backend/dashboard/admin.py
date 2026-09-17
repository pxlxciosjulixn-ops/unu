from django.contrib import admin

from dashboard import models


@admin.register(models.Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("sku", "name", "category", "price", "status")
    list_filter = ("status", "category")
    search_fields = ("sku", "name", "category")


@admin.register(models.Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "country")
    list_filter = ("country",)
    search_fields = ("name", "email")


class OrderItemInline(admin.TabularInline):
    model = models.OrderItem
    extra = 0


@admin.register(models.Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("code", "customer", "status", "payment_method", "total", "placed_at")
    list_filter = ("status", "payment_method")
    search_fields = ("code", "customer__name")
    date_hierarchy = "placed_at"
    inlines = [OrderItemInline]


@admin.register(models.MonthlyExpense)
class MonthlyExpenseAdmin(admin.ModelAdmin):
    list_display = ("month", "amount")


@admin.register(models.MonthlyTarget)
class MonthlyTargetAdmin(admin.ModelAdmin):
    list_display = ("month", "revenue", "orders", "visits")


@admin.register(models.DailyTraffic)
class DailyTrafficAdmin(admin.ModelAdmin):
    list_display = ("date", "page_views", "visitors")
