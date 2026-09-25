import * as React from "react"
import {
  ArrowLeftIcon,
  CheckIcon,
  LockIcon,
  LockOpenIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { AppShell } from "@/components/app-shell"
import {
  cambiarIlimitados,
  desbloquearAjustes,
  desbloquearMensajes,
  guardarGroseria,
  guardarLargo,
  guardarPersonalidad,
  traerAjustes,
  traerOpiniones,
} from "@/components/chatbot/api"
import { PERSONALIDADES } from "@/components/chatbot/personalidades"
import { AplicarPersonalizacion } from "@/components/chatbot/aplicar-personalizacion"
import { ListaEliminados } from "@/components/chatbot/papelera"
import {
  ACENTOS,
  ACENTOS_CLAROS,
  ACENTOS_INTENSOS,
  cambiarPersonalizacion,
  cargarFuentes,
  LETRA_DEL_ESTILO,
  LETRAS,
  usePersonalizacion,
  type Estilo,
  type Tema,
} from "@/components/chatbot/personalizacion"
import { SidebarConsejero } from "@/components/chatbot/sidebar-consejero"
import {
  detener,
  hablar,
  HAY_VOZ,
  useSonando,
  useVoces,
} from "@/components/chatbot/voz"
import type {
  AjustesConsejero,
  GrupoOpiniones,
  NivelGroseria,
  Opiniones,
  Personalidad,
} from "@/components/chatbot/tipos"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const NIVELES: {
  valor: NivelGroseria
  nombre: string
  detalle: string
  ejemplo: string
}[] = [
  {
    valor: "suave",
    nombre: "Suave",
    detalle: "Sin groserías. Te tutea y es atento contigo.",
    ejemplo: "“Mira, te responde corto y sin hacerte preguntas…”",
  },
  {
    valor: "normal",
    nombre: "Normal",
    detalle: "Le habla de usted, con una o dos groserías.",
    ejemplo: "“Mire, usted le escribe el doble, pirobo…”",
  },
  {
    valor: "sin_filtro",
    nombre: "Sin filtro",
    detalle: "De usted y super grosero, casi en cada frase.",
    ejemplo: "“Mire, pirobo, esa sapa hp le responde corto…”",
  },
]

const LARGOS = [
  { nombre: "Muy cortas", valor: 200 },
  { nombre: "Cortas", valor: 400 },
  { nombre: "Medias", valor: 800 },
  { nombre: "Largas", valor: 2000 },
]

/**
 * Ajustes del chat, a todo el ancho y en dos columnas parejas: a la
 * izquierda cómo se ve, a la derecha cómo habla, y abajo lo borrado.
 */
export function AjustesPage() {
  const [ajustes, setAjustes] = React.useState<AjustesConsejero | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const controlador = new AbortController()
    traerAjustes(controlador.signal)
      .then(setAjustes)
      .catch(() => {
        if (!controlador.signal.aborted) {
          setError("No se pudieron traer los ajustes.")
        }
      })
    return () => controlador.abort()
  }, [])

  return (
    <>
      <AplicarPersonalizacion />
      <AppShell
        titulo="Ajustes"
        raiz={{ etiqueta: "Chat", to: "/chatbot" }}
        sidebar={<SidebarConsejero />}
      >
        <div className="flex w-full flex-col gap-8 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
          <header className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 self-start text-muted-foreground"
              nativeButton={false}
              render={<Link to="/chatbot" />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Volver al chat
            </Button>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Ajustes del chat
              </h1>
              <p className="text-sm text-muted-foreground">
                Cómo se ve, cómo te habla, qué tan largas son sus respuestas y
                lo que has borrado.
              </p>
            </div>
          </header>

          <div className="aparecer grid items-stretch gap-6 lg:grid-cols-2">
            {ajustes ? (
              <Personalidades ajustes={ajustes} onCambio={setAjustes} />
            ) : !error ? (
              <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
            ) : null}
            <Personalizacion />

            <div className="flex flex-col gap-6">
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : !ajustes ? (
                <>
                  <Skeleton className="h-72 rounded-2xl" />
                  <Skeleton className="h-44 rounded-2xl" />
                </>
              ) : (
                <>
                  <Groserias ajustes={ajustes} onCambio={setAjustes} />
                  <MasMensajes ajustes={ajustes} onCambio={setAjustes} />
                  <Largo ajustes={ajustes} onCambio={setAjustes} />
                </>
              )}
            </div>

            <Seccion
              titulo="Eliminados"
              detalle="Lo que borraste sigue guardado. Restáuralo para que vuelva a aparecer, o elimínalo definitivamente para no verlo más aquí."
              className="lg:col-span-2"
            >
              <ListaEliminados onRestaurado={() => undefined} />
            </Seccion>
          </div>
        </div>
      </AppShell>
    </>
  )
}

