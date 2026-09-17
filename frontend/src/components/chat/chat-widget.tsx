import * as React from "react"
import { ArrowRightIcon, ArrowUpIcon, BotIcon, XIcon } from "lucide-react"

import { useChat } from "@/components/chat/chat-context"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Marker, MarkerContent } from "@/components/ui/marker"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { profile } from "@/data/resume"
import { cn } from "@/lib/utils"

type Rol = "user" | "assistant"

type Mensaje = {
  id: string
  rol: Rol
  texto: string
}

const BIENVENIDA: Mensaje = {
  id: "bienvenida",
  rol: "assistant",
  texto: `Hola. Soy el asistente de ${profile.firstName}. Pregúntame sobre su experiencia, sus herramientas o los proyectos en los que ha trabajado.`,
}

/** Atajos para que la caja no arranque vacía. */
const SUGERENCIAS = [
  "¿Qué experiencia tiene en ETL?",
  "¿Con qué herramientas de BI trabaja?",
  "¿Dónde trabaja actualmente?",
]

/** Aviso flotante sobre el botón para que el chat no pase desapercibido. */
function ChatAnuncio() {
  const { anuncioVisible, abrir, descartarAnuncio } = useChat()

  if (!anuncioVisible) return null

  return (
    <div
      className={cn(
        "fixed right-4 bottom-20 z-50 w-[calc(100vw-2rem)] max-w-xs sm:right-6 sm:bottom-22",
        "animate-in duration-500 fill-mode-both delay-700 fade-in slide-in-from-bottom-4",
        "motion-reduce:animate-none print:hidden"
      )}
    >
      <Alert
        role="status"
        className="py-3 pr-10 shadow-lg has-data-[slot=alert-action]:pr-10"
      >
        <BotIcon />
        <AlertTitle>
          Habla con la IA sobre {profile.firstName.split(" ")[0]}
        </AlertTitle>
        <AlertDescription>
          Pregúntale por su experiencia, sus herramientas o sus proyectos.
        </AlertDescription>
        <Button size="sm" onClick={abrir} className="col-start-2 mt-2 w-fit">
          Empezar a chatear
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <AlertAction>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Cerrar anuncio"
            onClick={descartarAnuncio}
          >
            <XIcon />
          </Button>
        </AlertAction>
      </Alert>
    </div>
  )
}

export function ChatWidget() {
  const { abierto, abrir, cerrar, anuncioVisible } = useChat()
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([BIENVENIDA])
  const [borrador, setBorrador] = React.useState("")

  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const botonRef = React.useRef<HTMLButtonElement>(null)

  // Cerrar con Escape y devolver el foco al botón que lo abrió.
  React.useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cerrar()
        botonRef.current?.focus()
      }
    }
    window.addEventListener("keydown", alPulsar)
    return () => window.removeEventListener("keydown", alPulsar)
  }, [abierto, cerrar])

  React.useEffect(() => {
    if (abierto) inputRef.current?.focus()
  }, [abierto])

  function enviar(texto: string) {
    const limpio = texto.trim()
    if (!limpio) return

    setMensajes((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, rol: "user", texto: limpio },
    ])
    setBorrador("")

    // TODO: aquí va la llamada al backend. Por ahora solo se acusa recibo.
    setMensajes((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        rol: "assistant",
        texto:
          "Todavía no estoy conectado a un modelo. La interfaz ya está lista: falta enchufar la lógica de respuesta.",
      },
    ])
  }

  return (
    <>
      <ChatAnuncio />

      {/* Botón flotante. Se oculta al imprimir la hoja de vida. */}
      <Button
        ref={botonRef}
        size="lg"
        aria-expanded={abierto}
        aria-haspopup="dialog"
        onClick={abrir}
        className={cn(
          "fixed right-4 bottom-4 z-50 h-12 gap-2 rounded-full px-5 shadow-lg transition-transform sm:right-6 sm:bottom-6",
          "hover:scale-105 print:hidden",
          abierto && "pointer-events-none scale-0 opacity-0"
        )}
      >
        <BotIcon data-icon="inline-start" />
        Pregúntale a la IA
        {anuncioVisible ? (
          <span aria-hidden className="absolute -top-0.5 -right-0.5 flex size-3">
            <span className="absolute inline-flex size-full rounded-full bg-primary opacity-40 motion-safe:animate-ping" />
            <span className="relative inline-flex size-3 rounded-full bg-primary ring-2 ring-background" />
          </span>
        ) : null}
      </Button>

      {/* Panel. Se mantiene montado para no perder la conversación al cerrar. */}
      <div
        role="dialog"
        aria-label="Chat"
        aria-modal="false"
        hidden={!abierto}
        className={cn(
          "fixed right-4 bottom-4 z-50 flex w-[calc(100vw-2rem)] max-w-[24rem] flex-col",
          "h-[min(32rem,calc(100vh-6rem))] overflow-hidden rounded-xl border border-border",
          "bg-card shadow-2xl sm:right-6 sm:bottom-6 print:hidden"
        )}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <BotIcon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">Asistente IA</span>
            <span className="text-xs text-muted-foreground">
              Sobre el perfil de {profile.firstName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cerrar chat"
            onClick={() => {
              cerrar()
              botonRef.current?.focus()
            }}
            className="ml-auto"
          >
            <XIcon />
          </Button>
        </header>

        <MessageScrollerProvider autoScroll>
          <MessageScroller className="min-h-0 flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent className="flex flex-col gap-3 p-4">
                <MessageScrollerItem scrollAnchor={false}>
                  <Marker variant="separator" role="status">
                    <MarkerContent>Aún sin conectar a un modelo</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
                {mensajes.map((m) => (
                  <MessageScrollerItem
                    key={m.id}
                    messageId={m.id}
                    scrollAnchor={m.rol === "user"}
                  >
                    <Message align={m.rol === "user" ? "end" : "start"}>
                      <MessageContent>
                        <Bubble
                          variant={m.rol === "user" ? "default" : "muted"}
                          align={m.rol === "user" ? "end" : "start"}
                        >
                          <BubbleContent className="whitespace-pre-wrap">
                            {m.texto}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}

                {mensajes.length === 1 ? (
                  <MessageScrollerItem scrollAnchor={false}>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {SUGERENCIAS.map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="xs"
                          onClick={() => enviar(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </MessageScrollerItem>
                ) : null}

              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>

        <div className="shrink-0 border-t border-border p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              enviar(borrador)
            }}
          >
            <InputGroup>
              <InputGroupTextarea
                ref={inputRef}
                value={borrador}
                onChange={(e) => setBorrador(e.target.value)}
                onKeyDown={(e) => {
                  // Enter envía; Shift+Enter hace salto de línea.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    enviar(borrador)
                  }
                }}
                placeholder="Escribe tu pregunta…"
                rows={1}
                aria-label="Mensaje"
                className="max-h-32 min-h-10"
              />
              <InputGroupAddon align="block-end">
                <InputGroupButton
                  type="submit"
                  size="icon-xs"
                  disabled={!borrador.trim()}
                  aria-label="Enviar mensaje"
                  className="ml-auto rounded-full"
                >
                  <ArrowUpIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>
      </div>
    </>
  )
}
