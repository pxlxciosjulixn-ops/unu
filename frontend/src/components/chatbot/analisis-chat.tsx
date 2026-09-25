import * as React from "react"
import {
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  MessagesSquareIcon,
  TimerIcon,
  XIcon,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import { useContador, useMontado } from "@/components/chatbot/animacion"
import { traerEstadisticas } from "@/components/chatbot/api"
import { capitalizar } from "@/components/chatbot/relaciones"
import type { EstadisticasChat, InteresChat } from "@/components/chatbot/tipos"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const diaCorto = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
})
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const DIAS_LARGOS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábados",
  "domingos",
]

/** `2026-09-25` como fecha local: `new Date()` la leería en UTC. */
function fechaLocal(iso: string) {
  const [anio, mes, dia] = iso.slice(0, 10).split("-").map(Number)
  return new Date(anio, mes - 1, dia)
}

function hora12(h: number) {
  const sufijo = h < 12 ? "a. m." : "p. m."
  return `${h % 12 === 0 ? 12 : h % 12} ${sufijo}`
}

function duracion(minutos: number | null) {
  if (minutos === null) return "—"
  if (minutos < 1) return "< 1 min"
  if (minutos < 60) return `${Math.round(minutos)} min`
  return `${(minutos / 60).toFixed(1).replace(".", ",")} h`
}

function nivel(puntaje: number) {
  if (puntaje <= 3) return "Bajo"
  if (puntaje <= 6) return "Medio"
  if (puntaje <= 8) return "Alto"
  return "Muy alto"
}

type Persona = EstadisticasChat["participants"][number]

/**
 * Dashboard de un chat de WhatsApp. Todo sale de las estadísticas que calcula
 * el backend con reglas sobre el texto: no se llama al modelo ni se gastan
 * tokens.
 *
 * Grilla de 12 columnas con filas parejas (4 + 8, cuatro de 3, y de a dos de
 * 6) para que nada quede colgando.
 */
export function AnalisisChat({ chatId }: { chatId: number }) {
  const [datos, setDatos] = React.useState<EstadisticasChat | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Se monta de nuevo con cada chat (`key`), así que el estado ya empieza
    // limpio: no hay que vaciarlo aquí.
    const controlador = new AbortController()
    traerEstadisticas(chatId, controlador.signal)
      .then(setDatos)
      .catch((fallo: unknown) => {
        if (!controlador.signal.aborted) {
          setError(fallo instanceof Error ? fallo.message : "Sin estadísticas.")
        }
      })
    return () => controlador.abort()
  }, [chatId])

  if (error) {
    return (
      <p className="rounded-2xl border p-5 text-sm text-muted-foreground">
        {error}
      </p>
    )
  }

  if (!datos) {
    return (
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-72 rounded-2xl lg:col-span-4" />
        <Skeleton className="h-72 rounded-2xl lg:col-span-8" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl lg:col-span-3" />
        ))}
        <Skeleton className="h-80 rounded-2xl lg:col-span-6" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-6" />
      </div>
    )
  }

  const yo = datos.participants.find((p) => p.is_me) ?? null
  const otro = datos.participants.find((p) => p.name === datos.other) ?? null
  const nombreOtro = otro ? capitalizar(otro.name) : "Los demás"
  const diaMasActivo = datos.weekdays.indexOf(Math.max(...datos.weekdays))

  return (
    <section
      className="aparecer grid gap-4 lg:grid-cols-12"
      aria-label="Análisis del chat"
    >
      <Medidor interes={datos.interest} className="lg:col-span-4" />
      <Senales interes={datos.interest} className="lg:col-span-8" />

      <Dato
        icono={MessagesSquareIcon}
        etiqueta="Mensajes"
        numero={datos.total_messages}
        detalle={
          yo && otro
            ? `${yo.messages} suyos · ${otro.messages} de ${nombreOtro}`
            : `${datos.avg_per_active_day} por día activo`
        }
      />
      <Dato
        icono={CalendarDaysIcon}
        etiqueta="Días con mensajes"
        numero={datos.active_days}
        detalle={`de ${datos.span_days} ${datos.span_days === 1 ? "día" : "días"} de chat`}
      />
      <Dato
        icono={TimerIcon}
        etiqueta={`${nombreOtro} responde en`}
        valor={duracion(otro?.median_reply_minutes ?? null)}
        detalle={`Usted: ${duracion(yo?.median_reply_minutes ?? null)}`}
      />
      <Dato
        icono={ClockIcon}
        etiqueta="Hora pico"
        valor={hora12(datos.busiest_hour)}
        detalle={`Más activos los ${DIAS_LARGOS[diaMasActivo]}`}
      />

      {yo && otro ? (
        <Balance yo={yo} otro={otro} nombreOtro={nombreOtro} />
      ) : (
        <Tarjeta titulo="Cara a cara" className="lg:col-span-6">
          <Vacio>No se sabe quién eres en este chat.</Vacio>
        </Tarjeta>
      )}
      <MapaDeCalor mapa={datos.heatmap} />

      <PorDia datos={datos} nombreOtro={nombreOtro} />
      <TiemposDeRespuesta
        datos={datos}
        yo={yo?.name ?? null}
        otro={otro?.name ?? null}
        nombreOtro={nombreOtro}
      />

      <Palabras
        datos={datos}
        yo={yo?.name ?? null}
        otro={otro?.name ?? null}
        nombreOtro={nombreOtro}
      />
      <Emojis datos={datos} yo={yo} otro={otro} />
    </section>
  )
}

