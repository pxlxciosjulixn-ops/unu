import * as React from "react"
import { Link } from "react-router-dom"

/**
 * Página suelta: /min-2026/angel.
 *
 * Hermana de /min-2026: mismo fondo zinc-950, mismo grano y los mismos
 * títulos con índice, pero dedicada a su estilo. Las fotos salen tal cual de
 * `public/img-min` (nombres de WhatsApp, por eso van con `encodeURI`).
 *
 * Como la otra, no usa los tokens del tema: colores escritos a mano. Las
 * animaciones viven en `ESTILOS_LOCALES` y se apagan con reduced-motion.
 */

const YO = {
  nombre: "Min",
  alias: "min",
  anio: 2026,
  ciudad: "Bogotá D.C.",
  instagram: "minshita.exe",
  instagramUrl: "https://www.instagram.com/minshita.exe/",
}

/** Lucide ya no trae logos de marcas: el de Instagram va dibujado aquí. */
function IconoInstagram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

type Foto = {
  archivo: string
  ancho: number
  alto: number
  pie: string
  /** Las que quedaron casi negras se levantan un poco en pantalla. */
  realce?: boolean
}

/** Las de poca luz: van en el rollo de película. */
const NOCHE: Foto[] = [
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.36.50 PM.jpeg",
    ancho: 609,
    alto: 603,
    pie: "Una luna colgando del cuello y otra que no se ve.",
    realce: true,
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.19.53 PM.jpeg",
    ancho: 828,
    alto: 614,
    pie: "Una constelación entera en una mejilla.",
    realce: true,
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.36.33 PM.jpeg",
    ancho: 699,
    alto: 584,
    pie: "Dos puntos de luz y una pregunta: ¿?",
    realce: true,
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.37.04 PM.jpeg",
    ancho: 980,
    alto: 709,
    pie: "Grano, pelo y silencio.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.19.05 PM.jpeg",
    ancho: 1080,
    alto: 726,
    pie: "Dos veces la misma noche.",
    realce: true,
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.18.48 PM.jpeg",
    ancho: 1080,
    alto: 666,
    pie: "El pelo como cortina.",
    realce: true,
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.20.09 PM.jpeg",
    ancho: 983,
    alto: 847,
    pie: "Hasta las uñas tienen personalidad.",
    realce: true,
  },
]

/** Las del espejo: van en la galería. La primera es la portada. */
const ESPEJO: Foto[] = [
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.21.06 PM.jpeg",
    ancho: 1080,
    alto: 1346,
    pie: "La pregunta se responde sola.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.38.40 PM.jpeg",
    ancho: 1080,
    alto: 1269,
    pie: "Un mechón de luz entre tanto negro.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.37.49 PM.jpeg",
    ancho: 1036,
    alto: 1140,
    pie: "La canción pregunta. Ella ya se sabe la respuesta.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.38.50 PM.jpeg",
    ancho: 1079,
    alto: 1352,
    pie: "Llamas en las mangas, calma en todo lo demás.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.38.19 PM.jpeg",
    ancho: 911,
    alto: 1146,
    pie: "Arte en el brazo y otro ¿? para la colección.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.20.37 PM.jpeg",
    ancho: 1080,
    alto: 1392,
    pie: "«Es IA», dicen. No: es ella.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.20.49 PM.jpeg",
    ancho: 1080,
    alto: 1223,
    pie: "Tinta en el brazo y un corazón en el espejo.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.20.56 PM.jpeg",
    ancho: 1080,
    alto: 1289,
    pie: "Negro sobre negro, y aun así brilla.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.38.31 PM.jpeg",
    ancho: 1080,
    alto: 1155,
    pie: "Cuando el flash se asoma, ella ya se escondió.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.20.22 PM.jpeg",
    ancho: 992,
    alto: 1060,
    pie: "Lo suave también le queda.",
  },
  {
    archivo: "WhatsApp Image 2026-09-24 at 11.38.00 PM.jpeg",
    ancho: 1070,
    alto: 1163,
    pie: "Vista desde arriba, igual de difícil de descifrar.",
  },
]

/** Portada en collage: la principal y dos asomándose detrás. */
const PORTADA = ESPEJO[0]
const DETRAS = [ESPEJO[3], ESPEJO[2]]

/**
 * Lo que la hace ella, rasgo por rasgo. El tono va hacia que se vea a sí
 * misma: cada rasgo lo eligió ella y nadie se lo puede quitar.
 */
const ESTILO = [
  {
    rasgo: "Glitter",
    texto:
      "Se pinta las estrellas ella misma. Nunca esperó a que alguien se las bajara del cielo.",
  },
  {
    rasgo: "¿?",
    texto:
      "Firma con un ¿? porque ella decide qué se muestra y qué no. Esa llave es solo suya.",
  },
  {
    rasgo: "Piercings",
    texto: "Cada punto de luz lo escogió ella. Su cara, sus reglas.",
  },
  {
    rasgo: "Tinta",
    texto:
      "Lo que lleva en la piel es para siempre porque ella lo quiso así. Nadie se lo dibujó.",
  },
  {
    rasgo: "Labios oscuros",
    texto: "Un color que no pide permiso. Se lo pone y el cuarto se acomoda.",
  },
  {
    rasgo: "Luna",
    texto:
      "Un collar de luna: la que pasa por fases y en ninguna deja de ser luna.",
  },
  {
    rasgo: "Negro",
    texto:
      "El negro no la apaga: ella lo lleva a él. Por eso se ve elegante y no triste.",
  },
  {
    rasgo: "Espejo",
    texto:
      "Sus mejores fotos se las toma ella. No necesita a nadie detrás de la cámara para verse increíble.",
  },
  {
    rasgo: "Estrellas",
    texto: "La blusa de estrellas no fue casualidad: ya sabía que brilla sola.",
  },
  {
    rasgo: "Contraste",
    texto:
      "Firme por fuera, tierna en los detalles. Las dos cosas son fuerza, ninguna es debilidad.",
  },
]

/** Cifras de broma, pero con cariño. */
const CIFRAS = [
  { valor: "100", unidad: "%", nota: "de su estilo lo armó ella, sin ayuda" },
  {
    valor: "∞",
    unidad: "",
    nota: "formas de brillar sin pedirle permiso a nadie",
  },
  {
    valor: "0",
    unidad: "",
    nota: "razones para hacerse pequeña y caber en algún lado",
  },
]

/** Rotan en la sección «ahora mismo». */
const PIROPOS = [
  "brillando sin pedirle permiso a nadie",
  "siendo suficiente, como siempre lo ha sido",
  "haciendo que el blanco y negro parezca a color",
  "escribiendo su propia historia, con su propia letra",
  "cuidando su luz como se merece",
  "siendo la protagonista de su propia foto",
  "brillando más que el glitter que se pone",
  "recordando que las estrellas no necesitan compañía para brillar",
]

