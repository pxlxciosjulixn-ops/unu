import { CalendarClockIcon } from "lucide-react"

import { mesActual, nombreMesLargo } from "@/components/finanzas/analisis"
import type { ProximoPago } from "@/components/finanzas/fijos"
import { formatearPesos } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * "Próximo pago · noviembre de 2026: $821.000" al pie de un crédito o de un
 * gasto fijo. Si todavía falta algo de este mes, eso es lo próximo. Cambia
 * solo cuando cambia el mes.
 */
export function LineaProximoPago({ proximo }: { proximo: ProximoPago | null }) {
  if (!proximo) return null
  const deEsteMes = proximo.mes === mesActual()
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        deEsteMes ? "border-destructive/40" : "bg-muted/40"
      )}
    >
      <CalendarClockIcon className="size-4 shrink-0" />
      <span className="flex-1 first-letter:uppercase">
        {deEsteMes ? "Falta pagar en " : "Próximo pago · "}
        {nombreMesLargo(proximo.mes)}
      </span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          deEsteMes && "text-destructive"
        )}
      >
        {formatearPesos(proximo.valor)}
      </span>
    </div>
  )
}
