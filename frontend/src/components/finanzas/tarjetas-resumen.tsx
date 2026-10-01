import { variacion, type Totales } from "@/components/finanzas/finanzas"
import { Variacion } from "@/components/finanzas/variacion"
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
  promedio = null,
}: {
  actual: Totales | null
  /** Totales del tramo anterior; null si el periodo no tiene con qué comparar. */
  anterior: Totales | null
  comparacion: string | null
  /**
   * Promedio mensual de los últimos meses cerrados. Solo tiene sentido cuando
   * se mira un mes: un mes contra el anterior engaña si ese fue raro.
   */
  promedio?: Totales | null
}) {
  if (!actual) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <TarjetaPesos
        titulo="Ingresos"
        valor={actual.ingresos}
        cambio={variacion(actual.ingresos, anterior?.ingresos)}
        comparacion={comparacion}
        promedio={promedio?.ingresos}
      />
      <TarjetaPesos
        titulo="Gastos"
        valor={actual.gastos}
        cambio={variacion(actual.gastos, anterior?.gastos)}
        comparacion={comparacion}
        promedio={promedio?.gastos}
      />
      <TarjetaPesos
        titulo="Balance"
        valor={actual.balance}
        conSigno
        cambio={variacion(actual.balance, anterior?.balance)}
        comparacion={comparacion}
        promedio={promedio?.balance}
      />

      <Card>
        <CardHeader>
          <CardDescription>Ahorro</CardDescription>
          <CardTitle className="text-lg tabular-nums sm:text-2xl">
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
        <CardFooter className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
          {actual.ahorroPct === null
            ? "Sin ingresos en el periodo"
            : actual.ahorroPct < 0
              ? "Se gastó más de lo que entró"
              : "De lo que entró, quedó libre"}
          {promedio && promedio.ahorroPct !== null ? (
            <span className="tabular-nums">
              Promedio 3 meses: {formatearPorcentaje(promedio.ahorroPct, 1)}
            </span>
          ) : null}
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
  promedio,
}: {
  titulo: string
  valor: number
  conSigno?: boolean
  cambio: number | null
  comparacion: string | null
  promedio?: number
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="text-lg break-all tabular-nums sm:text-2xl">
          {conSigno && valor > 0 ? "+" : ""}
          {formatearPesos(valor)}
        </CardTitle>
      </CardHeader>
      <CardFooter className="mt-auto flex flex-col items-start gap-1">
        <Variacion cambio={cambio} comparacion={comparacion} />
        {promedio !== undefined ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            Promedio 3 meses: {conSigno && promedio > 0 ? "+" : ""}
            {formatearPesos(promedio)}
          </span>
        ) : null}
      </CardFooter>
    </Card>
  )
}
