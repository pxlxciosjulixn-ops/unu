import * as React from "react"
import {
  FileTextIcon,
  MessageSquareIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react"

import {
  eliminarChatContexto,
  eliminarConversacion,
  restaurarChatContexto,
  restaurarConversacion,
  traerPapelera,
} from "@/components/chatbot/api"
import { nombresDelChat } from "@/components/chatbot/relaciones"
import type { ChatContexto, Conversacion } from "@/components/chatbot/tipos"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type Papelera = {
  analyses: (ChatContexto & { deleted_at: string })[]
  conversations: (Conversacion & { deleted_at: string })[]
}

const fecha = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
})

/**
 * Lo que el visitante borró (chats de WhatsApp y conversaciones), para
 * restaurarlo o eliminarlo definitivamente. Va en la rueda de ajustes.
 * Ninguna de las dos cosas saca nada de la base: eliminar solo lo quita de la
 * interfaz.
 */
export function ListaEliminados({
  onRestaurado,
}: {
  onRestaurado: () => void
}) {
  const [datos, setDatos] = React.useState<Papelera | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [ocupado, setOcupado] = React.useState<string | null>(null)

  const cargar = React.useCallback(() => {
    setError(null)
    traerPapelera()
      .then(setDatos)
      .catch(() => setError("No se pudieron traer los eliminados."))
  }, [])

  React.useEffect(() => {
    traerPapelera()
      .then(setDatos)
      .catch(() => setError("No se pudieron traer los eliminados."))
  }, [])

  async function ejecutar(
    clave: string,
    accion: () => Promise<unknown>,
    { restaura }: { restaura: boolean }
  ) {
    setOcupado(clave)
    setError(null)
    try {
      await accion()
      if (restaura) onRestaurado()
      cargar()
    } catch {
      setError(restaura ? "No se pudo restaurar." : "No se pudo eliminar.")
    } finally {
      setOcupado(null)
    }
  }

  const vacia =
    datos !== null &&
    datos.analyses.length === 0 &&
    datos.conversations.length === 0

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {datos === null && !error ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      ) : vacia ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No hay nada eliminado.
        </p>
      ) : datos ? (
        <div className="flex flex-col gap-4">
          {datos.analyses.length > 0 ? (
            <Seccion titulo="Chats de WhatsApp">
              {datos.analyses.map((chat) => {
                const clave = `a-${chat.id}`
                return (
                  <Fila
                    key={clave}
                    icono={<FileTextIcon className="size-4" />}
                    titulo={nombresDelChat(chat.participants) || chat.name}
                    detalle={`${chat.message_count} mensajes · borrado el ${fecha.format(new Date(chat.deleted_at))}`}
                    ocupado={ocupado === clave}
                    onRestaurar={() =>
                      void ejecutar(
                        clave,
                        () => restaurarChatContexto(chat.id),
                        { restaura: true }
                      )
                    }
                    onEliminar={() =>
                      void ejecutar(
                        clave,
                        () => eliminarChatContexto(chat.id),
                        { restaura: false }
                      )
                    }
                  />
                )
              })}
            </Seccion>
          ) : null}
          {datos.conversations.length > 0 ? (
            <Seccion titulo="Conversaciones">
              {datos.conversations.map((conversacion) => {
                const clave = `c-${conversacion.id}`
                return (
                  <Fila
                    key={clave}
                    icono={<MessageSquareIcon className="size-4" />}
                    titulo={conversacion.title || "Sin título"}
                    detalle={`${conversacion.message_count} mensajes · borrada el ${fecha.format(new Date(conversacion.deleted_at))}`}
                    ocupado={ocupado === clave}
                    onRestaurar={() =>
                      void ejecutar(
                        clave,
                        () => restaurarConversacion(conversacion.id),
                        { restaura: true }
                      )
                    }
                    onEliminar={() =>
                      void ejecutar(
                        clave,
                        () => eliminarConversacion(conversacion.id),
                        { restaura: false }
                      )
                    }
                  />
                )
              })}
            </Seccion>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {titulo}
      </p>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  )
}

/**
 * Un elemento borrado. Eliminar pide confirmación en la misma fila: no hay
 * vuelta atrás desde la interfaz.
 */
function Fila({
  icono,
  titulo,
  detalle,
  ocupado,
  onRestaurar,
  onEliminar,
}: {
  icono: React.ReactNode
  titulo: string
  detalle: string
  ocupado: boolean
  onRestaurar: () => void
  onEliminar: () => void
}) {
  const [confirmando, setConfirmando] = React.useState(false)

  if (confirmando) {
    return (
      <li className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <p className="text-sm">
          ¿Eliminar definitivamente{" "}
          <span className="font-medium">{titulo}</span>? Ya no lo vas a poder
          restaurar.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={ocupado}
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={ocupado}
            onClick={onEliminar}
          >
            <Trash2Icon data-icon="inline-start" />
            Eliminar
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border p-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{titulo}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {detalle}
        </span>
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={ocupado}
        onClick={onRestaurar}
      >
        <RotateCcwIcon data-icon="inline-start" />
        Restaurar
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={ocupado}
        aria-label={`Eliminar definitivamente ${titulo}`}
        title="Eliminar definitivamente"
        onClick={() => setConfirmando(true)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2Icon />
      </Button>
    </li>
  )
}
