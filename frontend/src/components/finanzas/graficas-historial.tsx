import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import {
  DIAS_SEMANA,
  type DiaCalendario,
  type MesResumen,
  type PuntoAcumulado,
} from "@/components/finanzas/analisis"
import {
  formatearFechaLocal,
  GRUPOS,
  type Grupo,
} from "@/components/finanzas/finanzas"
import { SinMovimientos } from "@/components/finanzas/sin-movimientos"
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
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatearPesos, formatearPesosCompacto } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Un color por grupo, mezclando los de la paleta del estilo elegido. */
const COLOR_GRUPO: Record<Grupo, string> = {
  deuda: "var(--chart-1)",
  familia: "var(--chart-3)",
  comida: "var(--chart-2)",
  transporte: "var(--chart-4)",
  mascotas: "var(--chart-5)",
  hogar: "color-mix(in oklch, var(--chart-1) 50%, var(--chart-3))",
  gustos: "color-mix(in oklch, var(--chart-2) 45%, var(--chart-5))",
  otro: "color-mix(in oklch, var(--muted-foreground) 60%, transparent)",
}

/** Valor en pesos dentro del tooltip, con su cuadrito de color. */
function filaTooltip(config: ChartConfig) {
  return function Fila(valor: unknown, nombre: unknown) {
    const clave = String(nombre)
    return (
      <div className="flex w-full items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span
            className="size-2.5 rounded-[2px]"
            style={{ background: `var(--color-${clave})` }}
          />
          {config[clave]?.label ?? clave}
        </span>
        <span className="font-mono font-medium tabular-nums">
          {formatearPesos(Number(valor))}
        </span>
      </div>
    )
  }
}

const ejeY = {
  tickLine: false,
  axisLine: false,
  width: 72,
  tickFormatter: (v: number) => formatearPesosCompacto(v),
} as const

const ejeX = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  minTickGap: 8,
} as const

function Cargando({ alto = "h-72" }: { alto?: string }) {
  return <Skeleton className={cn("w-full", alto)} />
}

// ---------------------------------------------------------------------------

