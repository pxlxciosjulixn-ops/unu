/**
 * Créditos: cuánto se debe en Nu, Addi, Mt15, Solventa, LuckyPlata…
 *
 * El saldo no se anota aparte: sale de los movimientos con el mismo concepto
 * desde la fecha en que se registró el crédito. Un gasto con ese concepto es
 * un abono y baja la deuda; un ingreso es un avance y la sube. El backend
 * devuelve el saldo ya calculado; aquí se repite la regla solo para dibujar
 * cómo fue cambiando y para avisar en el formulario antes de guardar.
 */
import {
  claveConcepto,
  escribir,
  type Movimiento,
  type Tipo,
} from "@/components/finanzas/finanzas"

export const RUTA_API_CREDITOS = "/api/finanzas/creditos/"

export type Credito = {
  id: number
  nombre: string
  saldo_inicial: number
  /** AAAA-MM-DD: los movimientos de este día en adelante mueven el saldo. */
  fecha_inicio: string
  cupo: number | null
  cuota: number | null
  /** Tasa efectiva anual en %, como texto ("26.82"); `null` si no se sabe. */
  tasa_ea: string | null
  abonado: number
  avances: number
  saldo: number
  ultimo_movimiento: string | null
  created_at: string
}

export type NuevoCredito = Pick<
  Credito,
  "nombre" | "saldo_inicial" | "fecha_inicio" | "cupo" | "cuota" | "tasa_ea"
>

export function crearCredito(datos: NuevoCredito) {
  return escribir<Credito>(RUTA_API_CREDITOS, "POST", datos)
}

export function actualizarCredito(id: number, datos: NuevoCredito) {
  return escribir<Credito>(`${RUTA_API_CREDITOS}${id}/`, "PUT", datos)
}

export function eliminarCredito(id: number) {
  return escribir<void>(`${RUTA_API_CREDITOS}${id}/`, "DELETE")
}

/** El crédito al que va un concepto, o `undefined` si no es de ninguno. */
export function creditoDe(
  concepto: string,
  creditos: Credito[] | null | undefined
) {
  const clave = claveConcepto(concepto)
  return clave
    ? creditos?.find((c) => claveConcepto(c.nombre) === clave)
    : undefined
}

/** Los movimientos que mueven el saldo de un crédito, del más viejo al nuevo. */
export function movimientosDe(credito: Credito, movimientos: Movimiento[]) {
  const clave = claveConcepto(credito.nombre)
  return movimientos
    .filter(
      (m) =>
        m.fecha >= credito.fecha_inicio && claveConcepto(m.concepto) === clave
    )
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
}

/** Cuánto mueve el saldo un movimiento: los gastos lo bajan, los avances lo suben. */
export function efecto(tipo: Tipo, valor: number) {
  return tipo === "gasto" ? -valor : valor
}

/**
 * Saldo de cada crédito al cierre de cada mes, desde el primero registrado
 * hasta el actual. Antes de su fecha de inicio un crédito va en `null`.
 */
export function serieSaldos(
  creditos: Credito[],
  movimientos: Movimiento[],
  meses: string[]
) {
  const porCredito = creditos.map((c) => ({
    credito: c,
    movimientos: movimientosDe(c, movimientos),
  }))
  return meses.map((mes) => {
    const punto: Record<string, string | number | null> = { mes }
    for (const { credito, movimientos: propios } of porCredito) {
      if (credito.fecha_inicio.slice(0, 7) > mes) {
        punto[`c${credito.id}`] = null
        continue
      }
      let saldo = credito.saldo_inicial
      for (const m of propios) {
        if (m.fecha.slice(0, 7) > mes) break
        saldo += efecto(m.tipo, m.valor)
      }
      punto[`c${credito.id}`] = saldo
    }
    return punto
  })
}
