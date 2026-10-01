/**
 * Gastos fijos: lo que se paga todos los meses (Mamá, arriendo…).
 *
 * Cada mes se debe el monto fijo. Un gasto con el concepto es un pago y lo va
 * llenando; un ingreso con el concepto es un préstamo de esa persona y se suma
 * a lo de ese mes. Lo que no se completa pasa al siguiente. Las cuentas las
 * hace el backend (`finanzas/fijos.py`).
 */
import { claveConcepto, escribir } from "@/components/finanzas/finanzas"

export const RUTA_API_FIJOS = "/api/finanzas/gastos-fijos/"

export type MesFijo = {
  /** AAAA-MM */
  mes: string
  /** Lo que venía de antes: positivo si faltó, negativo si quedó a favor. */
  arrastre: number
  monto: number
  prestado: number
  pagado: number
  total: number
  pendiente: number
}

/** Un pago por venir: de qué mes (AAAA-MM) y cuánto. */
export type ProximoPago = { mes: string; valor: number }

export type GastoFijo = {
  id: number
  nombre: string
  monto: number
  dia_pago: number | null
  fecha_inicio: string
  /** El último mes en que se debe; `null` es para siempre. */
  fecha_fin: string | null
  /** `null` si todavía no empieza (programado). */
  este_mes: MesFijo | null
  estado: "pagado" | "parcial" | "pendiente" | "programado" | "terminado"
  historial: MesFijo[]
  /** Lo que falta pagar este mes. */
  pendiente_mes: number
  /** El siguiente pago que toca: lo que falte de este mes, o el del otro. */
  proximo: ProximoPago | null
  /** Lo que se deberá el mes siguiente. */
  siguiente: number
  created_at: string
}

export type NuevoGastoFijo = Pick<
  GastoFijo,
  "nombre" | "monto" | "dia_pago" | "fecha_inicio" | "fecha_fin"
>

export function crearGastoFijo(datos: NuevoGastoFijo) {
  return escribir<GastoFijo>(RUTA_API_FIJOS, "POST", datos)
}

export function actualizarGastoFijo(id: number, datos: NuevoGastoFijo) {
  return escribir<GastoFijo>(`${RUTA_API_FIJOS}${id}/`, "PUT", datos)
}

export function eliminarGastoFijo(id: number) {
  return escribir<void>(`${RUTA_API_FIJOS}${id}/`, "DELETE")
}

/** El gasto fijo al que va un concepto, o `undefined`. */
export function fijoDe(
  concepto: string,
  fijos: GastoFijo[] | null | undefined
) {
  const clave = claveConcepto(concepto)
  return clave
    ? fijos?.find((f) => claveConcepto(f.nombre) === clave)
    : undefined
}

/**
 * Qué se muestra en la página de créditos. "Pendientes" es todo lo que aún
 * tiene algo por pagar (lo de Mamá sigue ahí aunque este mes ya esté pago,
 * porque el otro mes vuelve); "Ya pagados" es lo que se terminó: un crédito
 * en cero o algo de una sola vez que ya se pagó.
 */
export type Vista = "pendientes" | "pagados" | "todos"

export const VISTAS: { valor: Vista; etiqueta: string }[] = [
  { valor: "pendientes", etiqueta: "Pendientes" },
  { valor: "pagados", etiqueta: "Ya pagados" },
  { valor: "todos", etiqueta: "Todos" },
]

export function fijoTerminado(f: GastoFijo) {
  return f.estado === "terminado"
}

export function seVe(terminado: boolean, vista: Vista) {
  return vista === "todos" || (vista === "pagados") === terminado
}
