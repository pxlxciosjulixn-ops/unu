import * as React from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  ArrowUpIcon,
  CircleStopIcon,
  HeartHandshakeIcon,
  SettingsIcon,
  SpellCheckIcon,
  XIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import {
  borrarChatContexto,
  borrarConversacion,
  enviarMensaje,
  listarChatsContexto,
  traerAjustes,
  listarConversaciones,
  traerConversacion,
} from "@/components/chatbot/api"
import {
  MenuAdjuntar,
  PanelImportacion,
} from "@/components/chatbot/importar-chat"
import { AplicarPersonalizacion } from "@/components/chatbot/aplicar-personalizacion"
import { BotonEscuchar } from "@/components/chatbot/boton-escuchar"
import { BotonesOpinion } from "@/components/chatbot/botones-opinion"
import { personalidadDe } from "@/components/chatbot/personalidades"
import { detener as detenerVoz } from "@/components/chatbot/voz"
import { capitalizar } from "@/components/chatbot/relaciones"
import { buscarSugerencias } from "@/components/chatbot/sugerencias"
import { SugerenciasEscritura } from "@/components/chatbot/sugerencias-escritura"

import {
  AvatarConsejero,
  ChatsRecientes,
  DetallesChat,
  Saludo,
} from "@/components/chatbot/inicio-consejero"
import {
  BotonNuevaConversacion,
  ChatSidebar,
} from "@/components/chatbot/chat-sidebar"
import {
  BotonCopiar,
  MensajeMarkdown,
} from "@/components/chatbot/mensaje-markdown"
import type {
  Personalidad,
  Alcance,
  ChatContexto,
  Conversacion,
  Mensaje,
} from "@/components/chatbot/tipos"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Estado = "libre" | "esperando" | "escribiendo"

// Contador propio en vez de Date.now(): los ids solo tienen que ser distintos
// entre si, y asi el componente no depende de nada externo al renderizar.
let contadorIds = 0
const nuevoId = (prefijo: string) => `${prefijo}-${(contadorIds += 1)}`

// Tope de la pregunta al consejero; el servidor valida el mismo.
const MAX_CARACTERES_CONSEJOS = 1500

/** Lo que se le manda al consejero en el modo "revisar mensaje". */
function pedidoDeRevision(mensaje: string) {
  return `Revise este mensaje que le pienso mandar:\n\n${mensaje}`
}

/** Con qué alcance y qué chat de contexto quedó la conversación abierta. */
type ContextoHilo = {
  scope: Alcance
  analysis: { id: number; name: string } | null
}

