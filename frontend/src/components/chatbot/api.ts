import type {
  AjustesConsejero,
  Alcance,
  ChatContexto,
  EstadisticasChat,
  NivelGroseria,
  Opiniones,
  Perfil,
  Personalidad,
  Relacion,
  Conversacion,
  Cupo,
  ConversacionConMensajes,
  EventoChat,
} from "@/components/chatbot/tipos"
import { API_BASE, fetchJson } from "@/lib/api"

export function listarConversaciones(signal?: AbortSignal) {
  return fetchJson<{
    results: Conversacion[]
    quota: Cupo
    /** Cupo del consejero; solo viene en el listado del chat general. */
    advice_quota?: Cupo
  }>("/api/chat/conversations/", { signal })
}

export function listarChatsContexto(signal?: AbortSignal) {
  return fetchJson<{ results: ChatContexto[] }>("/api/chat/analyses/", {
    signal,
  })
}

/**
 * Sube un chat exportado de WhatsApp. El servidor no guarda el archivo: lo
 * lee y guarda la conversación ya limpia en la base.
 */
export async function subirChatContexto(
  archivo: File,
  relacion?: Relacion,
  perfil?: Perfil
) {
  const formulario = new FormData()
  formulario.append("file", archivo)
  if (relacion) formulario.append("relationship", relacion)
  if (perfil) formulario.append("profile", JSON.stringify(perfil))
  const respuesta = await fetch(`${API_BASE}/api/chat/analyses/`, {
    method: "POST",
    body: formulario,
  })
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new Error(
      datos?.detail ?? `No se pudo subir el archivo (${respuesta.status}).`
    )
  }
  // `merged`: ya había un chat con las mismas personas y solo se le
  // agregaron los mensajes nuevos (`added`).
  return datos as ChatContexto & { merged: boolean; added: number }
}

export async function borrarChatContexto(id: number) {
  const respuesta = await fetch(`${API_BASE}/api/chat/analyses/${id}/`, {
    method: "DELETE",
  })
  if (!respuesta.ok) {
    throw new Error(`No se pudo borrar el chat (${respuesta.status}).`)
  }
}

/**
 * Lo que el visitante borró en /chatbot. Borrar solo oculta, así que todo
 * esto sigue en la base y se puede restaurar.
 */
export function traerPapelera(signal?: AbortSignal) {
  return fetchJson<{
    analyses: (ChatContexto & { deleted_at: string })[]
    conversations: (Conversacion & { deleted_at: string })[]
  }>("/api/chat/trash/", { signal })
}

export function restaurarChatContexto(id: number) {
  return fetchJson<ChatContexto>(`/api/chat/analyses/${id}/restore/`, {
    method: "POST",
  })
}

export function restaurarConversacion(id: string) {
  return fetchJson<Conversacion>(`/api/chat/conversations/${id}/restore/`, {
    method: "POST",
  })
}

/**
 * "Eliminar definitivamente" desde la papelera: deja de salir en la
 * interfaz y ya no se puede restaurar, pero el dato sigue en la base.
 */
export function eliminarChatContexto(id: number) {
  return fetchJson<void>(`/api/chat/analyses/${id}/purge/`, { method: "POST" })
}

export function eliminarConversacion(id: string) {
  return fetchJson<void>(`/api/chat/conversations/${id}/purge/`, {
    method: "POST",
  })
}

export function traerConversacion(id: string, signal?: AbortSignal) {
  return fetchJson<ConversacionConMensajes>(`/api/chat/conversations/${id}/`, {
    signal,
  })
}

export async function borrarConversacion(id: string) {
  const respuesta = await fetch(`${API_BASE}/api/chat/conversations/${id}/`, {
    method: "DELETE",
  })
  if (!respuesta.ok) {
    throw new Error(`No se pudo borrar la conversación (${respuesta.status}).`)
  }
}

/**
 * Manda un mensaje y va entregando los eventos del servidor a medida que
 * llegan. El backend guarda tanto la pregunta como la respuesta.
 */
