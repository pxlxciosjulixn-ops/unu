/** Contratos de `/api/chat/`. */

export type Rol = "user" | "assistant"

/**
 * De qué habla el asistente en esa conversación: `general` es la página
 * /chatbot, `resume` el chat flotante de la hoja de vida, que solo responde
 * con lo que hay en el CV guardado en la base, y `finanzas` el asistente del
 * dashboard de gastos.
 */
export type Alcance = "general" | "resume" | "finanzas"

export type MensajeGuardado = {
  id: number
  role: Rol
  content: string
  created_at: string
}

export type Conversacion = {
  id: string
  title: string
  scope: Alcance
  created_at: string
  updated_at: string
  message_count: number
}

/**
 * Cuántos mensajes le quedan al visitante en este chat.
 *
 * `limit` y `remaining` vienen en `null` cuando ese chat no tiene tope; el
 * servidor es quien decide, la página solo lo muestra.
 */
export type Cupo = {
  used: number
  limit: number | null
  remaining: number | null
}

export type ConversacionConMensajes = Conversacion & {
  messages: MensajeGuardado[]
}

/** Mensaje en pantalla: puede estar a medio llegar. */
export type Mensaje = {
  id: string
  rol: Rol
  texto: string
  /** Solo para el que se está recibiendo en streaming. */
  enCurso?: boolean
}

export type EventoChat =
  | { type: "start"; conversation_id: string; title: string; model: string }
  /** El modelo empezó a razonar: todavía no hay texto, pero ya está trabajando. */
  | { type: "thinking" }
  | { type: "delta"; text: string }
  | { type: "done"; text: string }
  | { type: "error"; message: string }
