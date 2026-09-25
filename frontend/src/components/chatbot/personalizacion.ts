import * as React from "react"

/**
 * Personalización del chat: estilo, tema, color de acento y letra.
 *
 * Es una comodidad de cada navegador, así que vive en `localStorage` y no en
 * la base. Solo aplica mientras se está en las páginas del chat: la hoja de
 * vida y el resto del sitio se quedan siempre claros.
 */

export type Estilo = "normal" | "vintage" | "y2k"
export type Tema = "claro" | "oscuro" | "sistema"

export type Personalizacion = {
  estilo: Estilo
  tema: Tema
  acento: string
  letra: string
  /** Voz para leer las respuestas: `voiceURI` del navegador o "auto". */
  voz: string
  velocidad: number
}

const CLAVE = "unu.chat.personalizacion"
const POR_DEFECTO: Personalizacion = {
  estilo: "normal",
  tema: "claro",
  acento: "neutro",
  letra: "auto",
  voz: "auto",
  velocidad: 1,
}

type Color = {
  nombre: string
  claro: string
  oscuro: string
  /** El texto que va encima del color (botones, burbujas). */
  texto: string
}

const BLANCO = "oklch(0.985 0 0)"
const TINTA = "oklch(0.22 0.01 60)"

/**
 * Colores de acento. `neutro` deja los del estilo (gris en normal, sepia en
 * vintage). Los claritos llevan texto oscuro encima para que se lea.
 */
export const ACENTOS: Record<string, Color | null> = {
  neutro: null,
  azul: {
    nombre: "Azul",
    claro: "oklch(0.546 0.245 262.881)",
    oscuro: "oklch(0.623 0.214 259.815)",
    texto: BLANCO,
  },
  verde: {
    nombre: "Verde",
    claro: "oklch(0.527 0.154 150.069)",
    oscuro: "oklch(0.696 0.17 162.48)",
    texto: BLANCO,
  },
  violeta: {
    nombre: "Violeta",
    claro: "oklch(0.541 0.281 293.009)",
    oscuro: "oklch(0.702 0.183 293.541)",
    texto: BLANCO,
  },
  rosa: {
    nombre: "Rosa",
    claro: "oklch(0.592 0.249 0.584)",
    oscuro: "oklch(0.718 0.202 349.761)",
    texto: BLANCO,
  },
  ambar: {
    nombre: "Ámbar",
    claro: "oklch(0.666 0.179 58.318)",
    oscuro: "oklch(0.769 0.188 70.08)",
    texto: TINTA,
  },
  gris: {
    nombre: "Gris",
    claro: "oklch(0.55 0.01 260)",
    oscuro: "oklch(0.72 0.01 260)",
    texto: BLANCO,
  },
  rosa_claro: {
    nombre: "Rosa claro",
    claro: "oklch(0.86 0.07 350)",
    oscuro: "oklch(0.84 0.08 350)",
    texto: TINTA,
  },
  durazno: {
    nombre: "Durazno",
    claro: "oklch(0.86 0.08 55)",
    oscuro: "oklch(0.84 0.09 55)",
    texto: TINTA,
  },
  crema: {
    nombre: "Crema",
    claro: "oklch(0.92 0.06 90)",
    oscuro: "oklch(0.9 0.07 90)",
    texto: TINTA,
  },
  menta: {
    nombre: "Menta",
    claro: "oklch(0.87 0.08 165)",
    oscuro: "oklch(0.85 0.09 165)",
    texto: TINTA,
  },
  celeste: {
    nombre: "Celeste",
    claro: "oklch(0.84 0.08 230)",
    oscuro: "oklch(0.82 0.09 230)",
    texto: TINTA,
  },
  lavanda: {
    nombre: "Lavanda",
    claro: "oklch(0.83 0.08 300)",
    oscuro: "oklch(0.81 0.09 300)",
    texto: TINTA,
  },
  gris_claro: {
    nombre: "Gris claro",
    claro: "oklch(0.86 0.005 260)",
    oscuro: "oklch(0.8 0.005 260)",
    texto: TINTA,
  },
}

export const ACENTOS_INTENSOS = [
  "neutro",
  "azul",
  "verde",
  "violeta",
  "rosa",
  "ambar",
  "gris",
]
export const ACENTOS_CLAROS = [
  "rosa_claro",
  "durazno",
  "crema",
  "menta",
  "celeste",
  "lavanda",
  "gris_claro",
]

type Letra = {
  nombre: string
  grupo: "Sin serifa" | "Con serifa" | "Mono y máquina" | "A mano" | "Retro"
  /** Familia CSS; `null` es la de la app (Geist). */
  familia: string | null
  /** Parámetro de Google Fonts; sin él, la letra ya está en el equipo. */
  google?: string
}

/**
 * Letras disponibles. Las de Google Fonts se cargan solo cuando hacen falta
 * (la elegida, o todas al abrir la lista para mostrarlas).
 */
