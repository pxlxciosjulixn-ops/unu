import * as React from "react"
import { CircleAlertIcon } from "lucide-react"

import {
  eliminarMovimiento,
  formatearFechaLocal,
  type Movimiento,
} from "@/components/finanzas/finanzas"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Spinner } from "@/components/ui/spinner"
import { formatearPesos } from "@/lib/format"

/** Confirmación antes de borrar: no hay papelera ni deshacer. */
export function DialogoBorrar({
  movimiento,
  onCerrar,
  onBorrado,
}: {
  movimiento: Movimiento | null
  onCerrar: () => void
  onBorrado: () => void
}) {
  const [borrando, setBorrando] = React.useState(false)
  const [fallo, setFallo] = React.useState<string | null>(null)

  async function borrar() {
    if (!movimiento) return
    setBorrando(true)
    try {
      await eliminarMovimiento(movimiento.id)
      onBorrado()
    } catch (error) {
      setFallo(
        error instanceof Error && error.message.startsWith("Demasiados")
          ? error.message
          : "No se pudo borrar. Inténtalo de nuevo."
      )
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Dialog
      open={movimiento !== null}
      onOpenChange={(abierto: boolean) => {
        if (!abierto && !borrando) {
          // El aviso de error no sobrevive al cierre: la próxima vez que se
          // abra arranca limpio.
          setFallo(null)
          onCerrar()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Borrar este movimiento?</DialogTitle>
          <DialogDescription>
            Se quita del dashboard y de los totales. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        {movimiento ? (
          <p className="rounded-lg border p-3 text-sm">
            <span className="font-medium">{movimiento.concepto}</span> ·{" "}
            <span className="tabular-nums">
              {movimiento.tipo === "gasto" ? "−" : "+"}
              {formatearPesos(movimiento.valor)}
            </span>
            <span className="block text-muted-foreground tabular-nums">
              {formatearFechaLocal(movimiento.fecha)}
            </span>
          </p>
        ) : null}

        {fallo ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>No se borró</AlertTitle>
            <AlertDescription>{fallo}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={borrando} />}>
            Cancelar
          </DialogClose>
          <Button variant="destructive" onClick={borrar} disabled={borrando}>
            {borrando ? <Spinner data-icon="inline-start" /> : null}
            {borrando ? "Borrando…" : "Borrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