export function ChatbotPage() {
  const [conversaciones, setConversaciones] = React.useState<Conversacion[]>([])
  const [cargandoLista, setCargandoLista] = React.useState(true)
  const [activa, setActiva] = React.useState<string | null>(null)
  const [cargandoHilo, setCargandoHilo] = React.useState(false)

  const [mensajes, setMensajes] = React.useState<Mensaje[]>([])
  const [borrador, setBorrador] = React.useState("")
  const [estado, setEstado] = React.useState<Estado>("libre")
  const [error, setError] = React.useState<string | null>(null)
  const [segundos, setSegundos] = React.useState(0)
  const [razonando, setRazonando] = React.useState(false)
  // Cuántos mensajes le quedan al visitante. `null` mientras no ha respondido
  // el servidor, o si este chat no tiene tope.
  const [restantes, setRestantes] = React.useState<number | null>(null)
  const [restantesConsejos, setRestantesConsejos] = React.useState<
    number | null
  >(null)

  // Chats de WhatsApp subidos desde esta IP, el elegido para la próxima
  // conversación y el que ya usa la conversación abierta.
  const [chats, setChats] = React.useState<ChatContexto[]>([])
  // El chat elegido va también en la URL (`?chat=`): así, al volver del
  // análisis o de los ajustes, la página abre con el mismo chat.
  const [parametros, setParametros] = useSearchParams()
  const [chatElegido, setChatElegidoLocal] = React.useState<number | null>(
    () => Number(parametros.get("chat")) || null
  )
  const setChatElegido = React.useCallback(
    (id: number | null) => {
      setChatElegidoLocal(id)
      setParametros(id ? { chat: String(id) } : {}, { replace: true })
    },
    [setParametros]
  )
  // Archivo elegido en el "+" mientras se dice qué relación es; y el aviso de
  // lo que pasó al importarlo (p. ej. si solo se agregaron mensajes).
  const [archivoPendiente, setArchivoPendiente] = React.useState<File | null>(
    null
  )
  const [aviso, setAviso] = React.useState<string | null>(null)
  // Chat cuyo contexto (relación, fecha…) se está editando encima de la caja.
  const [editandoContexto, setEditandoContexto] =
    React.useState<ChatContexto | null>(null)
  // Sugerencia resaltada con las flechas; -1 si ninguna.
  const [sugerenciaActiva, setSugerenciaActiva] = React.useState(-1)
  // Escape las cierra hasta que vuelva a escribir.
  const [sinSugerencias, setSinSugerencias] = React.useState(false)
  // Modo "revisar mensaje": lo que se escribe es un mensaje para la otra
  // persona y el consejero dice si suena intenso, seco o bien.
  const [revisando, setRevisando] = React.useState(false)
  const [contextoHilo, setContextoHilo] = React.useState<ContextoHilo | null>(
    null
  )

  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  // La caja completa: el menú del "+" se abre de su mismo ancho.
  const cajaRef = React.useRef<HTMLFormElement>(null)
  const abortoRef = React.useRef<AbortController | null>(null)
  const ocupado = estado !== "libre"
  const enConsejos = activa
    ? contextoHilo?.scope === "consejos"
    : chatElegido !== null
  const cupoVisible = enConsejos ? restantesConsejos : restantes
  const sinCupo = cupoVisible === 0
  const nombreContexto = activa
    ? contextoHilo?.scope === "consejos"
      ? (contextoHilo.analysis?.name ?? "chat borrado")
      : null
    : (chats.find((c) => c.id === chatElegido)?.name ?? null)

  const refrescarLista = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const { results, quota, advice_quota } =
        await listarConversaciones(signal)
      setConversaciones(results)
      setRestantes(quota.remaining)
      setRestantesConsejos(advice_quota?.remaining ?? null)
    } catch {
      // El historial es secundario: si falla, el chat sigue sirviendo.
    } finally {
      setCargandoLista(false)
    }
  }, [])

  React.useEffect(() => {
    const controlador = new AbortController()
    listarConversaciones(controlador.signal)
      .then(({ results, quota, advice_quota }) => {
        setConversaciones(results)
        setRestantes(quota.remaining)
        setRestantesConsejos(advice_quota?.remaining ?? null)
      })
      // El historial es secundario: si falla, el chat sigue sirviendo.
      .catch(() => undefined)
      .finally(() => setCargandoLista(false))
    listarChatsContexto(controlador.signal)
      .then(({ results }) => setChats(results))
      .catch(() => undefined)
    return () => controlador.abort()
  }, [])

  const refrescarChats = React.useCallback(() => {
    listarChatsContexto()
      .then(({ results }) => setChats(results))
      .catch(() => undefined)
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

  // Quién habla (abuela, coach…): se muestra en el nombre de las respuestas.
  const [personalidad, setPersonalidad] = React.useState<
    Personalidad | undefined
  >(undefined)
  React.useEffect(() => {
    const controlador = new AbortController()
    traerAjustes(controlador.signal)
      .then((ajustes) => setPersonalidad(ajustes.personality))
      .catch(() => undefined)
    return () => controlador.abort()
  }, [])
  const quienHabla = personalidadDe(personalidad)
  // Nombre sobre cada respuesta: con fondo propio, para que se lea sobre
  // cualquier estilo (en Y2K queda encima del escritorio de cuadritos).
  const nombreDelChat = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2 py-0.5 shadow-xs">
      {quienHabla.valor === "consejero" ? null : (
        <quienHabla.icono className="size-3.5 text-primary" />
      )}
      Chat
      {quienHabla.valor === "consejero" ? null : (
        <span className="text-muted-foreground">· {quienHabla.nombre}</span>
      )}
    </span>
  )

  // Al salir de la página no se queda leyendo sola.
  React.useEffect(() => () => detenerVoz(), [])

  function nuevaConversacion() {
    detenerVoz()
    abortoRef.current?.abort()
    setActiva(null)
    setContextoHilo(null)
    setMensajes([])
    setError(null)
    setBorrador("")
    setEstado("libre")
    inputRef.current?.focus()
  }

  async function abrirConversacion(id: string) {
    if (id === activa) return
    detenerVoz()
    abortoRef.current?.abort()
    setActiva(id)
    setError(null)
    setCargandoHilo(true)
    try {
      const datos = await traerConversacion(id)
      setContextoHilo({ scope: datos.scope, analysis: datos.analysis })
      setMensajes(
        datos.messages.map((m) => ({
          id: `g-${m.id}`,
          rol: m.role,
          texto: m.content,
          servidorId: m.id,
          opinion: m.feedback,
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

  /** Terminó la importación: abre una conversación nueva con ese chat. */
  function alImportar(chat: ChatContexto, mensaje: string | null) {
    setArchivoPendiente(null)
    setAviso(mensaje)
    refrescarChats()
    if (activa) nuevaConversacion()
    setChatElegido(chat.id)
  }

  /** Oculta un chat de WhatsApp; sigue en la base y se restaura con la rueda. */
  async function borrarChat(id: number) {
    try {
      await borrarChatContexto(id)
      if (id === chatElegido) setChatElegido(null)
      refrescarChats()
    } catch {
      setError("No se pudo borrar el chat.")
    }
  }

  async function enviar(texto: string) {
    const escrito = texto.trim()
    if (!escrito || ocupado || sinCupo) return
    const limpio = revisando && enConsejos ? pedidoDeRevision(escrito) : escrito
    setRevisando(false)

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
    const elegido = activa ? null : chats.find((c) => c.id === chatElegido)

    try {
      for await (const evento of enviarMensaje(
        limpio,
        conversacionId,
        controlador.signal,
        "general",
        elegido?.id ?? null
      )) {
        if (evento.type === "start") {
          if (!conversacionId) {
            setContextoHilo(
              elegido
                ? {
                    scope: "consejos",
                    analysis: { id: elegido.id, name: elegido.name },
                  }
                : { scope: "general", analysis: null }
            )
          }
          conversacionId = evento.conversation_id
          setActiva(evento.conversation_id)
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
        if (evento.type === "done" && evento.message_id) {
          const servidorId = evento.message_id
          setMensajes((previos) =>
            previos.map((m) =>
              m.id === idRespuesta ? { ...m, servidorId, opinion: null } : m
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
  const chatDelHilo = activa
    ? chats.find((c) => c.id === contextoHilo?.analysis?.id)
    : chats.find((c) => c.id === chatElegido)

  // La caja de texto va centrada bajo el saludo cuando no hay mensajes y
  // abajo cuando ya hay conversación: es la misma, solo cambia de lugar.
  const sugerencias =
    enConsejos && !ocupado && !sinSugerencias
      ? buscarSugerencias(
          borrador,
          chatDelHilo
            ? capitalizar(
                chatDelHilo.participants.find((p) => p !== chatDelHilo.me) ??
                  "esa persona"
              )
            : null,
          chatDelHilo?.relationship ?? ""
        )
      : []

  function elegirSugerencia(texto: string) {
    setBorrador(texto)
    setSugerenciaActiva(-1)
    window.requestAnimationFrame(ajustarAlto)
    inputRef.current?.focus()
  }

  const redactor = (
    <div className="flex w-full flex-col gap-2">
      {editandoContexto ? (
        <PanelImportacion
          key={editandoContexto.id}
          chat={editandoContexto}
          onCancelar={() => setEditandoContexto(null)}
          onImportado={() => {
            setEditandoContexto(null)
            refrescarChats()
          }}
        />
      ) : null}
      {archivoPendiente ? (
        <PanelImportacion
          key={archivoPendiente.name + archivoPendiente.lastModified}
          archivo={archivoPendiente}
          onCancelar={() => setArchivoPendiente(null)}
          onImportado={alImportar}
        />
      ) : null}
      {sinCupo && enConsejos ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-xs"
        >
          <span className="flex-1">
            Te quedaste sin mensajes. Si tienes la contraseña, desbloquea entre
            10 y 30 más.
          </span>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link to="/chatbot/ajustes" />}
          >
            Desbloquear
          </Button>
        </div>
      ) : null}
      {aviso ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
        >
          <span className="flex-1">{aviso}</span>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setAviso(null)}
            className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      ) : null}
      {error ? (
        <Alert role="status">
          <TriangleAlertIcon />
          <AlertTitle>No se pudo responder</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {revisando && enConsejos ? (
        <Badge variant="default" className="self-start">
          <SpellCheckIcon data-icon="inline-start" />
          Revisando un mensaje antes de mandarlo
          <button
            type="button"
            aria-label="Salir del modo revisar"
            onClick={() => setRevisando(false)}
            className="ml-0.5 rounded-full opacity-80 hover:opacity-100"
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ) : null}
      {nombreContexto && !hiloVacio ? (
        <Badge
          variant="secondary"
          className="max-w-full self-start truncate"
          title="Chat de WhatsApp que se está usando"
        >
          <HeartHandshakeIcon data-icon="inline-start" />
          {nombreContexto}
        </Badge>
      ) : null}
      <form
        ref={cajaRef}
        onSubmit={(e) => {
          e.preventDefault()
          void enviar(borrador)
        }}
      >
        {/* El grupo base se atenúa si cualquier botón de adentro está
            deshabilitado, y el de enviar lo está cada vez que la caja está
            vacía: aquí solo se atenúa cuando no se puede escribir. */}
        <InputGroup
          className={cn(
            "rounded-[1.75rem] bg-background px-1.5 shadow-lg shadow-black/5 has-disabled:bg-background has-disabled:opacity-100 has-[[data-slot=input-group-control]:focus-visible]:border-foreground/30 has-[[data-slot=input-group-control]:focus-visible]:ring-foreground/10",
            (ocupado || sinCupo) && "opacity-70"
          )}
        >
          <InputGroupAddon
            align="inline-start"
            className="gap-0.5 self-end pb-3"
          >
            <MenuAdjuntar
              anclaRef={cajaRef}
              onArchivo={(archivo) => {
                setAviso(null)
                setEditandoContexto(null)
                setArchivoPendiente(archivo)
              }}
            />
            {enConsejos ? (
              <InputGroupButton
                type="button"
                size="icon-sm"
                aria-label="Revisar un mensaje antes de mandarlo"
                aria-pressed={revisando}
                title="Revisar un mensaje antes de mandarlo"
                onClick={() => {
                  setRevisando((r) => !r)
                  inputRef.current?.focus()
                }}
                className={cn(
                  "rounded-full",
                  revisando &&
                    "bg-foreground text-background hover:bg-foreground/90 hover:text-background"
                )}
              >
                <SpellCheckIcon />
              </InputGroupButton>
            ) : null}
          </InputGroupAddon>
          <InputGroupTextarea
            ref={inputRef}
            value={borrador}
            onChange={(e) => {
              setBorrador(e.target.value)
              setSugerenciaActiva(-1)
              setSinSugerencias(false)
              ajustarAlto()
            }}
            onKeyDown={(e) => {
              // Con sugerencias a la vista: flechas para moverse, Tab o Enter
              // (sobre una resaltada) para elegirla, Escape para cerrarlas.
              if (sugerencias.length > 0) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault()
                  const paso = e.key === "ArrowDown" ? 1 : -1
                  setSugerenciaActiva(
                    (i) => (i + paso + sugerencias.length) % sugerencias.length
                  )
                  return
                }
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault()
                  elegirSugerencia(sugerencias[Math.max(sugerenciaActiva, 0)])
                  return
                }
                if (e.key === "Enter" && sugerenciaActiva >= 0) {
                  e.preventDefault()
                  elegirSugerencia(sugerencias[sugerenciaActiva])
                  return
                }
                if (e.key === "Escape") {
                  setSinSugerencias(true)
                  return
                }
              }
              // Enter envía; Shift+Enter hace salto de línea.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void enviar(borrador)
              }
            }}
            disabled={ocupado || sinCupo}
            maxLength={enConsejos ? MAX_CARACTERES_CONSEJOS : undefined}
            rows={1}
            aria-label="Mensaje"
            placeholder={
              sinCupo
                ? "Te quedaste sin mensajes"
                : revisando && enConsejos
                  ? "Pegue el mensaje que le piensa mandar…"
                  : enConsejos
                    ? "Pregunta sobre este chat…"
                    : "Importa un chat con el botón +…"
            }
            className="min-h-0 resize-none px-2 py-4 leading-6"
          />
          <InputGroupAddon align="inline-end" className="self-end pb-3">
            {ocupado ? (
              <InputGroupButton
                type="button"
                size="icon-sm"
                aria-label="Detener respuesta"
                onClick={() => abortoRef.current?.abort()}
                className="rounded-full"
              >
                <CircleStopIcon />
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                size="icon-sm"
                variant="default"
                disabled={!borrador.trim() || sinCupo}
                aria-label="Enviar mensaje"
                className="rounded-full"
              >
                <ArrowUpIcon />
              </InputGroupButton>
            )}
          </InputGroupAddon>
        </InputGroup>
      </form>
      <SugerenciasEscritura
        sugerencias={sugerencias}
        activa={sugerenciaActiva}
        onElegir={elegirSugerencia}
        onResaltar={setSugerenciaActiva}
      />
    </div>
  )

  return (
    <>
      <AplicarPersonalizacion />
      <AppShell
        titulo="Chat"
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
            {cupoVisible !== null ? (
              <Badge variant={cupoVisible === 0 ? "destructive" : "outline"}>
                {cupoVisible === 0
                  ? "Sin mensajes"
                  : `${cupoVisible} ${cupoVisible === 1 ? "mensaje" : "mensajes"}`}
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Ajustes"
              title="Ajustes"
              nativeButton={false}
              render={<Link to="/chatbot/ajustes" />}
            >
              <SettingsIcon />
            </Button>
            <BotonNuevaConversacion onNueva={nuevaConversacion} />
          </>
        }
      >
        <div className="relative isolate flex min-h-0 flex-1 flex-col">
          {cargandoHilo ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:px-6">
              <Skeleton className="h-12 w-2/3 self-end rounded-2xl" />
              <Skeleton className="h-24 w-4/5 rounded-2xl" />
              <Skeleton className="h-12 w-1/2 self-end rounded-2xl" />
            </div>
          ) : hiloVacio ? (
            // Sin mensajes, como en ChatGPT: saludo y caja al centro.
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="mx-auto my-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
                <Saludo />
                {redactor}
                {enConsejos ? (
                  <DetallesChat
                    chat={chatDelHilo}
                    nombre={nombreContexto ?? "Chat borrado"}
                    onPreguntar={(texto) => void enviar(texto)}
                    onVolver={() => setChatElegido(null)}
                    onRevisar={() => {
                      setRevisando(true)
                      inputRef.current?.focus()
                    }}
                    onBorrar={(id) => void borrarChat(id)}
                    onEditarContexto={(chat) => {
                      setArchivoPendiente(null)
                      setAviso(null)
                      setEditandoContexto(chat)
                    }}
                  />
                ) : (
                  <ChatsRecientes
                    chats={chats}
                    onElegir={setChatElegido}
                    onBorrar={(id) => void borrarChat(id)}
                  />
                )}
              </div>
            </div>
          ) : (
            // El hilo es lo único que scrollea; el redactor se queda quieto.
            <div className="flex min-h-0 flex-1 flex-col">
              <MessageScrollerProvider autoScroll>
                <MessageScroller className="min-h-0 flex-1">
                  <MessageScrollerViewport>
                    {/* `justify-end` deja los mensajes pegados abajo, como en cualquier chat:
                        arriba se ve el espacio, no un hueco debajo del hilo. */}
                    <MessageScrollerContent className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-end gap-6 p-4 sm:px-6">
                      {/* La respuesta entra vacía al arrancar el streaming; mientras
                        no llegue texto se ve solo el indicador de "Leyendo el
                        chat", no una burbuja vacía encima. */}
                      {mensajes
                        .filter((m) => m.rol === "user" || m.texto !== "")
                        .map((mensaje) => (
                          <MessageScrollerItem
                            key={mensaje.id}
                            messageId={mensaje.id}
                            scrollAnchor={mensaje.rol === "user"}
                          >
                            {mensaje.rol === "user" ? (
                              <Message
                                align="end"
                                className="motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                              >
                                <MessageContent>
                                  <Bubble variant="default" align="end">
                                    <BubbleContent className="rounded-2xl rounded-br-md px-4 py-2.5 shadow-sm">
                                      <span className="whitespace-pre-wrap">
                                        {mensaje.texto}
                                      </span>
                                    </BubbleContent>
                                  </Bubble>
                                </MessageContent>
                              </Message>
                            ) : (
                              <Message
                                align="start"
                                className="gap-3 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                              >
                                <MessageAvatar className="self-start bg-transparent">
                                  <AvatarConsejero />
                                </MessageAvatar>
                                <MessageContent className="group/mensaje gap-1.5">
                                  <MessageHeader className="px-0 text-foreground">
                                    {nombreDelChat}
                                  </MessageHeader>
                                  <Bubble
                                    variant="outline"
                                    align="start"
                                    className="max-w-full sm:max-w-[90%]"
                                  >
                                    <BubbleContent className="rounded-2xl rounded-tl-md bg-card px-4 py-3 shadow-sm">
                                      <MensajeMarkdown texto={mensaje.texto} />
                                    </BubbleContent>
                                  </Bubble>
                                  {!mensaje.enCurso ? (
                                    <div className="flex items-center gap-0.5 opacity-60 transition-opacity group-hover/mensaje:opacity-100 focus-within:opacity-100">
                                      <BotonEscuchar
                                        id={mensaje.id}
                                        texto={mensaje.texto}
                                      />
                                      <BotonCopiar texto={mensaje.texto} />
                                      {mensaje.servidorId ? (
                                        <BotonesOpinion
                                          id={mensaje.servidorId}
                                          inicial={mensaje.opinion ?? null}
                                        />
                                      ) : null}
                                    </div>
                                  ) : null}
                                </MessageContent>
                              </Message>
                            )}
                          </MessageScrollerItem>
                        ))}

                      {estado === "esperando" ? (
                        <MessageScrollerItem scrollAnchor={false}>
                          <Message
                            align="start"
                            className="gap-3 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                          >
                            <MessageAvatar className="self-start bg-transparent">
                              <AvatarConsejero className="animate-pulse" />
                            </MessageAvatar>
                            <MessageContent className="gap-1.5">
                              <MessageHeader className="px-0 text-foreground">
                                {nombreDelChat}
                              </MessageHeader>
                              <Bubble variant="outline" align="start">
                                <BubbleContent className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-card px-4 py-3 text-muted-foreground shadow-sm">
                                  <span className="flex gap-1" aria-hidden>
                                    <span className="size-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
                                    <span className="size-1.5 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
                                    <span className="size-1.5 animate-bounce rounded-full bg-foreground/60" />
                                  </span>
                                  <span className="tabular-nums">
                                    {razonando
                                      ? "Analizando"
                                      : "Leyendo el chat"}
                                    … {segundos} s
                                  </span>
                                  {/* La espera depende de la cola del proveedor y
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
            </div>
          )}

          {/* Con conversación, la caja baja y se funde con el hilo. */}
          <div
            className={cn(
              "shrink-0 px-4 pb-3 sm:px-6",
              !hiloVacio &&
                "bg-linear-to-t from-background via-background/95 to-transparent pt-2"
            )}
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
              {!hiloVacio ? redactor : null}
              <div className="flex items-center justify-between gap-2 px-1 text-[0.6875rem] text-muted-foreground">
                <span className="hidden sm:inline">
                  Enter envía · Shift+Enter hace salto de línea
                </span>
                <span className="ml-auto">
                  Desarrollado por{" "}
                  <span className="font-medium text-foreground">
                    Julian Palacios
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  )
}
