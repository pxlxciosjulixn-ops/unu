/**
 * El borrador de una sección del editor: la copia editable de lo que hay
 * guardado, más el estado de su guardado.
 */
import * as React from "react"

import { ErrorAlGuardar } from "@/lib/resume-api"

export type EstadoDeSeccion = "limpio" | "sucio" | "guardando" | "guardado"

/** Lo que una sección del editor necesita para editarse y guardarse. */
export type ControlDeSeccion<T> = {
  valor: T
  cambiar: (valor: T) => void
  estado: EstadoDeSeccion
  error: ErrorAlGuardar | null
  guardar: () => void
}

export function useBorrador<T>(
  guardado: T,
  guardarEnServidor: (valor: T) => Promise<unknown>
): ControlDeSeccion<T> {
  // Valor y estado viven en un solo `useState` para poder decidir de una vez
  // si se acepta lo que llegó del servidor.
  const [borrador, setBorrador] = React.useState({
    valor: guardado,
    estado: "limpio" as EstadoDeSeccion,
  })
  const [ultimoGuardado, setUltimoGuardado] = React.useState(guardado)
  const [error, setError] = React.useState<ErrorAlGuardar | null>(null)

  // Ajuste durante el render (no en un efecto, que provocaría un render de
  // más): cuando el servidor devuelve datos nuevos se adopta su versión, pero
  // sólo si no hay nada escrito sin guardar. Así una recarga nunca borra lo
  // que se estaba editando.
  if (guardado !== ultimoGuardado) {
    setUltimoGuardado(guardado)
    if (borrador.estado === "limpio") {
      setBorrador({ valor: guardado, estado: "limpio" })
    }
  }

  const cambiar = React.useCallback((nuevo: T) => {
    setBorrador({ valor: nuevo, estado: "sucio" })
    setError(null)
  }, [])

  const guardar = React.useCallback(() => {
    setError(null)
    setBorrador((actual) => ({ ...actual, estado: "guardando" }))
    guardarEnServidor(borrador.valor)
      .then(() => setBorrador((actual) => ({ ...actual, estado: "guardado" })))
      .catch((fallo: unknown) => {
        setBorrador((actual) => ({ ...actual, estado: "sucio" }))
        setError(
          fallo instanceof ErrorAlGuardar
            ? fallo
            : new ErrorAlGuardar("No se pudo conectar con el servidor.")
        )
      })
  }, [guardarEnServidor, borrador.valor])

  return {
    valor: borrador.valor,
    cambiar,
    estado: borrador.estado,
    error,
    guardar,
  }
}
