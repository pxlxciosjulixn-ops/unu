import { esRomantica } from "@/components/chatbot/relaciones"
import type { Relacion } from "@/components/chatbot/tipos"

const GENERALES = [
  "¿Qué señales de interés ves en este chat?",
  "¿Qué le escribo ahora para seguir la conversación?",
  "¿Qué estoy haciendo bien y qué debería cambiar?",
  "Resume cómo va la relación hasta ahora",
  "¿Quién pone más de su parte en este chat?",
  "¿Por qué {n} tarda tanto en responder?",
  "¿Estoy escribiendo demasiado?",
  "¿Cómo retomo la conversación con {n} sin parecer intenso?",
  "¿De qué temas le gusta hablar a {n}?",
  "¿Qué debería evitar decirle a {n}?",
  "¿{n} está molesto o molesta conmigo?",
  "¿Cómo le pido perdón a {n}?",
  "¿Cuál fue el mejor momento de este chat?",
  "¿En qué momento se enfrió la conversación?",
]

const ROMANTICAS = [
  "¿Le gusto a {n}?",
  "¿Le intereso a {n} o estoy perdiendo el tiempo?",
  "¿Cómo invito a salir a {n}?",
  "¿Cuándo es buen momento para proponerle una cita?",
  "¿{n} está coqueteando conmigo?",
  "¿Me está dando largas?",
  "¿Cómo hago para que {n} me extrañe?",
  "¿Debería dejar de escribirle a {n}?",
  "¿Cómo le digo a {n} lo que siento?",
]

const NO_ROMANTICAS = [
  "¿Cómo mejoro mi relación con {n}?",
  "¿{n} confía en mí?",
  "¿Cómo le hablo a {n} de un tema difícil?",
  "¿Cómo hago planes con {n}?",
]

/** Sin tildes ni mayúsculas: "Qué" y "que" cuentan igual al buscar. */
function normal(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

/**
 * Preguntas que coinciden con lo que va escribiendo: cada palabra escrita
 * tiene que aparecer (o empezar una palabra) en la sugerencia.
 */
export function buscarSugerencias(
  texto: string,
  nombre: string | null,
  relacion: Relacion | ""
) {
  const escrito = normal(texto.trim())
  if (escrito.length < 2) return []
  const palabras = escrito.split(/\s+/).filter(Boolean)
  const lista = [
    ...(esRomantica(relacion) || relacion === "" ? ROMANTICAS : []),
    ...GENERALES,
    ...(esRomantica(relacion) ? [] : NO_ROMANTICAS),
  ].map((s) => s.replaceAll("{n}", nombre ?? "esa persona"))

  return lista
    .filter((s) => {
      const candidata = normal(s)
      if (candidata === escrito) return false
      return palabras.every((p) => candidata.includes(p))
    })
    .slice(0, 5)
}
