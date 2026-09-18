import * as React from "react"
import {
  ArrowRightIcon,
  ArrowUpIcon,
  BotIcon,
  SquareIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"

import { useChat } from "@/components/chat/chat-context"
import { enviarMensaje } from "@/components/chatbot/api"
import type { Mensaje } from "@/components/chatbot/tipos"
import { usePerfil } from "@/components/resume/resume-context"
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
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

// El renderizador de Markdown arrastra react-markdown, que pesa más que todo
// este widget. Se carga cuando llega la primera respuesta, no al abrir la
// hoja de vida; el trozo es el mismo que ya usa la página /chatbot.
const MensajeMarkdown = React.lazy(() =>
  import("@/components/chatbot/mensaje-markdown").then((m) => ({
    default: m.MensajeMarkdown,
  }))
)

/** El nombre sale de la hoja de vida, que se edita desde el sitio. */
function bienvenida(nombre: string): Mensaje {
  return {
    id: "bienvenida",
    rol: "assistant",
    texto: `Hola. Soy el asistente de ${nombre}. Pregúntame sobre su experiencia, sus herramientas o los proyectos en los que ha trabajado.`,
  }
}

// Identificadores de los mensajes en pantalla; un contador basta y no depende
// del reloj, que en un render repetido daría el mismo número.
let contadorIds = 0
const nuevoId = (prefijo: string) => `${prefijo}-${(contadorIds += 1)}`

/** Atajos para que la caja no arranque vacía. */
const SUGERENCIAS = [
  "¿Qué experiencia tiene en ETL?",
  "¿Con qué herramientas de BI trabaja?",
  "¿Dónde trabaja actualmente?",
]

/** Aviso flotante sobre el botón para que el chat no pase desapercibido. */
function ChatAnuncio() {
  const { anuncioVisible, abrir, descartarAnuncio } = useChat()
  const profile = usePerfil()

  if (!anuncioVisible) return null

  return (
    <div
      className={cn(
        "fixed right-4 bottom-20 z-50 w-[calc(100vw-2rem)] max-w-xs sm:right-6 sm:bottom-22",
        "animate-in delay-700 duration-500 fill-mode-both fade-in slide-in-from-bottom-4",
        "motion-reduce:animate-none print:hidden"
      )}
    >
      <Alert
        role="status"
        className="py-3 pr-10 shadow-lg has-data-[slot=alert-action]:pr-10"
      >
        <BotIcon />
        <AlertTitle>
          Habla con la IA sobre {profile.first_name.split(" ")[0]}
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
  const profile = usePerfil()
  const [mensajes, setMensajes] = React.useState<Mensaje[]>(() => [
    bienvenida(profile.first_name),
  ])
  const [borrador, setBorrador] = React.useState("")
  const [ocupado, setOcupado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // La conversación es de esta visita: el backend la guarda, pero el widget no
  // ofrece historial, así que al recargar la página se empieza de nuevo.
  const conversacionRef = React.useRef<string | null>(null)
  const abortoRef = React.useRef<AbortController | null>(null)
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

  // Si la página se va con una respuesta a medias, se corta la petición.
  React.useEffect(() => () => abortoRef.current?.abort(), [])

  async function enviar(texto: string) {
    const limpio = texto.trim()
    if (!limpio || ocupado) return

    const idUsuario = nuevoId("u")
    const idRespuesta = nuevoId("a")

    setMensajes((previos) => [
      ...previos,
      { id: idUsuario, rol: "user", texto: limpio },
    ])
    setBorrador("")
    setError(null)
    setOcupado(true)

    const controlador = new AbortController()
    abortoRef.current = controlador

    try {
      for await (const evento of enviarMensaje(
        limpio,
        conversacionRef.current,
        controlador.signal,
        // El alcance es lo que hace que responda solo con la hoja de vida: el
        // backend arma las instrucciones del modelo leyendo el CV de la base.
        "resume"
      )) {
        if (evento.type === "start") {
          conversacionRef.current = evento.conversation_id
          setMensajes((previos) => [
            ...previos,
            { id: idRespuesta, rol: "assistant", texto: "", enCurso: true },
          ])
        }
        if (evento.type === "delta") {
          setMensajes((previos) =>
            previos.map((m) =>
              m.id === idRespuesta ? { ...m, texto: m.texto + evento.text } : m
            )
          )
        }
        if (evento.type === "error") {
          setError(evento.message)
        }
      }
    } catch (fallo: unknown) {
      if (!controlador.signal.aborted) {
        setError(
          fallo instanceof Error
            ? fallo.message
            : "No se pudo conectar con el servidor."
        )
      }
    } finally {
      setMensajes((previos) =>
        previos
          // Si no alcanzó a llegar texto, se quita la burbuja vacía.
          .filter((m) => m.id !== idRespuesta || m.texto !== "")
          .map((m) => (m.id === idRespuesta ? { ...m, enCurso: false } : m))
      )
      setOcupado(false)
      abortoRef.current = null
    }
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
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex size-3"
          >
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
              Sobre el perfil de {profile.first_name}
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
                    <MarkerContent>
                      Solo responde sobre esta hoja de vida
                    </MarkerContent>
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
                          <BubbleContent>
                            {m.rol === "assistant" && m.id !== "bienvenida" ? (
                              <React.Suspense
                                fallback={
                                  <div className="text-sm whitespace-pre-wrap">
                                    {m.texto}
                                  </div>
                                }
                              >
                                <MensajeMarkdown texto={m.texto} />
                              </React.Suspense>
                            ) : (
                              <span className="whitespace-pre-wrap">
                                {m.texto}
                              </span>
                            )}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>
                    </Message>
                  </MessageScrollerItem>
                ))}

                {ocupado ? (
                  <MessageScrollerItem scrollAnchor={false}>
                    <p
                      role="status"
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <Spinner className="size-3.5" />
                      Buscando en la hoja de vida…
                    </p>
                  </MessageScrollerItem>
                ) : null}

                {error ? (
                  <MessageScrollerItem scrollAnchor={false}>
                    <Alert role="status" variant="destructive">
                      <TriangleAlertIcon />
                      <AlertTitle>No se pudo responder</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </MessageScrollerItem>
                ) : null}

                {mensajes.length === 1 ? (
                  <MessageScrollerItem scrollAnchor={false}>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {SUGERENCIAS.map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="xs"
                          disabled={ocupado}
                          onClick={() => void enviar(s)}
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
              void enviar(borrador)
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
                    void enviar(borrador)
                  }
                }}
                placeholder="Escribe tu pregunta…"
                rows={1}
                aria-label="Mensaje"
                disabled={ocupado}
                className="max-h-32 min-h-10"
              />
              <InputGroupAddon align="block-end">
                {ocupado ? (
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    aria-label="Detener la respuesta"
                    onClick={() => abortoRef.current?.abort()}
                    className="ml-auto rounded-full"
                  >
                    <SquareIcon />
                  </InputGroupButton>
                ) : (
                  <InputGroupButton
                    type="submit"
                    size="icon-xs"
                    disabled={!borrador.trim()}
                    aria-label="Enviar mensaje"
                    className="ml-auto rounded-full"
                  >
                    <ArrowUpIcon />
                  </InputGroupButton>
                )}
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>
      </div>
    </>
  )
}
