import * as React from "react"

import { compararMeses, nombreMesLargo } from "@/components/finanzas/analisis"
import type { Movimiento, Tipo } from "@/components/finanzas/finanzas"
import { SinMovimientos } from "@/components/finanzas/sin-movimientos"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatearPesos } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Dos meses cualquiera, concepto por concepto: qué subió y qué bajó. */
export function CompararMeses({
  movimientos,
  meses,
}: {
  movimientos: Movimiento[] | null
  /** Meses con datos, del más reciente al más viejo. */
  meses: string[]
}) {
  const [elegidos, setElegidos] = React.useState<[string, string] | null>(null)
  const [tipo, setTipo] = React.useState<Tipo>("gasto")
  // Por defecto, el mes pasado contra este.
  const [a, b] = elegidos ?? [meses[1] ?? meses[0] ?? "", meses[0] ?? ""]

  const filas = React.useMemo(
    () =>
      movimientos && a && b ? compararMeses(movimientos, a, b, tipo) : null,
    [movimientos, a, b, tipo]
  )
  const totalA = filas?.reduce((s, f) => s + f.a, 0) ?? 0
  const totalB = filas?.reduce((s, f) => s + f.b, 0) ?? 0
  const mayor =
    filas?.reduce((m, f) => Math.max(m, Math.abs(f.diferencia)), 0) || 1
  // En gastos subir es malo; en ingresos, bueno.
  const malo = (diferencia: number) =>
    tipo === "gasto" ? diferencia > 0 : diferencia < 0

  const selector = (
    valor: string,
    cambiar: (v: string) => void,
    etiqueta: string
  ) => (
    <Select
      value={valor}
      onValueChange={(v: string | null) => {
        if (v) cambiar(v)
      }}
    >
      <SelectTrigger size="sm" aria-label={etiqueta} className="w-44">
        <SelectValue>
          {(v) => (
            <span className="first-letter:uppercase">
              {v ? nombreMesLargo(String(v)) : "—"}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {meses.map((m) => (
          <SelectItem key={m} value={m}>
            <span className="first-letter:uppercase">{nombreMesLargo(m)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <Card id="comparar" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Comparar dos meses</CardTitle>
        <CardDescription>
          Concepto por concepto, de la mayor diferencia a la menor
        </CardDescription>
        <CardAction>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[tipo]}
            onValueChange={(valores: string[]) => {
              if (valores[0]) setTipo(valores[0] as Tipo)
            }}
            aria-label="Tipo de movimiento"
          >
            <ToggleGroupItem value="gasto">Gastos</ToggleGroupItem>
            <ToggleGroupItem value="ingreso">Ingresos</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {selector(a, (v) => setElegidos([v, b]), "Primer mes")}
          <span className="text-muted-foreground">contra</span>
          {selector(b, (v) => setElegidos([a, v]), "Segundo mes")}
        </div>

        {!filas ? (
          <Skeleton className="h-48 w-full" />
        ) : filas.length === 0 ? (
          <SinMovimientos texto="Ninguno de los dos meses tiene movimientos de este tipo." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right first-letter:uppercase">
                  {nombreMesLargo(a)}
                </TableHead>
                <TableHead className="text-right first-letter:uppercase">
                  {nombreMesLargo(b)}
                </TableHead>
                <TableHead className="w-1/3">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f) => (
                <TableRow key={f.concepto}>
                  <TableCell className="max-w-40 truncate">
                    {f.concepto}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearPesos(f.a)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatearPesos(f.b)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 bg-muted">
                        <div
                          className={cn(
                            "h-full",
                            malo(f.diferencia) ? "bg-destructive" : "bg-primary"
                          )}
                          style={{
                            width: `${(Math.abs(f.diferencia) / mayor) * 100}%`,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "w-28 text-right text-xs font-medium tabular-nums",
                          malo(f.diferencia) && "text-destructive"
                        )}
                      >
                        {f.diferencia > 0 ? "+" : f.diferencia < 0 ? "−" : ""}
                        {formatearPesos(Math.abs(f.diferencia))}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatearPesos(totalA)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatearPesos(totalB)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    malo(totalB - totalA) && "text-destructive"
                  )}
                >
                  {totalB - totalA > 0 ? "+" : totalB - totalA < 0 ? "−" : ""}
                  {formatearPesos(Math.abs(totalB - totalA))}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
