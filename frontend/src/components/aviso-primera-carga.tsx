import * as React from "react"
import { useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const CLAVE = "unu.aviso-primera-carga"

// Páginas que no le piden nada al servidor: ahí el aviso sobra.
const SIN_AVISO = ["/min-2026/angel"]

/** Cualquier acceso al almacenamiento falla en modo privado o con cookies bloqueadas. */
function yaLoVio(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === "1"
  } catch {
    return false
  }
}

function recordar() {
  try {
    sessionStorage.setItem(CLAVE, "1")
  } catch {
    // Sin almacenamiento el aviso se vuelve a mostrar; es lo de menos.
  }
}

/**
 * Aviso de que la primera carga se demora.
 *
 * El backend está en el plan gratuito de Render: se apaga cuando nadie lo usa
 * y la primera petición tiene que despertarlo. Sin este aviso, quien abre la
 * página cree que está rota.
 *
 * Se guarda en `sessionStorage`, no en `localStorage`, a propósito: el aviso
 * vale una vez por visita. Quien vuelva mañana se encuentra el servidor
 * dormido otra vez y la espera de nuevo.
 */
export function AvisoPrimeraCarga() {
  // El almacenamiento se lee una sola vez, al montar: después manda el estado.
  const [abierto, setAbierto] = React.useState(() => !yaLoVio())
  const { pathname } = useLocation()

  function cerrar(sigueAbierto: boolean) {
    setAbierto(sigueAbierto)
    if (!sigueAbierto) recordar()
  }

  if (SIN_AVISO.includes(pathname.replace(/\/+$/, ""))) return null

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      {/* Sin la X de la esquina: el aviso se cierra con Aceptar. */}
      <DialogContent showCloseButton={false} className="print:hidden">
        <DialogHeader>
          <DialogTitle>La primera carga puede tardar</DialogTitle>
          <DialogDescription>
            El servidor está en un plan gratuito: se apaga cuando nadie lo usa y
            la primera visita tiene que despertarlo. Por eso la información
            puede demorarse entre 20 y 30 segundos en aparecer. A partir de ahí,
            todo responde de inmediato.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button autoFocus />}>Aceptar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