/** Se escriben solas, una detrás de otra. */
const FRASES = [
  "Las estrellas no le preguntan a nadie si pueden brillar.",
  "La luna pasa por fases, y en todas sigue siendo luna.",
  "Ella es la que se toma la foto. Siempre lo ha sido.",
  "Lo que brilla de verdad no depende de quién esté mirando.",
  "No necesita color para ser la foto más bonita del feed.",
]

/** Tapados hasta que alguien los toca. */
const SECRETOS = [
  "Las estrellas que se pinta no son para nadie más. Son para acordarse de que ya las tiene.",
  "Nadie le puede quitar lo que ella misma construyó: su estilo, su risa, su forma de mirar.",
  "Cuando alguien no sabe ver lo que vale, el problema es de los ojos, no del brillo.",
  "Esconde la cara en las fotos porque puede. Ella decide quién la ve de cerca.",
  "La noche más oscura es justo cuando mejor se le ven las estrellas.",
  "Merece que la traten con la misma delicadeza con la que ella se pinta cada estrella.",
]

const COSAS_LINDAS = [
  "Tiene un estilo que no copia de nadie: se nota que lo fue armando ella.",
  "Hace que lo oscuro se vea bonito, que es mucho más difícil que al revés.",
  "Sus fotos tienen atmósfera. No son selfies, son escenas, y la directora es ella.",
  "Sabe esconder la cara y aun así llenar toda la foto.",
  "Mezcla lo dark con lo tierno y le sale natural.",
  "Lo que la hace especial ya estaba ahí antes de cualquiera, y va a seguir ahí después.",
  "No necesita que nadie la complete: llegó entera.",
  "Tiene todo el derecho de ocupar espacio, de subir el volumen y de no bajar la mirada.",
]

const PALABRAS = [
  "¿?",
  "estrellas",
  "glitter",
  "espejo",
  "luna",
  "negro",
  "tinta",
  "piercing",
  "blanco y negro",
  "angel",
  "noche",
  "suya",
  "entera",
  "brillo propio",
]

/** R U Mine? dura 3:21. */
const CANCION = {
  titulo: "R U Mine?",
  artista: "Arctic Monkeys",
  segundos: 201,
}

/** Mismo grano que /min-2026. */
const GRANO =
  "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22%3E%3Cfilter id=%22r%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22160%22 height=%22160%22 filter=%22url(%23r)%22/%3E%3C/svg%3E')"

/** Aleatorio con semilla: el cielo sale igual en cada visita. */
function azar(semilla: number) {
  let s = semilla
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CIELO = (() => {
  const r = azar(2026)
  return Array.from({ length: 46 }, () => ({
    top: `${(r() * 100).toFixed(2)}%`,
    left: `${(r() * 100).toFixed(2)}%`,
    tam: r() < 0.18 ? 3 : r() < 0.5 ? 2 : 1,
    retraso: `${(r() * 6).toFixed(2)}s`,
    duracion: `${(3 + r() * 4).toFixed(2)}s`,
  }))
})()

const ONDA = (() => {
  const r = azar(7)
  return Array.from({ length: 72 }, (_, i) => ({
    alto: 0.25 + 0.75 * Math.abs(Math.sin(i * 0.55)) * (0.6 + r() * 0.4),
    retraso: `${(r() * 1.1).toFixed(2)}s`,
  }))
})()

/** Las estrellitas que titilan alrededor de la portada. */
const DESTELLOS = [
  { top: "4%", left: "2%", size: "text-xs", delay: "0s" },
  { top: "16%", left: "92%", size: "text-sm", delay: "1.2s" },
  { top: "46%", left: "98%", size: "text-[10px]", delay: "2.1s" },
  { top: "72%", left: "-2%", size: "text-sm", delay: "0.6s" },
  { top: "94%", left: "84%", size: "text-xs", delay: "1.8s" },
  { top: "30%", left: "-5%", size: "text-[10px]", delay: "2.7s" },
]

const ESTILOS_LOCALES = `
@keyframes min-marquesina { from { transform: translateX(0) } to { transform: translateX(-50%) } }
@keyframes min-titilar { 0%,100% { opacity: .15; transform: scale(.8) } 50% { opacity: 1; transform: scale(1.1) } }
@keyframes min-aparecer { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes min-onda { 0%,100% { transform: scaleY(.35) } 50% { transform: scaleY(1) } }
@keyframes min-parpadeo { 50% { opacity: 0 } }
@keyframes min-latir { 0%,100% { opacity: .35; letter-spacing: .02em } 50% { opacity: 1; letter-spacing: .08em } }
@keyframes min-flotar { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
.min-marquesina { animation: min-marquesina 40s linear infinite }
.min-marquesina-inversa { animation: min-marquesina 55s linear infinite reverse }
.min-titilar { animation: min-titilar 3.2s ease-in-out infinite }
.min-aparecer { animation: min-aparecer .6s ease-out both }
.min-onda { animation: min-onda 1.1s ease-in-out infinite; transform-origin: center }
.min-cursor { animation: min-parpadeo 1s steps(1) infinite }
.min-latir { animation: min-latir 1.8s ease-in-out infinite }
.min-flotar { animation: min-flotar 6s ease-in-out infinite }
.min-revelar { opacity: 0; transform: translateY(22px); transition: opacity 1s ease, transform 1s ease }
.min-revelar.is-visto { opacity: 1; transform: none }
.min-sin-barra { scrollbar-width: none }
.min-sin-barra::-webkit-scrollbar { display: none }
@keyframes min-reflejo { 0%,55% { transform: translateX(-160%) skewX(-18deg) } 100% { transform: translateX(260%) skewX(-18deg) } }
.min-reflejo { animation: min-reflejo 7s ease-in-out infinite }
.min-aparecer-lento { animation: min-aparecer 1.4s ease-out .6s both }
@media (prefers-reduced-motion: reduce) {
  .min-marquesina, .min-marquesina-inversa, .min-titilar, .min-aparecer,
  .min-onda, .min-cursor, .min-latir, .min-flotar, .min-reflejo,
  .min-aparecer-lento { animation: none }
  .min-revelar { opacity: 1; transform: none; transition: none }
}
`

/** Agujeritos del rollo de película. */
const PERFORACION =
  "repeating-linear-gradient(90deg, transparent 0 6px, #09090b 6px 14px, transparent 14px 20px)"

function ruta(foto: Foto) {
  return encodeURI(`/img-min/${foto.archivo}`)
}

function filtro(foto: Foto) {
  return foto.realce ? "grayscale brightness-150 contrast-110" : "grayscale"
}

function horaBogota(fecha: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(fecha)
}

function dosDigitos(n: number) {
  return String(n).padStart(2, "0")
}

/**
 * Fase de la luna a partir de una luna nueva conocida (6 ene 2000, 18:14
 * UTC) y el mes sinódico. Precisión de horas: sobra para una página así.
 */
function faseLunar(fecha: Date) {
  const SINODICO = 29.530588853
  const referencia = Date.UTC(2000, 0, 6, 18, 14)
  const dias = (fecha.getTime() - referencia) / 86_400_000
  const edad = ((dias % SINODICO) + SINODICO) % SINODICO
  const fraccion = edad / SINODICO
  const luz = (1 - Math.cos(2 * Math.PI * fraccion)) / 2

  const nombres = [
    "Luna nueva",
    "Creciente",
    "Cuarto creciente",
    "Gibosa creciente",
    "Luna llena",
    "Gibosa menguante",
    "Cuarto menguante",
    "Menguante",
  ]
  const nombre = nombres[Math.floor(fraccion * 8 + 0.5) % 8]

  return { fraccion, luz, nombre, edad }
}

/** La parte iluminada de la luna como un path de SVG. */
function caminoLuna(fraccion: number, r: number) {
  const k = Math.cos(2 * Math.PI * fraccion)
  const creciente = fraccion < 0.5
  const rx = Math.abs(k) * r
  const exterior = creciente ? 1 : 0
  const terminador = creciente ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0
  return `M ${r} 0 A ${r} ${r} 0 0 ${exterior} ${r} ${2 * r} A ${rx} ${r} 0 0 ${terminador} ${r} 0 Z`
}

function useMovimiento() {
  const [permitido] = React.useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })
  return permitido
}

