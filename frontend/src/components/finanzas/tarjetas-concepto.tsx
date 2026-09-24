import {
  variacion,
  type ComparacionConcepto,
  type Totales,
} from "@/components/finanzas/finanzas"
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
 * Las cuatro cifras de arriba cuando hay un concepto elegido.
 *
 * Con el filtro puesto, el resumen normal no dice nada: los ingresos quedan
 * en cero, el balance es el gasto en negativo y el ahorro sale en "—". Estas
 * tarjetas cambian la pregunta: no "cómo va el mes" sino "cuánto pesa este
 * concepto", contra lo que entró y contra todo lo que se gastó.
 */
export function TarjetasConcepto({
  comparacion,
  anterior,
  descripcionComparacion,
}: {
  comparacion: ComparacionConcepto | null
  /** Totales del mismo concepto en el tramo anterior; `null` si no hay. */
  anterior: Totales | null
  descripcionComparacion: string | null
}) {
  if (!comparacion) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const { concepto, esIngreso, total, veces, promedio } = comparacion
  const antes = anterior
    ? esIngreso
      ? anterior.ingresos
      : anterior.gastos
    : null

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription className="truncate" title={concepto}>
            {esIngreso ? "Entró por" : "Se fue en"} {concepto}
          </CardDescription>
          <CardTitle className="text-2xl break-all tabular-nums">
            {formatearPesos(total)}
          </CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto">
          <Variacion
            cambio={variacion(total, antes)}
            comparacion={descripcionComparacion}
          />
        </CardFooter>
      </Card>

      {/* La referencia que se perdía al filtrar: un gasto contra lo que
          entró en el periodo, aunque ese ingreso sea de otro concepto. */}
      <TarjetaParte
        titulo={esIngreso ? "Frente a los gastos" : "Frente a los ingresos"}
        pct={comparacion.pctCruzado}
        referencia={comparacion.totalCruzado}
        pie={
          esIngreso
            ? "de todo lo que se gastó en el periodo"
            : "de todo lo que entró en el periodo"
        }
        vacio={
          esIngreso ? "Sin gastos en el periodo" : "Sin ingresos en el periodo"
        }
      />

      <TarjetaParte
        titulo={esIngreso ? "Parte de los ingresos" : "Parte de los gastos"}
        pct={comparacion.pctPropio}
        referencia={comparacion.totalPropio}
        pie={
          esIngreso
            ? "del total que entró en el periodo"
            : "del total que se gastó en el periodo"
        }
        vacio="Sin movimientos en el periodo"
      />

      <Card>
        <CardHeader>
          <CardDescription>Movimientos</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{veces}</CardTitle>
        </CardHeader>
        <CardFooter className="mt-auto text-xs text-muted-foreground">
          {veces > 0
            ? `${formatearPesos(promedio)} en promedio cada uno`
            : "Nada anotado en este periodo"}
        </CardFooter>
      </Card>
    </div>
  )
}

/** Un porcentaje con su barra y, debajo, los pesos contra los que se mide. */
function TarjetaParte({
  titulo,
  pct,
  referencia,
  pie,
  vacio,
}: {
  titulo: string
  pct: number | null
  referencia: number
  pie: string
  vacio: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {pct === null ? "—" : formatearPorcentaje(pct, 1)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Un concepto puede pasarse del 100 % (gastar más de lo que entró):
            la barra se queda llena y el número de arriba lo dice. */}
        <Progress value={Math.min(pct ?? 0, 100)} aria-label={titulo} />
      </CardContent>
      <CardFooter className="mt-auto text-xs text-muted-foreground">
        {pct === null ? vacio : `${formatearPesos(referencia)} ${pie}`}
      </CardFooter>
    </Card>
  )
}
