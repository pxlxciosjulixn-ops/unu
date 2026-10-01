import { Link } from "react-router-dom"

import type {
  EstadoPresupuesto,
  Proyeccion,
} from "@/components/finanzas/analisis"
import { RUTAS_FINANZAS } from "@/components/finanzas/finanzas"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

/**
 * "A este ritmo terminas con…": el mes en curso estirado hasta su último día.
 * Siempre es del mes en curso, sin importar el periodo elegido arriba.
 */
export function ProyeccionMes({ datos }: { datos: Proyeccion | null }) {
  if (!datos) return <Skeleton className="h-72 w-full rounded-xl" />
  const enRojo = datos.balanceFinal < 0

  return (
    <Card id="proyeccion" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Proyección del mes</CardTitle>
        <CardDescription>
          Así cerraría el mes si sigue igual · faltan {datos.diasRestantes}{" "}
          {datos.diasRestantes === 1 ? "día" : "días"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            A este ritmo terminas con
          </p>
          <p
            className={cn(
              "text-3xl font-semibold tabular-nums",
              enRojo && "text-destructive"
            )}
          >
            {datos.balanceFinal > 0 ? "+" : ""}
            {formatearPesos(datos.balanceFinal)}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Dato titulo="Ingresos al cierre" valor={datos.ingresosFinal} />
          <Dato titulo="Gastos al cierre" valor={datos.gastosFinal} />
          <Dato titulo="Llevas gastado" valor={datos.gastos} />
          <Dato titulo="Gasto variable por día" valor={datos.ritmoDiario} />
        </dl>
        {datos.pendientes.length ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">
              Lo que falta de lo de cada mes (ya está sumado):
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {datos.pendientes.map((r) => (
                <li key={`${r.tipo}:${r.clave}`}>
                  <Badge variant={r.tipo === "ingreso" ? "default" : "outline"}>
                    {r.concepto} {r.tipo === "ingreso" ? "+" : "−"}
                    {formatearPesos(r.pendiente)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto text-xs text-muted-foreground">
        De lo que se repite cada mes se suma lo que falta; el resto va al ritmo
        diario.
      </CardFooter>
    </Card>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd className="font-medium tabular-nums">{formatearPesos(valor)}</dd>
    </div>
  )
}

/**
 * Los topes por concepto del mes: avisa al 80 % y marca en rojo al pasarse.
 * Los topes se ponen en la página de edición, junto a cada sugerencia.
 */
export function Presupuestos({
  estados,
  mes,
}: {
  estados: EstadoPresupuesto[] | null
  /** El mes que se está mirando, ya con nombre. */
  mes: string
}) {
  return (
    <Card id="presupuestos" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Presupuestos</CardTitle>
        <CardDescription className="first-letter:uppercase">
          {mes}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {!estados ? (
          <Skeleton className="h-48 w-full" />
        ) : estados.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <p>Todavía no hay topes.</p>
            <p>
              Ponlos en{" "}
              <Link
                to={`${RUTAS_FINANZAS.editar}#sugerencias`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Editar → Sugerencias
              </Link>
              , junto a cada concepto: ahí mismo sale cuánto gastas al mes en
              promedio.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {estados.map((e) => (
              <li key={e.id} className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{e.concepto}</span>
                    {e.pct >= 100 ? (
                      <Badge variant="destructive">Pasado</Badge>
                    ) : e.pct >= 80 ? (
                      <Badge variant="outline">Cerca</Badge>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatearPesos(e.gastado)}{" "}
                    <span className="text-muted-foreground">
                      / {formatearPesos(e.tope)}
                    </span>
                  </span>
                </span>
                <Progress
                  value={Math.min(e.pct, 100)}
                  aria-label={`${e.concepto}: ${formatearPorcentaje(e.pct, 0)} del tope`}
                  className={cn(
                    e.pct >= 100 &&
                      "[&_[data-slot=progress-indicator]]:bg-destructive"
                  )}
                />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatearPorcentaje(e.pct, 0)} del tope
                  {e.pct < 100
                    ? ` · quedan ${formatearPesos(e.tope - e.gastado)}`
                    : ` · ${formatearPesos(e.gastado - e.tope)} por encima`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
