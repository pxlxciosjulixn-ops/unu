import * as React from "react"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import {
  claveMes,
  grupoDe,
  type MapaGrupos,
  type MesResumen,
} from "@/components/finanzas/analisis"
import type { Credito } from "@/components/finanzas/creditos"
import {
  homogenizarConcepto,
  RUTAS_FINANZAS,
  type Movimiento,
} from "@/components/finanzas/finanzas"
import { SinMovimientos } from "@/components/finanzas/sin-movimientos"
import { Link } from "react-router-dom"

import {
  Card,
  CardAction,
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
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatearPesos,
  formatearPesosCompacto,
  formatearPorcentaje,
} from "@/lib/format"
import { cn } from "@/lib/utils"

const config = {
  pagado: { label: "Pagado a deudas", color: "var(--chart-1)" },
  pct: { label: "% de los ingresos", color: "var(--chart-3)" },
} satisfies ChartConfig

/**
 * Cuánto se llevan las deudas: lo pagado cada mes, qué parte de lo que entró
 * fue a eso y a quién. "Deuda" es el grupo de cada concepto (Nu, Addi,
 * Préstamo…), que se cambia en Editar → Sugerencias.
 */
export function PanelDeudas({
  meses,
  movimientos,
  mapa,
  creditos,
}: {
  meses: MesResumen[] | null
  movimientos: Movimiento[] | null
  mapa: MapaGrupos
  /** Lo que se debe en cada crédito registrado. */
  creditos: Credito[] | null
}) {
  const saldoTotal = creditos?.reduce((s, c) => s + c.saldo, 0) ?? null
  const calculo = React.useMemo(() => {
    if (!meses || !movimientos) return null
    const serie = meses.map((m) => ({
      etiqueta: m.etiqueta,
      pagado: m.grupos.deuda,
      pct: m.ingresos > 0 ? (m.grupos.deuda / m.ingresos) * 100 : null,
    }))
    const total = serie.reduce((s, m) => s + m.pagado, 0)
    const ingresos = meses.reduce((s, m) => s + m.ingresos, 0)

    // A quién se le paga, en los mismos meses.
    const desde = meses[0]?.clave ?? ""
    const porConcepto = new Map<string, number>()
    for (const m of movimientos) {
      if (m.tipo !== "gasto" || claveMes(m.fecha) < desde) continue
      if (grupoDe(m.concepto, mapa) !== "deuda") continue
      const nombre = homogenizarConcepto(m.concepto)
      porConcepto.set(nombre, (porConcepto.get(nombre) ?? 0) + m.valor)
    }
    const acreedores = [...porConcepto.entries()]
      .map(([concepto, valor]) => ({ concepto, valor }))
      .sort((a, b) => b.valor - a.valor)

    // Tendencia: últimos 3 meses contra los 3 de antes.
    const ultimos = serie.slice(-3)
    const previos = serie.slice(-6, -3)
    const prom = (xs: typeof serie) =>
      xs.length ? xs.reduce((s, m) => s + m.pagado, 0) / xs.length : null
    const pUlt = prom(ultimos)
    const pPrev = prom(previos)
    const tendencia =
      pUlt !== null && pPrev ? ((pUlt - pPrev) / pPrev) * 100 : null

    return {
      serie,
      total,
      pctTotal: ingresos > 0 ? (total / ingresos) * 100 : null,
      esteMes: serie.at(-1),
      acreedores,
      tendencia,
      promedio: serie.length ? total / serie.length : 0,
    }
  }, [meses, movimientos, mapa])

  return (
    <Card id="deudas" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Deudas</CardTitle>
        <CardDescription>
          Lo que se va en Nu, Addi, préstamos y demás, mes a mes
        </CardDescription>
        <CardAction className="text-right">
          <p className="text-xs text-muted-foreground">Debes en total</p>
          <Link
            to={RUTAS_FINANZAS.creditos}
            className="text-lg font-semibold tabular-nums underline-offset-4 hover:underline"
          >
            {saldoTotal === null || !creditos?.length
              ? "Registrar créditos"
              : formatearPesos(saldoTotal)}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!calculo ? (
          <Skeleton className="h-80 w-full" />
        ) : calculo.total === 0 ? (
          <SinMovimientos
            className="h-60"
            texto="No hay pagos en conceptos del grupo Deudas."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ChartContainer config={config} className="aspect-auto h-80 w-full">
              <ComposedChart
                data={calculo.serie}
                margin={{ left: 4, right: 4, top: 8 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="etiqueta"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  yAxisId="pesos"
                  tickLine={false}
                  axisLine={false}
                  width={72}
                  tickFormatter={(v: number) => formatearPesosCompacto(v)}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(v: number) => `${Math.round(v)} %`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(valor, nombre) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {config[nombre as keyof typeof config]?.label}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {nombre === "pct"
                              ? formatearPorcentaje(Number(valor))
                              : formatearPesos(Number(valor))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar
                  yAxisId="pesos"
                  dataKey="pagado"
                  fill="var(--color-pagado)"
                  radius={3}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="pct"
                  dataKey="pct"
                  type="linear"
                  stroke="var(--color-pct)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </ComposedChart>
            </ChartContainer>

            <div className="flex flex-col gap-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Cifra
                  titulo="Este mes"
                  valor={formatearPesos(calculo.esteMes?.pagado ?? 0)}
                  detalle={
                    calculo.esteMes?.pct != null
                      ? `${formatearPorcentaje(calculo.esteMes.pct)} de lo que entró`
                      : "sin ingresos aún"
                  }
                />
                <Cifra
                  titulo="Promedio al mes"
                  valor={formatearPesos(Math.round(calculo.promedio))}
                />
                <Cifra
                  titulo={`Total, ${calculo.serie.length} meses`}
                  valor={formatearPesos(calculo.total)}
                  detalle={
                    calculo.pctTotal != null
                      ? `${formatearPorcentaje(calculo.pctTotal)} de los ingresos`
                      : undefined
                  }
                />
                <Cifra
                  titulo="Tendencia"
                  valor={
                    calculo.tendencia === null
                      ? "—"
                      : `${calculo.tendencia > 0 ? "+" : ""}${formatearPorcentaje(calculo.tendencia, 0)}`
                  }
                  detalle="últimos 3 meses vs. los 3 de antes"
                  alerta={calculo.tendencia !== null && calculo.tendencia > 0}
                />
              </dl>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  A quién se le paga
                </p>
                <ul className="flex flex-col gap-2">
                  {calculo.acreedores.map((a) => (
                    <li key={a.concepto} className="flex flex-col gap-1">
                      <span className="flex justify-between gap-3 text-sm">
                        <span className="truncate">{a.concepto}</span>
                        <span className="tabular-nums">
                          {formatearPesos(a.valor)}
                        </span>
                      </span>
                      <Progress
                        value={(a.valor / calculo.total) * 100}
                        aria-label={a.concepto}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Cifra({
  titulo,
  valor,
  detalle,
  alerta = false,
}: {
  titulo: string
  valor: string
  detalle?: string
  alerta?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3">
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd
        className={cn(
          "text-base font-semibold tabular-nums",
          alerta && "text-destructive"
        )}
      >
        {valor}
      </dd>
      {detalle ? (
        <dd className="text-xs text-muted-foreground">{detalle}</dd>
      ) : null}
    </div>
  )
}
