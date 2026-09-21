import { Cell, Label, Pie, PieChart } from "recharts"

import type { Totales } from "@/components/finanzas/finanzas"
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
} satisfies ChartConfig

/**
 * Ingresos contra gastos del periodo, como partes del total que se movió:
 * 60 mil de gasto y 40 mil de ingreso son 60 % y 40 %.
 */
export function GraficaDistribucion({ resumen }: { resumen: Totales | null }) {
  const total = resumen ? resumen.ingresos + resumen.gastos : 0
  const datos = resumen
    ? [
        {
          clave: "ingresos",
          valor: resumen.ingresos,
          pct: total ? (resumen.ingresos / total) * 100 : 0,
          color: config.ingresos.color,
        },
        {
          clave: "gastos",
          valor: resumen.gastos,
          pct: total ? (resumen.gastos / total) * 100 : 0,
          color: config.gastos.color,
        },
      ]
    : []

  // Cuántos pesos se van por cada 100 que entran: la misma cifra dicha de
  // forma que se entiende sin hacer cuentas.
  const porCada100 =
    resumen && resumen.ingresos > 0
      ? Math.round((resumen.gastos / resumen.ingresos) * 100)
      : null

  return (
    <Card id="balance" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Ingresos vs. gastos</CardTitle>
        <CardDescription>Parte de todo lo que se movió</CardDescription>
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
                      formatter={(valor, nombre, item) => (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span
                              className="size-2.5 rounded-[2px]"
                              style={{ background: item.payload.color }}
                            />
                            {config[nombre as keyof typeof config]?.label}
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
                  paddingAngle={resumen.ingresos && resumen.gastos ? 2 : 0}
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
                      const signo = resumen.balance > 0 ? "+" : ""
                      return (
                        <text x={cx} y={cy} textAnchor="middle">
                          <tspan
                            x={cx}
                            y={cy - 4}
                            className="fill-foreground text-base font-semibold tabular-nums"
                          >
                            {signo}
                            {formatearPesos(resumen.balance)}
                          </tspan>
                          <tspan
                            x={cx}
                            y={cy + 16}
                            className="fill-muted-foreground text-xs"
                          >
                            balance
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
                  <span>{config[d.clave as keyof typeof config].label}</span>
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
      {porCada100 !== null ? (
        <CardFooter className="text-sm text-muted-foreground">
          Por cada $ 100 que entran, se van $ {porCada100}.
        </CardFooter>
      ) : null}
    </Card>
  )
}
