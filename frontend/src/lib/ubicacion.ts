/**
 * Página de ubicación (trabajo de la U).
 *
 * `config` y `registrar` son públicos; `registros` pide sesión y se usa en la
 * página con login para el mapa.
 */
import { fetchJson } from "@/lib/api"
import { fetchConSesion } from "@/lib/auth"

export type TextosUbicacion = {
  aviso_titulo: string
  aviso_mensaje: string
  texto_final: string
}

export type RegistroUbicacion = {
  id: number
  ip: string
  ciudad: string
  region: string
  pais: string
  lat_ip: number | null
  lon_ip: number | null
  lat_gps: number | null
  lon_gps: number | null
  precision_gps: number | null
  tiene_gps: boolean
  user_agent: string
  created_at: string
}

/** Coordenadas del GPS; `null` si el navegador no las dio. */
export type Coordenadas = { lat: number; lon: number; precision: number } | null

export const TEXTOS_POR_DEFECTO: TextosUbicacion = {
  aviso_titulo: "Dale click en ver información",
  aviso_mensaje:
    "",
  texto_final:
    "",
}

export function traerTextos() {
  return fetchJson<TextosUbicacion>("/api/ubicacion/config/")
}

/** Guarda la visita. Solo se llama cuando la persona aceptó. */
export function registrarUbicacion(coords: Coordenadas) {
  return fetchJson<RegistroUbicacion>("/api/ubicacion/registrar/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      coords
        ? { lat: coords.lat, lon: coords.lon, precision: coords.precision }
        : {}
    ),
  })
}

/**
 * Pide el GPS del navegador. Devuelve `null` si no hay permiso, el equipo no
 * tiene GPS o se demora demasiado: en ese caso se guarda solo la IP.
 */
export function pedirGps(): Promise<Coordenadas> {
  return new Promise((resolver) => {
    if (!("geolocation" in navigator)) return resolver(null)
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolver({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          precision: pos.coords.accuracy,
        }),
      () => resolver(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

/** Las visitas registradas (necesita sesión). */
export async function traerRegistros(): Promise<RegistroUbicacion[]> {
  const respuesta = await fetchConSesion("/api/ubicacion/registros/")
  if (!respuesta.ok)
    throw new Error(`El servidor respondió ${respuesta.status}.`)
  return respuesta.json()
}

/** Las coordenadas que se muestran en el mapa: GPS si hay, si no las de la IP. */
export function coordenadasDe(r: RegistroUbicacion) {
  if (r.tiene_gps && r.lat_gps !== null && r.lon_gps !== null) {
    return { lat: r.lat_gps, lon: r.lon_gps, exacta: true }
  }
  if (r.lat_ip !== null && r.lon_ip !== null) {
    return { lat: r.lat_ip, lon: r.lon_ip, exacta: false }
  }
  return null
}
