import * as React from "react"

import {
  claveConcepto,
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
import { cn } from "@/lib/utils"

/**
 * Los conceptos más grandes del periodo, de gasto o de ingreso. Un clic en
 * uno filtra todo el dashboard por ese concepto y otro clic lo suelta.
 *
 * Es la única tarjeta que no hace caso al filtro: recibe el periodo completo
 * y marca el concepto elegido. Filtrada mostraría una sola barra al 100 %, y
 * lo que se quiere ver aquí es justo contra qué compite.
 */
export function GastosPorConcepto({
  movimientos,
  activo,
  onElegir,
}: {
  movimientos: Movimiento[] | null
  /** El concepto por el que está filtrado el dashboard; `null` si ninguno. */
  activo: string | null
  onElegir: (concepto: string | null) => void
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
        <CardDescription>
          {activo ? "Todo el periodo, sin el filtro" : "Por concepto"}
        </CardDescription>
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
            {grupos.map((g) => {
              const marcado =
                activo !== null &&
                !g.agrupado &&
                claveConcepto(g.concepto) === claveConcepto(activo)
              return (
              <li key={g.concepto}>
                {/* "Otros" junta varios conceptos: no tiene uno por el cual
                    filtrar. */}
                <button
                  type="button"
                  disabled={g.agrupado}
                  aria-pressed={g.agrupado ? undefined : marcado}
                  onClick={() => onElegir(marcado ? null : g.concepto)}
                  title={
                    g.agrupado
                      ? undefined
                      : marcado
                        ? "Quitar el filtro"
                        : `Ver solo ${g.concepto}`
                  }
                  className={cn(
                    "-mx-2 flex w-[calc(100%+1rem)] flex-col gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none",
                    marcado && "bg-muted ring-1 ring-foreground/10"
                  )}
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
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