/** Escribe y borra las frases, una por una. */
function useMaquina(frases: string[], activo: boolean) {
  const [texto, setTexto] = React.useState(activo ? "" : frases[0])

  React.useEffect(() => {
    if (!activo) return
    let i = 0
    let n = 0
    let borrando = false
    let id = 0

    const paso = () => {
      const frase = frases[i]
      if (!borrando) {
        n += 1
        setTexto(frase.slice(0, n))
        if (n === frase.length) {
          borrando = true
          id = window.setTimeout(paso, 2800)
          return
        }
        id = window.setTimeout(paso, 55)
      } else {
        n -= 1
        setTexto(frase.slice(0, n))
        if (n === 0) {
          borrando = false
          i = (i + 1) % frases.length
          id = window.setTimeout(paso, 450)
          return
        }
        id = window.setTimeout(paso, 20)
      }
    }

    id = window.setTimeout(paso, 700)
    return () => window.clearTimeout(id)
  }, [frases, activo])

  return texto
}

/** Aparece suave cuando entra en pantalla. */
function Revelar({
  children,
  className = "",
  retraso = 0,
}: {
  children: React.ReactNode
  className?: string
  retraso?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  // Sin IntersectionObserver no hay animación: se muestra de una.
  const [visto, setVisto] = React.useState(
    () => typeof IntersectionObserver === "undefined"
  )

  React.useEffect(() => {
    const nodo = ref.current
    if (!nodo || visto) return
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisto(true)
          observador.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    observador.observe(nodo)
    return () => observador.disconnect()
  }, [visto])

  return (
    <div
      ref={ref}
      className={`min-revelar ${visto ? "is-visto" : ""} ${className}`}
      style={{ transitionDelay: `${retraso}ms` }}
    >
      {children}
    </div>
  )
}

/** Título de sección: igual al de /min-2026. */
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

/** Visor de foto a pantalla completa, con flechas y Escape. */
function Visor({
  fotos,
  indice,
  onCerrar,
  onMover,
}: {
  fotos: Foto[]
  indice: number
  onCerrar: () => void
  onMover: (paso: number) => void
}) {
  const foto = fotos[indice]

  React.useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar()
      if (e.key === "ArrowRight") onMover(1)
      if (e.key === "ArrowLeft") onMover(-1)
    }
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", alTeclear)
    return () => {
      document.body.style.overflow = overflowPrevio
      window.removeEventListener("keydown", alTeclear)
    }
  }, [onCerrar, onMover])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={foto.pie}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onCerrar}
    >
      <div className="flex items-center justify-between px-5 py-4 font-mono text-[11px] tracking-wider text-zinc-500 uppercase">
        <span className="tabular-nums">
          {dosDigitos(indice + 1)} / {dosDigitos(fotos.length)}
        </span>
        <button
          type="button"
          onClick={onCerrar}
          className="transition-colors hover:text-zinc-100"
        >
          cerrar ✕
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4">
        <img
          key={foto.archivo}
          src={ruta(foto)}
          alt={foto.pie}
          onClick={(e) => e.stopPropagation()}
          className={`min-aparecer max-h-full max-w-full object-contain ${filtro(foto)}`}
        />
        <button
          type="button"
          aria-label="Foto anterior"
          onClick={(e) => {
            e.stopPropagation()
            onMover(-1)
          }}
          className="absolute left-2 flex h-10 w-10 items-center justify-center text-xl text-zinc-400 transition-colors hover:text-zinc-100 sm:left-6"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Foto siguiente"
          onClick={(e) => {
            e.stopPropagation()
            onMover(1)
          }}
          className="absolute right-2 flex h-10 w-10 items-center justify-center text-xl text-zinc-400 transition-colors hover:text-zinc-100 sm:right-6"
        >
          →
        </button>
      </div>

      <p className="px-5 py-5 text-center font-serif text-lg text-zinc-300 italic sm:text-xl">
        {foto.pie}
      </p>
    </div>
  )
}

