import * as React from "react"
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  ExternalLinkIcon,
  LogOutIcon,
  MapPinIcon,
  RefreshCwIcon,
  SatelliteIcon,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { useSesion } from "@/components/auth/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatearFechaHora } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  coordenadasDe,
  traerRegistros,
  type RegistroUbicacion,
} from "@/lib/ubicacion"

/** Página protegida: /home/ubicaciones. El mapa de quién aceptó y dónde. */
export function UbicacionRegistrosPage() {
  const { usuario, salir } = useSesion()
  const navegar = useNavigate()
  const [registros, setRegistros] = React.useState<RegistroUbicacion[] | null>(
    null
  )
  const [error, setError] = React.useState(false)
  const [elegido, setElegido] = React.useState<number | null>(null)

  const cargar = React.useCallback(() => {
    traerRegistros()
      .then((filas) => {
        setError(false)
        setRegistros(filas)
        setElegido((previo) => previo ?? filas[0]?.id ?? null)
      })
      .catch(() => setError(true))
  }, [])

  React.useEffect(() => cargar(), [cargar])

  const seleccionado = registros?.find((r) => r.id === elegido) ?? null
  const conGps = registros?.filter((r) => r.tiene_gps).length ?? 0

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link to="/home" />}
            aria-label="Volver"
          >
            <ArrowLeftIcon />
          </Button>
          <span className="truncate text-sm font-semibold">
            Ubicaciones registradas
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cargar}
              aria-label="Actualizar"
            >
              <RefreshCwIcon data-icon="inline-start" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await salir()
                navegar("/login", { replace: true })
              }}
            >
              <LogOutIcon data-icon="inline-start" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Hola, {usuario?.first_name || usuario?.username}
          </h1>
          <p className="text-sm text-muted-foreground">
            {registros
              ? `${registros.length} ${registros.length === 1 ? "visita registrada" : "visitas registradas"} · ${conGps} con GPS`
              : "Cargando…"}
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>No se pudieron cargar los registros</AlertTitle>
            <AlertDescription>
              Puede que el servidor esté despertando. Vuelve a intentarlo.
            </AlertDescription>
          </Alert>
        ) : null}

        {!registros ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : registros.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <MapPinIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">Todavía no hay visitas.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Comparte el enlace <code>/ubicacion</code>. Cuando alguien entre y
              acepte, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <ul className="flex max-h-[32rem] flex-col divide-y overflow-y-auto rounded-xl border bg-background">
              {registros.map((r) => (
                <li key={r.id}>
                  <Fila
                    registro={r}
                    activo={r.id === elegido}
                    onElegir={() => setElegido(r.id)}
                  />
                </li>
              ))}
            </ul>
            <Mapa registro={seleccionado} />
          </div>
        )}
      </main>
    </div>
  )
}

function Fila({
  registro: r,
  activo,
  onElegir,
}: {
  registro: RegistroUbicacion
  activo: boolean
  onElegir: () => void
}) {
  const lugar =
    [r.ciudad, r.region, r.pais].filter(Boolean).join(", ") ||
    "Sin ubicación por IP"
  return (
    <button
      type="button"
      onClick={onElegir}
      className={cn(
        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60",
        activo && "bg-muted"
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{lugar}</span>
        {r.tiene_gps ? (
          <Badge>
            <SatelliteIcon data-icon="inline-start" />
            GPS
          </Badge>
        ) : (
          <Badge variant="outline">Solo IP</Badge>
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatearFechaHora(r.created_at)} · IP {r.ip}
      </span>
    </button>
  )
}

function Mapa({ registro }: { registro: RegistroUbicacion | null }) {
  const coords = registro ? coordenadasDe(registro) : null

  if (!registro || !coords) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-xl border bg-background text-sm text-muted-foreground">
        Esta visita no tiene coordenadas para mostrar en el mapa.
      </div>
    )
  }

  const { lat, lon, exacta } = coords
  const d = exacta ? 0.004 : 0.05
  const bbox = `${lon - d},${lat - d},${lon + d},${lat + d}`
  const osm = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`
  const maps = `https://www.google.com/maps?q=${lat},${lon}`

  return (
    <div className="flex flex-col gap-2 overflow-hidden rounded-xl border bg-background">
      <iframe
        key={registro.id}
        title="Mapa de la visita"
        src={osm}
        className="h-80 w-full border-0"
        loading="lazy"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3 text-xs text-muted-foreground">
        <span className="tabular-nums">
          {exacta ? "GPS" : "Aproximado por IP"}: {lat.toFixed(5)},{" "}
          {lon.toFixed(5)}
          {exacta && registro.precision_gps
            ? ` · ±${Math.round(registro.precision_gps)} m`
            : ""}
        </span>
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
        >
          Abrir en Google Maps
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

export default UbicacionRegistrosPage
