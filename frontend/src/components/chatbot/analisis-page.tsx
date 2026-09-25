import * as React from "react"
import { ArrowLeftIcon, UsersIcon } from "lucide-react"
import { Link, useParams } from "react-router-dom"

import { AppShell } from "@/components/app-shell"
import { AnalisisChat } from "@/components/chatbot/analisis-chat"
import { nombresDelChat } from "@/components/chatbot/relaciones"
import { listarChatsContexto } from "@/components/chatbot/api"
import { AplicarPersonalizacion } from "@/components/chatbot/aplicar-personalizacion"
import { SidebarConsejero } from "@/components/chatbot/sidebar-consejero"
import type { ChatContexto } from "@/components/chatbot/tipos"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Análisis de un chat de WhatsApp en su propia página. "Volver" regresa al
 * consejero con ese mismo chat elegido (`/chatbot?chat=<id>`).
 */
export function AnalisisPage() {
  const { id } = useParams()
  const chatId = Number(id)
  const [chat, setChat] = React.useState<ChatContexto | null | undefined>(
    undefined
  )

  React.useEffect(() => {
    const controlador = new AbortController()
    listarChatsContexto(controlador.signal)
      .then(({ results }) =>
        setChat(results.find((c) => c.id === chatId) ?? null)
      )
      .catch(() => {
        if (!controlador.signal.aborted) setChat(null)
      })
    return () => controlador.abort()
  }, [chatId])

  const volver = chat ? `/chatbot?chat=${chat.id}` : "/chatbot"
  const nombre = chat ? nombresDelChat(chat.participants) || chat.name : ""

  return (
    <>
      <AplicarPersonalizacion />
      <AppShell
        titulo="Análisis"
        raiz={{ etiqueta: "Chat", to: volver }}
        sidebar={<SidebarConsejero />}
      >
        <div className="flex w-full flex-col gap-8 px-4 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground"
              nativeButton={false}
              render={<Link to={volver} />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Volver al chat
            </Button>

            {chat === undefined ? (
              <Skeleton className="h-16 w-72 rounded-xl" />
            ) : chat === null ? (
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Ese chat no está disponible
                </h1>
                <p className="text-sm text-muted-foreground">
                  Puede que lo hayas borrado o que lo subieras desde otra
                  conexión.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-muted/50">
                  <UsersIcon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                    {nombre}
                  </h1>
                  <p className="truncate text-sm text-muted-foreground">
                    {chat.name} · {chat.message_count} mensajes ·{" "}
                    {chat.since.split(" ")[0]} a {chat.until.split(" ")[0]}
                  </p>
                </div>
              </div>
            )}
          </div>

          {chat ? <AnalisisChat key={chat.id} chatId={chat.id} /> : null}
        </div>
      </AppShell>
    </>
  )
}