export async function* enviarMensaje(
  mensaje: string,
  conversacionId: string | null,
  signal: AbortSignal,
  /**
   * De qué puede hablar el asistente. `resume` es el chat de la hoja de vida,
   * que solo responde con lo que hay en el CV. Solo cuenta al abrir una
   * conversación nueva: después manda el alcance que quedó guardado en ella.
   */
  alcance: Alcance = "general",
  /**
   * Chat de WhatsApp que el consejero usa de contexto. Como el alcance, solo
   * cuenta al abrir una conversación nueva.
   */
  chatContextoId: number | null = null
): AsyncGenerator<EventoChat> {
  const respuesta = await fetch(`${API_BASE}/api/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: mensaje,
      scope: alcance,
      ...(conversacionId ? { conversation_id: conversacionId } : {}),
      ...(!conversacionId && chatContextoId
        ? { analysis_id: chatContextoId }
        : {}),
    }),
    signal,
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

  const lector = respuesta.body.getReader()
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
      const linea = bloque.split("\n").find((l) => l.startsWith("data:"))
      if (!linea) continue
      try {
        yield JSON.parse(linea.slice(5)) as EventoChat
      } catch {
        // Un bloque ilegible no debe tumbar la conversación.
      }
    }
  }
}

/**
 * Petición JSON que, si falla, lanza el `detail` del servidor: aquí el
 * mensaje importa (contraseña incorrecta, largo fuera de rango…).
 */
async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  })
  if (respuesta.status === 204) return undefined as T
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok) {
    throw new Error(
      datos?.detail ?? `El servidor respondió ${respuesta.status}.`
    )
  }
  return datos as T
}

export function traerEstadisticas(id: number, signal?: AbortSignal) {
  return pedir<EstadisticasChat>(`/api/chat/analyses/${id}/stats/`, {
    signal,
  })
}

/** Cambia la relación o quién es uno en el chat. */
export function actualizarChatContexto(
  id: number,
  cambios: { relationship?: Relacion | ""; me?: string; profile?: Perfil }
) {
  return pedir<ChatContexto>(`/api/chat/analyses/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(cambios),
  })
}

export function traerAjustes(signal?: AbortSignal) {
  return pedir<AjustesConsejero>("/api/chat/settings/", { signal })
}

export function guardarGroseria(nivel: NivelGroseria) {
  return pedir<AjustesConsejero>("/api/chat/settings/profanity/", {
    method: "PUT",
    body: JSON.stringify({ level: nivel }),
  })
}

export function guardarPersonalidad(personalidad: Personalidad) {
  return pedir<AjustesConsejero>("/api/chat/settings/personality/", {
    method: "PUT",
    body: JSON.stringify({ personality: personalidad }),
  })
}

/** "¿Te sirvió?" de una respuesta; `null` lo quita. */
export function valorarRespuesta(id: number, util: boolean | null) {
  return pedir<{ feedback: boolean | null }>(
    `/api/chat/messages/${id}/feedback/`,
    { method: "POST", body: JSON.stringify({ useful: util }) }
  )
}

export function cambiarIlimitados(clave: string, activo: boolean) {
  return pedir<AjustesConsejero>("/api/chat/settings/unlimited/", {
    method: "PUT",
    body: JSON.stringify({ password: clave, enabled: activo }),
  })
}

export function traerOpiniones(clave: string) {
  return pedir<Opiniones>("/api/chat/settings/feedback/", {
    method: "POST",
    body: JSON.stringify({ password: clave }),
  })
}

export function desbloquearAjustes(clave: string) {
  return pedir<void>("/api/chat/settings/unlock/", {
    method: "POST",
    body: JSON.stringify({ password: clave }),
  })
}

export function guardarLargo(clave: string, maxCaracteres: number) {
  return pedir<AjustesConsejero>("/api/chat/settings/length/", {
    method: "PUT",
    body: JSON.stringify({ password: clave, max_chars: maxCaracteres }),
  })
}
