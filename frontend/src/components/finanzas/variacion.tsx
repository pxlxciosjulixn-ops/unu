import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { formatearPorcentaje } from "@/lib/format"

/**
 * El "+12,3 % vs. agosto" del pie de las tarjetas.
 *
 * Lo comparten el resumen del periodo y las tarjetas de un concepto, que
 * miden cosas distintas pero se leen igual.
 */
export function Variacion({
  cambio,
  comparacion,
}: {
  cambio: number | null
  comparacion: string | null
}) {
  if (comparacion === null) {
    return (
      <span className="text-xs text-muted-foreground">Todo el historial</span>
    )
  }
  if (cambio === null) {
    return (
      <span className="text-xs text-muted-foreground">
        Sin datos para comparar
      </span>
    )
  }

  const Icono =
    Math.abs(cambio) < 0.05
      ? MinusIcon
      : cambio > 0
        ? TrendingUpIcon
        : TrendingDownIcon

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1 font-medium text-foreground tabular-nums">
        <Icono className="size-3.5" />
        {cambio > 0 ? "+" : ""}
        {formatearPorcentaje(cambio)}
      </span>
      {comparacion}
    </span>
  )
}
