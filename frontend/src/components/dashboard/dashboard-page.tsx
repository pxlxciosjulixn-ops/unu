import * as React from "react"
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { AppShell } from "@/components/app-shell"
import { ComplianceChart } from "@/components/dashboard/compliance-chart"
import { CountriesMap } from "@/components/dashboard/countries-map"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { FiltersBar } from "@/components/dashboard/filters-bar"
import {
  FILTROS_INICIALES,
  type Filtros,
} from "@/components/dashboard/filtros"
import { KpiCards } from "@/components/dashboard/kpi-cards"
import { ProductsTable } from "@/components/dashboard/products-table"
import { ProfitCard } from "@/components/dashboard/profit-card"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import type { Overview } from "@/components/dashboard/tipos"
import { useApi } from "@/hooks/use-api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/** Los filtros viven en la URL, así el tablero filtrado se puede compartir. */
function leerFiltros(params: URLSearchParams): Filtros {
  const meses = Number(params.get("months"))
  return {
    month: params.get("month") ?? "",
    months: [6, 12, 24].includes(meses) ? meses : FILTROS_INICIALES.months,
    country: (params.get("country") ?? "").toUpperCase().slice(0, 2),
    orderStatus: params.get("order_status") ?? "",
  }
}

function aQuery(filtros: Filtros) {
  const params = new URLSearchParams()
  if (filtros.month) params.set("month", filtros.month)
  if (filtros.months !== FILTROS_INICIALES.months) {
    params.set("months", String(filtros.months))
  }
  if (filtros.country) params.set("country", filtros.country)
  if (filtros.orderStatus) params.set("order_status", filtros.orderStatus)
  return params
}

export function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const filtros = React.useMemo(() => leerFiltros(params), [params])

  // La API espera `months` siempre; en la URL solo se guarda si no es el valor
  // por defecto para no ensuciar el enlace.
  const consulta = React.useMemo(() => {
    const p = aQuery(filtros)
    p.set("months", String(filtros.months))
    return p.toString()
  }, [filtros])

  const { data, error, cargando, recargar } = useApi<Overview>(
    `/api/dashboard/overview/?${consulta}`
  )

  const cambiarFiltros = (nuevos: Filtros) =>
    setParams(aQuery(nuevos), { replace: true })

  return (
    <AppShell
      titulo="Dashboard"
      sidebar={<DashboardSidebar />}
      acciones={
        <>
          {data?.summary ? (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {data.summary.month_label}
            </Badge>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={recargar}
            disabled={cargando}
            aria-label="Actualizar datos"
          >
            <RefreshCwIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </>
      }
    >
      <div className="flex min-w-0 flex-col gap-4 p-4 pb-10 sm:p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Panel de ventas
            </h1>
            <p className="text-sm text-muted-foreground">
              {data?.summary
                ? `Cifras de ${data.summary.month_label}, comparadas con ${data.summary.previous_month_label}.`
                : "Cargando cifras del último mes con pedidos…"}
              {data?.summary?.partial
                ? " El mes va en curso, así que la comparación todavía es parcial."
                : null}
            </p>
          </div>

          <FiltersBar
            opciones={data?.filters ?? null}
            filtros={filtros}
            onChange={cambiarFiltros}
          />

          {error ? (
            <Alert>
              <AlertCircleIcon />
              <AlertTitle>No se pudo cargar el panel</AlertTitle>
              <AlertDescription>
                {error}. Revisa que el backend esté corriendo en{" "}
                <code>manage.py runserver</code> y vuelve a intentar.
              </AlertDescription>
              <div className="col-start-2 mt-2">
                <Button variant="outline" size="sm" onClick={recargar}>
                  Reintentar
                </Button>
              </div>
            </Alert>
          ) : null}

          <section id="indicadores" className="scroll-mt-20">
            <KpiCards resumen={data?.summary ?? null} />
          </section>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ComplianceChart datos={data?.sales ?? null} />
            <ProfitCard datos={data?.profit ?? null} />
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <CountriesMap datos={data?.countries ?? null} />
            <RecentOrders datos={data?.recent_orders ?? null} />
          </div>

          <ProductsTable country={filtros.country} />

          <p className="text-xs text-muted-foreground">
            Los datos son de prueba, generados con{" "}
            <code>manage.py seed_dashboard</code>. No corresponden a ninguna
            operación real. Las metas son del negocio completo: al filtrar por
            país se oculta el cumplimiento, y la utilidad sigue siendo global
            porque los gastos no están abiertos por país.
          </p>
      </div>
    </AppShell>
  )
}