/** Pantalla negra con el ¿? antes de entrar. Una vez por sesión. */
function Intro() {
  const [fase, setFase] = React.useState<"on" | "saliendo" | "off">(() => {
    try {
      return sessionStorage.getItem("min-angel-intro") ? "off" : "on"
    } catch {
      return "on"
    }
  })

  React.useEffect(() => {
    if (fase === "on") {
      const id = window.setTimeout(() => setFase("saliendo"), 2200)
      return () => window.clearTimeout(id)
    }
    if (fase === "saliendo") {
      try {
        sessionStorage.setItem("min-angel-intro", "1")
      } catch {
        // Sin almacenamiento: la intro sale en cada visita, no pasa nada.
      }
      const id = window.setTimeout(() => setFase("off"), 900)
      return () => window.clearTimeout(id)
    }
  }, [fase])

  if (fase === "off") return null

  return (
    <button
      type="button"
      aria-label="Entrar"
      onClick={() => setFase("saliendo")}
      className={`fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-zinc-950 transition-opacity duration-[900ms] ${
        fase === "saliendo" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <span className="min-latir font-serif text-[clamp(5rem,26vw,11rem)] leading-none text-zinc-100 italic">
        ¿?
      </span>
      <span className="mt-6 font-mono text-[11px] tracking-[0.3em] text-zinc-500 uppercase">
        shh… alguien especial está por aparecer
      </span>
    </button>
  )
}

/** Luz que sigue al mouse: el resto de la página queda en penumbra. */
function Linterna() {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!window.matchMedia?.("(pointer: fine)").matches) return
    const nodo = ref.current
    if (!nodo) return

    const mover = (e: PointerEvent) => {
      nodo.style.opacity = "1"
      nodo.style.background = `radial-gradient(520px circle at ${e.clientX}px ${e.clientY}px, transparent 0%, rgba(9,9,11,0.42) 70%)`
    }
    const salir = () => {
      nodo.style.opacity = "0"
    }
    window.addEventListener("pointermove", mover)
    document.documentElement.addEventListener("pointerleave", salir)
    return () => {
      window.removeEventListener("pointermove", mover)
      document.documentElement.removeEventListener("pointerleave", salir)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 opacity-0 transition-opacity duration-500"
    />
  )
}

/** La luna dibujada en SVG, con la fase de hoy. */
/** La foto de las estrellas en la mejilla: se turna con la luna del cielo. */
const FOTO_LUNA = NOCHE[1]

/**
 * La luna dibujada en SVG, con la fase de hoy. Cuando `conFoto` está
 * encendido, la luna se desvanece y en el mismo círculo aparece ella; el halo
 * se queda quieto para que parezca la misma luna cambiando de cara.
 */
function Luna({ fraccion, conFoto }: { fraccion: number; conFoto: boolean }) {
  const r = 44
  return (
    <div
      aria-hidden
      className="min-flotar relative h-24 w-24 shrink-0 sm:h-28 sm:w-28"
    >
      <svg
        viewBox={`-6 -6 ${2 * r + 12} ${2 * r + 12}`}
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <radialGradient id="min-halo">
            <stop offset="60%" stopColor="#f4f4f5" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#f4f4f5" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={r} cy={r} r={r + 6} fill="url(#min-halo)" />
        <g
          className={`transition-opacity duration-[1500ms] ease-in-out ${conFoto ? "opacity-0" : "opacity-100"}`}
        >
          <circle
            cx={r}
            cy={r}
            r={r}
            fill="#18181b"
            stroke="#3f3f46"
            strokeWidth="0.75"
          />
          <path d={caminoLuna(fraccion, r)} fill="#e4e4e7" />
        </g>
      </svg>
      {/* El círculo del SVG ocupa del 6 % al 94 % de la caja. */}
      <img
        src={ruta(FOTO_LUNA)}
        alt=""
        className={`absolute inset-[6%] h-[88%] w-[88%] rounded-full object-cover object-[52%_30%] ring-1 ring-zinc-700 transition-opacity duration-[1500ms] ease-in-out ${filtro(FOTO_LUNA)} ${conFoto ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}

/* ---------------------------- Constelación ---------------------------- */

type Punto = { x: number; y: number }

/** «Min» trazado con estrellas, letra por letra, en un lienzo de 360×150. */
const LETRAS: Punto[][] = [
  [
    { x: 24, y: 124 },
    { x: 40, y: 28 },
    { x: 78, y: 88 },
    { x: 116, y: 26 },
    { x: 132, y: 122 },
  ],
  [
    { x: 186, y: 26 },
    { x: 190, y: 76 },
    { x: 184, y: 124 },
  ],
  [
    { x: 240, y: 122 },
    { x: 246, y: 30 },
    { x: 326, y: 118 },
    { x: 336, y: 24 },
  ],
]

const PUNTOS = LETRAS.flatMap((letra, l) =>
  letra.map((p, i) => ({ ...p, id: `${l}-${i}` }))
)

const TRAZOS = LETRAS.flatMap((letra, l) =>
  letra.slice(1).map((b, i) => {
    const a = letra[i]
    return {
      desde: `${l}-${i}`,
      hasta: `${l}-${i + 1}`,
      a,
      b,
      largo: Math.hypot(b.x - a.x, b.y - a.y),
    }
  })
)

/** Polvo de estrellas de adorno: no se puede tocar. */
const POLVO = (() => {
  const r = azar(99)
  return Array.from({ length: 30 }, () => ({
    x: r() * 360,
    y: r() * 150,
    r: 0.4 + r() * 0.9,
  }))
})()

/**
 * Las estrellas se encienden al pasar el mouse o el dedo; cada línea aparece
 * cuando sus dos puntas están encendidas. En celular el arrastre horizontal
 * funciona (touch-action: pan-y), así que se puede «escribir» el nombre.
 */
function Constelacion() {
  const [encendidas, setEncendidas] = React.useState<Set<string>>(
    () => new Set()
  )
  const completa = encendidas.size === PUNTOS.length

  const encender = (id: string) =>
    setEncendidas((previas) =>
      previas.has(id) ? previas : new Set(previas).add(id)
    )

  // Con el dedo el puntero queda capturado por el SVG: se busca a mano qué
  // estrella hay debajo.
  const alMover = (e: React.PointerEvent) => {
    const debajo = document.elementFromPoint(e.clientX, e.clientY)
    const id = debajo?.getAttribute("data-estrella")
    if (id) encender(id)
  }

  return (
    <div className="border border-zinc-800 bg-zinc-950/60 px-4 py-8 sm:px-10 sm:py-12">
      <svg
        viewBox="0 0 360 150"
        role="img"
        aria-label="Constelación que forma el nombre Min"
        onPointerMove={alMover}
        onPointerDown={alMover}
        className={`mx-auto block w-full max-w-3xl touch-pan-y transition-[filter] duration-1000 select-none ${
          completa ? "drop-shadow-[0_0_10px_rgba(250,250,250,0.35)]" : ""
        }`}
      >
        {POLVO.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#52525b" />
        ))}

        {TRAZOS.map((t) => {
          const unida = encendidas.has(t.desde) && encendidas.has(t.hasta)
          return (
            <line
              key={`${t.desde}_${t.hasta}`}
              x1={t.a.x}
              y1={t.a.y}
              x2={t.b.x}
              y2={t.b.y}
              stroke="#e4e4e7"
              strokeWidth={completa ? 1.1 : 0.8}
              strokeLinecap="round"
              strokeDasharray={t.largo}
              strokeDashoffset={unida ? 0 : t.largo}
              style={{
                opacity: unida ? 0.85 : 0,
                transition:
                  "stroke-dashoffset 900ms ease, opacity 600ms ease, stroke-width 1s ease",
              }}
            />
          )
        })}

        {PUNTOS.map((p, i) => {
          const on = encendidas.has(p.id)
          return (
            <g key={p.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={10}
                fill="#fafafa"
                style={{ opacity: on ? 0.14 : 0, transition: "opacity .8s" }}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={on ? 3 : 1.8}
                fill={on ? "#fafafa" : "#a1a1aa"}
                className={on ? "" : "min-titilar"}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  animationDelay: `${(i * 0.37) % 3}s`,
                  transition: "r .5s ease, fill .5s ease",
                }}
              />
              {/* Zona de toque generosa, invisible. */}
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill="#000"
                fillOpacity={0}
                data-estrella={p.id}
                className="cursor-pointer"
              />
            </g>
          )
        })}
      </svg>

      <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <span className="font-mono text-[11px] tracking-wider text-zinc-500 uppercase tabular-nums">
          {dosDigitos(encendidas.size)} / {dosDigitos(PUNTOS.length)} estrellas
        </span>
        <div className="flex gap-5 font-mono text-[11px] tracking-wider text-zinc-500 uppercase">
          {!completa && (
            <button
              type="button"
              onClick={() => setEncendidas(new Set(PUNTOS.map((p) => p.id)))}
              className="transition-colors hover:text-zinc-100"
            >
              unir todas ✦
            </button>
          )}
          {encendidas.size > 0 && (
            <button
              type="button"
              onClick={() => setEncendidas(new Set())}
              className="transition-colors hover:text-zinc-100"
            >
              apagar
            </button>
          )}
        </div>
      </div>

      <p
        key={completa ? "completa" : "pista"}
        className={`min-aparecer mx-auto mt-6 max-w-3xl text-center text-pretty ${
          completa
            ? "font-serif text-xl text-zinc-100 italic sm:text-2xl"
            : "text-sm text-zinc-500"
        }`}
      >
        {completa
          ? "Min. Una constelación que brilla sin pedirle luz prestada a nadie."
          : "Pasa el mouse o el dedo por las estrellas para unirlas."}
      </p>
    </div>
  )
}

