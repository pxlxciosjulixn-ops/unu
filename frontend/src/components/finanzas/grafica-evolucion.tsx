import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { acumular, type PuntoSerie } from "@/components/finanzas/finanzas"
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

const config = {
  ingresos: { label: "Ingresos", color: "var(--chart-1)" },
  gastos: { label: "Gastos", color: "var(--chart-3)" },
} satisfies ChartConfig

type Vista = "periodo" | "acumulado"

/**
 * Ingresos y gastos en el tiempo. La vista acumulada muestra cuánto va
 * sumando cada línea: cuando la de gastos alcanza a la de ingresos, se acabó
 * lo que entró en el periodo.
 */
export function GraficaEvolucion({
  serie,
  porDia,
}: {
  serie: PuntoSerie[] | null
  porDia: boolean
}) {
  const [vista, setVista] = React.useState<Vista>("periodo")
  const datos = React.useMemo(
    () => (serie && vista === "acumulado" ? acumular(serie) : serie),
    [serie, vista]
  )
  const vacia =
    serie !== null && serie.every((p) => p.ingresos === 0 && p.gastos === 0)

  return (
    <Card id="evolucion" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Ingresos contra gastos</CardTitle>
        <CardDescription>
          {vista === "acumulado"
            ? "Lo que va sumando cada uno en el periodo"
            : porDia
              ? "Día a día"
              : "Mes a mes"}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[vista]}
            onValueChange={(valores: string[]) => {
              if (valores[0]) setVista(valores[0] as Vista)
            }}
            aria-label="Vista de la gráfica"
          >
            <ToggleGroupItem value="periodo">
              {porDia ? "Por día" : "Por mes"}
            </ToggleGroupItem>
            <ToggleGroupItem value="acumulado">Acumulado</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      {/* La tarjeta se estira al alto de la torta de al lado: la gráfica
          ocupa ese alto en vez de dejar un hueco abajo. */}
      <CardContent className="flex flex-1 flex-col">
        {!datos ? (
          <Skeleton className="h-80 w-full" />
        ) : vacia ? (
          <SinMovimientos className="h-80" />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto min-h-80 w-full flex-1"
          >
            <LineChart data={datos} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="etiqueta"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(v: number) => formatearPesosCompacto(v)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(etiqueta) =>
                      porDia && vista === "periodo"
                        ? `Día ${etiqueta}`
                        : etiqueta
                    }
                    formatter={(valor, nombre) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className="size-2.5 rounded-[2px]"
                            style={{
                              background: `var(--color-${String(nombre)})`,
                            }}
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
              {/* Tramos rectos, sin suavizar: una curva inventaría valores
                  entre dos puntos (y hasta bajaría de cero). */}
              <Line
                dataKey="ingresos"
                type="linear"
                stroke="var(--color-ingresos)"
                strokeWidth={2.5}
                dot={datos.length <= 16 ? { r: 3 } : false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
              {/* Gastos punteada: en escala de grises, la forma distingue las
                  dos líneas mejor que el tono. */}
              <Line
                dataKey="gastos"
                type="linear"
                stroke="var(--color-gastos)"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={datos.length <= 16 ? { r: 3 } : false}
                activeDot={{ r: 5 }}
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
