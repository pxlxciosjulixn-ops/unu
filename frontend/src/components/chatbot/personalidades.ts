import {
  CoffeeIcon,
  CompassIcon,
  HandshakeIcon,
  MessageCircleMoreIcon,
  SofaIcon,
  TargetIcon,
  type LucideIcon,
} from "lucide-react"

import type { Personalidad } from "@/components/chatbot/tipos"

/**
 * Quién da los consejos. Cambia el tono, no las groserías ni el trato (eso lo
 * pone el nivel de groserías). El texto de cada una lo arma el backend.
 */
export const PERSONALIDADES: {
  valor: Personalidad
  nombre: string
  /** Icono de línea: toma el color del estilo elegido. */
  icono: LucideIcon
  detalle: string
  ejemplo: string
}[] = [
  {
    valor: "consejero",
    nombre: "Consejero",
    icono: CompassIcon,
    detalle: "Directo, analiza y va al grano.",
    ejemplo: "“Responde rápido, pero no propone planes.”",
  },
  {
    valor: "amigo",
    nombre: "Amigo sincero",
    icono: HandshakeIcon,
    detalle: "Te dice la verdad con confianza.",
    ejemplo: "“Mire, se lo digo porque lo quiero…”",
  },
  {
    valor: "psicologo",
    nombre: "Psicólogo",
    icono: SofaIcon,
    detalle: "Emociones y patrones, sin juzgar.",
    ejemplo: "“¿Qué siente cuando no le responde?”",
  },
  {
    valor: "abuela",
    nombre: "Tu abuela",
    icono: CoffeeIcon,
    detalle: "Dichos, refranes y “en mis tiempos”.",
    ejemplo: "“Mijo, el que mucho se despide…”",
  },
  {
    valor: "coach",
    nombre: "Coach de conquista",
    icono: TargetIcon,
    detalle: "Pasos concretos y mucha energía.",
    ejemplo: "“Paso 1: hoy le escribe esto…”",
  },
  {
    valor: "chismosa",
    nombre: "Amiga chismosa",
    icono: MessageCircleMoreIcon,
    detalle: "Drama, emoción y opinión sin filtro.",
    ejemplo: "“¡NO LO PUEDO CREER! Espera, espera…”",
  },
]

export function personalidadDe(valor: Personalidad | undefined) {
  return PERSONALIDADES.find((p) => p.valor === valor) ?? PERSONALIDADES[0]
}
