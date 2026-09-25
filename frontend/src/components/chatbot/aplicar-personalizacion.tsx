import * as React from "react"

import {
  ACENTOS,
  cargarFuentes,
  letraEfectiva,
  LETRAS,
  usePersonalizacion,
} from "@/components/chatbot/personalizacion"

function useOscuroDelSistema() {
  return React.useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia("(prefers-color-scheme: dark)")
      consulta.addEventListener("change", avisar)
      return () => consulta.removeEventListener("change", avisar)
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false
  )
}

const VARIABLES_DE_ACENTO = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--chart-1",
]

/**
 * Aplica la personalización a `<html>` (para que también la tomen los menús
 * y ventanas, que se dibujan fuera de la página) y la quita al salir del chat.
 *
 * `vintage` y `y2k` son clases aparte: cambian la paleta y la forma de las
 * cosas (ver `index.css`), y encima de ellas se pueden elegir color y letra.
 */
export function AplicarPersonalizacion() {
  const personalizacion = usePersonalizacion()
  const { tema, acento, estilo } = personalizacion
  const letra = letraEfectiva(personalizacion)
  const oscuroSistema = useOscuroDelSistema()
  const oscuro = tema === "oscuro" || (tema === "sistema" && oscuroSistema)

  React.useEffect(() => {
    const raiz = document.documentElement
    raiz.classList.toggle("dark", oscuro)
    raiz.classList.toggle("vintage", estilo === "vintage")
    raiz.classList.toggle("y2k", estilo === "y2k")

    const color = ACENTOS[acento]
    for (const variable of VARIABLES_DE_ACENTO)
      raiz.style.removeProperty(variable)
    if (color) {
      const tono = oscuro ? color.oscuro : color.claro
      raiz.style.setProperty("--primary", tono)
      raiz.style.setProperty("--primary-foreground", color.texto)
      raiz.style.setProperty("--ring", tono)
      raiz.style.setProperty("--sidebar-primary", tono)
      raiz.style.setProperty("--sidebar-primary-foreground", color.texto)
      raiz.style.setProperty("--chart-1", tono)
    }

    cargarFuentes([letra])
    const familia = LETRAS[letra]?.familia
    if (familia) raiz.style.fontFamily = familia
    else raiz.style.removeProperty("font-family")

    return () => {
      raiz.classList.remove("dark", "vintage", "y2k")
      for (const variable of VARIABLES_DE_ACENTO)
        raiz.style.removeProperty(variable)
      raiz.style.removeProperty("font-family")
    }
  }, [oscuro, acento, letra, estilo])

  return null
}
