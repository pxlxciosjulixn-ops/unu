import { esRomantica } from "@/components/chatbot/relaciones"
import type { Relacion } from "@/components/chatbot/tipos"

/**
 * Las preguntas que se hacen al importar un chat, para que el consejero se
 * ubique. Cambian según la relación: a un familiar no se le pregunta si ya
 * salieron, y a alguien que te gusta no se le pregunta qué familiar es.
 */

export type Pregunta = { id: string; texto: string; opciones: string[] }

const POR_RELACION: Record<Relacion, Pregunta[]> = {
  me_gusta: [
    {
      id: "conocen",
      texto: "¿Ya se conocen en persona?",
      opciones: ["Sí", "Todavía no", "Solo de vista"],
    },
    {
      id: "salido",
      texto: "¿Ya han salido juntos?",
      opciones: ["Sí, varias veces", "Una vez", "Nunca"],
    },
  ],
  pareja: [
    {
      id: "tipo",
      texto: "¿Qué son exactamente?",
      opciones: ["Novios", "Esposos", "Viven juntos", "Algo sin nombre"],
    },
    {
      id: "momento",
      texto: "¿Cómo están ahora?",
      opciones: ["Muy bien", "Normal", "Peleados", "En crisis"],
    },
  ],
  amante: [
    {
      id: "pareja",
      texto: "¿Alguno de los dos tiene pareja?",
      opciones: ["Yo", "Esa persona", "Los dos", "Ninguno"],
    },
    {
      id: "busca",
      texto: "¿Qué quieres que sea?",
      opciones: ["Algo serio", "Seguir así", "Terminarlo", "No sé"],
    },
  ],
  ex: [
    {
      id: "termino",
      texto: "¿Quién terminó?",
      opciones: ["Yo", "Esa persona", "Fue mutuo"],
    },
    {
      id: "hace",
      texto: "¿Hace cuánto terminaron?",
      opciones: [
        "Menos de un mes",
        "De 1 a 6 meses",
        "De 6 meses a un año",
        "Más de un año",
      ],
    },
  ],
  amistad: [
    {
      id: "tipo",
      texto: "¿Qué tan amigos son?",
      opciones: ["Mejores amigos", "Amigos cercanos", "Amigos", "Conocidos"],
    },
    {
      id: "origen",
      texto: "¿De dónde se conocen?",
      opciones: [
        "Colegio o universidad",
        "Trabajo",
        "Barrio",
        "Internet",
        "Otro",
      ],
    },
  ],
  familia: [
    {
      id: "quien",
      texto: "¿Qué familiar es?",
      opciones: [
        "Mamá",
        "Papá",
        "Hermano o hermana",
        "Hijo o hija",
        "Primo o prima",
        "Tío o tía",
        "Abuelo o abuela",
        "Otro",
      ],
    },
    {
      id: "trato",
      texto: "¿Cómo se llevan?",
      opciones: ["Muy bien", "Normal", "Con roces", "Casi no hablamos"],
    },
  ],
  trabajo: [
    {
      id: "quien",
      texto: "¿Qué es para ti en el trabajo o el estudio?",
      opciones: [
        "Jefe o jefa",
        "Compañero o compañera",
        "Alguien a mi cargo",
        "Cliente",
        "Profesor o profesora",
        "Compañero de clase",
      ],
    },
  ],
  otra: [],
}

const OBJETIVOS_ROMANTICOS = [
  "Conquistar a esa persona",
  "Saber si le intereso",
  "Arreglar algo que pasó",
  "Mejorar la relación",
  "Decidir si sigo o suelto",
]

const OBJETIVOS = [
  "Mejorar la relación",
  "Arreglar un problema",
  "Entender qué le pasa",
  "Hablar de algo difícil",
  "Solo curiosidad",
]

export function preguntasDe(relacion: Relacion): Pregunta[] {
  return [
    ...POR_RELACION[relacion],
    {
      id: "objetivo",
      texto: "¿Qué quieres lograr con este chat?",
      opciones: esRomantica(relacion) ? OBJETIVOS_ROMANTICOS : OBJETIVOS,
    },
  ]
}

/** Con la familia la fecha sobra: se habla desde siempre. */
export function preguntaFecha(relacion: Relacion) {
  if (relacion === "familia") return null
  if (relacion === "pareja") return "¿Desde cuándo están juntos?"
  if (relacion === "ex") return "¿Desde cuándo se conocen?"
  return "¿Desde cuándo hablan?"
}

/** Días entre una fecha `AAAA-MM-DD` y hoy. */
export function diasDesde(iso: string) {
  const [anio, mes, dia] = iso.split("-").map(Number)
  const desde = new Date(anio, mes - 1, dia)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.round((hoy.getTime() - desde.getTime()) / 86_400_000)
}

/** 258 → "8 meses y 18 días"; lo mismo que calcula el backend. */
export function tiempoEnPalabras(dias: number) {
  const plural = (n: number, uno: string, varios: string) =>
    `${n} ${n === 1 ? uno : varios}`
  if (dias < 31) return plural(dias, "día", "días")
  const anios = Math.floor(dias / 365)
  const meses = Math.floor((dias % 365) / 30)
  const sueltos = (dias % 365) % 30
  const partes = []
  if (anios) partes.push(plural(anios, "año", "años"))
  if (meses) partes.push(plural(meses, "mes", "meses"))
  if (!anios && sueltos) partes.push(plural(sueltos, "día", "días"))
  return partes.join(" y ")
}

/** Hoy como `AAAA-MM-DD` local, para el tope del calendario. */
export function hoyISO() {
  const hoy = new Date()
  const dos = (n: number) => String(n).padStart(2, "0")
  return `${hoy.getFullYear()}-${dos(hoy.getMonth() + 1)}-${dos(hoy.getDate())}`
}
