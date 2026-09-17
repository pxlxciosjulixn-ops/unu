from django.urls import path

from dashboard import views

app_name = "dashboard"

urlpatterns = [
    path("overview/", views.overview, name="overview"),
    path("summary/", views.summary, name="summary"),
    path("filters/", views.filters, name="filters"),
    path("sales-series/", views.sales_series, name="sales-series"),
    path("profit/", views.profit, name="profit"),
    path("countries/", views.countries, name="countries"),
    path("orders/recent/", views.recent_orders, name="recent-orders"),
    path("products/", views.ProductOverview.as_view(), name="products"),
]
