/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import {
  cerrarSesion,
  iniciarSesion,
  usuarioActual,
  type Usuario,
} from "@/lib/auth"

type EstadoSesion = {
  usuario: Usuario | null
  /** Mientras se comprueba el token guardado, no se sabe si hay sesión. */
  comprobando: boolean
  entrar: (usuario: string, clave: string) => Promise<void>
  salir: () => Promise<void>
}

const SesionContext = React.createContext<EstadoSesion | undefined>(undefined)

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = React.useState<Usuario | null>(null)
  const [comprobando, setComprobando] = React.useState(true)

  // Al cargar la app se revisa el token guardado contra el servidor: si ya no
  // sirve, se bota y el usuario vuelve al login.
  React.useEffect(() => {
    let vigente = true

    usuarioActual()
      .then((encontrado) => {
        if (vigente) setUsuario(encontrado)
      })
      .catch(() => {
        if (vigente) setUsuario(null)
      })
      .finally(() => {
        if (vigente) setComprobando(false)
      })

    return () => {
      vigente = false
    }
  }, [])

  const entrar = React.useCallback(async (nombre: string, clave: string) => {
    const { usuario: recien } = await iniciarSesion(nombre, clave)
    setUsuario(recien)
  }, [])

  const salir = React.useCallback(async () => {
    await cerrarSesion()
    setUsuario(null)
  }, [])

  const valor = React.useMemo(
    () => ({ usuario, comprobando, entrar, salir }),
    [usuario, comprobando, entrar, salir]
  )

  return (
    <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
  )
}

export function useSesion() {
  const contexto = React.useContext(SesionContext)

  if (contexto === undefined) {
    throw new Error("useSesion debe usarse dentro de SesionProvider")
  }

  return contexto
}
