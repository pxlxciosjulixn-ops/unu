import { Navigate, useLocation } from "react-router-dom"

import { useSesion } from "@/components/auth/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Envuelve las páginas que piden sesión.
 *
 * Mientras se comprueba el token guardado muestra un esqueleto: sin eso, al
 * recargar se vería un parpadeo al login antes de saber que sí había sesión.
 */
export function RutaProtegida({ children }: { children: React.ReactNode }) {
  const { usuario, comprobando } = useSesion()
  const ubicacion = useLocation()

  if (comprobando) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full max-w-xl" />
      </div>
    )
  }

  if (!usuario) {
    // Se recuerda a dónde iba para volver ahí después de entrar.
    return (
      <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
    )
  }

  return <>{children}</>
}
