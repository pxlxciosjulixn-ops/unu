import * as React from "react"
import {
  ArrowUpIcon,
  BotIcon,
  CircleStopIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
import { API_BASE } from "@/lib/api"

type Rol = "user" | "assistant"
type Mensaje = { id: string; rol: Rol; texto: string }
type Estado = "libre" | "esperando" | "escribiendo"

/** Lee el flujo SSE del backend y entrega los eventos uno por uno. */
async function* leerEventos(cuerpo: ReadableStream<Uint8Array>) {
  const lector = cuerpo.getReader()
  const decodificador = new TextDecoder()
  let resto = ""

  while (true) {
    const { value, done } = await lector.read()
    if (done) break

    resto += decodificador.decode(value, { stream: true })
    const bloques = resto.split("\n\n")
    // El último bloque puede venir cortado a mitad: se guarda para la próxima.
    resto = bloques.pop() ?? ""

    for (const bloque of bloques) {
      const linea = bloque
        .split("\n")
        .find((l) => l.startsWith("data:"))
      if (!linea) continue
      try {
        yield JSON.parse(linea.slice(5)) as {
          type: "start" | "delta" | "done" | "error"
          text?: string
          model?: string
          message?: string
        }
      } catch {
        // Un bloque ilegible no debe tumbar la conversación.
      }
    }
  }
}

export function ChatbotPage() {
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([])
  const [borrador, setBorrador] = React.useState("")
  const [estado, setEstado] = React.useState<Estado>("libre")
  const [error, setError] = React.useState<string | null>(null)
  const [modelo, setModelo] = React.useState<string | null>(null)
  const [segundos, setSegundos] = React.useState(0)

  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const abortoRef = React.useRef<AbortController | null>(null)
  const ocupado = estado !== "libre"

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

  async function enviar() {
    const texto = borrador.trim()
    if (!texto || ocupado) return

    const historial: Mensaje[] = [
      ...mensajes,
      { id: `u-${Date.now()}`, rol: "user", texto },
    ]
    const idRespuesta = `a-${Date.now()}`

    setMensajes(historial)
    setBorrador("")
    setError(null)
    setSegundos(0)
    setEstado("esperando")

    const controlador = new AbortController()
    abortoRef.current = controlador

    try {
      const respuesta = await fetch(`${API_BASE}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historial.map((m) => ({ role: m.rol, content: m.texto })),
        }),
        signal: controlador.signal,
      })

      if (!respuesta.ok || !respuesta.body) {
        const detalle = await respuesta.json().catch(() => null)
        throw new Error(
          detalle?.detail ??
            (respuesta.status === 429
              ? "Demasiados mensajes seguidos. Espera un momento."
              : `El servidor respondió ${respuesta.status}.`)
        )
      }

      setMensajes((previos) => [
        ...previos,
        { id: idRespuesta, rol: "assistant", texto: "" },
      ])

      for await (const evento of leerEventos(respuesta.body)) {
        if (evento.type === "start" && evento.model) {
          setModelo(evento.model)
        }
        if (evento.type === "delta" && evento.text) {
          setEstado("escribiendo")
          setMensajes((previos) =>
            previos.map((m) =>
              m.id === idRespuesta ? { ...m, texto: m.texto + evento.text } : m
            )
          )
        }
        if (evento.type === "error") {
          setError(evento.message ?? "El modelo no pudo responder.")
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
      // Si no llegó nada, se quita la burbuja vacía.
      setMensajes((previos) =>
        previos.filter((m) => m.id !== idRespuesta || m.texto !== "")
      )
      setEstado("libre")
      abortoRef.current = null
    }
  }

  function detener() {
    abortoRef.current?.abort()
  }

  function reiniciar() {
    abortoRef.current?.abort()
    setMensajes([])
    setBorrador("")
    setError(null)
    setEstado("libre")
  }

  return (
    <AppShell
      titulo="Chatbot"
      acciones={
        <>
          {modelo ? (
            <Badge variant="outline" className="hidden max-w-60 truncate sm:inline-flex">
              {modelo}
            </Badge>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={reiniciar}
            disabled={mensajes.length === 0 && !error}
          >
            <RotateCcwIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Nueva conversación</span>
          </Button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
        <Card className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col px-0">
            {mensajes.length === 0 ? (
              <Empty className="h-full">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BotIcon />
                  </EmptyMedia>
                  <EmptyTitle>Escribe tu primer mensaje</EmptyTitle>
                  <EmptyDescription>
                    Conversa con DeepSeek a través del backend. La primera
                    respuesta tarda entre 15 y 30 segundos porque el modelo se
                    encola en NVIDIA.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <MessageScrollerProvider autoScroll>
                <MessageScroller className="min-h-0 flex-1">
                  <MessageScrollerViewport>
                    <MessageScrollerContent className="flex flex-col gap-4 p-4 sm:px-6">
                      {modelo ? (
                        <MessageScrollerItem scrollAnchor={false}>
                          <Marker variant="separator">
                            <MarkerContent>{modelo}</MarkerContent>
                          </Marker>
                        </MessageScrollerItem>
                      ) : null}

                      {mensajes.map((mensaje) => (
                        <MessageScrollerItem
                          key={mensaje.id}
                          messageId={mensaje.id}
                          scrollAnchor={mensaje.rol === "user"}
                        >
                          <Message
                            align={mensaje.rol === "user" ? "end" : "start"}
                          >
                            <MessageContent>
                              <Bubble
                                variant={
                                  mensaje.rol === "user" ? "default" : "muted"
                                }
                                align={
                                  mensaje.rol === "user" ? "end" : "start"
                                }
                              >
                                <BubbleContent className="whitespace-pre-wrap">
                                  {mensaje.texto}
                                </BubbleContent>
                              </Bubble>
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      ))}

                      {estado === "esperando" ? (
                        <MessageScrollerItem scrollAnchor={false}>
                          <Message align="start">
                            <MessageContent>
                              <Bubble variant="muted" align="start">
                                <BubbleContent className="text-muted-foreground tabular-nums">
                                  Pensando… {segundos} s
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

            {error ? (
              <div className="px-4 pb-2 sm:px-6">
                <Alert role="status">
                  <TriangleAlertIcon />
                  <AlertTitle>No se pudo responder</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            ) : null}
          </CardContent>

          <CardFooter className="flex-col items-stretch gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void enviar()
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
                      void enviar()
                    }
                  }}
                  disabled={ocupado}
                  rows={1}
                  aria-label="Mensaje"
                  placeholder="Escribe tu mensaje…"
                  className="max-h-40 min-h-10"
                />
                <InputGroupAddon align="block-end">
                  {ocupado ? (
                    <InputGroupButton
                      type="button"
                      size="icon-xs"
                      aria-label="Detener respuesta"
                      onClick={detener}
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
              Enter envía, Shift+Enter hace salto de línea. La key de NVIDIA se
              queda en el backend: el navegador solo habla con{" "}
              <code>/api/chat/</code>.
            </p>
          </CardFooter>
        </Card>
      </div>
    </AppShell>
  )
}
