/* eslint-disable react-refresh/only-export-components */
/**
 * La hoja de vida, una sola vez para toda la app.
 *
 * Se pide al backend al arrancar. Mientras llega —o si el backend está
 * dormido, que en el plan gratis de Render pasa— se muestra la copia
 * empaquetada, así la página nunca aparece vacía.
 */
import * as React from "react"

import { HOJA_DE_VIDA_POR_DEFECTO } from "@/data/resume"
import {
  obtenerHojaDeVida,
  type HojaDeVida,
  type Limites,
  type OpcionDeNivel,
} from "@/lib/resume-api"

type EstadoHoja = {
  hoja: HojaDeVida
  /** Topes de caracteres del backend; `null` hasta que responda. */
  limites: Limites | null
  niveles: OpcionDeNivel[]
  cargando: boolean
  /** `true` si lo que se ve es la copia empaquetada, no la de la base. */
  deRespaldo: boolean
  /** Vuelve a pedir la hoja: lo usa el editor después de guardar. */
  recargar: () => void
}

const HojaContext = React.createContext<EstadoHoja | undefined>(undefined)

export function HojaDeVidaProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [estado, setEstado] = React.useState<{
    hoja: HojaDeVida
    limites: Limites | null
    niveles: OpcionDeNivel[]
    cargando: boolean
    deRespaldo: boolean
  }>({
    hoja: HOJA_DE_VIDA_POR_DEFECTO,
    limites: null,
    niveles: [],
    cargando: true,
    deRespaldo: true,
  })
  const [intento, setIntento] = React.useState(0)

  React.useEffect(() => {
    const controlador = new AbortController()

    obtenerHojaDeVida(controlador.signal)
      .then(({ limits, niveles_idioma, profile, ...secciones }) => {
        if (controlador.signal.aborted) return

        // Sin perfil guardado, la base está vacía: se deja el respaldo para no
        // mostrar una hoja de vida en blanco.
        setEstado({
          hoja: profile
            ? { ...HOJA_DE_VIDA_POR_DEFECTO, ...secciones, profile }
            : HOJA_DE_VIDA_POR_DEFECTO,
          limites: limits,
          niveles: niveles_idioma,
          cargando: false,
          deRespaldo: profile === null,
        })
      })
      .catch(() => {
        if (controlador.signal.aborted) return
        setEstado((anterior) => ({ ...anterior, cargando: false }))
      })

    return () => controlador.abort()
  }, [intento])

  const recargar = React.useCallback(() => setIntento((n) => n + 1), [])

  const valor = React.useMemo(
    () => ({ ...estado, recargar }),
    [estado, recargar]
  )

  return <HojaContext.Provider value={valor}>{children}</HojaContext.Provider>
}

export function useHojaDeVida(): EstadoHoja {
  const contexto = React.useContext(HojaContext)

  if (contexto === undefined) {
    throw new Error("useHojaDeVida debe usarse dentro de HojaDeVidaProvider")
  }

  return contexto
}

/** Atajo: casi todos los componentes sólo necesitan el encabezado. */
export function usePerfil() {
  return useHojaDeVida().hoja.profile
}
