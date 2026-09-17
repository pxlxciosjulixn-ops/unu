import * as React from "react"

import { fetchJson } from "@/lib/api"

type Cargado<T> = {
  /** Ruta + intento que produjo estos datos. */
  clave: string
  data: T | null
  error: string | null
}

/**
 * GET a la API con cancelación al desmontar o al cambiar la ruta.
 *
 * `cargando` se deduce comparando la petición en curso con la última que
 * respondió, así no hace falta un `setState` dentro del efecto. Mientras llega
 * la nueva respuesta se conservan los datos anteriores, que es lo que hace
 * falta al pasar de página en una tabla.
 */
export function useApi<T>(path: string) {
  const [intento, setIntento] = React.useState(0)
  const [cargado, setCargado] = React.useState<Cargado<T>>({
    clave: "",
    data: null,
    error: null,
  })

  const clave = `${path}#${intento}`

  React.useEffect(() => {
    const controlador = new AbortController()

    fetchJson<T>(path, { signal: controlador.signal })
      .then((data) => {
        if (!controlador.signal.aborted) {
          setCargado({ clave, data, error: null })
        }
      })
      .catch((error: unknown) => {
        if (controlador.signal.aborted) return
        setCargado({
          clave,
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo consultar la API",
        })
      })

    return () => controlador.abort()
  }, [clave, path])

  const recargar = React.useCallback(() => setIntento((n) => n + 1), [])

  return {
    data: cargado.data,
    error: cargado.clave === clave ? cargado.error : null,
    cargando: cargado.clave !== clave,
    recargar,
  }
}
