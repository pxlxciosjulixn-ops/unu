import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import { variacion, type Totales } from "@/components/finanzas/finanzas"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { formatearPesos, formatearPorcentaje } from "@/lib/format"

/**
 * Las cuatro cifras de arriba, siempre con el número completo: en finanzas
 * personales "136 k" esconde justo lo que se quiere mirar.
 */
export function TarjetasResumen({
  actual,
  anterior,
  comparacion,
}: {
  actual: Totales | null
  /** Totales del tramo anterior; null si el periodo no tiene con qué comparar. */
  anterior: Totales | null
  comparacion: string | null
}) {
  if (!actual) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <TarjetaPesos
        titulo="Ingresos"
        valor={actual.ingresos}
        cambio={variacion(actual.ingresos, anterior?.ingresos)}
        comparacion={comparacion}
      />
      <TarjetaPesos
        titulo="Gastos"
        valor={actual.gastos}
        cambio={variacion(actual.gastos, anterior?.gastos)}
        comparacion={comparacion}
      />
      <TarjetaPesos
        titulo="Balance"
        valor={actual.balance}
        conSigno
        cambio={variacion(actual.balance, anterior?.balance)}
        comparacion={comparacion}
      />

      <Card>
        <CardHeader>
          <CardDescription>Ahorro</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {actual.ahorroPct === null
              ? "—"
              : formatearPorcentaje(actual.ahorroPct, 1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={Math.min(Math.max(actual.ahorroPct ?? 0, 0), 100)}
            aria-label="Parte del ingreso que quedó sin gastar"
          />
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          {actual.ahorroPct === null
            ? "Sin ingresos en el periodo"
            : actual.ahorroPct < 0
              ? "Se gastó más de lo que entró"
              : "De lo que entró, quedó libre"}
        </CardFooter>
      </Card>
    </div>
  )
}

function TarjetaPesos({
  titulo,
  valor,
  conSigno = false,
  cambio,
  comparacion,
}: {
  titulo: string
  valor: number
  conSigno?: boolean
  cambio: number | null
  comparacion: string | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="text-2xl break-all tabular-nums">
          {conSigno && valor > 0 ? "+" : ""}
          {formatearPesos(valor)}
        </CardTitle>
      </CardHeader>
      <CardFooter className="mt-auto">
        <Variacion cambio={cambio} comparacion={comparacion} />
      </CardFooter>
    </Card>
  )
}

function Variacion({
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
