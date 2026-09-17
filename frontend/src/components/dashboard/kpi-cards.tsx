import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import type { Resumen, Tarjeta } from "@/components/dashboard/tipos"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatearNumero,
  formatearPesos,
  formatearPesosCompacto,
  formatearPorcentaje,
} from "@/lib/format"
import { cn } from "@/lib/utils"

/** Anillo de progreso contra la meta del mes, en monocromo. */
function Anillo({ porcentaje }: { porcentaje: number | null }) {
  const radio = 26
  const circunferencia = 2 * Math.PI * radio
  const avance = Math.min(porcentaje ?? 0, 100) / 100

  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={radio}
          fill="none"
          strokeWidth="6"
          className="stroke-muted"
        />
        {porcentaje === null ? null : (
          <circle
            cx="32"
            cy="32"
            r={radio}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circunferencia}
            strokeDashoffset={circunferencia * (1 - avance)}
            className="stroke-foreground"
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
        {porcentaje === null ? "—" : `${Math.round(porcentaje)}%`}
      </span>
    </div>
  )
}

function Variacion({ valor }: { valor: number | null }) {
  if (valor === null) {
    return <span className="text-xs text-muted-foreground">sin comparación</span>
  }

  const sube = valor >= 0
  const Icono = sube ? TrendingUpIcon : TrendingDownIcon

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs tabular-nums",
        sube ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <Icono className="size-3.5" />
      {sube ? "+" : ""}
      {formatearPorcentaje(valor)}
    </span>
  )
}

function TarjetaKpi({ tarjeta }: { tarjeta: Tarjeta }) {
  // En pesos el numero completo no cabe en la tarjeta: se muestra compacto y
  // el valor exacto queda en el `title` y para lectores de pantalla.
  const exacto =
    tarjeta.format === "currency"
      ? formatearPesos(tarjeta.value)
      : formatearNumero(tarjeta.value)
  const valor =
    tarjeta.format === "currency"
      ? formatearPesosCompacto(tarjeta.value)
      : formatearNumero(tarjeta.value)

  return (
    <Card>
      <CardContent className="flex items-center gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            {tarjeta.label}
          </span>
          <span
            title={exacto}
            aria-label={exacto}
            className="truncate text-2xl font-semibold tracking-tight tabular-nums"
          >
            {valor}
          </span>
          <Variacion valor={tarjeta.change_pct} />
        </div>
        <Anillo porcentaje={tarjeta.target_pct} />
      </CardContent>
    </Card>
  )
}

export function KpiCards({ resumen }: { resumen: Resumen | null }) {
  if (!resumen) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 sm:px-5">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="size-16 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {resumen.cards.map((tarjeta) => (
        <TarjetaKpi key={tarjeta.key} tarjeta={tarjeta} />
      ))}
    </div>
  )
}
