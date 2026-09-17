import * as React from "react"

const MOBILE_BREAKPOINT = 768

const consulta = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function suscribir(avisar: () => void) {
  const mql = window.matchMedia(consulta)
  mql.addEventListener("change", avisar)
  return () => mql.removeEventListener("change", avisar)
}

/**
 * Versión del hook de shadcn con `useSyncExternalStore`: el valor sale correcto
 * en el primer render y no hace falta un `setState` dentro de un efecto.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    suscribir,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false
  )
}
