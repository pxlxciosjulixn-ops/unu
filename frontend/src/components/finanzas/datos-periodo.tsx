import {
  formatearFechaLocal,
  type DatosPeriodo,
  type Movimiento,
} from "@/components/finanzas/finanzas"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { formatearNumero, formatearPesos } from "@/lib/format"

/** Cifras sueltas que no caben en una gráfica pero sirven para controlarse. */
export function DatosDelPeriodo({ datos }: { datos: DatosPeriodo | null }) {
  return (
    <Card id="datos" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Datos del periodo</CardTitle>
        <CardDescription>
          {datos
            ? `${formatearNumero(datos.dias)} ${datos.dias === 1 ? "día" : "días"} corridos`
            : "Cargando…"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!datos ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <dl className="flex flex-col gap-4">
            <Fila
              etiqueta="Gasto promedio por día"
              valor={formatearPesos(datos.promedioDiario)}
            />
            <Separator />
            <Destacado
              etiqueta="Gasto más grande"
              movimiento={datos.mayorGasto}
            />
            <Destacado
              etiqueta="Ingreso más grande"
              movimiento={datos.mayorIngreso}
            />
            <Separator />
            <Fila
              etiqueta="Movimientos registrados"
              valor={formatearNumero(datos.movimientos)}
            />
            <Fila
              etiqueta="Conceptos de gasto distintos"
              valor={formatearNumero(datos.conceptosDeGasto)}
            />
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium tabular-nums">{valor}</dd>
    </div>
  )
}

function Destacado({
  etiqueta,
  movimiento,
}: {
  etiqueta: string
  movimiento: Movimiento | null
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="flex items-baseline justify-between gap-4">
        {movimiento ? (
          <>
            <span className="flex min-w-0 flex-col">
              <span className="truncate" title={movimiento.concepto}>
                {movimiento.concepto}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatearFechaLocal(movimiento.fecha)}
              </span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatearPesos(movimiento.valor)}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  )
}
