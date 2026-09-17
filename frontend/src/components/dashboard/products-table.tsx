import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react"

import type { PaginaProductos } from "@/components/dashboard/tipos"
import { useApi } from "@/hooks/use-api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
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
import { formatearNumero, formatearPesos } from "@/lib/format"

const POR_PAGINA = 20

const FILTROS = [
  { valor: "", etiqueta: "Todos" },
  { valor: "active", etiqueta: "Disponibles" },
  { valor: "low_stock", etiqueta: "Pocas unidades" },
  { valor: "out_of_stock", etiqueta: "Agotados" },
]

const VARIANTE = {
  active: "secondary",
  low_stock: "outline",
  out_of_stock: "outline",
} as const

export function ProductsTable({ country }: { country: string }) {
  const [busqueda, setBusqueda] = React.useState("")
  const [busquedaAplicada, setBusquedaAplicada] = React.useState("")
  const [estado, setEstado] = React.useState("")
  const [pagina, setPagina] = React.useState(1)

  // Espera a que el usuario deje de escribir antes de consultar la API.
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setBusquedaAplicada(busqueda.trim())
      setPagina(1)
    }, 350)
    return () => window.clearTimeout(id)
  }, [busqueda])

  // Al cambiar el pais se vuelve a la primera pagina: el total es otro.
  // Se ajusta durante el render, que es lo que React recomienda para derivar
  // estado de un prop, en vez de un efecto que provoca un render extra.
  const [paisAnterior, setPaisAnterior] = React.useState(country)
  if (paisAnterior !== country) {
    setPaisAnterior(country)
    setPagina(1)
  }

  const params = new URLSearchParams({ page: String(pagina) })
  if (busquedaAplicada) params.set("search", busquedaAplicada)
  if (estado) params.set("status", estado)
  if (country) params.set("country", country)

  const { data, error, cargando, recargar } = useApi<PaginaProductos>(
    `/api/dashboard/products/?${params.toString()}`
  )

  const desde = (pagina - 1) * POR_PAGINA + 1
  const hasta = Math.min(pagina * POR_PAGINA, data?.count ?? 0)

  return (
    <Card id="productos" className="scroll-mt-20">
      <CardHeader className="border-b">
        <CardTitle>Productos</CardTitle>
        <CardDescription>
          {data
            ? `${formatearNumero(data.count)} productos · unidades e ingresos de pedidos pagados${
                country ? ` en ${country}` : ""
              }`
            : "Unidades e ingresos por producto"}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="sm:max-w-xs">
            <InputGroupInput
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, SKU o categoría"
              aria-label="Buscar productos"
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>

          <ToggleGroup
            variant="outline"
            size="sm"
            value={[estado]}
            onValueChange={(valores: string[]) => {
              setEstado(valores[0] ?? "")
              setPagina(1)
            }}
            aria-label="Filtrar por estado"
            className="flex-wrap"
          >
            {FILTROS.map((filtro) => (
              <ToggleGroupItem key={filtro.valor || "todos"} value={filtro.valor}>
                {filtro.etiqueta}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {error ? (
          <div className="flex flex-col items-start gap-3 px-4 pb-2">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={recargar}>
              Reintentar
            </Button>
          </div>
        ) : cargando && !data ? (
          <div className="flex flex-col gap-3 px-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : data && data.results.length === 0 ? (
          <p className="px-4 pb-2 text-sm text-muted-foreground">
            Ningún producto coincide con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Unidades</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.results.map((producto) => (
                  <TableRow key={producto.sku}>
                    <TableCell className="font-medium">
                      <span className="flex flex-col">
                        {producto.name}
                        <span className="text-xs font-normal text-muted-foreground tabular-nums">
                          {producto.sku}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {producto.category}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearPesos(producto.price)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={VARIANTE[producto.status]}>
                        {producto.status_label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearNumero(producto.units_sold)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatearPesos(producto.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {data && data.count > 0 ? (
        <CardFooter className="justify-between gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {desde}–{hasta} de {formatearNumero(data.count)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data.previous}
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data.next}
              onClick={() => setPagina((p) => p + 1)}
            >
              Siguiente
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  )
}
