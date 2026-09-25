import * as React from "react"
import {
  ArrowLeftIcon,
  CalendarIcon,
  FileTextIcon,
  PlusIcon,
  XIcon,
} from "lucide-react"

import {
  actualizarChatContexto,
  subirChatContexto,
} from "@/components/chatbot/api"
import {
  diasDesde,
  hoyISO,
  preguntaFecha,
  preguntasDe,
  tiempoEnPalabras,
  type Pregunta,
} from "@/components/chatbot/cuestionario"
import { nombresDelChat, RELACIONES } from "@/components/chatbot/relaciones"
import type { ChatContexto, Perfil, Relacion } from "@/components/chatbot/tipos"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { InputGroupButton } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/**
 * Botón "+" de la caja de texto: abre un menú, como el de ChatGPT, con la
 * única opción que tiene este chat: importar un chat de WhatsApp (.txt).
 */
export function MenuAdjuntar({
  onArchivo,
  anclaRef,
}: {
  onArchivo: (archivo: File) => void
  /** La caja de texto: el menú se abre debajo de ella y de su mismo ancho. */
  anclaRef?: React.RefObject<HTMLElement | null>
}) {
  const archivoRef = React.useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={archivoRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          if (archivo) onArchivo(archivo)
          // Deja volver a elegir el mismo archivo después.
          e.target.value = ""
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <InputGroupButton
              type="button"
              size="icon-sm"
              aria-label="Añadir"
              className="rounded-full"
            />
          }
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={8}
          anchor={anclaRef}
          className="rounded-2xl p-1.5"
        >
          <DropdownMenuItem
            onClick={() => archivoRef.current?.click()}
            className="gap-3 rounded-xl px-3 py-2.5"
          >
            <FileTextIcon />
            <span className="flex flex-col">
              <span className="text-sm">Importar chat de WhatsApp</span>
              <span className="text-xs text-muted-foreground">
                El .txt de Exportar chat → Sin archivos
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

type Paso =
  | { tipo: "relacion" }
  | { tipo: "pregunta"; pregunta: Pregunta }
  | { tipo: "fecha"; texto: string }
  | { tipo: "completo" }

type Subido = ChatContexto & { merged: boolean; added: number }

/**
 * Cuestionario de encima de la caja: qué es esa persona para uno, unas
 * preguntas según esa relación, desde cuándo hablan y si el archivo es todo
 * el chat. Con eso el consejero se ubica: no es lo mismo 15 mensajes en una
 * semana que 15 mensajes en un año.
 *
 * Sirve para importar (`archivo`) y para editar el contexto de un chat que ya
 * estaba (`chat`). Si el export no dice quién es uno, al final lo pregunta.
 */
export function PanelImportacion({
  archivo,
  chat,
  onCancelar,
  onImportado,
}: {
  archivo?: File
  chat?: ChatContexto
  onCancelar: () => void
  /** `aviso`: qué pasó, para mostrarlo (p. ej. si solo se agregaron mensajes). */
  onImportado: (chat: ChatContexto, aviso: string | null) => void
}) {
  const inicial = chat?.profile ?? {}
  const [relacion, setRelacion] = React.useState<Relacion | null>(
    chat?.relationship || null
  )
  // Respuestas por texto de la pregunta: así se recuperan al editar.
  const [respuestas, setRespuestas] = React.useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        (inicial.respuestas ?? []).map((r) => [r.pregunta, r.respuesta])
      )
  )
  const [desde, setDesde] = React.useState(inicial.desde ?? "")
  const [completo, setCompleto] = React.useState<boolean | null>(
    inicial.completo ?? null
  )
  const [indice, setIndice] = React.useState(0)
  const [subido, setSubido] = React.useState<Subido | null>(null)
  const [ocupado, setOcupado] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const pasos: Paso[] = [{ tipo: "relacion" }]
  if (relacion) {
    for (const pregunta of preguntasDe(relacion)) {
      pasos.push({ tipo: "pregunta", pregunta })
    }
    const fecha = preguntaFecha(relacion)
    if (fecha) pasos.push({ tipo: "fecha", texto: fecha })
    pasos.push({ tipo: "completo" })
  }
  const paso = pasos[Math.min(indice, pasos.length - 1)]
  const ultimo = relacion !== null && indice >= pasos.length - 1

  function perfil(): Perfil {
    const vigentes = relacion ? preguntasDe(relacion) : []
    return {
      respuestas: vigentes
        .filter((p) => respuestas[p.texto])
        .map((p) => ({ pregunta: p.texto, respuesta: respuestas[p.texto] })),
      ...(desde ? { desde } : {}),
      ...(completo !== null ? { completo } : {}),
    }
  }

  function avisoDe(c: Subido) {
    if (!c.merged) return null
    const quien = c.participants.filter((p) => p !== c.me).join(" y ")
    return c.added === 0
      ? `Ya tenía el chat con ${quien} y no trae mensajes nuevos.`
      : `Ya tenía el chat con ${quien}: se agregaron ${c.added} ${c.added === 1 ? "mensaje nuevo" : "mensajes nuevos"}.`
  }

  function avanzar() {
    if (ultimo) void terminar()
    else setIndice((i) => i + 1)
  }

  async function terminar() {
    if (!relacion) return
    setOcupado(true)
    setError(null)
    try {
      if (chat) {
        const guardado = await actualizarChatContexto(chat.id, {
          relationship: relacion,
          profile: perfil(),
        })
        onImportado(guardado, null)
        return
      }
      if (!archivo) return
      if (!archivo.name.toLowerCase().endsWith(".txt")) {
        setError("Solo se aceptan archivos .txt exportados de WhatsApp.")
        return
      }
      let nuevo: Subido = await subirChatContexto(archivo, relacion, perfil())
      // Un chat que ya estaba conserva su contexto viejo: se actualiza.
      if (nuevo.merged) {
        nuevo = {
          ...nuevo,
          ...(await actualizarChatContexto(nuevo.id, {
            relationship: relacion,
            profile: perfil(),
          })),
        }
      }
      if (nuevo.needs_me) setSubido(nuevo)
      else onImportado(nuevo, avisoDe(nuevo))
    } catch (fallo: unknown) {
      setError(
        fallo instanceof Error ? fallo.message : "No se pudo guardar el chat."
      )
    } finally {
      setOcupado(false)
    }
  }

  async function elegirQuienSoy(nombre: string) {
    if (!subido) return
    setOcupado(true)
    setError(null)
    try {
      const listo = await actualizarChatContexto(subido.id, { me: nombre })
      onImportado(listo, avisoDe(subido))
    } catch (fallo: unknown) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar.")
    } finally {
      setOcupado(false)
    }
  }

  const titulo =
    archivo?.name ?? (chat ? nombresDelChat(chat.participants) : "")
  const dias = desde ? diasDesde(desde) : null

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in motion-safe:slide-in-from-bottom-2 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <FileTextIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{titulo}</span>
          <span className="block text-xs text-muted-foreground">
            {subido
              ? "Último paso"
              : relacion
                ? `Paso ${Math.min(indice, pasos.length - 1) + 1} de ${pasos.length}`
                : chat
                  ? "Contexto del chat"
                  : "Chat de WhatsApp"}
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Cancelar"
          disabled={ocupado}
          onClick={onCancelar}
        >
          <XIcon />
        </Button>
      </div>

      {/* Barra de avance: un tramo por paso. */}
      {relacion && !subido ? (
        <div className="flex gap-1" aria-hidden>
          {pasos.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= indice ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      ) : null}

      {subido ? (
        <PasoOpciones
          texto="El chat no dice quién eres. ¿Cuál de estos eres tú?"
          opciones={subido.participants}
          elegida={null}
          disabled={ocupado}
          onElegir={(nombre) => void elegirQuienSoy(nombre)}
        />
      ) : paso.tipo === "relacion" ? (
        <PasoOpciones
          texto="¿Qué es esta persona para ti?"
          opciones={RELACIONES.map((r) => r.nombre)}
          elegida={RELACIONES.find((r) => r.valor === relacion)?.nombre ?? null}
          disabled={ocupado}
          onElegir={(nombre) => {
            const elegida = RELACIONES.find((r) => r.nombre === nombre)
            if (elegida) setRelacion(elegida.valor)
            setIndice(1)
          }}
        />
      ) : paso.tipo === "pregunta" ? (
        <PasoOpciones
          texto={paso.pregunta.texto}
          opciones={paso.pregunta.opciones}
          elegida={respuestas[paso.pregunta.texto] ?? null}
          disabled={ocupado}
          onElegir={(opcion) => {
            setRespuestas((r) => ({ ...r, [paso.pregunta.texto]: opcion }))
            avanzar()
          }}
        />
      ) : paso.tipo === "fecha" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">{paso.texto}</p>
          <div className="relative max-w-60">
            <CalendarIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              max={hoyISO()}
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              aria-label={paso.texto}
              className="bg-background pl-9"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {dias !== null && dias >= 0
              ? `Llevan ${tiempoEnPalabras(dias)} hablando (${dias.toLocaleString("es-CO")} días).`
              : "Elige la fecha en el calendario."}
          </p>
        </div>
      ) : (
        <PasoOpciones
          texto="¿Este archivo es toda la conversación con esa persona?"
          ayuda="Si es toda y llevan tiempo hablando, cuántos mensajes hay también dice algo."
          opciones={["Sí, es toda", "No, es solo una parte"]}
          elegida={
            completo === null
              ? null
              : completo
                ? "Sí, es toda"
                : "No, es solo una parte"
          }
          disabled={ocupado}
          onElegir={(opcion) => setCompleto(opcion === "Sí, es toda")}
        />
      )}

      {!subido && relacion ? (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={ocupado || indice === 0}
            onClick={() => setIndice((i) => Math.max(0, i - 1))}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Atrás
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {!ultimo ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={ocupado}
                onClick={avanzar}
              >
                {paso.tipo === "fecha" && !desde ? "No me acuerdo" : "Saltar"}
              </Button>
            ) : null}
            <Button size="sm" disabled={ocupado} onClick={avanzar}>
              {ocupado ? <Spinner data-icon="inline-start" /> : null}
              {ultimo ? (chat ? "Guardar" : "Importar") : "Siguiente"}
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function PasoOpciones({
  texto,
  ayuda,
  opciones,
  elegida,
  onElegir,
  disabled,
}: {
  texto: string
  ayuda?: string
  opciones: string[]
  elegida: string | null
  onElegir: (opcion: string) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm">{texto}</p>
        {ayuda ? (
          <p className="text-xs text-muted-foreground">{ayuda}</p>
        ) : null}
      </div>
      <div
        role="radiogroup"
        aria-label={texto}
        className="flex flex-wrap gap-1.5"
      >
        {opciones.map((opcion) => (
          <button
            key={opcion}
            type="button"
            role="radio"
            aria-checked={elegida === opcion}
            disabled={disabled}
            onClick={() => onElegir(opcion)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition hover:border-foreground/30 disabled:opacity-50",
              elegida === opcion
                ? "border-primary bg-primary text-primary-foreground hover:border-primary"
                : "bg-background"
            )}
          >
            {opcion}
          </button>
        ))}
      </div>
    </div>
  )
}
