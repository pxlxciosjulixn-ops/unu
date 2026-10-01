import * as React from "react"
import { FileSpreadsheetIcon, PrinterIcon, SearchIcon } from "lucide-react"

import {
  formatearFechaLocal,
  hoyISO,
  type Movimiento,
  type Tipo,
} from "@/components/finanzas/finanzas"
import { SinMovimientos } from "@/components/finanzas/sin-movimientos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatearPesos } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Filas antes del botón "Ver más". */
const FILAS = 15

/** Sin tildes ni mayúsculas, para que "cafe" encuentre "Café". */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
}

/**
 * Baja lo listado como CSV para Excel: separado por punto y coma (el Excel en
 * español toma la coma como decimal) y con BOM para que respete las tildes.
 */
function descargarExcel(movimientos: Movimiento[]) {
  const celda = (texto: string) => `"${texto.replace(/"/g, '""')}"`
  const filas = [
    ["Fecha", "Tipo", "Concepto", "Valor"].join(";"),
    ...movimientos.map((m) =>
      [
        m.fecha,
        m.tipo === "ingreso" ? "Ingreso" : "Gasto",
        celda(m.concepto),
        m.tipo === "ingreso" ? m.valor : -m.valor,
      ].join(";")
    ),
  ]
  const archivo = new Blob([String.fromCharCode(0xfeff) + filas.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  })
  const enlace = document.createElement("a")
  enlace.href = URL.createObjectURL(archivo)
  enlace.download = `movimientos-${hoyISO()}.csv`
  enlace.click()
  URL.revokeObjectURL(enlace.href)
}

export function TablaMovimientos({
  movimientos,
  cargando,
}: {
  movimientos: Movimiento[] | null
  cargando: boolean
}) {
  const [filtro, setFiltro] = React.useState<Tipo | "todos">("todos")
  const [busqueda, setBusqueda] = React.useState("")
  const [visibles, setVisibles] = React.useState(FILAS)

  const filtrados = React.useMemo(() => {
    const buscado = normalizar(busqueda.trim())
    return (movimientos ?? []).filter(
      (m) =>
        (filtro === "todos" || m.tipo === filtro) &&
        (!buscado || normalizar(m.concepto).includes(buscado))
    )
  }, [movimientos, filtro, busqueda])

  const suma = filtrados.reduce(
    (total, m) => total + (m.tipo === "ingreso" ? m.valor : -m.valor),
    0
  )

  return (
    <Card
      id="movimientos"
      className={cn("scroll-mt-20", cargando && "opacity-60")}
    >
      <CardHeader>
        <CardTitle>Movimientos</CardTitle>
        <CardDescription>
          {movimientos
            ? `${filtrados.length} ${filtrados.length === 1 ? "movimiento" : "movimientos"}`
            : "Cargando…"}
        </CardDescription>
        <CardAction>
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[filtro]}
            onValueChange={(valores: string[]) => {
              if (!valores[0]) return
              setFiltro(valores[0] as Tipo | "todos")
              setVisibles(FILAS)
            }}
            aria-label="Filtrar por tipo"
          >
            <ToggleGroupItem value="todos">Todos</ToggleGroupItem>
            <ToggleGroupItem value="gasto">Gastos</ToggleGroupItem>
            <ToggleGroupItem value="ingreso">Ingresos</ToggleGroupItem>
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setVisibles(FILAS)
              }}
              placeholder="Buscar por concepto"
              aria-label="Buscar por concepto"
            />
          </InputGroup>
          {/* Exportan lo que está listado: el periodo, el filtro y la
              búsqueda de arriba. */}
          <div className="flex shrink-0 gap-2 print:hidden">
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1"
              disabled={!filtrados.length}
              onClick={() => descargarExcel(filtrados)}
            >
              <FileSpreadsheetIcon data-icon="inline-start" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 flex-1"
              onClick={() => {
                // Al imprimir salen todas las filas, no solo las primeras.
                setVisibles(filtrados.length)
                setTimeout(() => window.print(), 50)
              }}
            >
              <PrinterIcon data-icon="inline-start" />
              PDF
            </Button>
          </div>
        </div>

        {!movimientos ? (
          <Skeleton className="h-64 w-full" />
        ) : filtrados.length === 0 ? (
          <SinMovimientos
            texto={
              busqueda.trim()
                ? "Ningún concepto coincide con la búsqueda."
                : "No hay movimientos en este periodo."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-32 sm:table-cell">
                  Fecha
                </TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.slice(0, visibles).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">
                    {formatearFechaLocal(m.fecha)}
                  </TableCell>
                  {/* En el celular la fecha va debajo del concepto: así el
                      valor, que es lo que importa, no se sale de la pantalla. */}
                  <TableCell className="w-full max-w-0 sm:w-auto sm:max-w-md">
                    <span className="block truncate" title={m.concepto}>
                      {m.concepto}
                    </span>
                    {m.automatico ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        Automático: lo que sobró de los meses anteriores
                      </span>
                    ) : null}
                    <span className="block text-xs text-muted-foreground tabular-nums sm:hidden">
                      {formatearFechaLocal(m.fecha)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant={m.tipo === "ingreso" ? "default" : "secondary"}
                    >
                      {m.tipo === "ingreso" ? "Ingreso" : "Gasto"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      m.tipo === "gasto" && "text-muted-foreground"
                    )}
                  >
                    {m.tipo === "gasto" ? "−" : "+"}
                    {formatearPesos(m.valor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {movimientos && filtrados.length > 0 ? (
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t">
          <span className="text-sm text-muted-foreground">
            Neto de lo listado:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {suma > 0 ? "+" : ""}
              {formatearPesos(suma)}
            </span>
          </span>
          {filtrados.length > visibles ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibles((n) => n + FILAS)}
            >
              Ver más ({filtrados.length - visibles})
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}