/* ------------------------------- Espejo ------------------------------- */

/** Estrellitas encima del reflejo, como el glitter de sus fotos. */
const BRILLOS_ESPEJO = [
  { top: "14%", left: "22%", size: "text-sm", delay: "0s" },
  { top: "22%", left: "74%", size: "text-xs", delay: "1.1s" },
  { top: "38%", left: "12%", size: "text-[10px]", delay: "2s" },
  { top: "46%", left: "84%", size: "text-sm", delay: "0.5s" },
  { top: "62%", left: "18%", size: "text-xs", delay: "1.6s" },
  { top: "30%", left: "50%", size: "text-[10px]", delay: "2.6s" },
  { top: "70%", left: "78%", size: "text-[10px]", delay: "0.9s" },
]

type EstadoEspejo = "quieto" | "pidiendo" | "camara" | "sin-camara"

/**
 * Un espejo que, al tocarlo, pide la cámara frontal y muestra a quien mira
 * en blanco y negro con estrellas encima. El video no sale del navegador:
 * no se graba, no se sube, y se apaga al cerrar o al salir de la página.
 * Sin cámara (o sin permiso) muestra el mensaje igual.
 */
function Espejo() {
  const [estado, setEstado] = React.useState<EstadoEspejo>("quieto")
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)

  const apagar = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((pista) => pista.stop())
    streamRef.current = null
  }, [])

  React.useEffect(() => apagar, [apagar])

  React.useEffect(() => {
    const video = videoRef.current
    if (estado !== "camara" || !video || !streamRef.current) return
    video.srcObject = streamRef.current
    video.play().catch(() => {
      // Si el navegador no deja reproducir, el mensaje igual se ve.
    })
  }, [estado])

  const abrir = async () => {
    if (estado !== "quieto") return
    if (!navigator.mediaDevices?.getUserMedia) {
      setEstado("sin-camara")
      return
    }
    setEstado("pidiendo")
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })
      setEstado("camara")
    } catch {
      setEstado("sin-camara")
    }
  }

  const cerrar = () => {
    apagar()
    setEstado("quieto")
  }

  const abierto = estado === "camara" || estado === "sin-camara"

  return (
    <div className="flex flex-col items-center">
      {/* Marco en arco, como un espejo de pie. */}
      <div className="w-full max-w-[320px] rounded-t-full border border-zinc-800 p-2.5 sm:max-w-[380px] lg:max-w-[420px]">
        <button
          type="button"
          onClick={abrir}
          disabled={estado !== "quieto"}
          aria-label={
            estado === "quieto" ? "Tocar el espejo" : "Espejo encendido"
          }
          className="group relative block aspect-[3/4] w-full overflow-hidden rounded-t-full border border-zinc-700 bg-[linear-gradient(140deg,#27272a_0%,#09090b_42%,#18181b_58%,#09090b_100%)] disabled:cursor-default"
        >
          {/* Reflejo de luz que cruza el vidrio. */}
          <span
            aria-hidden
            className="min-reflejo pointer-events-none absolute inset-y-0 left-0 z-20 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />

          {estado === "camara" && (
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="absolute inset-0 h-full w-full -scale-x-100 object-cover brightness-110 contrast-125 grayscale"
            />
          )}

          {abierto &&
            BRILLOS_ESPEJO.map((b, i) => (
              <span
                key={i}
                aria-hidden
                className={`min-titilar pointer-events-none absolute z-10 text-zinc-100 ${b.size}`}
                style={{ top: b.top, left: b.left, animationDelay: b.delay }}
              >
                ✦
              </span>
            ))}

          {estado === "quieto" && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="min-latir font-serif text-4xl text-zinc-400 italic">
                ¿?
              </span>
              <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500 uppercase transition-colors group-hover:text-zinc-200">
                Toca el espejo
              </span>
            </span>
          )}

          {estado === "pidiendo" && (
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] tracking-[0.3em] text-zinc-500 uppercase">
              abriendo el espejo…
            </span>
          )}

          {abierto && (
            <span
              className={`absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 pb-8 text-center ${
                estado === "camara"
                  ? "bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-24"
                  : "top-0 justify-center"
              }`}
            >
              <span className="min-aparecer-lento font-serif text-2xl leading-tight text-balance text-zinc-100 italic sm:text-3xl">
                La persona más importante de esta página eres tú.
              </span>
              {estado === "sin-camara" && (
                <span className="min-aparecer-lento mt-4 text-xs text-pretty text-zinc-500">
                  Aunque el espejo no te vea, tú sabes quién está ahí.
                </span>
              )}
            </span>
          )}
        </button>
      </div>
      {/* Pie del espejo */}
      <span aria-hidden className="h-6 w-px bg-zinc-800" />
      <span aria-hidden className="h-px w-24 bg-zinc-800" />

      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <p className="max-w-xs text-[11px] text-pretty text-zinc-600">
          La cámara solo se ve aquí, en tu pantalla. No se graba ni se guarda
          nada.
        </p>
        {abierto && (
          <button
            type="button"
            onClick={cerrar}
            className="font-mono text-[11px] tracking-wider text-zinc-500 uppercase transition-colors hover:text-zinc-100"
          >
            cerrar el espejo
          </button>
        )}
      </div>
    </div>
  )
}

