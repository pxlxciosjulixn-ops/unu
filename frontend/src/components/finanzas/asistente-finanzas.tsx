import * as React from "react"
import {
  ArrowUpIcon,
  RotateCcwIcon,
  SquareIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { enviarMensaje } from "@/components/chatbot/api"
import type { Mensaje } from "@/components/chatbot/tipos"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

// El Markdown arrastra react-markdown: se carga con la primera respuesta.
const MensajeMarkdown = React.lazy(() =>
  import("@/components/chatbot/mensaje-markdown").then((m) => ({
    default: m.MensajeMarkdown,
  }))
)

/**
 * Cuánto puede escribir la persona. Es el mismo número que
 * `MAX_CARACTERES_FINANZAS` en `chat/services.py`, que es quien lo valida.
 */
const MAX_CARACTERES = 200

const SUGERENCIAS = [
  "¿En qué gasto más este mes?",
  "¿Cómo voy contra el mes pasado?",
  "¿Cómo puedo ahorrar más?",
]

let contadorIds = 0
const nuevoId = (prefijo: string) => `${prefijo}-${(contadorIds += 1)}`

/**
 * Asistente de IA del dashboard. El servidor le pasa al modelo un resumen de
 * los movimientos en cada pregunta, así que responde con lo último
 * registrado. Sin cupo por visitante: preguntas cortas, respuestas cortas.
 */
export function AsistenteFinanzas() {
  const [mensajes, setMensajes] = React.useState<Mensaje[]>([])
  const [borrador, setBorrador] = React.useState("")
  const [ocupado, setOcupado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const conversacionRef = React.useRef<string | null>(null)
  const abortoRef = React.useRef<AbortController | null>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => () => abortoRef.current?.abort(), [])

  function reiniciar() {
    abortoRef.current?.abort()
    conversacionRef.current = null
    setMensajes([])
    setError(null)
    inputRef.current?.focus()
  }

  async function enviar(texto: string) {
    const limpio = texto.trim().slice(0, MAX_CARACTERES)
    if (!limpio || ocupado) return

    const idRespuesta = nuevoId("a")
    setMensajes((previos) => [
      ...previos,
      { id: nuevoId("u"), rol: "user", texto: limpio },
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
        "finanzas"
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
        if (evento.type === "error") setError(evento.message)
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
          .filter((m) => m.id !== idRespuesta || m.texto !== "")
          .map((m) => (m.id === idRespuesta ? { ...m, enCurso: false } : m))
      )
      setOcupado(false)
      abortoRef.current = null
    }
  }

  return (
    <Card id="asistente" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Asistente financiero</CardTitle>
        <CardDescription>Pregúntale por tus gastos e ingresos</CardDescription>
        {mensajes.length > 0 ? (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={reiniciar}
              aria-label="Empezar de nuevo"
              title="Empezar de nuevo"
            >
              <RotateCcwIcon />
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex min-h-72 flex-1 flex-col">
        <MessageScrollerProvider autoScroll>
          <MessageScroller className="h-72 min-h-0 flex-1 rounded-lg border bg-muted/30">
            <MessageScrollerViewport>
              <MessageScrollerContent className="flex flex-col gap-3 p-3">
                {mensajes.length === 0 ? (
                  <MessageScrollerItem scrollAnchor={false}>
                    <div className="flex flex-col gap-3 pt-2">
                      <p className="text-sm text-muted-foreground">
                        Conoce tus movimientos. Prueba con:
                      </p>
                      <div className="flex flex-col items-start gap-1.5">
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
                    </div>
                  </MessageScrollerItem>
                ) : null}

                {/* La burbuja de la respuesta aparece con el primer trozo de
                    texto; mientras tanto se ve el indicador de abajo. */}
                {mensajes
                  .filter((m) => m.texto !== "")
                  .map((m) => (
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
                              {m.rol === "assistant" ? (
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
                      Revisando tus números…
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
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      </CardContent>

      <CardFooter>
        <form
          className="w-full"
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
              placeholder="Pregunta sobre tus finanzas…"
              rows={1}
              aria-label="Pregunta para el asistente"
              maxLength={MAX_CARACTERES}
              disabled={ocupado}
              className="max-h-24 min-h-10"
            />
            <InputGroupAddon align="block-end">
              <span
                className={cn(
                  "text-xs tabular-nums",
                  borrador.length >= MAX_CARACTERES
                    ? "font-medium text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {borrador.length}/{MAX_CARACTERES}
              </span>
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
                  aria-label="Enviar pregunta"
                  className="ml-auto rounded-full"
                >
                  <ArrowUpIcon />
                </InputGroupButton>
              )}
            </InputGroupAddon>
          </InputGroup>
        </form>
      </CardFooter>
    </Card>
  )
}
