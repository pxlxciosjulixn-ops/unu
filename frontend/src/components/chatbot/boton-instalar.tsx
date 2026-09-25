import * as React from "react"
import { DownloadIcon, ShareIcon, SquarePlusIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { instalar, useInstalacion } from "@/lib/instalar"

/**
 * "Instalar app" en la barra lateral. Con Chrome o Android instala de un
 * toque; en iPhone explica cómo agregarla a la pantalla de inicio. Si ya está
 * abierta como app, o el navegador no deja instalar, no aparece.
 */
export function BotonInstalar() {
  const { instalada, puede, manual } = useInstalacion()
  const [pasos, setPasos] = React.useState(false)

  if (instalada || (!puede && !manual)) return null

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Instalar app"
        onClick={() => (puede ? void instalar() : setPasos(true))}
      >
        <DownloadIcon />
        <span>Instalar app</span>
      </SidebarMenuButton>
      <Dialog open={pasos} onOpenChange={setPasos}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Instalar en el iPhone</DialogTitle>
            <DialogDescription>
              Queda en tu pantalla de inicio con el logo y se abre como una app,
              sin tienda.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <ShareIcon className="size-4" />
              </span>
              Toca Compartir, abajo en Safari.
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <SquarePlusIcon className="size-4" />
              </span>
              Elige “Agregar a inicio” y luego “Agregar”.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </SidebarMenuItem>
  )
}
