import * as React from "react"
import { Link } from "react-router-dom"

import foto from "@/assets/min.jpg"
import { ENCUESTA, ENCUESTA_TOTAL } from "@/components/min/encuesta"

/**
 * Página suelta: /min-2026.
 *
 * Es la única pantalla oscura del sitio (el resto es siempre claro, a
 * propósito), así que no usa los tokens del tema: los colores van escritos a
 * mano para que no dependan de `:root` ni de la clase `.dark`.
 *
 * El texto sale de las constantes de abajo y los resultados de la encuesta de
 * `encuesta.ts`, que es la misma tabulación del Excel.
 */

const YO = {
  nombre: "Min",
  alias: "min",
  anio: 2026,
  frase: "Dos carnets, una sola semana.",
  ciudad: "Bogotá D.C.",
}

/** Las tres cifras que abren la sección de la encuesta. */
const DESTACADOS = [
  { pregunta: 6, opcion: "Si", nota: "le atrae el efecto del humo" },
  { pregunta: 10, opcion: "Si", nota: "cree que esto atrae a los jóvenes" },
  { pregunta: 1, opcion: "No", nota: "nunca había probado un mochi" },
]

/** La semana en tres bloques: mañana, tarde y noche. */
const HORARIO = [
  { dia: "Lun", bloques: ["Colegio", "Taller", "Universidad"] },
  { dia: "Mar", bloques: ["Colegio", "Libre", "Universidad"] },
  { dia: "Mié", bloques: ["Colegio", "Taller", "Universidad"] },
  { dia: "Jue", bloques: ["Colegio", "Libre", "Universidad"] },
  { dia: "Vie", bloques: ["Colegio", "Código", "Descanso"] },
  { dia: "Sáb", bloques: ["Dormir", "Código", "Código"] },
  { dia: "Dom", bloques: ["Dormir", "Nada", "Nada"] },
]

const BITACORA = [
  { mes: "Enero", texto: "Arranca el año con dos horarios pegados en la nevera." },
  { mes: "Marzo", texto: "Primer corte en la universidad. Sobrevive el promedio." },
  { mes: "Junio", texto: "Sale la idea de los mochis con nitrógeno líquido." },
  {
    mes: "Septiembre",
    texto: "30 encuestas respondidas en una mañana y una hoja de tabulación nueva.",
  },
  { mes: "Diciembre", texto: "Pendiente. Aquí debería decir que salió todo bien." },
]

/** El grano del fondo, aparte para no pelear con las comillas del SVG. */
const GRANO =
  "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22%3E%3Cfilter id=%22r%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22160%22 height=%22160%22 filter=%22url(%23r)%22/%3E%3C/svg%3E')"

/** El formulario guardó "Si" sin tilde; en pantalla se lee bien. */
function bonita(texto: string) {
  return texto === "Si" ? "Sí" : texto
}

function porcentaje(pregunta: number, opcion: string) {
  return (
    ENCUESTA.find((p) => p.n === pregunta)?.opciones.find(
      (o) => o.texto === opcion
    )?.pct ?? 0
  )
}

/** Hora de Bogotá, sin importar dónde corra el navegador. */
function horaBogota(fecha: Date) {
  const partes = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(fecha)

  const buscar = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? ""

  return {
    dia: buscar("weekday").replace(".", "").toLowerCase(),
    hora: Number(buscar("hour")),
    reloj: `${buscar("hour")}:${buscar("minute")}:${buscar("second")}`,
  }
}

/** Lo que debería estar haciendo según el día y la hora. */
function queHagoAhora(dia: string, hora: number) {
  const finDeSemana = dia.startsWith("sá") || dia.startsWith("do")

  if (hora < 5 || hora >= 23) return "durmiendo, con suerte"
  if (finDeSemana) {
    if (hora < 11) return "recuperando el sueño de la semana"
    return "escribiendo código que nadie pidió"
  }
  if (hora < 13) return "en el colegio"
  if (hora < 17) return "haciendo tareas de los dos lados"
  if (hora < 22) return "en la universidad"
  return "terminando algo que se entrega mañana"
}

/** Cuánto del año va corrido: sale de la fecha, no es un número inventado. */
function progresoDelAnio(fecha: Date, anio: number) {
  const inicio = new Date(anio, 0, 1).getTime()
  const fin = new Date(anio + 1, 0, 1).getTime()
  const avance = (fecha.getTime() - inicio) / (fin - inicio)
  return Math.min(Math.max(avance, 0), 1)
}

