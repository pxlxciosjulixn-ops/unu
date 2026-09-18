import * as React from "react"
import { MinusIcon, PlusIcon, RotateCcwIcon } from "lucide-react"
import { geoCentroid, geoMercator, geoPath } from "d3-geo"
import type { FeatureCollection, Geometry } from "geojson"
import type { Topology } from "topojson-specification"
import { feature } from "topojson-client"

import topologia from "world-atlas/countries-110m.json"

import type { Pais, Paises } from "@/components/dashboard/tipos"
import { Button } from "@/components/ui/button"
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

/** Lienzo de trabajo de la proyección; el viewBox final se recorta al encuadre. */
const LIENZO = 600
const ESCALA_MIN = 1
const ESCALA_MAX = 12

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

type Vista = { escala: number; x: number; y: number }

const VISTA_INICIAL: Vista = { escala: 1, x: 0, y: 0 }

export function CountriesMap({ datos }: { datos: Paises | null }) {
  const [activo, setActivo] = React.useState<Pais | null>(null)
  const [vista, setVista] = React.useState<Vista>(VISTA_INICIAL)
  const [arrastrando, setArrastrando] = React.useState(false)
  const svgRef = React.useRef<SVGSVGElement>(null)
  const arrastreRef = React.useRef<{ x: number; y: number } | null>(null)

  const porId = React.useMemo(() => {
    const mapa = new Map<string, Pais>()
    for (const pais of datos?.results ?? []) {
      const id = ISO_NUMERICO[pais.country_code]
      if (id) mapa.set(id, pais)
    }
    return mapa
  }, [datos])

  // El mapa se encuadra en los países que tienen ventas: mostrar el mundo
  // completo dejaría tres cuartos del recuadro vacíos.
  //
  // Dos detalles que cuestan encontrar:
  // 1. El encuadre se calcula con los centros de esos países, no con su
  //    contorno; territorios lejanos como Alaska estiran el rectángulo de
  //    Estados Unidos hasta dar la vuelta al planeta.
  // 2. d3-geo espera los anillos en sentido horario (al contrario de lo que
  //    pide GeoJSON); al revés interpreta el complemento, o sea el mundo.
  const { trazo, caja } = React.useMemo(() => {
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
        caja: { x: 0, y: 0, ancho: LIENZO, alto: LIENZO },
      }
    }

    const lons = centros.map(([lon]) => lon)
    const lats = centros.map(([, lat]) => lat)
    const margen = 12
    const x0 = Math.max(Math.min(...lons) - margen, -179)
    const x1 = Math.min(Math.max(...lons) + margen, 179)
    const y0 = Math.max(Math.min(...lats) - margen, -58)
    const y1 = Math.min(Math.max(...lats) + margen, 78)

    const encuadre: FeatureCollection<Geometry, { name: string }> = {
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

    const proyeccion = geoMercator().fitExtent(limites, encuadre)
    const camino = geoPath(proyeccion)
    const [[bx0, by0], [bx1, by1]] = camino.bounds(encuadre)

    return {
      trazo: camino,
      caja: { x: bx0, y: by0, ancho: bx1 - bx0, alto: by1 - by0 },
    }
  }, [porId])

  /** Mantiene el mapa dentro del recuadro al acercarse o arrastrar. */
  const acotar = React.useCallback(
    (proxima: Vista): Vista => {
      const escala = Math.min(Math.max(proxima.escala, ESCALA_MIN), ESCALA_MAX)
      const maxX = caja.ancho * (escala - 1)
      const maxY = caja.alto * (escala - 1)
      return {
        escala,
        x: Math.min(0, Math.max(-maxX, proxima.x)),
        y: Math.min(0, Math.max(-maxY, proxima.y)),
      }
    },
    [caja]
  )

  /** Convierte la posición del puntero a coordenadas del SVG. */
  const puntoEnSvg = React.useCallback(
    (evento: { clientX: number; clientY: number }) => {
      const svg = svgRef.current
      const matriz = svg?.getScreenCTM()
      if (!matriz) return undefined
      const punto = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(
        matriz.inverse()
      )
      return { x: punto.x, y: punto.y }
    },
    []
  )

  /** Acerca o aleja manteniendo fijo el punto señalado. */
  const acercar = React.useCallback(
    (factor: number, foco?: { x: number; y: number }) => {
      setVista((actual) => {
        const escala = Math.min(
          Math.max(actual.escala * factor, ESCALA_MIN),
          ESCALA_MAX
        )
        const centro = foco ?? {
          x: caja.x + caja.ancho / 2,
          y: caja.y + caja.alto / 2,
        }
        const relX = centro.x - caja.x
        const relY = centro.y - caja.y
        const proporcion = escala / actual.escala
        return acotar({
          escala,
          x: relX - (relX - actual.x) * proporcion,
          y: relY - (relY - actual.y) * proporcion,
        })
      })
    },
    [acotar, caja]
  )

  // La rueda se escucha a mano para poder cancelar el scroll de la página:
  // React registra `onWheel` como pasivo y ahí `preventDefault` no funciona.
  React.useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const alGirar = (evento: WheelEvent) => {
      evento.preventDefault()
      acercar(evento.deltaY < 0 ? 1.2 : 1 / 1.2, puntoEnSvg(evento))
    }

    svg.addEventListener("wheel", alGirar, { passive: false })
    return () => svg.removeEventListener("wheel", alGirar)
  }, [acercar, puntoEnSvg])

  const maximo = Math.max(
    ...(datos?.results.map((p) => aNumero(p.revenue)) ?? [0]),
    1
  )
  const destacado = activo ?? datos?.results[0] ?? null
  const conZoom = vista.escala > 1.01

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
            <div className="relative">
              <svg
                ref={svgRef}
                viewBox={`${caja.x} ${caja.y} ${caja.ancho} ${caja.alto}`}
                preserveAspectRatio="xMidYMid meet"
                className={
                  arrastrando
                    ? "mx-auto h-[17rem] w-auto max-w-full cursor-grabbing touch-none select-none sm:h-[19rem]"
                    : "mx-auto h-[17rem] w-auto max-w-full cursor-grab touch-none select-none sm:h-[19rem]"
                }
                role="img"
                aria-label="Mapa de ventas por país"
                onPointerDown={(e) => {
                  const punto = puntoEnSvg(e)
                  if (!punto) return
                  arrastreRef.current = {
                    x: punto.x - vista.x,
                    y: punto.y - vista.y,
                  }
                  setArrastrando(true)
                  e.currentTarget.setPointerCapture(e.pointerId)
                }}
                onPointerMove={(e) => {
                  const inicio = arrastreRef.current
                  if (!inicio) return
                  const punto = puntoEnSvg(e)
                  if (!punto) return
                  setVista((actual) =>
                    acotar({
                      ...actual,
                      x: punto.x - inicio.x,
                      y: punto.y - inicio.y,
                    })
                  )
                }}
                onPointerUp={(e) => {
                  arrastreRef.current = null
                  setArrastrando(false)
                  e.currentTarget.releasePointerCapture(e.pointerId)
                }}
                onPointerLeave={() => {
                  arrastreRef.current = null
                  setArrastrando(false)
                }}
                onDoubleClick={(e) => acercar(1.6, puntoEnSvg(e))}
              >
                {/* El zoom se ancla a la esquina del encuadre: como el viewBox
                    no empieza en (0,0), escalar sin recentrar desplazaria el
                    mapa. `transform-origin` no sirve aqui porque JSX no acepta
                    esa propiedad, asi que la traslacion va compuesta a mano. */}
                <g
                  transform={
                    `translate(${caja.x + vista.x} ${caja.y + vista.y}) ` +
                    `scale(${vista.escala}) ` +
                    `translate(${-caja.x} ${-caja.y})`
                  }
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
                        // El borde se compensa para que no engorde al acercar.
                        strokeWidth={0.4 / vista.escala}
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
                </g>
              </svg>

              <div className="absolute top-0 right-0 flex flex-col gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Acercar el mapa"
                  onClick={() => acercar(1.4)}
                  disabled={vista.escala >= ESCALA_MAX}
                >
                  <PlusIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Alejar el mapa"
                  onClick={() => acercar(1 / 1.4)}
                  disabled={!conZoom}
                >
                  <MinusIcon />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Restablecer el mapa"
                  onClick={() => setVista(VISTA_INICIAL)}
                  disabled={!conZoom}
                >
                  <RotateCcwIcon />
                </Button>
              </div>

              {conZoom ? (
                <span className="absolute bottom-0 left-0 rounded-md bg-background/80 px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                  {vista.escala.toFixed(1)}×
                </span>
              ) : null}
            </div>

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

            <p className="text-xs text-muted-foreground">
              Rueda del mouse o doble clic para acercar; arrastra para moverte.
            </p>

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
