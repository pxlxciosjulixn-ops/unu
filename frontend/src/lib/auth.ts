/**
 * Tokens JWT del frontend.
 *
 * Se guardan en `localStorage`, que es lo simple y sirve para este caso: la
 * sesión sobrevive a recargar la página. La contra es que un script inyectado
 * en el sitio podría leerlos; la alternativa (cookies `httpOnly`) obliga a
 * manejar CSRF y dominios cruzados, y aquí no hay nada crítico detrás del
 * login. Si algún día hay datos sensibles, ese es el cambio que toca.
 */
import { API_BASE } from "@/lib/api"

const CLAVE_ACCESO = "unu.jwt.access"
const CLAVE_REFRESCO = "unu.jwt.refresh"

export type Usuario = {
  username: string
  first_name: string
  email: string
  is_staff: boolean
}

type Tokens = { access: string; refresh: string }

/** Cualquier acceso a `localStorage` puede fallar (modo privado, cookies bloqueadas). */
function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave)
  } catch {
    return null
  }
}

function escribir(clave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, valor)
  } catch {
    // Sin almacenamiento la sesión solo dura lo que dure la pestaña.
  }
}

export const tokens = {
  acceso: () => leer(CLAVE_ACCESO),
  refresco: () => leer(CLAVE_REFRESCO),
  guardar({ access, refresh }: Tokens) {
    escribir(CLAVE_ACCESO, access)
    escribir(CLAVE_REFRESCO, refresh)
  },
  borrar() {
    escribir(CLAVE_ACCESO, null)
    escribir(CLAVE_REFRESCO, null)
  },
}

export class ErrorDeLogin extends Error {}

/** Pide los tokens con usuario y contraseña. */
export async function iniciarSesion(
  username: string,
  password: string
): Promise<{ tokens: Tokens; usuario: Usuario }> {
  const respuesta = await fetch(`${API_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })

  if (respuesta.status === 401) {
    throw new ErrorDeLogin("Usuario o contraseña incorrectos.")
  }
  if (respuesta.status === 429) {
    throw new ErrorDeLogin("Demasiados intentos. Espera un momento.")
  }
  if (!respuesta.ok) {
    throw new ErrorDeLogin(`El servidor respondió ${respuesta.status}.`)
  }

  const datos = (await respuesta.json()) as Tokens & { user: Usuario }
  const nuevos = { access: datos.access, refresh: datos.refresh }
  tokens.guardar(nuevos)
  return { tokens: nuevos, usuario: datos.user }
}

/** Cambia el refresco por un acceso nuevo. Devuelve false si ya no sirve. */
export async function renovarAcceso(): Promise<boolean> {
  const refresco = tokens.refresco()
  if (!refresco) return false

  const respuesta = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refresco }),
  })

  if (!respuesta.ok) {
    tokens.borrar()
    return false
  }

  const datos = (await respuesta.json()) as { access: string; refresh?: string }
  tokens.guardar({
    access: datos.access,
    // Con la rotación activada llega un refresco nuevo; el viejo queda inválido.
    refresh: datos.refresh ?? refresco,
  })
  return true
}

/**
 * `fetch` con el token puesto. Si el acceso ya expiró, lo renueva una vez y
 * repite la petición; así la sesión no se corta a mitad de uso.
 */
export async function fetchConSesion(
  path: string,
  init: RequestInit = {},
  reintentar = true
): Promise<Response> {
  const acceso = tokens.acceso()
  const cabeceras = new Headers(init.headers)
  if (acceso) cabeceras.set("Authorization", `Bearer ${acceso}`)

  const respuesta = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: cabeceras,
  })

  if (respuesta.status === 401 && reintentar && (await renovarAcceso())) {
    return fetchConSesion(path, init, false)
  }

  return respuesta
}

/** Quién es el dueño del token guardado, o null si no hay sesión válida. */
export async function usuarioActual(): Promise<Usuario | null> {
  if (!tokens.acceso() && !tokens.refresco()) return null

  const respuesta = await fetchConSesion("/api/auth/me/")
  if (!respuesta.ok) {
    tokens.borrar()
    return null
  }
  return (await respuesta.json()) as Usuario
}

/** Cierra la sesión: invalida el refresco en el servidor y bota los tokens. */
export async function cerrarSesion(): Promise<void> {
  const refresco = tokens.refresco()
  try {
    await fetchConSesion("/api/auth/logout/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refresco }),
    })
  } catch {
    // Si el servidor no responde, igual se cierra del lado del navegador.
  } finally {
    tokens.borrar()
  }
}
