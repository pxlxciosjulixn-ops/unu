import * as React from "react"
import {
  ArrowUpIcon,
  BotIcon,
  CircleStopIcon,
  PaperclipIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import {
  borrarConversacion,
  enviarMensaje,
  listarConversaciones,
  traerConversacion,
} from "@/components/chatbot/api"
import {
  BotonNuevaConversacion,
  ChatSidebar,
} from "@/components/chatbot/chat-sidebar"
import {
  BotonCopiar,
  MensajeMarkdown,
} from "@/components/chatbot/mensaje-markdown"
import type { Conversacion, Mensaje } from "@/components/chatbot/tipos"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Message, MessageContent } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Skeleton } from "@/components/ui/skeleton"

type Estado = "libre" | "esperando" | "escribiendo"

// Contador propio en vez de Date.now(): los ids solo tienen que ser distintos
// entre si, y asi el componente no depende de nada externo al renderizar.
let contadorIds = 0
const nuevoId = (prefijo: string) => `${prefijo}-${(contadorIds += 1)}`

const SUGERENCIAS = [
  "Explícame qué es un Data Warehouse en dos párrafos",
  "Dame cinco ideas de KPI para un panel de ventas",
  "Escribe una consulta SQL que saque el top 10 de productos",
  "¿Cuál es la diferencia entre ETL y ELT?",
]

