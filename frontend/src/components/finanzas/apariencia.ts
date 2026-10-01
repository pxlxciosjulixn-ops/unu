import * as React from "react"

import type { Apariencia } from "@/components/chatbot/controles-estilo"
import { ACENTOS, LETRAS } from "@/components/chatbot/personalizacion"
import { fetchJson } from "@/lib/api"

/**
 * Cómo se ven las páginas de finanzas: estilo, tema, color de acento y letra.
 *
 * Es aparte de la del chat. Se guarda en el backend, atada a la IP, para que
 * en otro equipo salga el mismo diseño; `localStorage` queda solo como copia
 * para pintar bien desde el primer cuadro, antes de que responda la API.
 */

const RUTA = "/api/finanzas/ajustes/"
const CLAVE = "unu.finanzas.apariencia"

export const APARIENCIA_POR_DEFECTO: Apariencia = {
  estilo: "y2k",
  tema: "claro",
  acento: "neutro",
  letra: "auto",
}

/** Lo que no se reconozca (un color que ya no existe) vuelve al defecto. */
function limpiar(datos: unknown): Apariencia {
  const crudo = (datos && typeof datos === "object" ? datos : {}) as Record<
    string,
    unknown
  >
  const junta = { ...APARIENCIA_POR_DEFECTO }
  if (["normal", "vintage", "y2k"].includes(crudo.estilo as string))
    junta.estilo = crudo.estilo as Apariencia["estilo"]
  if (["claro", "oscuro", "sistema"].includes(crudo.tema as string))
    junta.tema = crudo.tema as Apariencia["tema"]
  if (typeof crudo.acento === "string" && crudo.acento in ACENTOS)
    junta.acento = crudo.acento
  if (
    typeof crudo.letra === "string" &&
    (crudo.letra === "auto" || LETRAS[crudo.letra])
  )
    junta.letra = crudo.letra
  return junta
}

function leerCopia(): Apariencia {
  try {
    return limpiar(JSON.parse(localStorage.getItem(CLAVE) ?? "null"))
  } catch {
    return APARIENCIA_POR_DEFECTO
  }
}

function guardarCopia(apariencia: Apariencia) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(apariencia))
  } catch {
    // Modo privado: igual queda en el backend.
  }
}

let actual: Apariencia | null = null
const oyentes = new Set<() => void>()

function obtener() {
  actual ??= leerCopia()
  return actual
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

function poner(apariencia: Apariencia) {
  actual = apariencia
  guardarCopia(apariencia)
  oyentes.forEach((oyente) => oyente())
}

// Se pide al backend una vez por visita; al cambiar algo antes de que llegue,
// gana lo que se eligió.
let pedida = false
let tocada = false

function traerDelServidor() {
  if (pedida) return
  pedida = true
  fetchJson<unknown>(RUTA)
    .then((datos) => {
      if (tocada || !datos || Object.keys(datos).length === 0) return
      poner(limpiar(datos))
    })
    .catch(() => {
      // Sin backend se queda la copia del navegador.
    })
}

export function useApariencia() {
  React.useEffect(traerDelServidor, [])
  return React.useSyncExternalStore(
    suscribir,
    obtener,
    () => APARIENCIA_POR_DEFECTO
  )
}

// Al arrastrar entre opciones se guarda una sola vez, ya quieto.
let pendiente: ReturnType<typeof setTimeout> | undefined

export function cambiarApariencia(cambios: Partial<Apariencia>) {
  tocada = true
  poner({ ...obtener(), ...cambios })
  clearTimeout(pendiente)
  pendiente = setTimeout(() => {
    fetchJson(RUTA, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(obtener()),
    }).catch(() => {
      // Queda en este navegador; se reintenta con el próximo cambio.
    })
  }, 500)
}