function Seccion({
  titulo,
  detalle,
  accion,
  className,
  children,
}: {
  titulo: string
  detalle: string
  accion?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-xs sm:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{detalle}</p>
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-medium">{etiqueta}</p>
      {children}
    </div>
  )
}

function Opcion({
  elegida,
  onElegir,
  className,
  children,
}: {
  elegida: boolean
  onElegir: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      onClick={onElegir}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition hover:border-foreground/30",
        elegida
          ? "border-foreground bg-muted/60 ring-1 ring-foreground"
          : "bg-background",
        className
      )}
    >
      {children}
    </button>
  )
}

const TEMAS: { valor: Tema; nombre: string; icono: typeof SunIcon }[] = [
  { valor: "claro", nombre: "Claro", icono: SunIcon },
  { valor: "oscuro", nombre: "Oscuro", icono: MoonIcon },
  { valor: "sistema", nombre: "Sistema", icono: MonitorIcon },
]

const ESTILOS: { valor: Estilo; nombre: string; detalle: string }[] = [
  { valor: "normal", nombre: "Normal", detalle: "Limpio y moderno" },
  {
    valor: "vintage",
    nombre: "Vintage",
    detalle: "Papel, tinta y máquina de escribir",
  },
  {
    valor: "y2k",
    nombre: "Web 1.0 / Y2K",
    detalle: "Windows 98 y escritorio rosado",
  },
]

/** Muestra en miniatura de cada estilo, dibujada con sus propios colores. */
function MuestraEstilo({ estilo }: { estilo: Estilo }) {
  if (estilo === "y2k") {
    // Ventanita de Windows 98 sobre el escritorio rosado.
    return (
      <div
        aria-hidden
        className="flex h-20 w-full items-center justify-center overflow-hidden p-2.5"
        style={{
          backgroundColor: "#f7b2ea",
          backgroundImage:
            "repeating-conic-gradient(#f59ce3 0% 25%, #fbc9f1 0% 50%)",
          backgroundSize: "6px 6px",
        }}
      >
        <div
          className="flex w-4/5 flex-col bg-[#c0c0c0] p-[3px]"
          style={{
            boxShadow:
              "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf",
          }}
        >
          <span className="h-2.5 bg-linear-to-r from-[#000080] to-[#1084d0]" />
          <span className="mt-1 h-3 bg-white shadow-[inset_1px_1px_#808080]" />
        </div>
      </div>
    )
  }
  const vintage = estilo === "vintage"
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-20 w-full flex-col justify-end gap-1.5 overflow-hidden border p-2.5",
        vintage
          ? "rounded-[5px] border-[#cdb991] bg-[#f3ead6]"
          : "rounded-lg border-neutral-200 bg-white"
      )}
    >
      <span
        className={cn(
          "h-3 w-3/5 self-end",
          vintage
            ? "rounded-[3px] bg-[#7a3b24] shadow-[2px_2px_0_#00000030]"
            : "rounded-full bg-neutral-900"
        )}
      />
      <span
        className={cn(
          "h-3 w-4/5",
          vintage
            ? "rounded-[3px] border border-[#cdb991] bg-[#fbf6ea] shadow-[2px_2px_0_#00000020]"
            : "rounded-full border border-neutral-200 bg-neutral-50"
        )}
      />
    </div>
  )
}

