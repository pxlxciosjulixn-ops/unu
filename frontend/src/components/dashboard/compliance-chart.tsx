import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
} from "recharts"

import type { SerieVentas } from "@/components/dashboard/tipos"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  aNumero,
  formatearPesos,
  formatearPesosCompacto,
  formatearPorcentaje,
} from "@/lib/format"

const config = {
  sales: { label: "Venta real", color: "var(--chart-1)" },
  target: { label: "Meta", color: "var(--chart-3)" },
} satisfies ChartConfig

export function ComplianceChart({ datos }: { datos: SerieVentas | null }) {
  const series =
    datos?.series.map((punto) => ({
      label: punto.label,
      sales: aNumero(punto.sales),
      target: punto.target === null ? null : aNumero(punto.target),
      compliance: punto.compliance_pct,
    })) ?? []

  const conMeta = series.filter((p) => p.target !== null)
  const cumplidos = conMeta.filter((p) => (p.compliance ?? 0) >= 100).length
  const metaTotal = conMeta.reduce((suma, p) => suma + (p.target ?? 0), 0)
  const ventaTotal = conMeta.reduce((suma, p) => suma + p.sales, 0)
  const cumplimientoTotal = metaTotal > 0 ? (ventaTotal / metaTotal) * 100 : null

  return (
    <Card id="ventas" className="scroll-mt-20">
      <CardHeader className="border-b">
        <CardTitle>Ventas contra meta</CardTitle>
        <CardDescription>
          {datos
            ? datos.targets_available
              ? `${cumplidos} de ${conMeta.length} meses por encima de la meta`
              : "Las metas están definidas para el negocio completo, no por país: quita el filtro de país para ver el cumplimiento."
            : "Cargando…"}
        </CardDescription>
        {datos?.targets_available && cumplimientoTotal !== null ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant={cumplimientoTotal >= 100 ? "default" : "secondary"}>
              {formatearPorcentaje(cumplimientoTotal)} del acumulado
            </Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatearPesos(ventaTotal)} de {formatearPesos(metaTotal)}
            </span>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="pt-2">
        {datos ? (
          <ChartContainer config={config} className="aspect-auto h-[17rem] w-full">
            <AreaChart data={series} margin={{ left: 4, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="area-ventas" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-sales)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-sales)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(valor: number) => formatearPesosCompacto(valor)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(valor) => formatearPesos(Number(valor))}
                  />
                }
              />
              <Area
                dataKey="sales"
                type="monotone"
                stroke="var(--color-sales)"
                strokeWidth={2}
                fill="url(#area-ventas)"
                isAnimationActive={false}
              />
              {/* La meta va como línea punteada encima del área: donde el área
                  queda por debajo, ese mes no se cumplió. */}
              <Line
                dataKey="target"
                type="monotone"
                stroke="var(--color-target)"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        ) : (
          <Skeleton className="h-[17rem] w-full" />
        )}
      </CardContent>
    </Card>
  )
}
