import * as React from "react"

/**
 * Animaciones sutiles del chat. Todas respetan "reducir movimiento" del
 * sistema: con eso activo, los números y las barras aparecen de una vez.
 */

const CONSULTA = "(prefers-reduced-motion: reduce)"

export function useMenosMovimiento() {
  return React.useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia(CONSULTA)
      consulta.addEventListener("change", avisar)
      return () => consulta.removeEventListener("change", avisar)
    },
    () => window.matchMedia(CONSULTA).matches,
    () => true
  )
}

/**
 * `true` desde el primer cuadro después de montar: sirve para que una barra
 * o un medidor arranquen en cero y crezcan con una transición de CSS.
 */
export function useMontado() {
  const [listo, setListo] = React.useState(false)
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setListo(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return listo
}

/** Número que cuenta desde cero hasta `objetivo`, frenando al final. */
export function useContador(objetivo: number, duracion = 900) {
  const menosMovimiento = useMenosMovimiento()
  const [valor, setValor] = React.useState(0)

  React.useEffect(() => {
    if (menosMovimiento) return
    let id = 0
    const inicio = performance.now()
    const paso = (ahora: number) => {
      const avance = Math.min(1, (ahora - inicio) / duracion)
      // Frena al final (ease-out cúbico): se siente natural.
      setValor(objetivo * (1 - (1 - avance) ** 3))
      if (avance < 1) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [objetivo, duracion, menosMovimiento])

  return menosMovimiento ? objetivo : valor
}
