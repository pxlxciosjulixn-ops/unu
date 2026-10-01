import * as React from "react"
import { CircleAlertIcon, DownloadIcon } from "lucide-react"

import { hoyISO } from "@/components/finanzas/finanzas"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { API_BASE } from "@/lib/api"

const RUTA_EXPORTAR = "/api/finanzas/exportar/"

/** AAAAMMDD-HHMMSS en hora local, como los archivos del script de backup. */
function marcaDeTiempo() {
  const ahora = new Date()
  const dos = (n: number) => String(n).padStart(2, "0")
  return (
    hoyISO().replace(/-/g, "") +
    `-${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`
  )
}

/**
 * Baja todo lo de finanzas (movimientos, créditos, sugerencias y avisos) en
 * un JSON. Es el mismo archivo que hace `backup/json/backup_movimientos.py`
 * y se restaura con `manage.py loaddata`.
 */
export function BotonExportar() {
  const [estado, setEstado] = React.useState<"listo" | "bajando" | "fallo">(
    "listo"
  )

  async function exportar() {
    setEstado("bajando")
    try {
      const respuesta = await fetch(`${API_BASE}${RUTA_EXPORTAR}`)
      if (!respuesta.ok) throw new Error(String(respuesta.status))
      const enlace = document.createElement("a")
      enlace.href = URL.createObjectURL(await respuesta.blob())
      // El nombre se arma aquí y no se lee del servidor: entre dominios
      // distintos el navegador esconde el encabezado que lo trae.
      enlace.download = `finanzas-${marcaDeTiempo()}.json`
      enlace.click()
      URL.revokeObjectURL(enlace.href)
      setEstado("listo")
    } catch {
      setEstado("fallo")
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportar}
      disabled={estado === "bajando"}
      title={
        estado === "fallo"
          ? "No se pudo exportar. Vuelve a intentarlo."
          : "Movimientos, créditos y sugerencias en un archivo JSON"
      }
      aria-label="Exportar datos en JSON"
    >
      {estado === "bajando" ? (
        <Spinner data-icon="inline-start" />
      ) : estado === "fallo" ? (
        <CircleAlertIcon data-icon="inline-start" />
      ) : (
        <DownloadIcon data-icon="inline-start" />
      )}
      <span className="hidden sm:inline">
        {estado === "fallo" ? "Reintentar" : "Exportar JSON"}
      </span>
    </Button>
  )
}
