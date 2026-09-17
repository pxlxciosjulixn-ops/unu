/**
 * Cliente mínimo de la API del backend.
 *
 * La URL base sale de `VITE_API_URL`; en local, si no está definida, se usa el
 * puerto por defecto de `manage.py runserver`.
 */
const BASE = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "")

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const respuesta = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
    ...init,
  })

  if (!respuesta.ok) {
    throw new ApiError(
      `La API respondió ${respuesta.status} en ${path}`,
      respuesta.status
    )
  }

  return (await respuesta.json()) as T
}

export { BASE as API_BASE }
