import * as React from "react"

/**
 * Leer las respuestas en voz alta con la voz del navegador (Web Speech API):
 * no pasa por ningún servidor ni cuesta nada. Cada navegador trae sus voces;
 * se prefieren las de español latino.
 */

export const HAY_VOZ =
  typeof window !== "undefined" && "speechSynthesis" in window

/** Orden de preferencia de los acentos, del más cercano al más lejano. */
const ACENTOS = ["es-CO", "es-MX", "es-US", "es-419", "es-AR", "es-ES"]

function puntaje(voz: SpeechSynthesisVoice) {
  const acento = ACENTOS.indexOf(voz.lang)
  // Las "Natural", "Online" y de Google suenan bastante mejor.
  const calidad = /natural|online|google/i.test(voz.name) ? 0 : 10
  return (acento === -1 ? ACENTOS.length : acento) + calidad
}

function leerVoces(): SpeechSynthesisVoice[] {
  if (!HAY_VOZ) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith("es"))
    .sort((a, b) => puntaje(a) - puntaje(b))
}

let voces: SpeechSynthesisVoice[] = leerVoces()

function suscribirVoces(avisar: () => void) {
  if (!HAY_VOZ) return () => undefined
  // Chrome las carga tarde: llegan con este evento.
  const alCambiar = () => {
    voces = leerVoces()
    avisar()
  }
  window.speechSynthesis.addEventListener("voiceschanged", alCambiar)
  return () =>
    window.speechSynthesis.removeEventListener("voiceschanged", alCambiar)
}

/** Voces en español del navegador, la mejor primero. */
export function useVoces() {
  return React.useSyncExternalStore(
    suscribirVoces,
    () => voces,
    () => voces
  )
}

/** El Markdown de la respuesta, sin asteriscos ni numerales que se lean. */
export function textoParaVoz(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>~|]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Cuál respuesta está sonando, para que su botón cambie a "detener".
let sonando: string | null = null
const oyentes = new Set<() => void>()

function avisarSonando(id: string | null) {
  sonando = id
  oyentes.forEach((oyente) => oyente())
}

export function useSonando() {
  return React.useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    () => sonando,
    () => null
  )
}

export function detener() {
  if (!HAY_VOZ) return
  window.speechSynthesis.cancel()
  avisarSonando(null)
}

/**
 * Lee `texto` con la voz elegida (`"auto"` es la mejor en español) a la
 * velocidad dada. Si ya estaba sonando otra respuesta, la corta.
 */
export function hablar(
  id: string,
  texto: string,
  { voz, velocidad }: { voz: string; velocidad: number }
) {
  if (!HAY_VOZ) return
  window.speechSynthesis.cancel()
  const frase = new SpeechSynthesisUtterance(textoParaVoz(texto))
  // Si la voz guardada ya no existe (otro navegador), va la mejor que haya.
  const elegida = voces.find((v) => v.voiceURI === voz) ?? voces[0]
  if (elegida) {
    frase.voice = elegida
    frase.lang = elegida.lang
  } else {
    frase.lang = "es-CO"
  }
  frase.rate = velocidad
  frase.onend = () => {
    if (sonando === id) avisarSonando(null)
  }
  frase.onerror = frase.onend
  avisarSonando(id)
  window.speechSynthesis.speak(frase)
}
