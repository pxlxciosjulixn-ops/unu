/**
 * La hoja de vida que sirve el backend.
 *
 * Leerla es público (`GET /api/resume/`); guardarla exige sesión, así que las
 * escrituras van por `fetchConSesion`, que es el `fetch` con el token JWT.
 *
 * Los nombres de los campos se dejan tal como llegan de la API (`first_name`,
 * `skill_groups`): traducirlos a otro estilo solo agregaría un diccionario que
 * mantener cada vez que se agregue un campo.
 */
import { fetchJson } from "@/lib/api"
import { fetchConSesion } from "@/lib/auth"

export type Perfil = {
  first_name: string
  last_name: string
  title: string
  initials: string
  address: string
  phone: string
  email: string
  website: string
  website_label: string
  website_note: string
  summary: string
  show_reference_contacts: boolean
}

export type Highlight = { title: string; text: string }

export type GrupoDeHerramientas = { name: string; skills: string[] }

export type NivelIdioma = "nativo" | "avanzado" | "intermedio" | "basico"

export type Idioma = {
  name: string
  level: NivelIdioma
  /** Cómo se escribe el nivel en la hoja: "Nativo", "Intermedio"… */
  level_label: string
  /** Cuánto llena la barra, calculado en el servidor a partir del nivel. */
  percent: number
}

export type DatoPersonal = { label: string; value: string }

export type Referencia = {
  name: string
  relation: string
  phone: string
  email: string
}

export type Experiencia = {
  role: string
  company: string
  location: string
  /** Inicio y fin en formato AAAA-MM; `current` deja el cargo abierto. */
  start: string
  end: string
  current: boolean
  /** Lo calcula el servidor con las fechas: "jul. 2025 — Actualidad". */
  period: string
  bullets: string[]
  stack: string[]
}

export type Formacion = {
  title: string
  institution: string
  location: string
  year: string
  description: string
}

/** Las secciones que son listas; el perfil va aparte porque es uno solo. */
export type Secciones = {
  about: Highlight[]
  skill_groups: GrupoDeHerramientas[]
  languages: Idioma[]
  personal_details: DatoPersonal[]
  references: Referencia[]
  experiences: Experiencia[]
  education: Formacion[]
  certifications: Formacion[]
}

export type NombreDeSeccion = keyof Secciones

export type HojaDeVida = Secciones & { profile: Perfil }

/**
 * Topes de caracteres por campo y de elementos por lista (`max_items`).
 *
 * Los define el backend y los manda en la misma respuesta: el editor cuenta
 * con los mismos números con los que después valida el servidor.
 */
export type Limites = Record<string, Record<string, number>>

export type OpcionDeNivel = {
  value: NivelIdioma
  label: string
  percent: number
}

type RespuestaHojaDeVida = Partial<Secciones> & {
  profile: Perfil | null
  limits: Limites
  niveles_idioma: OpcionDeNivel[]
}

/** La hoja de vida publicada, o `null` en `profile` si nadie la ha guardado. */
export async function obtenerHojaDeVida(
  signal?: AbortSignal
): Promise<RespuestaHojaDeVida> {
  return fetchJson<RespuestaHojaDeVida>("/api/resume/", { signal })
}

export class ErrorAlGuardar extends Error {
  /** Errores por campo que devolvió la API, si los hay. */
  detalles: string[]

  constructor(mensaje: string, detalles: string[] = []) {
    super(mensaje)
    this.name = "ErrorAlGuardar"
    this.detalles = detalles
  }
}

/**
 * Aplana la respuesta de error de DRF a una lista de frases.
 *
 * Llega anidada de varias formas: `{"detail": "…"}`, `{"campo": ["…"]}` o,
 * en las listas, `{"0": {"campo": ["…"]}}`. Al editor le sirve la frase.
 */
function mensajesDeError(cuerpo: unknown, camino: string[] = []): string[] {
  if (typeof cuerpo === "string") {
    const donde = camino.filter((parte) => !/^\d+$/.test(parte)).join(" · ")
    const fila = camino.find((parte) => /^\d+$/.test(parte))
    const prefijo = [fila ? `#${Number(fila) + 1}` : "", donde]
      .filter(Boolean)
      .join(" ")
    return [prefijo ? `${prefijo}: ${cuerpo}` : cuerpo]
  }
  if (Array.isArray(cuerpo)) {
    return cuerpo.flatMap((item, i) =>
      mensajesDeError(item, [...camino, `${i}`])
    )
  }
  if (cuerpo && typeof cuerpo === "object") {
    return Object.entries(cuerpo).flatMap(([clave, valor]) =>
      mensajesDeError(valor, clave === "detail" ? camino : [...camino, clave])
    )
  }
  return []
}

async function guardar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const respuesta = await fetchConSesion(ruta, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  })

  if (respuesta.status === 401 || respuesta.status === 403) {
    throw new ErrorAlGuardar("Tu sesión venció. Vuelve a entrar para guardar.")
  }

  if (!respuesta.ok) {
    let detalles: string[] = []
    try {
      detalles = mensajesDeError(await respuesta.json())
    } catch {
      // Sin cuerpo útil queda el mensaje genérico de abajo.
    }
    throw new ErrorAlGuardar(
      detalles.length
        ? "Revisa los campos marcados."
        : `El servidor respondió ${respuesta.status}.`,
      detalles
    )
  }

  return (await respuesta.json()) as T
}

export async function guardarPerfil(perfil: Perfil): Promise<Perfil> {
  return guardar<Perfil>("/api/resume/profile/", perfil)
}

export async function guardarSeccion<N extends NombreDeSeccion>(
  nombre: N,
  elementos: Secciones[N]
): Promise<Secciones[N]> {
  return guardar<Secciones[N]>(`/api/resume/${nombre}/`, elementos)
}
