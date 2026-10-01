import { LandmarkIcon, RepeatIcon } from "lucide-react"

import {
  aCapital,
  creditoDe,
  efecto,
  type Credito,
} from "@/components/finanzas/creditos"
import { fijoDe, type GastoFijo } from "@/components/finanzas/fijos"
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
  const despues = credito.saldo + efecto(tipo, valor ?? 0, credito.costo_pct)
  const capital = aCapital(valor ?? 0, credito.costo_pct)
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
            {tipo === "gasto" && credito.costo_pct !== null && valor ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                De {formatearPesos(valor)}, {formatearPesos(capital)} van a
                capital y {formatearPesos(valor - capital)} a intereses y
                seguros ({Number(credito.costo_pct).toLocaleString("es-CO")} %).
              </p>
            ) : null}
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

/**
 * Lo mismo para un gasto fijo (Mamá, arriendo…): un gasto es un pago y lo va
 * llenando; un ingreso es un préstamo y se suma a lo que se le debe este mes.
 */
export function AvisoFijo({
  concepto,
  tipo,
  valor,
  fecha,
  fijos,
}: {
  concepto: string
  tipo: Tipo
  valor: number | null
  fecha: string
  fijos: GastoFijo[] | null
}) {
  const fijo = fijoDe(concepto, fijos)
  if (!fijo) return null

  // Un gasto fijo que todavía no empieza no tiene "este mes".
  const delMes =
    fijo.este_mes !== null && fecha.slice(0, 7) === fijo.este_mes.mes
  const despues =
    fijo.pendiente_mes + (tipo === "gasto" ? -1 : 1) * (valor ?? 0)

  return (
    <div className="flex gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
      <RepeatIcon className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">
          {tipo === "gasto"
            ? `Pago a ${fijo.nombre}`
            : `Préstamo de ${fijo.nombre}`}
        </p>
        {!delMes ? (
          <p className="text-muted-foreground">
            Cuenta para el mes de esa fecha, no para el de ahora.
          </p>
        ) : (
          <p className="text-muted-foreground tabular-nums">
            {tipo === "gasto" ? "Este mes faltan " : "Este mes le debes "}
            {formatearPesos(fijo.pendiente_mes)}
            {" → "}
            <span className="font-medium text-foreground">
              {despues <= 0
                ? "¡queda al día!"
                : `${tipo === "gasto" ? "quedan" : "pasas a deberle"} ${formatearPesos(despues)}`}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