function Tarjeta({
  titulo,
  descripcion,
  accion,
  children,
  className,
}: {
  titulo: string
  descripcion?: string
  accion?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold">{titulo}</p>
          {descripcion ? (
            <p className="text-xs text-muted-foreground">{descripcion}</p>
          ) : null}
        </div>
        {accion}
      </div>
      {children}
    </div>
  )
}

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

/** Leyenda de las dos personas para las gráficas hechas a mano. */
function Leyenda({ nombreOtro }: { nombreOtro: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-primary" />
        Usted
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-[3px] bg-primary/35" />
        {nombreOtro}
      </span>
    </div>
  )
}

function Dato({
  icono: Icono,
  etiqueta,
  valor,
  numero,
  detalle,
}: {
  icono: typeof ClockIcon
  etiqueta: string
  /** Texto fijo ("2 min"), o `numero` para que cuente hasta él. */
  valor?: string
  numero?: number
  detalle: string
}) {
  const contado = Math.round(useContador(numero ?? 0))
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-xs lg:col-span-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {etiqueta}
        </p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icono className="size-4" />
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {numero !== undefined ? contado.toLocaleString("es-CO") : valor}
        </p>
        <p className="truncate text-xs text-muted-foreground">{detalle}</p>
      </div>
    </div>
  )
}

/** Medidor de media luna con el puntaje de interés. */
function Medidor({
  interes,
  className,
}: {
  interes: InteresChat | null
  className?: string
}) {
  if (!interes) {
    return (
      <Tarjeta titulo="Nivel de interés" className={className}>
        <Vacio>Para calcularlo hay que saber quién eres en el chat.</Vacio>
      </Tarjeta>
    )
  }

  return <MedidorLleno interes={interes} className={className} />
}