export const LETRAS: Record<string, Letra> = {
  geist: { nombre: "Geist", grupo: "Sin serifa", familia: null },
  sistema: {
    nombre: "Sistema",
    grupo: "Sin serifa",
    familia: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  inter: {
    nombre: "Inter",
    grupo: "Sin serifa",
    familia: "'Inter', sans-serif",
    google: "Inter:wght@400;500;600;700",
  },
  poppins: {
    nombre: "Poppins",
    grupo: "Sin serifa",
    familia: "'Poppins', sans-serif",
    google: "Poppins:wght@400;500;600;700",
  },
  dm_sans: {
    nombre: "DM Sans",
    grupo: "Sin serifa",
    familia: "'DM Sans', sans-serif",
    google: "DM+Sans:wght@400;500;600;700",
  },
  outfit: {
    nombre: "Outfit",
    grupo: "Sin serifa",
    familia: "'Outfit', sans-serif",
    google: "Outfit:wght@400;500;600;700",
  },
  nunito: {
    nombre: "Nunito",
    grupo: "Sin serifa",
    familia: "'Nunito', sans-serif",
    google: "Nunito:wght@400;500;600;700",
  },
  quicksand: {
    nombre: "Quicksand",
    grupo: "Sin serifa",
    familia: "'Quicksand', sans-serif",
    google: "Quicksand:wght@400;500;600;700",
  },
  space_grotesk: {
    nombre: "Space Grotesk",
    grupo: "Sin serifa",
    familia: "'Space Grotesk', sans-serif",
    google: "Space+Grotesk:wght@400;500;600;700",
  },
  lora: {
    nombre: "Lora",
    grupo: "Con serifa",
    familia: "'Lora', serif",
    google: "Lora:wght@400;500;600;700",
  },
  playfair: {
    nombre: "Playfair Display",
    grupo: "Con serifa",
    familia: "'Playfair Display', serif",
    google: "Playfair+Display:wght@400;500;600;700",
  },
  merriweather: {
    nombre: "Merriweather",
    grupo: "Con serifa",
    familia: "'Merriweather', serif",
    google: "Merriweather:wght@400;700",
  },
  garamond: {
    nombre: "EB Garamond",
    grupo: "Con serifa",
    familia: "'EB Garamond', serif",
    google: "EB+Garamond:wght@400;500;600;700",
  },
  jetbrains: {
    nombre: "JetBrains Mono",
    grupo: "Mono y máquina",
    familia: "'JetBrains Mono', monospace",
    google: "JetBrains+Mono:wght@400;500;600;700",
  },
  courier_prime: {
    nombre: "Courier Prime",
    grupo: "Mono y máquina",
    familia: "'Courier Prime', monospace",
    google: "Courier+Prime:wght@400;700",
  },
  special_elite: {
    nombre: "Special Elite",
    grupo: "Mono y máquina",
    familia: "'Special Elite', monospace",
    google: "Special+Elite",
  },
  caveat: {
    nombre: "Caveat",
    grupo: "A mano",
    familia: "'Caveat', cursive",
    google: "Caveat:wght@400;500;600;700",
  },
  tahoma: {
    nombre: "Tahoma (Windows 98)",
    grupo: "Retro",
    familia: "Tahoma, Verdana, 'MS Sans Serif', sans-serif",
  },
  pixelify: {
    nombre: "Pixelify Sans",
    grupo: "Retro",
    familia: "'Pixelify Sans', sans-serif",
    google: "Pixelify+Sans:wght@400;500;600;700",
  },
  vt323: {
    nombre: "VT323 (terminal)",
    grupo: "Retro",
    familia: "'VT323', monospace",
    google: "VT323",
  },
  comic: {
    nombre: "Comic Neue",
    grupo: "Retro",
    familia: "'Comic Neue', 'Comic Sans MS', cursive",
    google: "Comic+Neue:wght@400;700",
  },
}

/** La letra de cada estilo cuando se deja en "Automática". */
export const LETRA_DEL_ESTILO: Record<Estilo, string> = {
  normal: "geist",
  vintage: "courier_prime",
  y2k: "tahoma",
}

/** La letra que de verdad se usa: "auto" depende del estilo. */
export function letraEfectiva({ letra, estilo }: Personalizacion) {
  return letra === "auto" || !LETRAS[letra] ? LETRA_DEL_ESTILO[estilo] : letra
}

/**
 * Pide a Google Fonts las letras que falten, cada una una sola vez. El CSS
 * pesa poco; el archivo de la letra solo se baja cuando algo la usa.
 */
export function cargarFuentes(claves: string[]) {
  for (const clave of claves) {
    const google = LETRAS[clave]?.google
    if (!google || document.getElementById(`fuente-${clave}`)) continue
    const enlace = document.createElement("link")
    enlace.id = `fuente-${clave}`
    enlace.rel = "stylesheet"
    enlace.href = `https://fonts.googleapis.com/css2?family=${google}&display=swap`
    document.head.appendChild(enlace)
  }
}

function leer(): Personalizacion {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE) ?? "null") ?? {}
    const junta = { ...POR_DEFECTO, ...guardada }
    // Valores de versiones anteriores que ya no existen vuelven al defecto.
    if (!(junta.acento in ACENTOS)) junta.acento = POR_DEFECTO.acento
    if (junta.letra !== "auto" && !LETRAS[junta.letra]) junta.letra = "auto"
    if (!["normal", "vintage", "y2k"].includes(junta.estilo))
      junta.estilo = "normal"
    if (typeof junta.velocidad !== "number") junta.velocidad = 1
    return junta
  } catch {
    // Modo privado o almacenamiento bloqueado: se usa la de siempre.
    return POR_DEFECTO
  }
}

let actual: Personalizacion | null = null
const oyentes = new Set<() => void>()

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

function obtener() {
  actual ??= leer()
  return actual
}

export function usePersonalizacion() {
  return React.useSyncExternalStore(suscribir, obtener, () => POR_DEFECTO)
}

export function cambiarPersonalizacion(cambios: Partial<Personalizacion>) {
  actual = { ...obtener(), ...cambios }
  try {
    localStorage.setItem(CLAVE, JSON.stringify(actual))
  } catch {
    // Si no se puede guardar, igual aplica mientras dure la visita.
  }
  oyentes.forEach((oyente) => oyente())
}