/** Estilo, tema, color de acento y letra: se guarda en este navegador. */
function Personalizacion() {
  const personalizacion = usePersonalizacion()
  const { estilo, tema, acento, letra } = personalizacion

  // Para ver cada letra en la lista hay que tenerlas cargadas.
  React.useEffect(() => {
    cargarFuentes(Object.keys(LETRAS))
  }, [])

  const grupos = Object.entries(LETRAS).reduce<
    Record<string, [string, (typeof LETRAS)[string]][]>
  >((acumulado, entrada) => {
    ;(acumulado[entrada[1].grupo] ??= []).push(entrada)
    return acumulado
  }, {})
  const nombreLetra = (clave: string) =>
    clave === "auto"
      ? `Automática (${LETRAS[LETRA_DEL_ESTILO[estilo]].nombre})`
      : (LETRAS[clave]?.nombre ?? clave)

  return (
    <Seccion
      titulo="Personalización"
      detalle="Cómo se ve el chat en este navegador. Se aplica al instante."
    >
      <div className="flex flex-col gap-6">
        <Campo etiqueta="Estilo">
          <div
            role="radiogroup"
            aria-label="Estilo"
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {ESTILOS.map((e) => (
              <Opcion
                key={e.valor}
                elegida={estilo === e.valor}
                onElegir={() => cambiarPersonalizacion({ estilo: e.valor })}
                className="flex-col items-stretch gap-2.5 p-3 text-left"
              >
                <MuestraEstilo estilo={e.valor} />
                <span className="flex flex-col">
                  <span className="font-medium">{e.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.detalle}
                  </span>
                </span>
              </Opcion>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Tema">
          <div
            role="radiogroup"
            aria-label="Tema"
            className="grid grid-cols-3 gap-2"
          >
            {TEMAS.map((t) => (
              <Opcion
                key={t.valor}
                elegida={tema === t.valor}
                onElegir={() => cambiarPersonalizacion({ tema: t.valor })}
              >
                <t.icono className="size-4" />
                {t.nombre}
              </Opcion>
            ))}
          </div>
        </Campo>

        <Campo etiqueta="Color de acento">
          <div className="grid gap-3 sm:grid-cols-2">
            <Paleta
              titulo="Intensos"
              claves={ACENTOS_INTENSOS}
              elegido={acento}
            />
            <Paleta
              titulo="Claritos"
              claves={ACENTOS_CLAROS}
              elegido={acento}
            />
          </div>
        </Campo>

        <Campo etiqueta="Letra">
          <Select
            value={letra}
            onValueChange={(valor: string | null) => {
              if (valor) cambiarPersonalizacion({ letra: valor })
            }}
          >
            <SelectTrigger
              aria-label="Letra"
              className="h-11! w-full bg-background"
            >
              <SelectValue>
                {(valor) => (
                  <span
                    style={{
                      fontFamily:
                        LETRAS[
                          valor === "auto"
                            ? LETRA_DEL_ESTILO[estilo]
                            : String(valor)
                        ]?.familia ?? undefined,
                    }}
                  >
                    {nombreLetra(String(valor))}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="auto">
                Automática ({LETRAS[LETRA_DEL_ESTILO[estilo]].nombre})
              </SelectItem>
              {Object.entries(grupos).map(([grupo, letras]) => (
                <SelectGroup key={grupo}>
                  <SelectLabel>{grupo}</SelectLabel>
                  {letras.map(([clave, datos]) => (
                    <SelectItem
                      key={clave}
                      value={clave}
                      style={{ fontFamily: datos.familia ?? undefined }}
                    >
                      {datos.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <p
            className="rounded-xl bg-muted/50 px-4 py-3 text-sm"
            style={{
              fontFamily:
                LETRAS[letra === "auto" ? LETRA_DEL_ESTILO[estilo] : letra]
                  ?.familia ?? undefined,
            }}
          >
            Mire, ella le responde corto y sin hacerle preguntas.
          </p>
        </Campo>

        {HAY_VOZ ? <CampoVoz /> : null}
      </div>
    </Seccion>
  )
}

function Paleta({
  titulo,
  claves,
  elegido,
}: {
  titulo: string
  claves: string[]
  elegido: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <div
        role="radiogroup"
        aria-label={`Colores ${titulo.toLowerCase()}`}
        className="grid grid-cols-7 gap-2"
      >
        {claves.map((clave) => {
          const color = ACENTOS[clave]
          const activo = elegido === clave
          const nombre = color?.nombre ?? "Neutro"
          return (
            <button
              key={clave}
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={nombre}
              title={nombre}
              onClick={() => cambiarPersonalizacion({ acento: clave })}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-full border ring-offset-2 ring-offset-background transition",
                activo ? "ring-2 ring-foreground" : "hover:scale-105"
              )}
              style={{ background: color?.claro ?? "var(--foreground)" }}
            >
              {activo ? (
                <CheckIcon
                  className="size-3.5"
                  style={{ color: color?.texto ?? "var(--background)" }}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Groserias({
  ajustes,
  onCambio,
}: {
  ajustes: AjustesConsejero
  onCambio: (ajustes: AjustesConsejero) => void
}) {
  const [guardando, setGuardando] = React.useState<NivelGroseria | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function elegir(nivel: NivelGroseria) {
    if (nivel === ajustes.profanity) return
    setGuardando(nivel)
    setError(null)
    try {
      onCambio(await guardarGroseria(nivel))
    } catch (fallo: unknown) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar.")
    } finally {
      setGuardando(null)
    }
  }

  return (
    <Seccion
      titulo="Groserías"
      detalle="Solo para ti: cada conexión elige la suya. Se guarda al tocarla."
    >
      <div
        role="radiogroup"
        aria-label="Nivel de groserías"
        className="flex flex-col gap-2"
      >
        {NIVELES.map((n) => {
          const elegido = ajustes.profanity === n.valor
          return (
            <button
              key={n.valor}
              type="button"
              role="radio"
              aria-checked={elegido}
              disabled={guardando !== null}
              onClick={() => void elegir(n.valor)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition hover:border-foreground/30 disabled:cursor-wait",
                elegido
                  ? "border-foreground bg-muted/60 ring-1 ring-foreground"
                  : "bg-background"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                  elegido
                    ? "border-foreground bg-foreground text-background"
                    : "border-border"
                )}
              >
                {elegido ? <CheckIcon className="size-3" /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{n.nombre}</span>
                  {n.valor === "sin_filtro" ? (
                    <Badge variant="outline">Por defecto</Badge>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {n.detalle}
                </span>
                <span className="text-xs text-foreground/80 italic">
                  {n.ejemplo}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Seccion>
  )
}

/**
 * Largo máximo de las respuestas, para todos los visitantes. Se cambia con la
 * contraseña de ajustes; el servidor la vuelve a pedir al guardar.
 */
function Largo({
  ajustes,
  onCambio,
}: {
  ajustes: AjustesConsejero
  onCambio: (ajustes: AjustesConsejero) => void
}) {
  const [clave, setClave] = React.useState("")
  const [desbloqueado, setDesbloqueado] = React.useState(false)
  const [pidiendoClave, setPidiendoClave] = React.useState(false)
  const [valor, setValor] = React.useState(String(ajustes.max_chars))
  const [ocupado, setOcupado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [guardado, setGuardado] = React.useState(false)

  async function desbloquear(e: React.FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    try {
      await desbloquearAjustes(clave)
      setDesbloqueado(true)
      setValor(String(ajustes.max_chars))
    } catch (fallo: unknown) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo verificar.")
    } finally {
      setOcupado(false)
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    setGuardado(false)
    try {
      onCambio(await guardarLargo(clave, Number(valor)))
      setGuardado(true)
    } catch (fallo: unknown) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Seccion
      titulo="Administración"
      className="flex-1"
      detalle="Solo para ti, con la contraseña: largo de las respuestas, mensajes ilimitados y qué opina la gente."
      accion={
        desbloqueado ? (
          <Badge variant="outline">
            <LockOpenIcon data-icon="inline-start" />
            Desbloqueado
          </Badge>
        ) : !pidiendoClave ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPidiendoClave(true)}
          >
            <LockIcon data-icon="inline-start" />
            Desbloquear
          </Button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5 rounded-xl bg-muted/50 p-4">
          <span className="text-xs text-muted-foreground">
            Largo de las respuestas
          </span>
          <span className="text-2xl font-semibold tabular-nums">
            {ajustes.max_chars.toLocaleString("es-CO")}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              caracteres
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-xl bg-muted/50 p-4">
          <span className="text-xs text-muted-foreground">
            Mensajes en esta conexión
          </span>
          <span className="text-2xl font-semibold">
            {ajustes.unlimited ? "Ilimitados" : "Con límite"}
          </span>
        </div>
      </div>

      {!desbloqueado && pidiendoClave ? (
        <form
          onSubmit={(e) => void desbloquear(e)}
          className="flex flex-col gap-2 rounded-xl bg-muted/50 p-4"
        >
          <label htmlFor="clave-ajustes" className="text-sm font-medium">
            Contraseña de ajustes
          </label>
          <div className="flex gap-2">
            <Input
              id="clave-ajustes"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="Escribe la contraseña"
              autoComplete="off"
              autoFocus
              className="bg-background"
            />
            <Button type="submit" disabled={!clave || ocupado}>
              <LockOpenIcon data-icon="inline-start" />
              Desbloquear
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground"
            onClick={() => {
              setPidiendoClave(false)
              setError(null)
            }}
          >
            Cancelar
          </Button>
        </form>
      ) : null}

      {desbloqueado ? (
        <Ilimitados clave={clave} ajustes={ajustes} onCambio={onCambio} />
      ) : null}

      {desbloqueado ? (
        <form
          onSubmit={(e) => void guardar(e)}
          className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4"
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LARGOS.map((largo) => (
              <Button
                key={largo.nombre}
                type="button"
                variant={Number(valor) === largo.valor ? "default" : "outline"}
                size="sm"
                className="flex-col gap-0 py-5"
                onClick={() => {
                  setValor(String(largo.valor))
                  setGuardado(false)
                }}
              >
                <span>{largo.nombre}</span>
                <span className="text-[0.6875rem] font-normal opacity-70">
                  {largo.valor.toLocaleString("es-CO")}
                </span>
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="largo-ajustes" className="text-sm font-medium">
              O un número exacto
            </label>
            <div className="flex gap-2">
              <Input
                id="largo-ajustes"
                type="number"
                inputMode="numeric"
                min={ajustes.min_chars}
                max={ajustes.max_chars_limit}
                step={50}
                value={valor}
                onChange={(e) => {
                  setValor(e.target.value)
                  setGuardado(false)
                }}
                className="bg-background"
              />
              <Button type="submit" disabled={ocupado || !valor}>
                Guardar cambios
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Entre {ajustes.min_chars.toLocaleString("es-CO")} y{" "}
              {ajustes.max_chars_limit.toLocaleString("es-CO")} caracteres.
              {guardado ? " Cambios guardados." : ""}
            </p>
          </div>
        </form>
      ) : null}

      {desbloqueado ? <PanelOpiniones clave={clave} /> : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Seccion>
  )
}

const VELOCIDADES = [
  { nombre: "Lenta", valor: 0.85 },
  { nombre: "Normal", valor: 1 },
  { nombre: "Rápida", valor: 1.25 },
]

/** Qué voz del navegador lee las respuestas y a qué velocidad. */
function CampoVoz() {
  const { voz, velocidad } = usePersonalizacion()
  const voces = useVoces()
  const probando = useSonando() === "prueba"

  return (
    <Campo etiqueta="Voz para escuchar respuestas">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={voz}
          onValueChange={(valor: string | null) => {
            if (valor) cambiarPersonalizacion({ voz: valor })
          }}
        >
          <SelectTrigger
            aria-label="Voz"
            className="h-11! w-full bg-background"
          >
            <SelectValue>
              {(valor) =>
                valor === "auto"
                  ? `Automática${voces[0] ? ` (${voces[0].name})` : ""}`
                  : (voces.find((v) => v.voiceURI === valor)?.name ??
                    "Automática")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="auto">
              Automática (la mejor en español)
            </SelectItem>
            {voces.map((v) => (
              <SelectItem key={v.voiceURI} value={v.voiceURI}>
                {v.name} · {v.lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-11 shrink-0"
          onClick={() =>
            probando
              ? detener()
              : hablar(
                  "prueba",
                  "Mire, ella le responde corto y sin hacerle preguntas: eso es interés tibio.",
                  { voz, velocidad }
                )
          }
        >
          {probando ? "Detener" : "Probar"}
        </Button>
      </div>
      <div
        role="radiogroup"
        aria-label="Velocidad"
        className="grid grid-cols-3 gap-2"
      >
        {VELOCIDADES.map((v) => (
          <Opcion
            key={v.nombre}
            elegida={velocidad === v.valor}
            onElegir={() => cambiarPersonalizacion({ velocidad: v.valor })}
          >
            {v.nombre}
          </Opcion>
        ))}
      </div>
      {voces.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Este navegador no trae voces en español: se usará la que tenga.
        </p>
      ) : null}
    </Campo>
  )
}

/** Quién da los consejos: seis personajes, a todo el ancho. */
function Personalidades({
  ajustes,
  onCambio,
}: {
  ajustes: AjustesConsejero
  onCambio: (ajustes: AjustesConsejero) => void
}) {
  const [guardando, setGuardando] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function elegir(personalidad: Personalidad) {
    if (personalidad === ajustes.personality) return
    setGuardando(true)
    setError(null)
    try {
      onCambio(await guardarPersonalidad(personalidad))
    } catch (fallo: unknown) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Seccion
      titulo="Personalidad"
      detalle="Quién te da los consejos. Cambia el tono, no las groserías: esas van aparte."
      className="lg:col-span-2"
    >
      <div
        role="radiogroup"
        aria-label="Personalidad"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        {PERSONALIDADES.map((p) => {
          const elegida = ajustes.personality === p.valor
          return (
            <button
              key={p.valor}
              type="button"
              role="radio"
              aria-checked={elegida}
              disabled={guardando}
              onClick={() => void elegir(p.valor)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 text-left transition hover:border-foreground/30 disabled:cursor-wait",
                elegida
                  ? "border-foreground bg-muted/60 ring-1 ring-foreground"
                  : "bg-background"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex size-10 items-center justify-center rounded-xl border bg-background text-primary">
                  <p.icono className="size-5" />
                </span>
                {elegida ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                    <CheckIcon className="size-3" />
                  </span>
                ) : null}
              </span>
              <span className="text-sm font-semibold">{p.nombre}</span>
              <span className="text-xs text-muted-foreground">{p.detalle}</span>
              <span className="mt-auto text-xs text-foreground/80 italic">
                {p.ejemplo}
              </span>
            </button>
          )
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Seccion>
  )
}

/** Mensajes sin tope para la conexión desde donde se está (la del dueño). */
function Ilimitados({
  clave,
  ajustes,
  onCambio,
}: {
  clave: string
  ajustes: AjustesConsejero
  onCambio: (ajustes: AjustesConsejero) => void
}) {
  const [ocupado, setOcupado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function alternar() {
    setOcupado(true)
    setError(null)
    try {
      onCambio(await cambiarIlimitados(clave, !ajustes.unlimited))
    } catch (fallo: unknown) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/50 p-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">
          Mensajes ilimitados en esta conexión
        </p>
        <p className="text-xs text-muted-foreground">
          {error ??
            "Solo para desde donde estás ahora. Si te cambia la IP, vuelve a activarlo."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ajustes.unlimited}
        aria-label="Mensajes ilimitados"
        disabled={ocupado}
        onClick={() => void alternar()}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
          ajustes.unlimited ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform",
            ajustes.unlimited && "translate-x-5"
          )}
        />
      </button>
    </div>
  )
}

/** Qué tal le parecen las respuestas a la gente: los 👍 y 👎 de todos. */
function PanelOpiniones({ clave }: { clave: string }) {
  const [datos, setDatos] = React.useState<Opiniones | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    traerOpiniones(clave)
      .then(setDatos)
      .catch((fallo: unknown) =>
        setError(fallo instanceof Error ? fallo.message : "Sin opiniones.")
      )
  }, [clave])

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>
  }
  if (!datos) {
    return <Skeleton className="h-40 rounded-xl" />
  }

  const porcentaje = datos.total
    ? Math.round((datos.up / datos.total) * 100)
    : 0

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">¿Les sirve el chat?</p>
        <p className="text-xs text-muted-foreground">
          {datos.total} {datos.total === 1 ? "opinión" : "opiniones"} de{" "}
          {datos.people} {datos.people === 1 ? "persona" : "personas"}
        </p>
      </div>
      {datos.total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía nadie ha dicho si le sirvió una respuesta.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-semibold tabular-nums">
              {porcentaje}%
            </span>
            <span className="pb-1 text-sm text-muted-foreground">
              le sirvió · {datos.up} sí · {datos.down} no
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TablaOpiniones
              titulo="Por personalidad"
              grupos={datos.by_personality}
            />
            <TablaOpiniones
              titulo="Por groserías"
              grupos={datos.by_profanity}
            />
          </div>
        </>
      )}
    </div>
  )
}

function TablaOpiniones({
  titulo,
  grupos,
}: {
  titulo: string
  grupos: GrupoOpiniones[]
}) {
  // Primero lo más votado; los que nadie ha votado, al final.
  const ordenados = [...grupos].sort((a, b) => b.up + b.down - (a.up + a.down))
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      {ordenados.map((g) => {
        const total = g.up + g.down
        const util = total ? Math.round((g.up / total) * 100) : null
        return (
          <div key={g.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{g.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {util === null ? "sin votos" : `${util}% · ${total}`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-background">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${util ?? 0}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Desbloquear mensajes: cada conexión tiene uno gratis y, con la clave de
 * mensajes, elige cuántos más (de 10 a 30). No se acumulan: queda con
 * exactamente los que eligió, y cuando se acaban vuelve a pedirlos.
 */
function MasMensajes({
  ajustes,
  onCambio,
}: {
  ajustes: AjustesConsejero
  onCambio: (ajustes: AjustesConsejero) => void
}) {
  const [clave, setClave] = React.useState("")
  const [cantidad, setCantidad] = React.useState(ajustes.unlock_min)
  const [ocupado, setOcupado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [listo, setListo] = React.useState<number | null>(null)

  const quedan = ajustes.messages.remaining
  const sinTope = ajustes.messages.limit === null

  async function desbloquear(e: React.FormEvent) {
    e.preventDefault()
    setOcupado(true)
    setError(null)
    setListo(null)
    try {
      const nuevos = await desbloquearMensajes(clave, cantidad)
      onCambio(nuevos)
      setListo(nuevos.messages.remaining)
      setClave("")
    } catch (fallo: unknown) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo desbloquear."
      )
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Seccion
      titulo="Más mensajes"
      detalle="Cada conexión tiene un mensaje gratis. Con la contraseña desbloqueas entre 10 y 30 más; cuando se acaben, vuelves a pedirlos."
    >
      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-4">
        <span className="text-sm text-muted-foreground">Te quedan</span>
        <span className="text-2xl font-semibold tabular-nums">
          {sinTope
            ? "Ilimitados"
            : `${quedan ?? 0} ${quedan === 1 ? "mensaje" : "mensajes"}`}
        </span>
      </div>

      {sinTope ? null : (
        <form
          onSubmit={(e) => void desbloquear(e)}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="cantidad-mensajes"
                className="text-sm font-medium"
              >
                ¿Cuántos quieres?
              </label>
              <span className="text-2xl font-semibold tabular-nums">
                {cantidad}
              </span>
            </div>
            <input
              id="cantidad-mensajes"
              type="range"
              min={ajustes.unlock_min}
              max={ajustes.unlock_max}
              step={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{ajustes.unlock_min}</span>
              <span>{ajustes.unlock_max}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="clave-mensajes" className="text-sm font-medium">
              Contraseña
            </label>
            <div className="flex gap-2">
              <Input
                id="clave-mensajes"
                type="password"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="Escribe la contraseña"
                autoComplete="off"
                className="bg-background"
              />
              <Button type="submit" disabled={!clave || ocupado}>
                <LockOpenIcon data-icon="inline-start" />
                Desbloquear
              </Button>
            </div>
          </div>
        </form>
      )}

      {listo !== null ? (
        <p role="status" className="text-sm">
          Listo: ahora tienes {listo} {listo === 1 ? "mensaje" : "mensajes"}.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Seccion>
  )
}
