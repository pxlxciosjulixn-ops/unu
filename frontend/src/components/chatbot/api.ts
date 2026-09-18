import type {
  Alcance,
  Conversacion,
  Cupo,
  ConversacionConMensajes,
  EventoChat,
} from "@/components/chatbot/tipos"
import { API_BASE, fetchJson } from "@/lib/api"

export function listarConversaciones(signal?: AbortSignal) {
  return fetchJson<{ results: Conversacion[]; quota: Cupo }>(
    "/api/chat/conversations/",
    { signal }
  )
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
  alcance: Alcance = "general"
): AsyncGenerator<EventoChat> {
  const respuesta = await fetch(`${API_BASE}/api/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: mensaje,
      scope: alcance,
      ...(conversacionId ? { conversation_id: conversacionId } : {}),
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
