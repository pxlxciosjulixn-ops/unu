import * as React from "react"

import {
  CONCEPTOS_POR_DEFECTO,
  RUTA_API_SUGERENCIAS,
  type Sugerencia,
} from "@/components/finanzas/finanzas"
import { useApi } from "@/hooks/use-api"

/**
 * Los conceptos que se sugieren al escribir, tal como están guardados en el
 * backend.
 *
 * Mientras la petición va en camino —o si falló— `nombres` trae la lista por
 * defecto: es preferible sugerir lo de siempre a dejar el campo sin ayuda.
 */
export function useSugerencias() {
  const { data, error, cargando, recargar } = useApi<Sugerencia[]>(
    RUTA_API_SUGERENCIAS
  )

  // Con la lista vacía a propósito no se sugiere nada: el respaldo es solo
  // para cuando todavía no hay respuesta.
  const nombres = React.useMemo(
    () => data?.map((s) => s.nombre) ?? CONCEPTOS_POR_DEFECTO,
    [data]
  )

  return { sugerencias: data, nombres, error, cargando, recargar }
}
