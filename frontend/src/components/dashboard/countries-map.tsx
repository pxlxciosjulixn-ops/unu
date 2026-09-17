import * as React from "react"
import { geoCentroid, geoMercator, geoPath } from "d3-geo"
import type { FeatureCollection, Geometry } from "geojson"
import type { Topology } from "topojson-specification"
import { feature } from "topojson-client"

import topologia from "world-atlas/countries-110m.json"

import type { Pais, Paises } from "@/components/dashboard/tipos"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { aNumero, formatearNumero, formatearPesos } from "@/lib/format"

/**
 * ISO alfa-2 → ISO numérico, que es el `id` que usa el mapa de world-atlas.
 * Solo los países donde la operación puede vender; si aparece uno que no esté
 * en la tabla, el mapa lo deja sin pintar y sigue saliendo en el detalle.
 */
const ISO_NUMERICO: Record<string, string> = {
  AR: "032", BO: "068", BR: "076", CA: "124", CL: "152", CO: "170",
  CR: "188", CU: "192", DO: "214", EC: "218", ES: "724", GT: "320",
  HN: "340", MX: "484", NI: "558", PA: "591", PE: "604", PT: "620",
  PY: "600", SV: "222", US: "840", UY: "858", VE: "862",
}

/** Lienzo de trabajo de la proyeccion; el viewBox final se recorta al encuadre. */
const LIENZO = 600

// El topojson se convierte una sola vez: es el mismo para todos los renders.
const mundo = feature(
  topologia as unknown as Topology,
  (topologia as unknown as Topology).objects.countries
) as FeatureCollection<Geometry, { name: string }>

/** Más ventas, más oscuro. La escala es de raíz para que no se aplane. */
function intensidad(valor: number, maximo: number) {
  if (maximo <= 0 || valor <= 0) return 0
  return Math.sqrt(valor / maximo)
}

export function CountriesMap({ datos }: { datos: Paises | null }) {
  const [activo, setActivo] = React.useState<Pais | null>(null)

  const porId = React.useMemo(() => {
    const mapa = new Map<string, Pais>()
    for (const pais of datos?.results ?? []) {
      const id = ISO_NUMERICO[pais.country_code]
      if (id) mapa.set(id, pais)
    }
    return mapa
  }, [datos])

  // El mapa se encuadra en los paises que tienen ventas: mostrar el mundo
  // completo dejaria tres cuartos del recuadro vacios.
  //
  // Dos detalles que cuestan encontrar:
  // 1. El encuadre se calcula con los centros de esos paises, no con su
  //    contorno; territorios lejanos como Alaska estiran el rectangulo de
  //    Estados Unidos hasta dar la vuelta al planeta.
  // 2. d3-geo espera los anillos en sentido horario (al contrario de lo que
  //    pide GeoJSON); al revés interpreta el complemento, o sea el mundo.
  const { trazo, viewBox } = React.useMemo(() => {
    const centros = mundo.features
      .filter((f) => porId.has(String(f.id ?? "")))
      .map((f) => geoCentroid(f))
      .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat))

    const limites = [
      [0, 0],
      [LIENZO, LIENZO],
    ] as [[number, number], [number, number]]

    if (centros.length === 0) {
      const proyeccion = geoMercator().fitExtent(limites, mundo)
      return {
        trazo: geoPath(proyeccion),
        viewBox: `0 0 ${LIENZO} ${LIENZO}`,
      }
    }

    const lons = centros.map(([lon]) => lon)
    const lats = centros.map(([, lat]) => lat)
    const margen = 12
    const x0 = Math.max(Math.min(...lons) - margen, -179)
    const x1 = Math.min(Math.max(...lons) + margen, 179)
    const y0 = Math.max(Math.min(...lats) - margen, -58)
    const y1 = Math.min(Math.max(...lats) + margen, 78)

    const caja: FeatureCollection<Geometry, { name: string }> = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { name: "encuadre" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [x0, y0],
                [x0, y1],
                [x1, y1],
                [x1, y0],
                [x0, y0],
              ],
            ],
          },
        },
      ],
    }

    const proyeccion = geoMercator().fitExtent(limites, caja)
    const camino = geoPath(proyeccion)
    // El viewBox se ajusta al encuadre proyectado para que no queden franjas
    // vacias a los lados de una region alta y angosta como America.
    const [[bx0, by0], [bx1, by1]] = camino.bounds(caja)

    return {
      trazo: camino,
      viewBox: `${bx0} ${by0} ${bx1 - bx0} ${by1 - by0}`,
    }
  }, [porId])

  const maximo = Math.max(
    ...(datos?.results.map((p) => aNumero(p.revenue)) ?? [0]),
    1
  )

  const destacado = activo ?? datos?.results[0] ?? null

  return (
    <Card id="paises" className="scroll-mt-20">
      <CardHeader className="border-b">
        <CardTitle>Ventas por país</CardTitle>
        <CardDescription>
          {datos
            ? `${formatearPesos(datos.total_revenue)} en los últimos ${datos.months} meses`
            : "Cargando…"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {datos ? (
          <>
            <svg
              viewBox={viewBox}
              preserveAspectRatio="xMidYMid meet"
              className="mx-auto h-[17rem] w-auto max-w-full sm:h-[19rem]"
              role="img"
              aria-label="Mapa de ventas por país"
            >
              {mundo.features.map((pais) => {
                const id = String(pais.id ?? "")
                const dato = porId.get(id)
                const valor = dato ? aNumero(dato.revenue) : 0
                const mezcla = intensidad(valor, maximo)
                const camino = trazo(pais)
                if (!camino) return null

                return (
                  <path
                    key={id || pais.properties.name}
                    d={camino}
                    className="stroke-background transition-[fill]"
                    strokeWidth={0.4}
                    fill={
                      dato
                        ? `color-mix(in oklab, var(--foreground) ${Math.round(
                            20 + mezcla * 80
                          )}%, var(--muted))`
                        : "var(--muted)"
                    }
                    onMouseEnter={() => dato && setActivo(dato)}
                    onMouseLeave={() => setActivo(null)}
                  >
                    <title>
                      {dato
                        ? `${dato.country}: ${formatearPesos(dato.revenue)} (${dato.share_pct} %)`
                        : pais.properties.name}
                    </title>
                  </path>
                )
              })}
            </svg>

            {/* Lo que el mapa no dice solo: cifra exacta del país señalado. */}
            <div className="flex min-h-10 flex-wrap items-baseline justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
              {destacado ? (
                <>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="rounded border bg-background px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wider text-muted-foreground">
                      {destacado.country_code}
                    </span>
                    {destacado.country}
                  </span>
                  <span className="text-sm tabular-nums">
                    {formatearPesos(destacado.revenue)} ·{" "}
                    {destacado.share_pct.toFixed(1).replace(".", ",")} % ·{" "}
                    {formatearNumero(destacado.orders)} pedidos
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Menos ventas</span>
              <span
                aria-hidden
                className="h-2 flex-1 rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, var(--muted), color-mix(in oklab, var(--foreground) 100%, var(--muted)))",
                }}
              />
              <span>Más ventas</span>
            </div>

            {/* Alternativa accesible y para imprimir. */}
            <ol className="sr-only">
              {datos.results.map((pais) => (
                <li key={pais.country_code}>
                  {pais.country}: {formatearPesos(pais.revenue)},{" "}
                  {pais.share_pct} por ciento, {pais.orders} pedidos.
                </li>
              ))}
            </ol>
          </>
        ) : (
          <Skeleton className="h-[17rem] w-full" />
        )}
      </CardContent>
    </Card>
  )
}
