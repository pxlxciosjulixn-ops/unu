import * as React from "react"

import {
  porConcepto,
  type Movimiento,
  type Tipo,
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
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatearPesos, formatearPorcentaje } from "@/lib/format"

/**
 * Los conceptos más grandes del periodo, de gasto o de ingreso. Un clic en
 * uno filtra todo el dashboard por ese concepto.
 */
export function GastosPorConcepto({
  movimientos,
  onElegir,
}: {
  movimientos: Movimiento[] | null
  onElegir: (concepto: string) => void
}) {
  const [tipo, setTipo] = React.useState<Tipo>("gasto")
  const grupos = React.useMemo(
    () => (movimientos ? porConcepto(movimientos, tipo, 6) : null),
    [movimientos, tipo]
  )

  return (
    <Card id="conceptos" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>
          {tipo === "gasto" ? "¿En qué se va la plata?" : "¿De dónde entra?"}
        </CardTitle>
        <CardDescription>Por concepto</CardDescription>
        <CardAction>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[tipo]}
            onValueChange={(valores: string[]) => {
              if (valores[0]) setTipo(valores[0] as Tipo)
            }}
            aria-label="Tipo de movimiento"
          >
            <ToggleGroupItem value="gasto">Gastos</ToggleGroupItem>
            <ToggleGroupItem value="ingreso">Ingresos</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!grupos ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <SinMovimientos
            texto={
              tipo === "gasto"
                ? "No hay gastos en este periodo."
                : "No hay ingresos en este periodo."
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {grupos.map((g) => (
              <li key={g.concepto}>
                {/* "Otros" junta varios conceptos: no tiene uno por el cual
                    filtrar. */}
                <button
                  type="button"
                  disabled={g.agrupado}
                  onClick={() => onElegir(g.concepto)}
                  title={g.agrupado ? undefined : `Ver solo ${g.concepto}`}
                  className="-mx-2 flex w-[calc(100%+1rem)] flex-col gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none"
                >
                  <span className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{g.concepto}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatearPesos(g.total)}
                    </span>
                  </span>
                  <Progress value={g.pct} aria-label={g.concepto} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatearPorcentaje(g.pct)} · {g.veces}{" "}
                    {g.veces === 1 ? "movimiento" : "movimientos"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