export function MinAngelPage() {
  const movimiento = useMovimiento()
  const [ahora, setAhora] = React.useState(() => new Date())
  const [inicio] = React.useState(() => Date.now())
  const [visor, setVisor] = React.useState<{
    fotos: Foto[]
    indice: number
  } | null>(null)
  const [destapados, setDestapados] = React.useState<Set<number>>(
    () => new Set()
  )

  React.useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const frase = useMaquina(FRASES, movimiento)

  const abrir = (fotos: Foto[], indice: number) => setVisor({ fotos, indice })
  const cerrar = React.useCallback(() => setVisor(null), [setVisor])
  const mover = React.useCallback(
    (paso: number) =>
      setVisor((v) =>
        v
          ? {
              ...v,
              indice: (v.indice + paso + v.fotos.length) % v.fotos.length,
            }
          : v
      ),
    [setVisor]
  )

  const destapar = (i: number) =>
    setDestapados((previos) => {
      const siguientes = new Set(previos)
      if (siguientes.has(i)) siguientes.delete(i)
      else siguientes.add(i)
      return siguientes
    })

  // Cambia de piropo cada 5 segundos, al ritmo del reloj.
  const piropo = PIROPOS[Math.floor(ahora.getTime() / 5000) % PIROPOS.length]
  const luna = faseLunar(ahora)
  // Luna y foto se turnan cada 4 segundos, al ritmo del reloj.
  const lunaConFoto = Math.floor(ahora.getTime() / 4000) % 2 === 1
  const sonando =
    Math.floor((ahora.getTime() - inicio) / 1000) % CANCION.segundos
  const reloj = (s: number) => `${Math.floor(s / 60)}:${dosDigitos(s % 60)}`

  return (
    <div className="min-h-svh overflow-x-hidden bg-zinc-950 text-zinc-100 selection:bg-zinc-100 selection:text-zinc-950">
      <style>{ESTILOS_LOCALES}</style>
      <Intro />
      <Linterna />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06] mix-blend-screen"
        style={{ backgroundImage: GRANO }}
      />

      {/* Cielo: puntitos quietos que titilan a destiempo. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        {CIELO.map((estrella, i) => (
          <span
            key={i}
            className="min-titilar absolute rounded-full bg-zinc-100"
            style={{
              top: estrella.top,
              left: estrella.left,
              width: estrella.tam,
              height: estrella.tam,
              animationDelay: estrella.retraso,
              animationDuration: estrella.duracion,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1680px] px-5 py-10 sm:px-8 sm:py-14 lg:px-14 xl:px-20">
        <header className="flex items-center justify-between gap-4 text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
          <span className="truncate">
            {YO.alias} · {YO.ciudad}
          </span>
          <Link
            to="/min-2026"
            className="shrink-0 transition-colors hover:text-zinc-100"
          >
            ← {YO.alias}-{YO.anio}
          </Link>
        </header>

        {/* Portada: collage de tres fotos y la pregunta en grande. */}
        <section className="mt-12 grid items-center gap-14 sm:mt-16 sm:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] sm:gap-12 lg:mt-20 lg:gap-20">
          <div className="group relative mx-auto w-full max-w-[300px] sm:max-w-none lg:max-w-[520px] lg:justify-self-end">
            {DETRAS.map((foto, i) => (
              <img
                key={foto.archivo}
                src={ruta(foto)}
                alt=""
                aria-hidden
                className={`absolute inset-0 aspect-[4/5] w-full object-cover opacity-60 ring-1 ring-zinc-800 transition duration-700 ${filtro(foto)} ${
                  i === 0
                    ? "-translate-x-4 -rotate-6 group-hover:-translate-x-10 group-hover:-rotate-[10deg]"
                    : "translate-x-4 rotate-6 group-hover:translate-x-10 group-hover:rotate-[10deg]"
                }`}
              />
            ))}
            <button
              type="button"
              onClick={() => abrir(ESPEJO, 0)}
              className="relative block w-full"
            >
              <img
                src={ruta(PORTADA)}
                alt={PORTADA.pie}
                width={PORTADA.ancho}
                height={PORTADA.alto}
                className="relative aspect-[4/5] w-full object-cover shadow-2xl ring-1 shadow-black ring-zinc-700 grayscale transition duration-700 group-hover:brightness-110"
              />
            </button>
            {DESTELLOS.map((d, i) => (
              <span
                key={i}
                aria-hidden
                className={`min-titilar pointer-events-none absolute text-zinc-100 ${d.size}`}
                style={{ top: d.top, left: d.left, animationDelay: d.delay }}
              >
                ✦
              </span>
            ))}
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <p className="text-[11px] tracking-[0.3em] text-zinc-500 uppercase">
              Estética · {YO.anio}
            </p>
            <h1 className="mt-3 font-serif text-[clamp(3rem,10vw,10rem)] leading-[0.9] tracking-tight italic">
              seen this
              <br />
              angel?
            </h1>
            <p className="mx-auto mt-6 max-w-sm text-base text-balance text-zinc-300 sm:mx-0 sm:text-lg lg:max-w-md lg:text-xl">
              Una página sobre {YO.nombre} y la forma en que convierte la
              oscuridad en algo bonito.
            </p>
            <p className="mx-auto mt-4 max-w-sm text-sm text-pretty text-zinc-500 sm:mx-0">
              Para que se mire como la ven los demás: despacio, y con todo su
              brillo.
            </p>
            <a
              href={YO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-8 inline-flex items-center gap-3 border border-zinc-700 px-4 py-2.5 font-mono text-xs tracking-wider text-zinc-300 transition-colors duration-500 hover:border-zinc-100 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <IconoInstagram className="h-4 w-4" />@{YO.instagram}
              <span
                aria-hidden
                className="transition-transform duration-500 group-hover:translate-x-1"
              >
                →
              </span>
            </a>
          </div>
        </section>

        {/* Dos marquesinas cruzadas: la estética en dos líneas. */}
        <div
          aria-hidden
          className="-mx-5 mt-20 space-y-px sm:-mx-8 lg:-mx-14 xl:-mx-20"
        >
          <div className="overflow-hidden border-y border-zinc-800 py-3">
            <div className="min-marquesina flex w-max gap-6 font-mono text-[11px] tracking-[0.25em] whitespace-nowrap text-zinc-500 uppercase">
              {[...PALABRAS, ...PALABRAS].map((palabra, i) => (
                <span key={i} className="flex items-center gap-6">
                  {palabra}
                  <span className="text-zinc-700">✦</span>
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden border-b border-zinc-800 py-3">
            <div className="min-marquesina-inversa flex w-max gap-8 font-serif text-lg whitespace-nowrap text-zinc-700 italic">
              {[...PALABRAS, ...PALABRAS].reverse().map((palabra, i) => (
                <span key={i} className="flex items-center gap-8">
                  {palabra}
                  <span className="text-zinc-800">·</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Estado en vivo + la luna de hoy */}
        <Revelar className="mt-14">
          <section className="grid gap-px border-y border-zinc-800 bg-zinc-800 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="bg-zinc-950 py-6 pr-0 sm:pr-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-100" />
                  </span>
                  <span className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
                    Ahora mismo, {YO.nombre} está
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                  {horaBogota(ahora)} · Bogotá
                </span>
              </div>
              <p
                key={piropo}
                className="min-aparecer mt-4 text-2xl tracking-tight text-pretty sm:text-3xl"
              >
                {piropo}
              </p>
            </div>

            <div className="flex items-center gap-5 bg-zinc-950 py-6 sm:pl-6">
              <Luna fraccion={luna.fraccion} conFoto={lunaConFoto} />
              <div className="min-w-0">
                <p className="text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
                  La luna de hoy
                </p>
                <p className="mt-1 font-serif text-xl italic">{luna.nombre}</p>
                <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
                  {Math.round(luna.luz * 100)} % iluminada
                </p>
                <p className="mt-2 text-xs text-pretty text-zinc-500">
                  La del cielo cambia de fase y nunca deja de ser luna. La que
                  ella lleva en el cuello, tampoco.
                </p>
              </div>
            </div>
          </section>
        </Revelar>

        {/* Rollo de película con las fotos de noche */}
        <Revelar className="mt-16">
          <section>
            <Titulo indice="01">De noche</Titulo>
            <div className="mt-6 flex items-baseline justify-between gap-4">
              <p className="max-w-2xl text-sm text-pretty text-zinc-500">
                Poca luz, glitter y una luna. Las fotos que casi no se dejan
                ver.
              </p>
              <span className="shrink-0 font-mono text-[11px] tracking-wider text-zinc-600 uppercase">
                desliza →
              </span>
            </div>

            <div className="-mx-5 mt-6 bg-zinc-900 py-2 sm:-mx-8 lg:-mx-14 xl:-mx-20">
              <div className="h-2.5" style={{ backgroundImage: PERFORACION }} />
              <div className="min-sin-barra flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 py-2 sm:px-8 lg:px-14 xl:px-20">
                {NOCHE.map((foto, i) => (
                  <figure key={foto.archivo} className="shrink-0 snap-center">
                    <button
                      type="button"
                      onClick={() => abrir(NOCHE, i)}
                      className="group block h-48 overflow-hidden bg-zinc-950 sm:h-64 lg:h-80"
                    >
                      <img
                        src={ruta(foto)}
                        alt={foto.pie}
                        width={foto.ancho}
                        height={foto.alto}
                        loading="lazy"
                        className={`h-full w-auto transition duration-700 group-hover:scale-[1.04] ${filtro(foto)}`}
                      />
                    </button>
                    <figcaption className="mt-1.5 flex items-baseline gap-2 font-mono text-[10px] text-zinc-500">
                      <span className="text-zinc-600 tabular-nums">
                        {dosDigitos(i + 1)}A
                      </span>
                      <span className="max-w-[16rem] truncate">{foto.pie}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <div className="h-2.5" style={{ backgroundImage: PERFORACION }} />
            </div>
          </section>
        </Revelar>

        {/* Galería del espejo */}
        <Revelar className="mt-16">
          <section>
            <Titulo indice="02">En el espejo</Titulo>
            <p className="mt-6 max-w-2xl text-sm text-pretty text-zinc-500">
              Blanco y negro, el celular tapando la cara y mucho carácter. Toca
              cualquiera para verla grande.
            </p>

            <div className="mt-7 columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4 2xl:columns-5">
              {ESPEJO.map((foto, i) => (
                <figure
                  key={foto.archivo}
                  className="mb-3 break-inside-avoid sm:mb-4"
                >
                  <button
                    type="button"
                    onClick={() => abrir(ESPEJO, i)}
                    className="group relative block w-full overflow-hidden bg-zinc-900 ring-1 ring-zinc-800"
                  >
                    <img
                      src={ruta(foto)}
                      alt={foto.pie}
                      width={foto.ancho}
                      height={foto.alto}
                      loading="lazy"
                      className={`h-auto w-full transition duration-700 group-hover:scale-[1.03] group-hover:brightness-110 ${filtro(foto)}`}
                    />
                    {/* Al pasar el mouse, el pie sube como subtítulo. */}
                    <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/90 to-transparent px-3 pt-8 pb-3 text-left font-serif text-[13px] text-zinc-100 italic opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                      {foto.pie}
                    </span>
                    <span className="absolute top-2 left-2 font-mono text-[10px] text-zinc-300/80 tabular-nums mix-blend-difference">
                      {dosDigitos(i + 1)}
                    </span>
                  </button>
                  <figcaption className="mt-2 font-serif text-[13px] text-pretty text-zinc-400 italic sm:hidden">
                    {foto.pie}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        </Revelar>

        {/* Lo que sonaba en una de sus historias */}
        <Revelar className="mt-16">
          <section className="border border-zinc-800 bg-zinc-950/80 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
              <span>Sonando en una de sus historias</span>
              <span className="font-mono tracking-wider">♪</span>
            </div>

            <div
              aria-hidden
              className="mt-6 flex h-14 items-center gap-[3px] sm:h-16"
            >
              {ONDA.map((barra, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-full bg-zinc-100 ${i >= 32 ? "hidden lg:block" : ""} ${movimiento ? "min-onda" : ""}`}
                  style={{
                    height: `${(barra.alto * 100).toFixed(0)}%`,
                    animationDelay: barra.retraso,
                  }}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div>
                <p className="font-serif text-3xl italic sm:text-4xl">
                  {CANCION.titulo}
                </p>
                <p className="mt-1 text-sm text-zinc-500">{CANCION.artista}</p>
              </div>
              <p className="max-w-xs text-xs text-pretty text-zinc-500">
                La canción pregunta de quién es. Ella ya se sabe la respuesta:
                es suya.
              </p>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="font-mono text-[11px] text-zinc-500 tabular-nums">
                {reloj(sonando)}
              </span>
              <div className="h-px flex-1 bg-zinc-800">
                <div
                  className="h-px bg-zinc-100 transition-[width] duration-1000 ease-linear"
                  style={{ width: `${(sonando / CANCION.segundos) * 100}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                {reloj(CANCION.segundos)}
              </span>
            </div>
          </section>
        </Revelar>

        {/* Estilo, rasgo por rasgo */}
        <Revelar className="mt-16">
          <section>
            <Titulo indice="03">Su estilo</Titulo>

            <div className="mt-7 grid gap-px bg-zinc-800 sm:grid-cols-3">
              {CIFRAS.map((cifra) => (
                <div
                  key={cifra.nota}
                  className="bg-zinc-950 px-5 py-7 text-center sm:text-left"
                >
                  <p className="text-4xl leading-none font-semibold tracking-tighter tabular-nums sm:text-5xl">
                    {cifra.valor}
                    <span className="text-xl text-zinc-500">
                      {cifra.unidad}
                    </span>
                  </p>
                  <p className="mt-3 text-sm text-pretty text-zinc-400">
                    {cifra.nota}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-px grid gap-px bg-zinc-800 sm:grid-cols-2 lg:grid-cols-5">
              {ESTILO.map((item, i) => (
                <article
                  key={item.rasgo}
                  className="group bg-zinc-950 p-5 transition-colors duration-500 hover:bg-zinc-900/60 sm:p-6"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] text-zinc-600 tabular-nums">
                      {dosDigitos(i + 1)}
                    </span>
                    <h3 className="text-[11px] tracking-[0.2em] text-zinc-200 uppercase">
                      {item.rasgo}
                    </h3>
                    <span className="ml-auto text-xs text-zinc-700 transition-colors duration-500 group-hover:text-zinc-300">
                      ✦
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-pretty text-zinc-400">
                    {item.texto}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </Revelar>

        {/* Frases que se escriben solas */}
        <Revelar className="mt-24">
          <blockquote className="text-center">
            <span aria-hidden className="text-zinc-600">
              ✦
            </span>
            <p
              aria-live="off"
              className="mx-auto mt-4 flex min-h-[3.6em] max-w-xl items-center justify-center font-serif text-[clamp(1.6rem,6vw,2.75rem)] leading-tight text-balance italic lg:max-w-4xl lg:text-6xl"
            >
              <span>
                {frase}
                {movimiento && (
                  <span
                    aria-hidden
                    className="min-cursor ml-0.5 inline-block w-[2px] bg-zinc-300 not-italic"
                  >
                    &nbsp;
                  </span>
                )}
              </span>
            </p>
            <span aria-hidden className="mt-4 inline-block text-zinc-600">
              ✦
            </span>
          </blockquote>
        </Revelar>

        {/* Secretos: tapados hasta que alguien los toca */}
        <Revelar className="mt-24">
          <section className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-16 right-0 font-serif text-[9rem] leading-none text-zinc-900 italic select-none sm:-top-24 sm:text-[14rem] lg:-top-40 lg:text-[22rem]"
            >
              ¿?
            </span>
            <div className="relative">
              <Titulo indice="04">Secretos</Titulo>
              <p className="mt-6 max-w-2xl text-sm text-pretty text-zinc-500">
                Seis cosas que a veces se olvidan. Toca para destaparlas.
              </p>

              <div className="mt-7 grid gap-px bg-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
                {SECRETOS.map((secreto, i) => {
                  const abierto = destapados.has(i)
                  return (
                    <button
                      key={secreto}
                      type="button"
                      aria-pressed={abierto}
                      onClick={() => destapar(i)}
                      className="group flex min-h-40 flex-col justify-between bg-zinc-950 p-5 text-left transition-colors duration-500 hover:bg-zinc-900/60 sm:p-6"
                    >
                      <span className="flex items-center justify-between font-mono text-[11px] tracking-wider text-zinc-600 uppercase">
                        <span>Secreto nº {dosDigitos(i + 1)}</span>
                        <span
                          className={
                            abierto
                              ? "text-zinc-300"
                              : "text-zinc-600 group-hover:text-zinc-400"
                          }
                        >
                          {abierto ? "✦" : "¿?"}
                        </span>
                      </span>
                      <span
                        className={`mt-5 font-serif text-lg leading-snug text-pretty italic transition duration-700 ${
                          abierto
                            ? "blur-0 text-zinc-100"
                            : "text-zinc-400 blur-[6px] select-none"
                        }`}
                      >
                        {secreto}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        </Revelar>

        {/* Constelación con su nombre */}
        <Revelar className="mt-20">
          <section>
            <Titulo indice="05">Constelación</Titulo>
            <p className="mt-6 max-w-2xl text-sm text-pretty text-zinc-500">
              Algunas estrellas ya estaban ahí antes de que alguien las uniera.
              Estas también.
            </p>
            <div className="mt-7">
              <Constelacion />
            </div>
          </section>
        </Revelar>

        {/* Cosas lindas */}
        <Revelar className="mt-20">
          <section>
            <Titulo indice="06">Cosas lindas</Titulo>
            <ol className="mt-6 ml-1 grid lg:grid-cols-2 lg:gap-x-16">
              {COSAS_LINDAS.map((texto, i) => (
                <li
                  key={texto}
                  className="relative border-l border-zinc-800 py-4 pl-6"
                >
                  <span className="absolute top-[1.45rem] -left-[3px] h-[5px] w-[5px] rounded-full bg-zinc-600" />
                  <p className="font-mono text-[11px] tracking-wider text-zinc-500 uppercase">
                    {dosDigitos(i + 1)}
                  </p>
                  <p className="mt-1 text-sm text-pretty text-zinc-300 sm:text-base">
                    {texto}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </Revelar>

        {/* Carta final */}
        <Revelar className="mt-20">
          <section className="relative mx-auto max-w-4xl border border-zinc-800 px-6 py-10 sm:px-12 sm:py-14">
            <span
              aria-hidden
              className="absolute -top-2.5 left-6 bg-zinc-950 px-2 text-zinc-500 sm:left-12"
            >
              ✦
            </span>
            <p className="text-[11px] tracking-[0.3em] text-zinc-500 uppercase">
              Para la chica del ¿?
            </p>
            <div className="mt-6 space-y-5 font-serif text-lg leading-relaxed text-pretty text-zinc-300 italic sm:text-xl">
              <p>
                Hay personas que se entienden a la primera. Tú no, y qué bueno:
                cada foto deja algo sin decir, y lo que decides no mostrar
                también es tuyo.
              </p>
              <p>
                Te pintas estrellas, eliges tu tinta, tu color de labios, tu
                ángulo en el espejo. Todo eso lo construiste tú, y nadie tiene
                la llave para quitártelo.
              </p>
              <p>
                Si algún día se te olvida cuánto vales, vuelve a mirar tus
                fotos. Ahí está la respuesta, en blanco y negro y sin ningún ¿?.
              </p>
            </div>
            <p className="mt-8 text-right font-mono text-[11px] tracking-[0.2em] text-zinc-500 uppercase">
              — firmado, ¿?
            </p>
          </section>
        </Revelar>

        {/* El espejo: la última foto la pone ella */}
        <Revelar className="mt-24">
          <section>
            <Titulo indice="07">Reflejo</Titulo>
            <p className="mt-6 max-w-2xl text-sm text-pretty text-zinc-500">
              Falta una foto en esta página. La más importante.
            </p>
            <div className="mt-10">
              <Espejo />
            </div>
          </section>
        </Revelar>

        {/* Cierre: donde sigue su estilo */}
        <Revelar className="mt-24">
          <section className="text-center">
            <p className="text-[11px] tracking-[0.3em] text-zinc-500 uppercase">
              Donde vive su estilo
            </p>
            <a
              href={YO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-6 inline-flex max-w-full flex-col items-center gap-4"
            >
              <IconoInstagram className="h-8 w-8 text-zinc-500 transition-colors duration-500 group-hover:text-zinc-100 sm:h-10 sm:w-10" />
              <span className="max-w-full font-serif text-[clamp(2.25rem,9vw,7rem)] leading-none tracking-tight break-all italic transition-colors duration-500 group-hover:text-zinc-400">
                @{YO.instagram}
              </span>
              <span className="h-px w-16 bg-zinc-700 transition-all duration-700 group-hover:w-full group-hover:bg-zinc-100" />
            </a>
            <p className="mx-auto mt-6 max-w-md text-sm text-pretty text-zinc-500">
              Las estrellas, el espejo y el ¿? siguen ahí. Siempre en sus
              propios términos.
            </p>
          </section>
        </Revelar>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-zinc-800 pt-6 text-[11px] text-zinc-600">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {YO.alias}-{YO.anio} · angel edition ✦
            </span>
            <a
              href={YO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-zinc-100"
            >
              <IconoInstagram className="h-3 w-3" />@{YO.instagram}
            </a>
          </span>
          <Link
            to="/min-2026"
            className="shrink-0 transition-colors hover:text-zinc-100"
          >
            volver a {YO.alias}-{YO.anio} →
          </Link>
        </footer>
      </div>

      {visor && (
        <Visor
          fotos={visor.fotos}
          indice={visor.indice}
          onCerrar={cerrar}
          onMover={mover}
        />
      )}
    </div>
  )
}

export default MinAngelPage