/** Título de sección: número romano tenue y línea al frente. */
function Titulo({
  indice,
  children,
}: {
  indice: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-xs text-zinc-600">{indice}</span>
      <h2 className="text-xs tracking-[0.2em] whitespace-nowrap text-zinc-400 uppercase">
        {children}
      </h2>
      <span className="h-px flex-1 bg-zinc-800" />
    </div>
  )
}

export function Min2026Page() {
  const [ahora, setAhora] = React.useState(() => new Date())

  React.useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { dia, hora, reloj } = horaBogota(ahora)
  const estado = queHagoAhora(dia, hora)
  const avance = progresoDelAnio(ahora, YO.anio)

  return (
    <div className="min-h-svh overflow-x-hidden bg-zinc-950 text-zinc-100 selection:bg-zinc-100 selection:text-zinc-950">
      {/* Grano encima del fondo: textura, no degradado. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06] mix-blend-screen"
        style={{ backgroundImage: GRANO }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[880px] px-5 py-10 sm:px-8 sm:py-14">
        <header className="flex items-center justify-between gap-4 text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
          <span className="truncate">
            {YO.alias} · {YO.ciudad}
          </span>
          <Link
            to="/"
            className="shrink-0 transition-colors hover:text-zinc-100"
          >
            ← portafolio
          </Link>
        </header>

        {/* Portada: la foto manda, el año la acompaña. */}
        <section className="mt-12 flex flex-col items-center gap-7 text-center sm:mt-16 sm:flex-row sm:items-center sm:gap-10 sm:text-left">
          <div className="relative shrink-0">
            <img
              src={foto}
              alt="Foto de portada"
              width={640}
              height={640}
              className="h-32 w-32 rounded-full object-cover grayscale ring-1 ring-zinc-700 sm:h-44 sm:w-44"
            />
            {/* Aro exterior: separa la foto del fondo sin encerrarla. */}
            <span
              aria-hidden
              className="pointer-events-none absolute -inset-3 rounded-full border border-zinc-800/80"
            />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.3em] text-zinc-500 uppercase">
              Colegio + Universidad
            </p>
            <h1 className="mt-2 text-[clamp(3.5rem,17vw,8rem)] leading-[0.85] font-semibold tracking-tighter">
              {YO.anio}
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-base text-balance text-zinc-300 sm:mx-0 sm:text-lg">
              {YO.frase}
            </p>
          </div>
        </section>

        <p className="mx-auto mt-8 max-w-md text-center text-sm text-pretty text-zinc-500 sm:mx-0 sm:text-left">
          Página personal de {YO.nombre}. Medio colegio, medio universidad, y el
          resto del día intentando que las dos cosas quepan en el mismo horario.
        </p>

        <div className="mt-8 flex items-center gap-4">
          <div className="h-px min-w-0 flex-1 bg-zinc-800">
            <div
              className="h-px bg-zinc-100"
              style={{ width: `${(avance * 100).toFixed(1)}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] text-zinc-500 tabular-nums">
            {(avance * 100).toFixed(1)} % del año
          </span>
        </div>

        {/* Estado en vivo */}
        <section className="mt-14 border-y border-zinc-800 py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-100" />
              </span>
              <span className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
                Ahora mismo
              </span>
            </div>
            <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
              {reloj} · Bogotá
            </span>
          </div>
          <p className="mt-4 text-2xl tracking-tight text-pretty sm:text-3xl">
            {estado}
          </p>
        </section>

        {/* La encuesta: lo que dio el Excel */}
        <section className="mt-16">
          <Titulo indice="01">La encuesta</Titulo>

          <div className="mt-6 flex flex-col items-center gap-1 text-sm text-zinc-500 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-6">
            <span className="text-zinc-300">
              Mochis en nitrógeno líquido
            </span>
            <span className="font-mono text-[11px] tracking-wider uppercase">
              {ENCUESTA_TOTAL} respuestas · {ENCUESTA.length} preguntas
            </span>
          </div>

          {/* Las tres cifras que resumen todo */}
          <div className="mt-7 grid gap-px bg-zinc-800 sm:grid-cols-3">
            {DESTACADOS.map((item) => (
              <div
                key={item.nota}
                className="bg-zinc-950 px-5 py-7 text-center sm:text-left"
              >
                <p className="text-4xl leading-none font-semibold tracking-tighter tabular-nums sm:text-5xl">
                  {porcentaje(item.pregunta, item.opcion)}
                  <span className="text-xl text-zinc-500">%</span>
                </p>
                <p className="mt-3 text-sm text-pretty text-zinc-400">
                  {item.nota}
                </p>
              </div>
            ))}
          </div>

          {/* Pregunta por pregunta, con la barra de cada opción */}
          <div className="mt-px grid gap-px bg-zinc-800 sm:grid-cols-2">
            {ENCUESTA.map((pregunta) => (
              <article key={pregunta.n} className="bg-zinc-950 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                    {String(pregunta.n).padStart(2, "0")}
                  </span>
                  <h3
                    className="min-w-0 text-sm text-pretty text-zinc-200"
                    title={pregunta.completa}
                  >
                    {pregunta.corta}
                  </h3>
                </div>

                <ul className="mt-4 space-y-3">
                  {pregunta.opciones.map((opcion, i) => (
                    <li key={opcion.texto}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={
                            i === 0
                              ? "min-w-0 text-xs text-pretty text-zinc-300"
                              : "min-w-0 text-xs text-pretty text-zinc-500"
                          }
                        >
                          {bonita(opcion.texto)}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-zinc-500 tabular-nums">
                          {opcion.pct} %
                        </span>
                      </div>
                      {/* La barra: la opción más votada va en blanco. */}
                      <div className="mt-1.5 h-[3px] w-full bg-zinc-900">
                        <div
                          className={
                            i === 0
                              ? "h-[3px] bg-zinc-100"
                              : "h-[3px] bg-zinc-700"
                          }
                          style={{ width: `${opcion.pct}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="mt-4 text-[11px] text-pretty text-zinc-600">
            Tabulado a mano desde el formulario. Los porcentajes van redondeados,
            así que alguna pregunta suma 99 o 101.
          </p>
        </section>

        {/* Semana */}
        <section className="mt-16">
          <Titulo indice="02">La semana</Titulo>
          <div className="mt-6 divide-y divide-zinc-900 border-y border-zinc-900">
            {HORARIO.map((fila) => {
              const hoy = dia.startsWith(fila.dia.toLowerCase().slice(0, 2))
              return (
                <div
                  key={fila.dia}
                  className={
                    hoy
                      ? "flex items-center gap-3 py-3 text-zinc-100"
                      : "flex items-center gap-3 py-3 text-zinc-500"
                  }
                >
                  <span className="w-9 shrink-0 font-mono text-[11px] tracking-wider uppercase">
                    {fila.dia}
                  </span>
                  <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
                    {fila.bloques.map((bloque, i) => (
                      <span
                        key={`${fila.dia}-${i}`}
                        className="truncate text-[11px] sm:text-sm"
                      >
                        {bloque}
                      </span>
                    ))}
                  </div>
                  <span className="w-8 shrink-0 text-right text-[10px] tracking-widest text-zinc-600 uppercase">
                    {hoy ? "hoy" : ""}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Bitácora */}
        <section className="mt-16">
          <Titulo indice="03">{`Bitácora ${YO.anio}`}</Titulo>
          <ol className="mt-6 ml-1 border-l border-zinc-800">
            {BITACORA.map((entrada) => (
              <li key={entrada.mes} className="relative py-4 pl-6">
                <span className="absolute top-[1.45rem] -left-[3px] h-[5px] w-[5px] rounded-full bg-zinc-600" />
                <p className="font-mono text-[11px] tracking-wider text-zinc-500 uppercase">
                  {entrada.mes}
                </p>
                <p className="mt-1 text-sm text-pretty text-zinc-300">
                  {entrada.texto}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-zinc-800 pt-6 text-[11px] text-zinc-600">
          <span>
            {YO.alias}-{YO.anio} · hecho un miércoles a las 11 de la noche
          </span>
          <Link
            to="/proyectos"
            className="shrink-0 transition-colors hover:text-zinc-100"
          >
            ver proyectos →
          </Link>
        </footer>
      </div>
    </div>
  )
}

export default Min2026Page
