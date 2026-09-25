/** Contratos de `/api/chat/`. */

export type Rol = "user" | "assistant"

/**
 * De qué habla el asistente en esa conversación: `general` es la página
 * /chatbot, `resume` el chat flotante de la hoja de vida, que solo responde
 * con lo que hay en el CV guardado en la base, y `finanzas` el asistente del
 * dashboard de gastos. `consejos` es el consejero de relaciones de /chatbot: el
 * servidor lo asigna solo cuando la conversación arranca con un chat de
 * WhatsApp como contexto.
 */
export type Alcance = "general" | "resume" | "finanzas" | "consejos"

/**
 * Un chat de WhatsApp exportado que el visitante subió. El servidor solo
 * devuelve los que subió desde su propia IP.
 */
export type ChatContexto = {
  id: number
  name: string
  participants: string[]
  message_count: number
  since: string
  until: string
  /** Qué es la otra persona para quien subió el chat; vacío si no lo dijo. */
  relationship: Relacion | ""
  /** Lo que contó al importarlo (preguntas, desde cuándo, si es todo el chat). */
  profile: Perfil
  /** Días desde que hablan, según la fecha que dio; `null` si no la dio. */
  days_talking: number | null
  /** Cómo aparece en el chat quien lo subió ("Tú" en iPhone en español). */
  me: string
  /** El export no traía "Tú": hay que preguntar cuál participante es uno. */
  needs_me: boolean
  created_at: string
}

export type Perfil = {
  respuestas?: { pregunta: string; respuesta: string }[]
  /** Desde cuándo hablan, `AAAA-MM-DD`. */
  desde?: string
  /** Si el archivo es toda la conversación o solo una parte. */
  completo?: boolean
}

export type Relacion =
  | "amistad"
  | "pareja"
  | "me_gusta"
  | "amante"
  | "ex"
  | "familia"
  | "trabajo"
  | "otra"

export type MensajeGuardado = {
  id: number
  role: Rol
  content: string
  created_at: string
  /** "¿Te sirvió?": `true` 👍, `false` 👎, `null` sin respuesta. */
  feedback: boolean | null
}

export type Conversacion = {
  id: string
  title: string
  scope: Alcance
  /** El chat de WhatsApp que usa de contexto; `null` si no tiene o se borró. */
  analysis: { id: number; name: string } | null
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
  /** Id en la base; sin él no se puede valorar la respuesta. */
  servidorId?: number
  opinion?: boolean | null
}

export type EventoChat =
  | { type: "start"; conversation_id: string; title: string; model: string }
  /** El modelo empezó a razonar: todavía no hay texto, pero ya está trabajando. */
  | { type: "thinking" }
  | { type: "delta"; text: string }
  | { type: "done"; text: string; message_id?: number }
  | { type: "error"; message: string }

/** Estadísticas de un chat de WhatsApp, calculadas sin el modelo. */
export type EstadisticasChat = {
  total_messages: number
  first: string
  last: string
  span_days: number
  active_days: number
  avg_per_active_day: number
  busiest_hour: number
  /** Quién subió el chat y si aparece en él. */
  me: string
  me_known: boolean
  /** Con quién habla (en un grupo, el que más escribe de los demás). */
  other: string | null
  participants: {
    name: string
    is_me: boolean
    messages: number
    share: number
    words_avg: number
    /** Mediana de lo que tarda en contestar; `null` si nunca contestó. */
    median_reply_minutes: number | null
    starts: number
    questions: number
    laughs: number
    plans: number
  }[]
  /** Con más de 90 días la serie viene por semanas. */
  granularity: "day" | "week"
  /** `me`: mensajes de quien subió el chat; `others`: los del resto. */
  series: { date: string; me: number; others: number }[]
  /** Mensajes por hora del día, de 0 a 23. */
  hours: number[]
  /** Mensajes por día de la semana, de lunes (0) a domingo (6). */
  weekdays: number[]
  /** Mensajes por día de la semana (filas, lunes primero) y hora (columnas). */
  heatmap: number[][]
  /** Nombres de los rangos de tiempo de respuesta ("< 1 min"…). */
  reply_buckets: string[]
  /** Por persona: cuántas respuestas caen en cada rango. */
  reply_times: Record<string, number[]>
  top_words: Record<string, { word: string; count: number }[]>
  top_emojis: { emoji: string; count: number }[]
  /** `null` si no se sabe quién es quién en el chat. */
  interest: InteresChat | null
}

/** Nivel de interés de la otra persona, calculado con reglas en el backend. */
export type InteresChat = {
  score: number
  summary: string
  other: string
  for: string[]
  against: string[]
}

export type NivelGroseria = "suave" | "normal" | "sin_filtro"

export type Personalidad =
  "consejero" | "amigo" | "psicologo" | "abuela" | "coach" | "chismosa"

export type AjustesConsejero = {
  /** Esta conexión no tiene tope de mensajes (lo activa el dueño). */
  unlimited: boolean
  profanity: NivelGroseria
  personality: Personalidad
  max_chars: number
  min_chars: number
  max_chars_limit: number
}

/** Cuántos 👍 y 👎 lleva un grupo (una personalidad, un nivel…). */
export type GrupoOpiniones = {
  key: string
  name: string
  up: number
  down: number
}

export type Opiniones = {
  total: number
  up: number
  down: number
  people: number
  by_personality: GrupoOpiniones[]
  by_profanity: GrupoOpiniones[]
}
