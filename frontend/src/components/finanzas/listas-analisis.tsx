import { CheckIcon, ClockIcon } from "lucide-react"

import type {
  Anomalia,
  MesResumen,
  Recurrente,
} from "@/components/finanzas/analisis"
import { formatearFechaLocal } from "@/components/finanzas/finanzas"
import { SinMovimientos } from "@/components/finanzas/sin-movimientos"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatearPesos, formatearPorcentaje } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Lo que sale casi todos los meses, detectado solo: los pagos fijos y los
 * ingresos de siempre, y si este mes ya aparecieron.
 */
export function ListaRecurrentes({ datos }: { datos: Recurrente[] | null }) {
  const gastos = datos?.filter((r) => r.tipo === "gasto") ?? []
  const ingresos = datos?.filter((r) => r.tipo === "ingreso") ?? []
  const totalFijo = gastos.reduce((s, r) => s + r.monto, 0)

  return (
    <Card id="recurrentes" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Lo que se repite cada mes</CardTitle>
        <CardDescription>
          {datos && gastos.length
            ? `${formatearPesos(totalFijo)} al mes en gastos que se repiten`
            : "Aparece en 3 de los últimos 4 meses"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!datos ? (
          <Skeleton className="h-48 w-full" />
        ) : datos.length === 0 ? (
          <SinMovimientos texto="Hacen falta por lo menos dos meses completos para ver qué se repite." />
        ) : (
          <div className="flex flex-col gap-4">
            {[
              { titulo: "Pagos", lista: gastos },
              { titulo: "Ingresos", lista: ingresos },
            ]
              .filter((g) => g.lista.length)
              .map((g) => (
                <div key={g.titulo} className="flex flex-col gap-1">
                  <p className="text-xs text-muted-foreground">{g.titulo}</p>
                  <ul className="flex flex-col divide-y">
                    {g.lista.map((r) => (
                      <li
                        key={r.clave}
                        className="flex items-center gap-2 py-1.5 text-sm"
                      >
                        {r.pagadoEsteMes ? (
                          <CheckIcon
                            className="size-4 shrink-0"
                            aria-label="Ya salió este mes"
                          />
                        ) : (
                          <ClockIcon
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-label="Todavía no sale este mes"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {r.concepto}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {r.meses} meses
                        </span>
                        <span className="w-28 text-right tabular-nums">
                          {formatearPesos(r.monto)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Gastos recientes muy por encima de lo que se suele pagar en ese concepto. */
export function FueraDeLoNormal({ datos }: { datos: Anomalia[] | null }) {
  return (
    <Card id="anomalias" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Fuera de lo normal</CardTitle>
        <CardDescription>
          Gastos de los últimos 60 días de por lo menos el doble de lo usual
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!datos ? (
          <Skeleton className="h-48 w-full" />
        ) : datos.length === 0 ? (
          <SinMovimientos texto="Nada raro: todo está dentro de lo de siempre." />
        ) : (
          <ul className="flex flex-col divide-y">
            {datos.slice(0, 8).map((a) => (
              <li
                key={a.movimiento.id}
                className="flex items-center gap-3 py-2 text-sm"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {a.movimiento.concepto}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatearFechaLocal(a.movimiento.fecha)} · lo usual:{" "}
                    {formatearPesos(a.usual)}
                  </span>
                </span>
                <Badge variant="destructive">
                  ×{a.veces.toFixed(1).replace(".", ",")}
                </Badge>
                <span className="w-28 text-right font-medium tabular-nums">
                  {formatearPesos(a.movimiento.valor)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Lo que va a la familia (mamá, abuelos) y a los gatos: en el año y como
 * parte de lo que entró.
 */
export function FamiliaMascotas({ meses }: { meses: MesResumen[] | null }) {
  const ingresos = meses?.reduce((s, m) => s + m.ingresos, 0) ?? 0
  const filas = [
    { clave: "familia" as const, titulo: "Familia", detalle: "Mamá, abuelos…" },
    { clave: "mascotas" as const, titulo: "Mascotas", detalle: "Los gatos" },
  ].map((f) => {
    const total = meses?.reduce((s, m) => s + m.grupos[f.clave], 0) ?? 0
    const conDatos = meses?.filter((m) => m.grupos[f.clave] > 0).length ?? 0
    return {
      ...f,
      total,
      promedio: conDatos ? total / conDatos : 0,
      pct: ingresos > 0 ? (total / ingresos) * 100 : null,
      esteMes: meses?.at(-1)?.grupos[f.clave] ?? 0,
    }
  })

  return (
    <Card id="familia" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Familia y mascotas</CardTitle>
        <CardDescription>
          {meses?.length
            ? `Últimos ${meses.length} ${meses.length === 1 ? "mes" : "meses"}`
            : "Apoyo a la familia y los gatos"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!meses ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filas.map((f) => (
              <div
                key={f.clave}
                className={cn("flex flex-col gap-1 rounded-lg bg-muted/50 p-4")}
              >
                <p className="text-sm font-medium">{f.titulo}</p>
                <p className="text-xs text-muted-foreground">{f.detalle}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">
                  {formatearPesos(f.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {f.pct === null
                    ? "Sin ingresos para comparar"
                    : `${formatearPorcentaje(f.pct)} de lo que entró`}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Al mes</dt>
                    <dd className="font-medium tabular-nums">
                      {formatearPesos(Math.round(f.promedio))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Este mes</dt>
                    <dd className="font-medium tabular-nums">
                      {formatearPesos(f.esteMes)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