/** Barras apiladas: en qué grupo se fue el gasto de cada mes. */
export function GraficaGrupos({ meses }: { meses: MesResumen[] | null }) {
  const usados = React.useMemo(
    () => GRUPOS.filter((g) => meses?.some((m) => m.grupos[g.valor] > 0)),
    [meses]
  )
  const config = Object.fromEntries(
    usados.map((g) => [
      g.valor,
      { label: g.etiqueta, color: COLOR_GRUPO[g.valor] },
    ])
  ) satisfies ChartConfig
  const datos = meses?.map((m) => ({ etiqueta: m.etiqueta, ...m.grupos }))

  return (
    <Card id="grupos" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Gasto por grupo, mes a mes</CardTitle>
        <CardDescription>
          Deudas, familia, comida, transporte… Los grupos se cambian en Editar →
          Sugerencias.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!datos ? (
          <Cargando alto="h-80" />
        ) : usados.length === 0 ? (
          <SinMovimientos className="h-80" texto="No hay gastos todavía." />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-80 w-full">
            <BarChart data={datos} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="etiqueta" {...ejeX} />
              <YAxis {...ejeY} />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={filaTooltip(config)} />
                }
              />
              {usados.map((g, i) => (
                <Bar
                  key={g.valor}
                  dataKey={g.valor}
                  stackId="gasto"
                  fill={`var(--color-${g.valor})`}
                  radius={i === usados.length - 1 ? [3, 3, 0, 0] : 0}
                  isAnimationActive={false}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

/** Lo que quedó libre cada mes: hacia arriba si cerró en verde, abajo si no. */
export function GraficaAhorro({ meses }: { meses: MesResumen[] | null }) {
  const config = {
    balance: { label: "Ahorro neto", color: "var(--chart-1)" },
  } satisfies ChartConfig
  const enRojo = meses?.filter((m) => m.balance < 0).length ?? 0

  return (
    <Card id="ahorro" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Ahorro neto por mes</CardTitle>
        <CardDescription>
          {meses && meses.length
            ? enRojo
              ? `${enRojo} de ${meses.length} meses cerraron en rojo`
              : "Todos los meses cerraron en verde"
            : "Ingresos menos gastos"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!meses ? (
          <Cargando />
        ) : meses.length === 0 ? (
          <SinMovimientos className="h-72" />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <BarChart data={meses} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="etiqueta" {...ejeX} />
              <YAxis {...ejeY} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={filaTooltip(config)} />
                }
              />
              <Bar dataKey="balance" radius={3} isAnimationActive={false}>
                {meses.map((m) => (
                  <Cell
                    key={m.clave}
                    fill={
                      m.balance < 0
                        ? "var(--destructive)"
                        : "var(--color-balance)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

/** Este mes contra el pasado, al mismo día: ¿se va mejor o peor? */
export function GraficaAcumulado({
  datos,
  medida,
  onMedida,
}: {
  datos: PuntoAcumulado[] | null
  medida: "gastos" | "balance"
  onMedida: (medida: "gastos" | "balance") => void
}) {
  const config = {
    actual: { label: "Este mes", color: "var(--chart-1)" },
    anterior: { label: "Mes pasado", color: "var(--chart-3)" },
  } satisfies ChartConfig

  return (
    <Card id="acumulado" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Este mes vs. el pasado</CardTitle>
        <CardDescription>
          {medida === "gastos" ? "Gasto acumulado" : "Balance acumulado"} día a
          día
        </CardDescription>
        <CardAction>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[medida]}
            onValueChange={(valores: string[]) => {
              if (valores[0]) onMedida(valores[0] as "gastos" | "balance")
            }}
            aria-label="Qué acumular"
          >
            <ToggleGroupItem value="gastos">Gastos</ToggleGroupItem>
            <ToggleGroupItem value="balance">Balance</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!datos ? (
          <Cargando />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <LineChart data={datos} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="dia" {...ejeX} />
              <YAxis {...ejeY} />
              {medida === "balance" ? (
                <ReferenceLine y={0} stroke="var(--border)" />
              ) : null}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(dia) => `Día ${dia}`}
                    formatter={filaTooltip(config)}
                  />
                }
              />
              <Line
                dataKey="anterior"
                type="linear"
                stroke="var(--color-anterior)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="actual"
                type="linear"
                stroke="var(--color-actual)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

/** Promedio de gasto de cada día de la semana, sin los pagos fijos. */
export function GraficaDiaSemana({
  datos,
}: {
  datos: { dia: string; promedio: number }[] | null
}) {
  const config = {
    promedio: { label: "Promedio", color: "var(--chart-2)" },
  } satisfies ChartConfig
  const maximo = datos?.reduce((a, d) => (d.promedio > a.promedio ? d : a))

  return (
    <Card id="dia-semana" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>¿Qué día se gasta más?</CardTitle>
        <CardDescription>
          {maximo && maximo.promedio > 0
            ? `El ${maximo.dia.toLowerCase()} es el más caro · últimos 6 meses, sin pagos fijos`
            : "Promedio por día, últimos 6 meses"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!datos ? (
          <Cargando />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <BarChart data={datos} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="dia" {...ejeX} />
              <YAxis {...ejeY} />
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={filaTooltip(config)} />
                }
              />
              <Bar dataKey="promedio" radius={3} isAnimationActive={false}>
                {datos.map((d) => (
                  <Cell
                    key={d.dia}
                    fill={
                      d === maximo ? "var(--chart-1)" : "var(--color-promedio)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

/**
 * Un cuadrito por día, más oscuro mientras más se gastó, como el de GitHub.
 * Los niveles van por raíz cuadrada: con uno lineal, un pago grande deja
 * todo lo demás en blanco.
 */
export function CalendarioCalor({
  datos,
}: {
  datos: { columnas: DiaCalendario[][]; maximo: number } | null
}) {
  const nivel = (gasto: number) =>
    !datos || gasto === 0 || datos.maximo === 0
      ? 0
      : Math.max(1, Math.ceil(Math.sqrt(gasto / datos.maximo) * 4))
  const fondo = (n: number) =>
    n === 0
      ? "var(--muted)"
      : `color-mix(in srgb, var(--chart-1) ${[0, 25, 45, 70, 100][n]}%, var(--muted))`
  const etiquetaMes = new Intl.DateTimeFormat("es-CO", { month: "short" })

  return (
    <Card id="calendario" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Calendario de gastos</CardTitle>
        <CardDescription>
          Últimos 6 meses · cada cuadrito es un día
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!datos ? (
          <Cargando alto="h-36" />
        ) : (
          <>
            <div className="overflow-x-auto pb-1">
              <div className="flex w-max gap-[3px]">
                <div className="mr-1 flex flex-col gap-[3px] pt-5 text-[10px] text-muted-foreground">
                  {DIAS_SEMANA.map((d, i) => (
                    <span key={d} className="flex h-3.5 items-center">
                      {i % 2 === 0 ? d : ""}
                    </span>
                  ))}
                </div>
                {datos.columnas.map((semana, i) => {
                  const primero = semana[0].fecha
                  const nuevoMes =
                    i === 0 ||
                    primero.slice(5, 7) !==
                      datos.columnas[i - 1][0].fecha.slice(5, 7)
                  return (
                    <div key={primero} className="flex flex-col gap-[3px]">
                      <span className="h-4 text-[10px] text-muted-foreground">
                        {nuevoMes
                          ? etiquetaMes
                              .format(new Date(`${primero}T12:00:00`))
                              .replace(".", "")
                          : ""}
                      </span>
                      {semana.map((d) => (
                        <span
                          key={d.fecha}
                          title={
                            d.futuro
                              ? undefined
                              : `${formatearFechaLocal(d.fecha)}: ${formatearPesos(d.gasto)}`
                          }
                          className={cn(
                            "size-3.5 rounded-[3px]",
                            d.futuro && "opacity-0"
                          )}
                          style={{ background: fondo(nivel(d.gasto)) }}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
              Menos
              {[0, 1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className="size-3 rounded-[3px]"
                  style={{ background: fondo(n) }}
                />
              ))}
              Más
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

/** El concepto filtrado en los últimos 12 meses, para ver si viene subiendo. */
export function HistorialConcepto({
  concepto,
  meses,
}: {
  concepto: string
  meses: MesResumen[] | null
}) {
  const esIngreso =
    !!meses &&
    meses.reduce((s, m) => s + m.ingresos, 0) >
      meses.reduce((s, m) => s + m.gastos, 0)
  const clave = esIngreso ? "ingresos" : "gastos"
  const config = {
    [clave]: { label: concepto, color: "var(--chart-1)" },
  } satisfies ChartConfig
  const conDatos = meses?.filter((m) => m[clave] > 0) ?? []
  const promedio = conDatos.length
    ? conDatos.reduce((s, m) => s + m[clave], 0) / conDatos.length
    : 0

  return (
    <Card id="historial-concepto" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="truncate">
          {concepto} en los últimos meses
        </CardTitle>
        <CardDescription>
          {conDatos.length
            ? `Promedio de ${formatearPesos(Math.round(promedio))} en los meses que hubo`
            : "Sin movimientos de este concepto"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!meses ? (
          <Cargando alto="h-60" />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-60 w-full">
            <BarChart data={meses} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="etiqueta" {...ejeX} />
              <YAxis {...ejeY} />
              {promedio ? (
                <ReferenceLine
                  y={promedio}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                />
              ) : null}
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={filaTooltip(config)} />
                }
              />
              <Bar
                dataKey={clave}
                fill={`var(--color-${clave})`}
                radius={3}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