function MedidorLleno({
  interes,
  className,
}: {
  interes: InteresChat
  className?: string
}) {
  // Arranca vacío y se llena al entrar; el número cuenta a la par.
  const listo = useMontado()
  const puntaje = Math.round(useContador(interes.score, 1100))
  // Media circunferencia de radio 80: su largo es π·80.
  const largo = Math.PI * 80
  const lleno = listo ? (interes.score / 10) * largo : 0

  return (
    <Tarjeta
      titulo={`Interés de ${capitalizar(interes.other)}`}
      descripcion="Calculado con los números del chat"
      className={className}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="relative w-full max-w-60">
          <svg
            viewBox="0 0 200 110"
            className="w-full"
            role="img"
            aria-label={`Interés ${interes.score} de 10`}
          >
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--muted)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${lleno} ${largo}`}
              style={{
                transition:
                  "stroke-dasharray 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
            <p className="text-5xl leading-none font-semibold tracking-tight tabular-nums">
              {puntaje}
              <span className="text-lg font-normal text-muted-foreground">
                /10
              </span>
            </p>
          </div>
        </div>
        <span className="rounded-full border px-3 py-0.5 text-xs font-medium">
          {nivel(interes.score)}
        </span>
        <p className="text-center text-sm text-muted-foreground">
          {interes.summary}
        </p>
      </div>
    </Tarjeta>
  )
}

function Senales({
  interes,
  className,
}: {
  interes: InteresChat | null
  className?: string
}) {
  const columnas = [
    { titulo: "A favor", icono: CheckIcon, senales: interes?.for ?? [] },
    { titulo: "En contra", icono: XIcon, senales: interes?.against ?? [] },
  ]
  return (
    <Tarjeta
      titulo="Señales del chat"
      descripcion="Lo que sube y lo que baja el nivel de interés"
      className={className}
    >
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        {columnas.map(({ titulo, icono: Icono, senales }) => (
          <div
            key={titulo}
            className="flex flex-col gap-1 rounded-xl bg-muted/50 p-4"
          >
            <p className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-background">
                <Icono className="size-3" />
              </span>
              {titulo}
            </p>
            {senales.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada claro por ahora.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60">
                {senales.map((senal) => (
                  <li
                    key={senal}
                    className="py-2.5 text-sm leading-snug first:pt-0"
                  >
                    {senal}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Tarjeta>
  )
}

/**
 * Cara a cara: cada fila compara una métrica con dos barras que salen del
 * centro, la suya a la izquierda y la de la otra persona a la derecha.
 */
function Balance({
  yo,
  otro,
  nombreOtro,
}: {
  yo: Persona
  otro: Persona
  nombreOtro: string
}) {
  const filas = (
    [
      ["Mensajes", "messages"],
      ["Palabras por mensaje", "words_avg"],
      ["Preguntas", "questions"],
      ["Risas y emojis", "laughs"],
      ["Planes para verse", "plans"],
      ["Inicia la charla", "starts"],
    ] as const
  ).map(([etiqueta, campo]) => ({
    etiqueta,
    mio: yo[campo],
    suyo: otro[campo],
  }))
  const listo = useMontado()

  return (
    <Tarjeta
      titulo="Cara a cara"
      descripcion="Quién pone más de su parte, punto por punto"
      accion={<Leyenda nombreOtro={nombreOtro} />}
      className="lg:col-span-6"
    >
      <div className="flex flex-1 flex-col justify-around gap-3">
        {filas.map((fila) => {
          const tope = Math.max(fila.mio, fila.suyo, 1)
          return (
            <div key={fila.etiqueta} className="flex flex-col gap-1.5">
              <p className="text-center text-xs text-muted-foreground">
                {fila.etiqueta}
              </p>
              <div className="grid grid-cols-[2.5rem_1fr_1fr_2.5rem] items-center gap-2">
                <span
                  className={cn(
                    "text-right text-sm tabular-nums",
                    fila.mio > fila.suyo && "font-semibold"
                  )}
                >
                  {String(fila.mio).replace(".", ",")}
                </span>
                <div className="flex h-2.5 justify-end rounded-l-full bg-muted">
                  <div
                    className="rounded-l-full bg-primary transition-[width] duration-700 ease-out"
                    style={{ width: listo ? `${(fila.mio / tope) * 100}%` : 0 }}
                  />
                </div>
                <div className="flex h-2.5 rounded-r-full bg-muted">
                  <div
                    className="rounded-r-full bg-primary/35 transition-[width] duration-700 ease-out"
                    style={{
                      width: listo ? `${(fila.suyo / tope) * 100}%` : 0,
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    fila.suyo > fila.mio && "font-semibold"
                  )}
                >
                  {String(fila.suyo).replace(".", ",")}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Tarjeta>
  )
}

function tonoDelMapa(proporcion: number) {
  return proporcion === 0
    ? "var(--muted)"
    : `color-mix(in srgb, var(--chart-1) ${25 + proporcion * 75}%, var(--muted))`
}

/**
 * Mapa de calor: días de la semana contra horas del día. Un solo tono, de
 * claro (pocos mensajes) a oscuro (muchos).
 */
function MapaDeCalor({ mapa }: { mapa: number[][] }) {
  const maximo = Math.max(1, ...mapa.flat())
  return (
    <Tarjeta
      titulo="Cuándo hablan"
      descripcion="Mensajes por día y hora; pase el mouse para ver cuántos"
      className="lg:col-span-6"
    >
      <div className="flex flex-1 flex-col justify-center gap-1">
        {mapa.map((horas, dia) => (
          <div
            key={DIAS[dia]}
            className="grid grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] items-center gap-[3px]"
          >
            <span className="text-xs text-muted-foreground">{DIAS[dia]}</span>
            {horas.map((cuantos, hora) => (
              <span
                key={hora}
                title={`${capitalizar(DIAS_LARGOS[dia])} ${hora12(hora)}: ${cuantos} ${cuantos === 1 ? "mensaje" : "mensajes"}`}
                className="aspect-square rounded-[3px]"
                style={{ background: tonoDelMapa(cuantos / maximo) }}
              />
            ))}
          </div>
        ))}
        <div className="mt-1 grid grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-[3px] text-[0.625rem] text-muted-foreground">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center">
              {h % 6 === 0
                ? `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`
                : ""}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-end gap-1.5 text-[0.6875rem] text-muted-foreground">
          Menos
          {[0, 0.3, 0.55, 0.8, 1].map((t) => (
            <span
              key={t}
              className="size-3 rounded-[3px]"
              style={{ background: tonoDelMapa(t) }}
            />
          ))}
          Más
        </div>
      </div>
    </Tarjeta>
  )
}

/** Mensajes de cada uno en el tiempo: la suya continua, la otra punteada. */
function PorDia({
  datos,
  nombreOtro,
}: {
  datos: EstadisticasChat
  nombreOtro: string
}) {
  const semanal = datos.granularity === "week"
  const titulo = semanal ? "Mensajes por semana" : "Mensajes por día"

  if (datos.series.length < 2) {
    const dia = datos.series[0]
    return (
      <Tarjeta
        titulo={titulo}
        descripcion="Cómo sube o baja la conversación"
        className="lg:col-span-6"
      >
        <Vacio>
          <span className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-foreground tabular-nums">
              {datos.total_messages}
            </span>
            Todo el chat es del{" "}
            {dia ? diaCorto.format(fechaLocal(dia.date)) : "mismo día"}. Con más
            días aquí se ve la tendencia.
          </span>
        </Vacio>
      </Tarjeta>
    )
  }

  const config = {
    me: { label: "Usted", color: "var(--chart-1)" },
    others: { label: nombreOtro, color: "var(--chart-3)" },
  } satisfies ChartConfig
  const puntos = datos.series.map((p) => ({
    etiqueta: diaCorto.format(fechaLocal(p.date)),
    me: p.me,
    others: p.others,
  }))

  return (
    <Tarjeta
      titulo={titulo}
      descripcion="Cómo sube o baja la conversación"
      className="lg:col-span-6"
    >
      <ChartContainer
        config={config}
        className="aspect-auto h-full min-h-60 w-full flex-1"
      >
        <LineChart data={puntos} margin={{ left: -16, right: 8, top: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(etiqueta) =>
                  semanal ? `Semana del ${etiqueta}` : String(etiqueta)
                }
              />
            }
          />
          <Line
            dataKey="me"
            type="linear"
            stroke="var(--color-me)"
            strokeWidth={2}
            dot={puntos.length <= 16 ? { r: 3 } : false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="others"
            type="linear"
            stroke="var(--color-others)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={puntos.length <= 16 ? { r: 3 } : false}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </LineChart>
      </ChartContainer>
    </Tarjeta>
  )
}

/** Cuántas respuestas de cada uno llegan en menos de un minuto, en cinco… */
function TiemposDeRespuesta({
  datos,
  yo,
  otro,
  nombreOtro,
}: {
  datos: EstadisticasChat
  yo: string | null
  otro: string | null
  nombreOtro: string
}) {
  const config = {
    me: { label: "Usted", color: "var(--chart-1)" },
    others: { label: nombreOtro, color: "var(--chart-3)" },
  } satisfies ChartConfig
  const puntos = datos.reply_buckets.map((rango, i) => ({
    etiqueta: rango,
    me: yo ? (datos.reply_times[yo]?.[i] ?? 0) : 0,
    others: otro ? (datos.reply_times[otro]?.[i] ?? 0) : 0,
  }))

  return (
    <Tarjeta
      titulo="Qué tan rápido se responden"
      descripcion="Respuestas según lo que tardaron"
      className="lg:col-span-6"
    >
      <ChartContainer
        config={config}
        className="aspect-auto h-full min-h-60 w-full flex-1"
      >
        <BarChart
          data={puntos}
          margin={{ left: -16, right: 4, top: 4 }}
          barGap={2}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="etiqueta"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            fontSize={11}
          />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={<ChartTooltipContent />}
          />
          <Bar
            dataKey="me"
            fill="var(--color-me)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
          <Bar
            dataKey="others"
            fill="var(--color-others)"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    </Tarjeta>
  )
}

/** Las palabras que más usa cada uno (sin las que no dicen nada). */
function Palabras({
  datos,
  yo,
  otro,
  nombreOtro,
}: {
  datos: EstadisticasChat
  yo: string | null
  otro: string | null
  nombreOtro: string
}) {
  const listo = useMontado()
  const columnas = [
    {
      nombre: "Usted",
      palabras: yo ? (datos.top_words[yo] ?? []) : [],
      tono: "bg-primary",
    },
    {
      nombre: nombreOtro,
      palabras: otro ? (datos.top_words[otro] ?? []) : [],
      tono: "bg-primary/35",
    },
  ]
  return (
    <Tarjeta
      titulo="Palabras más usadas"
      descripcion="De qué habla cada uno"
      className="lg:col-span-6"
    >
      <div className="grid flex-1 gap-5 sm:grid-cols-2">
        {columnas.map((columna) => {
          const tope = Math.max(1, ...columna.palabras.map((p) => p.count))
          return (
            <div key={columna.nombre} className="flex flex-col gap-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                {columna.nombre}
              </p>
              {columna.palabras.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                columna.palabras.slice(0, 6).map((p) => (
                  <div key={p.word} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate">{p.word}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {p.count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-700 ease-out",
                          columna.tono
                        )}
                        style={{
                          width: listo ? `${(p.count / tope) * 100}%` : 0,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
    </Tarjeta>
  )
}

/** Emojis favoritos del chat; si no hay, cuánto se ríe cada uno. */
function Emojis({
  datos,
  yo,
  otro,
}: {
  datos: EstadisticasChat
  yo: Persona | null
  otro: Persona | null
}) {
  return (
    <Tarjeta
      titulo="Emojis favoritos"
      descripcion="Los que más aparecen en el chat"
      className="lg:col-span-6"
    >
      {datos.top_emojis.length === 0 ? (
        <Vacio>
          <span className="flex flex-col gap-1">
            <span>No usan emojis en este chat (los stickers no cuentan).</span>
            {yo && otro ? (
              <span>
                Risas: usted {yo.laughs}, {capitalizar(otro.name)} {otro.laughs}
                .
              </span>
            ) : null}
          </span>
        </Vacio>
      ) : (
        <div className="grid flex-1 grid-cols-5 content-center gap-2">
          {datos.top_emojis.map((e) => (
            <div
              key={e.emoji}
              className="flex flex-col items-center gap-1 rounded-xl bg-muted/50 py-3"
            >
              <span className="text-2xl leading-none">{e.emoji}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {e.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  )
}