export function ChatbotPage() {
  const [conversaciones, setConversaciones] = React.useState<Conversacion[]>([])
  const [cargandoLista, setCargandoLista] = React.useState(true)
  const [activa, setActiva] = React.useState<string | null>(null)
  const [cargandoHilo, setCargandoHilo] = React.useState(false)

  const [mensajes, setMensajes] = React.useState<Mensaje[]>([])
  const [borrador, setBorrador] = React.useState("")
  const [estado, setEstado] = React.useState<Estado>("libre")
  const [error, setError] = React.useState<string | null>(null)
  const [modelo, setModelo] = React.useState<string | null>(null)
  const [segundos, setSegundos] = React.useState(0)
  const [razonando, setRazonando] = React.useState(false)

  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const abortoRef = React.useRef<AbortController | null>(null)
  const ocupado = estado !== "libre"

  const refrescarLista = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const { results } = await listarConversaciones(signal)
      setConversaciones(results)
    } catch {
      // El historial es secundario: si falla, el chat sigue sirviendo.
    } finally {
      setCargandoLista(false)
    }
  }, [])

  React.useEffect(() => {
    const controlador = new AbortController()
    listarConversaciones(controlador.signal)
      .then(({ results }) => setConversaciones(results))
      // El historial es secundario: si falla, el chat sigue sirviendo.
      .catch(() => undefined)
      .finally(() => setCargandoLista(false))
    return () => controlador.abort()
  }, [])

  // Contador de la espera: el modelo tarda entre 15 y 30 segundos en arrancar,
  // así que sin este aviso la página parece congelada.
  React.useEffect(() => {
    if (estado !== "esperando") return
    const id = window.setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [estado])

  React.useEffect(() => {
    if (!ocupado) inputRef.current?.focus()
  }, [ocupado])

  /** El campo crece con el texto hasta un tope. */
  function ajustarAlto() {
    const campo = inputRef.current
    if (!campo) return
    campo.style.height = "auto"
    campo.style.height = `${Math.min(campo.scrollHeight, 200)}px`
  }

  function nuevaConversacion() {
    abortoRef.current?.abort()
    setActiva(null)
    setMensajes([])
    setError(null)
    setBorrador("")
    setEstado("libre")
    inputRef.current?.focus()
  }

  async function abrirConversacion(id: string) {
    if (id === activa) return
    abortoRef.current?.abort()
    setActiva(id)
    setError(null)
    setCargandoHilo(true)
    try {
      const datos = await traerConversacion(id)
      setMensajes(
        datos.messages.map((m) => ({
          id: `g-${m.id}`,
          rol: m.role,
          texto: m.content,
        }))
      )
    } catch {
      setError("No se pudo abrir esa conversación.")
      setMensajes([])
    } finally {
      setCargandoHilo(false)
    }
  }

  async function eliminarConversacion(id: string) {
    try {
      await borrarConversacion(id)
      setConversaciones((previas) => previas.filter((c) => c.id !== id))
      if (id === activa) nuevaConversacion()
    } catch {
      setError("No se pudo borrar la conversación.")
    }
  }

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
    setSegundos(0)
    setRazonando(false)
    setEstado("esperando")
    window.requestAnimationFrame(ajustarAlto)

    const controlador = new AbortController()
    abortoRef.current = controlador
    let conversacionId = activa

    try {
      for await (const evento of enviarMensaje(
        limpio,
        conversacionId,
        controlador.signal
      )) {
        if (evento.type === "start") {
          conversacionId = evento.conversation_id
          setActiva(evento.conversation_id)
          setModelo(evento.model)
          setMensajes((previos) => [
            ...previos,
            { id: idRespuesta, rol: "assistant", texto: "", enCurso: true },
          ])
        }
        if (evento.type === "thinking") {
          setRazonando(true)
        }
        if (evento.type === "delta") {
          setEstado("escribiendo")
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
            : "No se pudo conectar con el backend."
        )
      }
    } finally {
      setMensajes((previos) =>
        previos
          // Si no llegó nada, se quita la burbuja vacía.
          .filter((m) => m.id !== idRespuesta || m.texto !== "")
          .map((m) => (m.id === idRespuesta ? { ...m, enCurso: false } : m))
      )
      setEstado("libre")
      abortoRef.current = null
      void refrescarLista()
    }
  }

  const hiloVacio = mensajes.length === 0 && !cargandoHilo

  return (
    <AppShell
      titulo="Chatbot"
      altoFijo
      sidebar={
        <ChatSidebar
          conversaciones={conversaciones}
          activa={activa}
          cargando={cargandoLista}
          onNueva={nuevaConversacion}
          onAbrir={(id) => void abrirConversacion(id)}
          onBorrar={(id) => void eliminarConversacion(id)}
        />
      }
      acciones={
        <>
          {modelo ? (
            <Badge
              variant="outline"
              className="hidden max-w-60 truncate lg:inline-flex"
            >
              {modelo}
            </Badge>
          ) : null}
          <BotonNuevaConversacion onNueva={nuevaConversacion} />
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* El hilo es lo único que scrollea; el redactor se queda quieto. */}
        <div className="flex min-h-0 flex-1 flex-col">
          {cargandoHilo ? (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:px-6">
              <Skeleton className="h-12 w-2/3 self-end" />
              <Skeleton className="h-24 w-4/5" />
              <Skeleton className="h-12 w-1/2 self-end" />
            </div>
          ) : hiloVacio ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BotIcon />
                </EmptyMedia>
                <EmptyTitle>¿En qué te ayudo?</EmptyTitle>
                <EmptyDescription>
                  Conversa con DeepSeek. La primera respuesta tarda entre 15 y
                  30 segundos porque el modelo se encola en NVIDIA; el resto van
                  apareciendo a medida que se escriben.
                </EmptyDescription>
              </EmptyHeader>
              <div className="flex flex-wrap justify-center gap-2 px-4">
                {SUGERENCIAS.map((sugerencia) => (
                  <Button
                    key={sugerencia}
                    variant="outline"
                    size="sm"
                    className="h-auto max-w-full py-1.5 text-left whitespace-normal"
                    onClick={() => void enviar(sugerencia)}
                  >
                    <SparklesIcon data-icon="inline-start" />
                    {sugerencia}
                  </Button>
                ))}
              </div>
            </Empty>
          ) : (
            <MessageScrollerProvider autoScroll>
              <MessageScroller className="min-h-0 flex-1">
                <MessageScrollerViewport>
                  {/* `justify-end` deja los mensajes pegados abajo, como en cualquier chat:
                        arriba se ve el espacio, no un hueco debajo del hilo. */}
                  <MessageScrollerContent className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-end gap-4 p-4 sm:px-6">
                    {mensajes.map((mensaje) => (
                      <MessageScrollerItem
                        key={mensaje.id}
                        messageId={mensaje.id}
                        scrollAnchor={mensaje.rol === "user"}
                      >
                        <Message
                          align={mensaje.rol === "user" ? "end" : "start"}
                        >
                          <MessageContent className="group/mensaje">
                            <Bubble
                              variant={
                                mensaje.rol === "user" ? "default" : "muted"
                              }
                              align={mensaje.rol === "user" ? "end" : "start"}
                            >
                              <BubbleContent>
                                {mensaje.rol === "user" ? (
                                  <span className="whitespace-pre-wrap">
                                    {mensaje.texto}
                                  </span>
                                ) : (
                                  <MensajeMarkdown texto={mensaje.texto} />
                                )}
                              </BubbleContent>
                            </Bubble>
                            {mensaje.rol === "assistant" && !mensaje.enCurso ? (
                              <div className="mt-1 opacity-0 transition-opacity group-hover/mensaje:opacity-100 focus-within:opacity-100">
                                <BotonCopiar texto={mensaje.texto} />
                              </div>
                            ) : null}
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ))}

                    {estado === "esperando" ? (
                      <MessageScrollerItem scrollAnchor={false}>
                        <Message align="start">
                          <MessageContent>
                            <Bubble variant="muted" align="start">
                              <BubbleContent className="flex items-center gap-2 text-muted-foreground">
                                <span className="flex gap-1" aria-hidden>
                                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                                  <span className="size-1.5 animate-bounce rounded-full bg-current" />
                                </span>
                                <span className="tabular-nums">
                                  {razonando ? "Razonando" : "Pensando"}…{" "}
                                  {segundos} s
                                </span>
                                {/* La espera depende de la cola de NVIDIA y
                                    algunos días se va a varios minutos: mejor
                                    decirlo que dejar al usuario adivinando. */}
                                {segundos > 45 ? (
                                  <span className="text-xs">
                                    · el modelo está encolado, puede tardar
                                    varios minutos
                                  </span>
                                ) : null}
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ) : null}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          )}
        </div>

        {/* Barra inferior fija: borde arriba, sin recuadro alrededor del chat. */}
        <div className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-2">
            {error ? (
              <Alert role="status">
                <TriangleAlertIcon />
                <AlertTitle>No se pudo responder</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
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
                  onChange={(e) => {
                    setBorrador(e.target.value)
                    ajustarAlto()
                  }}
                  onKeyDown={(e) => {
                    // Enter envía; Shift+Enter hace salto de línea.
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      void enviar(borrador)
                    }
                  }}
                  disabled={ocupado}
                  rows={1}
                  aria-label="Mensaje"
                  placeholder="Escribe tu mensaje…"
                  className="min-h-10 resize-none"
                />
                <InputGroupAddon align="block-end">
                  <Dialog>
                    <DialogTrigger
                      render={
                        <InputGroupButton
                          type="button"
                          size="icon-xs"
                          aria-label="Adjuntar archivo"
                        />
                      }
                    >
                      <PaperclipIcon />
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Adjuntar archivos</DialogTitle>
                        <DialogDescription>
                          En construcción. Todavía no se pueden mandar archivos
                          al modelo; falta definir qué tipos se aceptan y dónde
                          se guardan.
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>

                  {ocupado ? (
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label="Detener respuesta"
                      onClick={() => abortoRef.current?.abort()}
                      className="ml-auto rounded-full"
                    >
                      <CircleStopIcon />
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
            <p className="text-xs text-muted-foreground">
              Enter envía, Shift+Enter hace salto de línea. Las conversaciones
              quedan guardadas en la base de datos.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
