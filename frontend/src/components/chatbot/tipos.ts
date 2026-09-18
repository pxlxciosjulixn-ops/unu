/** Contratos de `/api/chat/`. */

export type Rol = "user" | "assistant"

export type MensajeGuardado = {
  id: number
  role: Rol
  content: string
  created_at: string
}

export type Conversacion = {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
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
