import * as React from "react"
import {
  CheckIcon,
  DownloadIcon,
  LinkIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react"

import {
  consultarTrabajo,
  crearTrabajo,
  guardarArchivo,
  pedirInfo,
  type EstadoTrabajo,
  type InfoCancion,
} from "@/components/descargas/api"
import { SiteHeader } from "@/components/resume/site-header"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * Página: /descargar-musica/mp3 (enlazada desde Proyectos).
 *
 * Pega una URL de YouTube, se leen los datos de la canción y se elige la
 * calidad del MP3. El servidor la baja y la convierte en segundo plano; la
 * página consulta el avance y, al terminar, el navegador guarda el archivo.
 *
 * Toma el lenguaje de la hoja de vida: banda oscura arriba, títulos de sección
 * en versalitas espaciadas y todo en blanco, negro y gris. Se diseña primero
 * para el celular: una columna, botones a todo el ancho y recuadros de 2 en 2.
 */

const CALIDADES = [
  { kbps: 320, etiqueta: "Máxima" },
  { kbps: 256, etiqueta: "Alta" },
  { kbps: 192, etiqueta: "Buena" },
  { kbps: 128, etiqueta: "Liviana" },
] as const

const PASOS = [
  { fase: "bajando", etiqueta: "Bajar" },
  { fase: "convirtiendo", etiqueta: "Convertir" },
  { fase: "listo", etiqueta: "Listo" },
] as const

type Descarga =
  | { fase: "inactivo" }
  | { fase: "creando" }
  | { fase: "trabajando"; id: string; estado: EstadoTrabajo }
  | { fase: "listo"; id: string; nombre: string }
  | { fase: "error"; mensaje: string }

function duracionLegible(segundos: number | null) {
  if (!segundos) return null
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`
  return h ? `${h}:${mmss}` : mmss
}

const MEGAS = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 })

/** Peso del MP3: bitrate por duración. En CBR sale casi exacto. */
function pesoMp3(kbps: number, segundos: number | null) {
  if (!segundos) return null
  return `${MEGAS.format((kbps * 1000 * segundos) / 8 / 1_000_000)} MB`
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function DescargarPage() {
  const [url, setUrl] = React.useState("")
  const [info, setInfo] = React.useState<InfoCancion | null>(null)
  const [buscando, setBuscando] = React.useState(false)
  const [errorInfo, setErrorInfo] = React.useState<string | null>(null)
  const [kbps, setKbps] = React.useState<number>(320)
  const [descarga, setDescarga] = React.useState<Descarga>({ fase: "inactivo" })

  // Corta la consulta del avance al salir de la página o empezar otra.
  const consulta = React.useRef<AbortController | null>(null)
  React.useEffect(() => () => consulta.current?.abort(), [])

  const ocupado = descarga.fase === "creando" || descarga.fase === "trabajando"
  const muyLarga =
    info?.duracion != null && info.duracion > info.duracion_maxima

  async function buscar(evento: React.FormEvent) {
    evento.preventDefault()
    const enlace = url.trim()
    if (!enlace || buscando || ocupado) return
    setBuscando(true)
    setErrorInfo(null)
    setInfo(null)
    setDescarga({ fase: "inactivo" })
    try {
      setInfo(await pedirInfo(enlace))
    } catch (error) {
      setErrorInfo(
        error instanceof Error ? error.message : "No se pudo leer el video."
      )
    } finally {
      setBuscando(false)
    }
  }

  function empezarDeNuevo() {
    consulta.current?.abort()
    setUrl("")
    setInfo(null)
    setErrorInfo(null)
    setDescarga({ fase: "inactivo" })
  }

  async function descargar() {
    if (!info || ocupado) return
    consulta.current?.abort()
    const controlador = new AbortController()
    consulta.current = controlador
    setDescarga({ fase: "creando" })

    try {
      const id = await crearTrabajo(url.trim(), kbps)
      let fallos = 0

      while (!controlador.signal.aborted) {
        let estado: EstadoTrabajo
        try {
          estado = await consultarTrabajo(id, controlador.signal)
          fallos = 0
        } catch (error) {
          // Un corte suelto de red no tumba la descarga: se reintenta.
          if (controlador.signal.aborted) return
          if (++fallos >= 5) throw error
          await esperar(2000)
          continue
        }

        if (estado.fase === "error") throw new Error(estado.mensaje)
        if (estado.fase === "listo") {
          setDescarga({ fase: "listo", id, nombre: estado.nombre })
          guardarArchivo(id)
          return
        }
        setDescarga({ fase: "trabajando", id, estado })
        await esperar(1000)
      }
    } catch (error) {
      if (controlador.signal.aborted) return
      setDescarga({
        fase: "error",
        mensaje:
          error instanceof Error ? error.message : "No se pudo descargar.",
      })
    }
  }

  return (
    <div className="min-h-svh overflow-x-clip bg-muted/40">
      <SiteHeader />

      <section className="bg-band text-band-foreground">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-10 sm:px-6 sm:pt-14 sm:pb-14">
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <p className="text-[0.6875rem] font-semibold tracking-[0.28em] uppercase opacity-70 sm:text-xs">
              YouTube a MP3
            </p>
            <h1 className="text-[2rem] leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">
              Tu música en MP3, hasta 320&nbsp;kbps
            </h1>
            <p className="max-w-xl text-sm text-pretty opacity-80 sm:text-base">
              Pega el enlace de la canción, elige la calidad y el archivo queda
              en tus descargas con su carátula y el nombre del artista.
            </p>
          </div>

          <form onSubmit={buscar} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5 rounded-xl bg-background p-1.5 text-foreground shadow-lg sm:flex-row sm:items-center">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 pl-3">
                <LinkIcon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <span className="sr-only">Enlace de YouTube</span>
                <input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  enterKeyHint="search"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Pega el enlace de YouTube"
                  disabled={ocupado}
                  // 16 px en el celular: con menos, iOS hace zoom al tocarlo.
                  className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                {url && !ocupado ? (
                  <button
                    type="button"
                    onClick={empezarDeNuevo}
                    aria-label="Borrar el enlace"
                    className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <XIcon className="size-4" />
                  </button>
                ) : null}
              </label>
              <Button
                type="submit"
                size="lg"
                className="h-11 w-full px-6 sm:w-auto"
                disabled={!url.trim() || buscando || ocupado}
              >
                {buscando ? <Spinner /> : null}
                {buscando ? "Buscando…" : "Buscar"}
              </Button>
            </div>

            {errorInfo ? (
              <p
                role="alert"
                className="rounded-lg border border-band-foreground/25 px-3 py-2 text-sm text-pretty"
              >
                {errorInfo}
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {buscando ? (
          <Cargando />
        ) : info ? (
          <article className="overflow-hidden rounded-xl border bg-background shadow-xs">
            <Cancion info={info} />

            <div className="flex flex-col gap-3 border-t p-4 sm:p-6">
              <h2 className="text-xs font-bold tracking-[0.14em] uppercase">
                Calidad
              </h2>
              <div
                role="radiogroup"
                aria-label="Calidad del MP3"
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                {CALIDADES.map((c) => (
                  <Recuadro
                    key={c.kbps}
                    activo={kbps === c.kbps}
                    disabled={ocupado}
                    onClick={() => setKbps(c.kbps)}
                  >
                    <span className="text-lg leading-none font-semibold tabular-nums">
                      {c.kbps}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        kbps
                      </span>
                    </span>
                    <span className="flex w-full items-baseline justify-between gap-2 text-xs text-muted-foreground">
                      <span>{c.etiqueta}</span>
                      <span className="tabular-nums">
                        {pesoMp3(c.kbps, info.duracion)}
                      </span>
                    </span>
                  </Recuadro>
                ))}
              </div>
              {info.audio_kbps ? (
                <p className="text-xs text-pretty text-muted-foreground">
                  YouTube guarda esta canción a unos {info.audio_kbps} kbps. A
                  320 el archivo es compatible con todo, pero no suena mejor que
                  el original.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-4 border-t bg-muted/50 p-4 sm:p-6">
              {descarga.fase === "trabajando" || descarga.fase === "creando" ? (
                <Avance
                  estado={
                    descarga.fase === "trabajando"
                      ? descarga.estado
                      : { fase: "en_cola", progreso: 0 }
                  }
                />
              ) : descarga.fase === "listo" ? (
                <Listo
                  nombre={descarga.nombre}
                  onOtraVez={() => guardarArchivo(descarga.id)}
                  onOtraCancion={empezarDeNuevo}
                />
              ) : (
                <>
                  {descarga.fase === "error" ? (
                    <Alert variant="destructive">
                      <AlertDescription>{descarga.mensaje}</AlertDescription>
                    </Alert>
                  ) : null}
                  {info.en_vivo || muyLarga ? (
                    <p className="text-sm text-pretty text-muted-foreground">
                      {info.en_vivo
                        ? "Las transmisiones en vivo no se pueden descargar."
                        : "Esta canción dura más de una hora: el servidor solo baja hasta 60 minutos."}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm">
                      <span className="font-semibold tabular-nums">
                        MP3 · {kbps} kbps
                      </span>
                      {info.duracion ? (
                        <span className="text-muted-foreground tabular-nums">
                          {" "}
                          · {pesoMp3(kbps, info.duracion)}
                        </span>
                      ) : null}
                    </p>
                    <Button
                      size="lg"
                      className="h-12 w-full px-6 text-base sm:h-11 sm:w-auto sm:text-sm"
                      onClick={descargar}
                      disabled={info.en_vivo || muyLarga}
                    >
                      <DownloadIcon />
                      {descarga.fase === "error"
                        ? "Intentar de nuevo"
                        : "Descargar MP3"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </article>
        ) : (
          <Guia />
        )}

        <p className="mt-8 text-xs text-pretty text-muted-foreground sm:mt-10">
          Solo para música propia, con licencia libre o que tengas permiso de
          guardar. Si el enlace es de una lista, se baja solo esa canción.
        </p>
      </main>
    </div>
  )
}

function Cancion({ info }: { info: InfoCancion }) {
  const duracion = duracionLegible(info.duracion)

  return (
    <div className="flex flex-col sm:flex-row">
      {info.miniatura ? (
        <div className="relative aspect-video shrink-0 bg-muted sm:w-64">
          <img src={info.miniatura} alt="" className="size-full object-cover" />
          {duracion ? (
            <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white tabular-nums">
              {duracion}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col justify-center gap-1 p-4 sm:px-6">
        <p className="line-clamp-2 text-lg leading-snug font-semibold text-pretty [overflow-wrap:anywhere]">
          {info.titulo}
        </p>
        {info.artista ? (
          <p className="truncate text-sm text-muted-foreground">
            {info.artista}
          </p>
        ) : null}
        {info.audio_kbps ? (
          <p className="mt-2 text-xs text-muted-foreground tabular-nums">
            Audio original: {info.audio_kbps} kbps
          </p>
        ) : null}
      </div>
    </div>
  )
}

/** Opción seleccionable: la elegida se marca con borde negro y un visto. */
function Recuadro({
  activo,
  disabled,
  onClick,
  children,
}: {
  activo: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex min-h-16 flex-col items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
        activo
          ? "border-foreground ring-1 ring-foreground"
          : "hover:border-foreground/40 hover:bg-muted/60"
      )}
    >
      {children}
      {activo ? (
        <span
          aria-hidden
          className="absolute top-2 right-2 grid size-4 place-items-center rounded-full bg-foreground text-background"
        >
          <CheckIcon className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  )
}

function Avance({ estado }: { estado: EstadoTrabajo }) {
  const fase = estado.fase
  const progreso = "progreso" in estado ? estado.progreso : 0
  const indice = PASOS.findIndex((p) => p.fase === fase)
  const porcentaje = Math.round(progreso * 100)
  const texto =
    fase === "en_cola"
      ? "En fila: hay otra canción convirtiéndose."
      : fase === "bajando"
        ? `Bajando el audio de YouTube · ${porcentaje} %`
        : `Convirtiendo a MP3 · ${porcentaje} %`

  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <ol className="grid grid-cols-3 gap-2">
        {PASOS.map((paso, i) => {
          const hecho = indice > i
          const actual = indice === i
          return (
            <li key={paso.fase} className="flex flex-col gap-2">
              <div className="h-1 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-500"
                  style={{
                    width: hecho ? "100%" : actual ? `${porcentaje}%` : "0%",
                  }}
                />
              </div>
              <span
                className={cn(
                  "text-xs",
                  hecho || actual
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {paso.etiqueta}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
        <Spinner className="shrink-0" />
        {texto}
      </p>
    </div>
  )
}

function Listo({
  nombre,
  onOtraVez,
  onOtraCancion,
}: {
  nombre: string
  onOtraVez: () => void
  onOtraCancion: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <p role="status" className="flex items-start gap-2.5 text-sm">
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-foreground text-background">
          <CheckIcon className="size-3" strokeWidth={3} />
        </span>
        <span className="min-w-0 text-pretty text-muted-foreground">
          <span className="font-medium [overflow-wrap:anywhere] text-foreground">
            {nombre}
          </span>{" "}
          quedó en tus descargas.
        </span>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full sm:w-auto"
          onClick={onOtraVez}
        >
          <DownloadIcon />
          ¿No bajó? Guardar otra vez
        </Button>
        <Button
          size="lg"
          className="h-11 w-full sm:w-auto"
          onClick={onOtraCancion}
        >
          <RotateCcwIcon />
          Otra canción
        </Button>
      </div>
    </div>
  )
}

function Cargando() {
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex flex-col sm:flex-row">
        <Skeleton className="aspect-video rounded-none sm:w-64" />
        <div className="flex flex-1 flex-col justify-center gap-2 p-4 sm:px-6">
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t p-4 sm:grid-cols-4 sm:p-6">
        {CALIDADES.map((c) => (
          <Skeleton key={c.kbps} className="h-16" />
        ))}
      </div>
    </div>
  )
}

/** Lo que se ve antes de buscar: qué sale y qué límites tiene. */
function Guia() {
  const puntos = [
    {
      titulo: "Cuatro calidades",
      texto:
        "320, 256, 192 o 128 kbps. Antes de bajar ves cuánto va a pesar cada una.",
    },
    {
      titulo: "Con carátula y datos",
      texto:
        "El MP3 lleva el título, el artista y la portada, así se ve bien en el celular y en el carro.",
    },
    {
      titulo: "Hasta una hora",
      texto:
        "Canciones, sesiones y mezclas de hasta 60 minutos. Las transmisiones en vivo no.",
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <ol className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
        {puntos.map((punto, i) => (
          <li
            key={punto.titulo}
            className="flex flex-col gap-1.5 bg-background p-4 sm:p-5"
          >
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              0{i + 1}
            </span>
            <h2 className="font-semibold">{punto.titulo}</h2>
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {punto.texto}
            </p>
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-bold tracking-[0.14em] uppercase">
          Sobre la calidad
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground">
          YouTube guarda el audio a unos 130–160 kbps. Un MP3 a 320 sale de ahí:
          sirve cuando el reproductor o el programa lo piden, pero no recupera
          lo que YouTube ya quitó. Si solo es para escuchar, 192 kbps suena
          igual y pesa menos.
        </p>
      </section>
    </div>
  )
}
