import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartColumnIcon,
  EyeIcon,
  FileTextIcon,
  MessageSquareTextIcon,
  ScaleIcon,
  ScrollTextIcon,
  SlidersHorizontalIcon,
  SpellCheckIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { tiempoEnPalabras } from "@/components/chatbot/cuestionario"
import { nombreRelacion, nombresDelChat } from "@/components/chatbot/relaciones"
import type { ChatContexto } from "@/components/chatbot/tipos"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Foto del consejero: la misma del círculo de la barra lateral. */
export const FOTO_CONSEJERO = "/img/chatbot-avatar.png"

export function AvatarConsejero({ className }: { className?: string }) {
  return (
    <img
      src={FOTO_CONSEJERO}
      alt=""
      className={cn(
        "size-8 shrink-0 rounded-full bg-black object-cover ring-1 ring-border",
        className
      )}
    />
  )
}

/** Saludo de la pantalla vacía, encima de la caja de texto. */
export function Saludo() {
  return (
    <div className="flex items-center justify-center gap-3">
      <AvatarConsejero className="size-12 ring-4 ring-muted" />
      <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
        hola jeje
      </h1>
    </div>
  )
}

function resumenChat(chat: ChatContexto) {
  return `${chat.message_count} mensajes · ${chat.since.split(" ")[0]} a ${chat.until.split(" ")[0]}`
}

/** Debajo de la caja, sin chat elegido: los que ya subió, para elegir uno. */
export function ChatsRecientes({
  chats,
  onElegir,
  onBorrar,
}: {
  chats: ChatContexto[]
  onElegir: (id: number) => void
  /** Solo lo oculta: se restaura desde la rueda de la cabecera. */
  onBorrar: (id: number) => void
}) {
  if (chats.length === 0) return null

  return (
    <div className="aparecer grid w-full gap-2 sm:grid-cols-2">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className="group/tarjeta relative flex items-center rounded-2xl border bg-card shadow-xs transition hover:border-foreground/30 hover:shadow-md"
        >
          <button
            type="button"
            onClick={() => onElegir(chat.id)}
            className="group flex min-w-0 flex-1 items-center gap-3 p-3 pr-1 text-left"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <FileTextIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {nombresDelChat(chat.participants) || chat.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {resumenChat(chat)}
              </span>
            </span>
            <ArrowRightIcon className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Borrar el chat con ${nombresDelChat(chat.participants) || chat.name}`}
            title="Borrar (se puede restaurar)"
            onClick={() => onBorrar(chat.id)}
            className="mr-2 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
    </div>
  )
}

const SUGERENCIAS = [
  { icono: EyeIcon, texto: "¿Qué señales de interés ves en este chat?" },
  {
    icono: MessageSquareTextIcon,
    texto: "¿Qué le escribo ahora para seguir la conversación?",
  },
  {
    icono: ScaleIcon,
    texto: "¿Qué estoy haciendo bien y qué debería cambiar?",
  },
  { icono: ScrollTextIcon, texto: "Resume cómo va la relación hasta ahora" },
]

/** Debajo de la caja, con un chat elegido: de qué chat se trata y preguntas. */
export function DetallesChat({
  chat,
  nombre,
  onPreguntar,
  onVolver,
  onBorrar,
  onRevisar,
  onEditarContexto,
}: {
  /** `undefined` si la conversación abierta usa un chat ya borrado. */
  chat: ChatContexto | undefined
  nombre: string
  onPreguntar: (texto: string) => void
  /** Vuelve a la lista de chats sin elegir ninguno. */
  onVolver: () => void
  onBorrar: (id: number) => void
  /** Activa el modo de revisar un mensaje antes de mandarlo. */
  onRevisar: () => void
  /** Abre el cuestionario (relación, fecha…) para ese chat. */
  onEditarContexto: (chat: ChatContexto) => void
}) {
  return (
    <div className="aparecer flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onVolver}
          className="text-muted-foreground"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Ver todos mis chats
        </Button>
        {chat ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            nativeButton={false}
            render={<Link to={`/chatbot/chats/${chat.id}/analisis`} />}
          >
            <ChartColumnIcon data-icon="inline-start" />
            Ver análisis previo
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-3 rounded-2xl border bg-muted/50 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-foreground shadow-xs">
          <UsersIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {chat ? nombresDelChat(chat.participants) : nombre}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {chat ? `${chat.name} · ${resumenChat(chat)}` : nombre}
          </p>
        </div>
        {chat ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 bg-background"
            onClick={() => onEditarContexto(chat)}
            title="Qué es para ti, desde cuándo hablan…"
          >
            <SlidersHorizontalIcon data-icon="inline-start" />
            {nombreRelacion(chat.relationship) ?? "Agregar contexto"}
            {chat.days_talking !== null ? (
              <span className="text-muted-foreground">
                · {tiempoEnPalabras(chat.days_talking)}
              </span>
            ) : null}
          </Button>
        ) : null}
        {chat ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Borrar este chat"
            title="Borrar (se puede restaurar)"
            onClick={() => onBorrar(chat.id)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {SUGERENCIAS.map((sugerencia) => (
          <button
            key={sugerencia.texto}
            type="button"
            onClick={() => onPreguntar(sugerencia.texto)}
            className="group flex items-center gap-3 rounded-2xl border bg-card p-3 text-left text-sm shadow-xs transition hover:border-foreground/30 hover:shadow-md"
          >
            <sugerencia.icono className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{sugerencia.texto}</span>
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </button>
        ))}
        <button
          type="button"
          onClick={onRevisar}
          className="group flex items-center gap-3 rounded-2xl border border-dashed bg-card p-3 text-left text-sm transition hover:border-foreground/30 hover:shadow-md sm:col-span-2"
        >
          <SpellCheckIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1">
            <span className="font-medium">
              Revisar un mensaje antes de mandarlo
            </span>
            <span className="block text-xs text-muted-foreground">
              Pegue lo que le piensa escribir y le digo si suena intenso, seco o
              bien.
            </span>
          </span>
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </button>
      </div>
    </div>
  )
}
