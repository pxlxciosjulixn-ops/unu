/**
 * Cliente de `/api/descargas/`.
 *
 * La descarga es un trabajo en el servidor: se crea, se consulta su avance
 * cada segundo y, cuando está listo, el MP3 se pide con un enlace normal. Así
 * ninguna petición queda abierta minutos (en Render se cortaría) y el archivo
 * no pasa por la memoria de la página.
 */
import { API_BASE } from "@/lib/api"

export type InfoCancion = {
  id: string
  titulo: string
  artista: string | null
  duracion: number | null
  miniatura: string | null
  /** Bitrate del mejor audio que entrega YouTube. */
  audio_kbps: number | null
  en_vivo: boolean
  /** Segundos: por encima de esto el servidor no la baja. */
  duracion_maxima: number
}

export type EstadoTrabajo =
  | { fase: "en_cola" | "bajando" | "convirtiendo"; progreso: number }
  | { fase: "listo"; progreso: number; nombre: string }
  | { fase: "error"; mensaje: string }

const RUTA = `${API_BASE}/api/descargas`

async function detalleDelError(respuesta: Response) {
  if (respuesta.status === 429) {
    return "Demasiadas descargas seguidas. Espera un minuto."
  }
  try {
    const cuerpo = (await respuesta.json()) as { detail?: string }
    if (cuerpo.detail) return cuerpo.detail
  } catch {
    // Sin cuerpo JSON: se usa el mensaje genérico.
  }
  return `El servidor respondió ${respuesta.status}.`
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${RUTA}${ruta}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error
    }
    throw new Error("No hay conexión con el servidor. Intenta de nuevo.", {
      cause: error,
    })
  }
  if (!respuesta.ok) throw new Error(await detalleDelError(respuesta))
  return (await respuesta.json()) as T
}

export function pedirInfo(url: string, signal?: AbortSignal) {
  return pedir<InfoCancion>("/info/", {
    method: "POST",
    body: JSON.stringify({ url }),
    signal,
  })
}

export async function crearTrabajo(url: string, calidad: number) {
  const { id } = await pedir<{ id: string }>("/trabajos/", {
    method: "POST",
    body: JSON.stringify({ url, calidad }),
  })
  return id
}

export function consultarTrabajo(id: string, signal?: AbortSignal) {
  return pedir<EstadoTrabajo>(`/trabajos/${id}/`, { signal })
}

/** Abre el MP3 listo: el servidor lo manda como adjunto y el navegador lo guarda. */
export function guardarArchivo(id: string) {
  const enlace = document.createElement("a")
  enlace.href = `${RUTA}/trabajos/${id}/archivo/`
  enlace.rel = "noopener"
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
}
