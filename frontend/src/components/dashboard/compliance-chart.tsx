import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
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
  target: { label: "Meta", color: "var(--chart-4)" },
  sales: { label: "Venta real", color: "var(--chart-1)" },
  compliance: { label: "Cumplimiento", color: "var(--chart-2)" },
} satisfies ChartConfig

export function ComplianceChart({ datos }: { datos: SerieVentas | null }) {
  const series =
    datos?.series.map((punto) => ({
      label: punto.label,
      target: punto.target === null ? null : aNumero(punto.target),
      sales: aNumero(punto.sales),
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
        <CardTitle>Cumplimiento de metas</CardTitle>
        <CardDescription>
          {datos
            ? datos.targets_available
              ? `Meta contra venta real · ${cumplidos} de ${conMeta.length} meses por encima del 100 %`
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
            <ComposedChart data={series} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
              />
              <YAxis
                yAxisId="pesos"
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(valor: number) => formatearPesosCompacto(valor)}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tickLine={false}
                axisLine={false}
                width={44}
                domain={[0, 140]}
                tickFormatter={(valor: number) => `${valor} %`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(valor, nombre) =>
                      nombre === "compliance"
                        ? formatearPorcentaje(Number(valor))
                        : formatearPesos(Number(valor))
                    }
                  />
                }
              />
              <Bar
                yAxisId="pesos"
                dataKey="target"
                fill="var(--color-target)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                yAxisId="pesos"
                dataKey="sales"
                fill="var(--color-sales)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              {/* El 100 % marca la meta: arriba se cumplió, abajo faltó. */}
              <ReferenceLine
                yAxisId="pct"
                y={100}
                stroke="var(--color-compliance)"
                strokeDasharray="4 4"
              />
              <Line
                yAxisId="pct"
                dataKey="compliance"
                type="monotone"
                stroke="var(--color-compliance)"
                strokeWidth={2}
                dot={{ r: 2.5 }}
                isAnimationActive={false}
                connectNulls
              />
              <ChartLegend content={<ChartLegendContent />} />
            </ComposedChart>
          </ChartContainer>
        ) : (
          <Skeleton className="h-[17rem] w-full" />
        )}
      </CardContent>
    </Card>
  )
}
