import { Cell, Label, Pie, PieChart } from "recharts"

import type {
  ComparacionConcepto,
  Totales,
} from "@/components/finanzas/finanzas"
import { SinMovimientos } from "@/components/finanzas/sin-movimientos"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { formatearPesos, formatearPorcentaje } from "@/lib/format"

const config = {
  ingresos: { label: "Ingresos", color: "var(--chart-1)" },
  gastos: { label: "Gastos", color: "var(--chart-4)" },
  concepto: { label: "Concepto", color: "var(--chart-2)" },
  resto: { label: "Resto", color: "var(--chart-5)" },
} satisfies ChartConfig

type Gajo = {
  clave: string
  etiqueta: string
  valor: number
  pct: number
  color: string
}

/**
 * La torta del periodo, que cambia de pregunta según el filtro.
 *
 * Sin filtro: ingresos contra gastos, como partes de todo lo que se movió.
 * Con un concepto elegido: ese concepto contra el resto de su lado, porque
 * "Comida" sola sería un círculo del 100 % que no dice nada.
 */
export function GraficaDistribucion({
  resumen,
  comparacion,
}: {
  resumen: Totales | null
  /** El concepto filtrado medido contra el periodo; `null` sin filtro. */
  comparacion?: ComparacionConcepto | null
}) {
  const datos = comparacion
    ? gajosDeConcepto(comparacion)
    : gajosDeResumen(resumen)
  const total = datos.reduce((suma, d) => suma + d.valor, 0)

  return (
    <Card id="balance" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="truncate">
          {comparacion
            ? `${comparacion.concepto} vs. el resto`
            : "Ingresos vs. gastos"}
        </CardTitle>
        <CardDescription>
          {comparacion
            ? comparacion.esIngreso
              ? "Parte de lo que entró en el periodo"
              : "Parte de lo que se gastó en el periodo"
            : "Parte de todo lo que se movió"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-center gap-5">
        {!resumen ? (
          <Skeleton className="mx-auto aspect-square w-full max-w-[15rem] rounded-full" />
        ) : total === 0 ? (
          <SinMovimientos />
        ) : (
          <>
            <ChartContainer
              config={config}
              className="mx-auto aspect-square w-full max-w-[15rem]"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="clave"
                      hideLabel
                      formatter={(valor, _nombre, item) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="size-2.5 rounded-[2px]"
                              style={{ background: item.payload.color }}
                            />
                            {item.payload.etiqueta}
                          </span>
                          <span className="font-mono font-medium tabular-nums">
                            {formatearPesos(Number(valor))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={datos}
                  dataKey="valor"
                  nameKey="clave"
                  innerRadius="62%"
                  outerRadius="100%"
                  paddingAngle={datos.every((d) => d.valor > 0) ? 2 : 0}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {datos.map((d) => (
                    <Cell key={d.clave} fill={d.color} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !("cx" in viewBox)) return null
                      const { cx, cy } = viewBox as { cx: number; cy: number }
                      const cifra = comparacion
                        ? formatearPesos(comparacion.total)
                        : `${resumen.balance > 0 ? "+" : ""}${formatearPesos(resumen.balance)}`
                      return (
                        <text x={cx} y={cy} textAnchor="middle">
                          <tspan
                            x={cx}
                            y={cy - 4}
                            className="fill-foreground text-base font-semibold tabular-nums"
                          >
                            {cifra}
                          </tspan>
                          <tspan
                            x={cx}
                            y={cy + 16}
                            className="fill-muted-foreground text-xs"
                          >
                            {comparacion
                              ? recortar(comparacion.concepto)
                              : "balance"}
                          </tspan>
                        </text>
                      )
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <ul className="flex flex-col gap-3">
              {datos.map((d) => (
                <li
                  key={d.clave}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 text-sm"
                >
                  <span
                    className="size-3 rounded-[3px] ring-1 ring-foreground/10"
                    style={{ background: d.color }}
                  />
                  <span className="min-w-0 truncate">{d.etiqueta}</span>
                  <span className="font-medium tabular-nums">
                    {formatearPesos(d.valor)}
                  </span>
                  <span />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatearPorcentaje(d.pct)} del total
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>

      <Pie100 resumen={resumen} comparacion={comparacion} />
    </Card>
  )
}

/**
 * La frase de abajo: la misma cuenta dicha sin porcentajes. Con un concepto
 * elegido es la comparación que el filtro se llevaba por delante, porque los
 * pesos que entraron ya no están en los movimientos filtrados.
 */
function Pie100({
  resumen,
  comparacion,
}: {
  resumen: Totales | null
  comparacion?: ComparacionConcepto | null
}) {
  if (comparacion) {
    if (comparacion.pctCruzado === null) return null
    const porCada100 = Math.round(comparacion.pctCruzado)
    return (
      <CardFooter className="text-sm text-muted-foreground">
        {comparacion.esIngreso
          ? `Por cada $ 100 que se gastaron, entraron $ ${porCada100} por ${comparacion.concepto}.`
          : `De cada $ 100 que entraron, $ ${porCada100} se fueron en ${comparacion.concepto}.`}
      </CardFooter>
    )
  }

  // Cuántos pesos se van por cada 100 que entran: la misma cifra dicha de
  // forma que se entiende sin hacer cuentas.
  if (!resumen || resumen.ingresos <= 0) return null
  return (
    <CardFooter className="text-sm text-muted-foreground">
      Por cada $ 100 que entran, se van ${" "}
      {Math.round((resumen.gastos / resumen.ingresos) * 100)}.
    </CardFooter>
  )
}

function gajosDeResumen(resumen: Totales | null): Gajo[] {
  if (!resumen) return []
  const total = resumen.ingresos + resumen.gastos
  return [
    {
      clave: "ingresos",
      etiqueta: config.ingresos.label,
      valor: resumen.ingresos,
      pct: total ? (resumen.ingresos / total) * 100 : 0,
      color: config.ingresos.color,
    },
    {
      clave: "gastos",
      etiqueta: config.gastos.label,
      valor: resumen.gastos,
      pct: total ? (resumen.gastos / total) * 100 : 0,
      color: config.gastos.color,
    },
  ]
}

function gajosDeConcepto(c: ComparacionConcepto): Gajo[] {
  // Lo del concepto nunca puede pasarse de su propio lado, pero se corta por
  // si acaso: un gajo negativo rompería la torta.
  const resto = Math.max(c.totalPropio - c.total, 0)
  const total = c.total + resto
  return [
    {
      clave: "concepto",
      etiqueta: c.concepto,
      valor: c.total,
      pct: total ? (c.total / total) * 100 : 0,
      color: config.concepto.color,
    },
    {
      clave: "resto",
      etiqueta: c.esIngreso ? "Otros ingresos" : "Otros gastos",
      valor: resto,
      pct: total ? (resto / total) * 100 : 0,
      color: config.resto.color,
    },
  ]
}

/** El nombre del concepto en el centro de la torta, donde no cabe mucho. */
function recortar(texto: string) {
  return texto.length > 14 ? `${texto.slice(0, 13)}…` : texto
}
