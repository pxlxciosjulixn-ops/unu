import * as React from "react"
import { CircleAlertIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { DialogoBorrar } from "@/components/finanzas/dialogo-borrar"
import { DialogoMovimiento } from "@/components/finanzas/dialogo-movimiento"
import {
  RUTA_API,
  RUTAS_FINANZAS,
  type Movimiento,
} from "@/components/finanzas/finanzas"
import { FinanzasShell } from "@/components/finanzas/finanzas-shell"
import { PanelSugerencias } from "@/components/finanzas/panel-sugerencias"
import { TablaEdicion } from "@/components/finanzas/tabla-edicion"
import { useSugerencias } from "@/components/finanzas/use-sugerencias"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useApi } from "@/hooks/use-api"

/**
 * Página suelta: /editar/gastos/julian/palacios.
 *
 * Es el lado de escritura del dashboard: corregir o borrar lo que se anotó
 * mal, y mantener la lista de conceptos que se sugieren al escribir. Pública
 * pero sin enlazar desde el resto del sitio; solo la barra lateral de
 * finanzas apunta aquí.
 *
 * Después de cada cambio se vuelve a pedir la lista completa en vez de
 * retocarla en memoria: son pocas filas y así lo que se ve es lo que quedó
 * guardado, con el concepto ya homogenizado por el backend.
 */
export function EditarGastosPage() {
  const { data, error, cargando, recargar } = useApi<Movimiento[]>(RUTA_API)
  const {
    sugerencias,
    nombres,
    recargar: recargarSugerencias,
  } = useSugerencias()
  const [editando, setEditando] = React.useState<Movimiento | null>(null)
  const [borrando, setBorrando] = React.useState<Movimiento | null>(null)

  return (
    <FinanzasShell
      titulo="Editar"
      acciones={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={recargar}
            disabled={cargando}
            aria-label="Actualizar datos"
          >
            <RefreshCwIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link to={RUTAS_FINANZAS.formulario} />}
          >
            <PlusIcon data-icon="inline-start" />
            Registrar
          </Button>
        </>
      }
    >
      <title>Editar movimientos</title>

      <div className="flex min-w-0 flex-col gap-4 p-4 pb-10 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Editar movimientos
          </h1>
          <p className="text-sm text-muted-foreground">
            Corrige o borra lo que se anotó mal y maneja las sugerencias de
            concepto.
          </p>
        </div>

        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>No se pudieron cargar los movimientos</AlertTitle>
            <AlertDescription>
              Puede que el servidor esté despertando. Vuelve a intentarlo.
            </AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={recargar}>
                Reintentar
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        <TablaEdicion
          movimientos={data}
          cargando={cargando && data !== null}
          onEditar={setEditando}
          onBorrar={setBorrando}
        />

        <PanelSugerencias
          sugerencias={sugerencias}
          onCambio={recargarSugerencias}
        />
      </div>

      <DialogoMovimiento
        movimiento={editando}
        sugerencias={nombres}
        onCerrar={() => setEditando(null)}
        onGuardado={() => {
          setEditando(null)
          recargar()
        }}
      />

      <DialogoBorrar
        movimiento={borrando}
        onCerrar={() => setBorrando(null)}
        onBorrado={() => {
          setBorrando(null)
          recargar()
        }}
      />
    </FinanzasShell>
  )
}

export default EditarGastosPage
