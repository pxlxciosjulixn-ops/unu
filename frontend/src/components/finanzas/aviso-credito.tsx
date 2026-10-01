import { LandmarkIcon } from "lucide-react"

import { creditoDe, efecto, type Credito } from "@/components/finanzas/creditos"
import { formatearFechaLocal, type Tipo } from "@/components/finanzas/finanzas"
import { formatearPesos } from "@/lib/format"

/**
 * Debajo del valor, cuando el concepto es un crédito: cuánto va a quedar
 * debiendo. Un gasto es un abono y baja la deuda; un ingreso es un avance y
 * la sube.
 */
export function AvisoCredito({
  concepto,
  tipo,
  valor,
  fecha,
  creditos,
}: {
  concepto: string
  tipo: Tipo
  valor: number | null
  fecha: string
  creditos: Credito[] | null
}) {
  const credito = creditoDe(concepto, creditos)
  if (!credito) return null

  const antes = fecha < credito.fecha_inicio
  const despues = credito.saldo + efecto(tipo, valor ?? 0)
  const libre = credito.cupo !== null ? credito.cupo - despues : null

  return (
    <div className="flex gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
      <LandmarkIcon className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">
          {tipo === "gasto"
            ? `Abono a ${credito.nombre}`
            : `Avance de ${credito.nombre}`}
        </p>
        {antes ? (
          <p className="text-muted-foreground">
            No mueve el saldo: es de antes del{" "}
            {formatearFechaLocal(credito.fecha_inicio)}, cuando se registró el
            crédito.
          </p>
        ) : (
          <>
            <p className="text-muted-foreground tabular-nums">
              La deuda {tipo === "gasto" ? "baja" : "sube"} de{" "}
              {formatearPesos(credito.saldo)} a{" "}
              <span className="font-medium text-foreground">
                {formatearPesos(despues)}
              </span>
              .
            </p>
            {libre !== null ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {libre >= 0
                  ? `Quedan ${formatearPesos(libre)} de cupo.`
                  : `Pasa el cupo por ${formatearPesos(-libre)}.`}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
