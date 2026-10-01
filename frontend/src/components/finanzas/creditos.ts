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

export type TipoCargo = "intereses" | "manejo" | "seguro" | "mora" | "otro"

export const TIPOS_CARGO: { valor: TipoCargo; etiqueta: string }[] = [
  { valor: "intereses", etiqueta: "Intereses" },
  { valor: "manejo", etiqueta: "Cuota de manejo" },
  { valor: "seguro", etiqueta: "Seguro" },
  { valor: "mora", etiqueta: "Intereses de mora" },
  { valor: "otro", etiqueta: "Otro cargo" },
]

/**
 * Lo que la entidad le suma a la deuda sin que entre plata (intereses,
 * manejo, seguro…). No es un movimiento: no toca ingresos ni gastos.
 */
export type CargoCredito = {
  id: number
  fecha: string
  tipo: TipoCargo
  valor: number
  nota: string
  created_at: string
}

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
  /**
   * Qué % de cada pago se va en intereses y seguros ("64.22"); `null` si todo
   * va a capital.
   */
  costo_pct: string | null
  /** Todo lo pagado (los gastos con el concepto). */
  abonado: number
  /** De lo pagado, lo que fue a capital: lo único que baja la deuda. */
  capital_abonado: number
  /** De lo pagado, lo que se fue en intereses y seguros. */
  costos_en_pagos: number
  avances: number
  /** Lo que falta de la cuota de este mes. */
  pendiente_mes: number
  /** El siguiente pago: lo que falte de este mes, o la cuota del otro. */
  proximo: { mes: string; valor: number } | null
  /** La cuota del mes siguiente (menos si ya se va a terminar de pagar). */
  siguiente: number
  /** Suma de los cargos: intereses, manejo, seguro… */
  total_cargos: number
  cargos: CargoCredito[]
  saldo: number
  ultimo_movimiento: string | null
  created_at: string
}

export type NuevoCredito = Pick<
  Credito,
  | "nombre"
  | "saldo_inicial"
  | "fecha_inicio"
  | "cupo"
  | "cuota"
  | "tasa_ea"
  | "costo_pct"
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

export function crearCargo(
  creditoId: number,
  datos: Pick<CargoCredito, "fecha" | "tipo" | "valor" | "nota">
) {
  return escribir<CargoCredito>(
    `${RUTA_API_CREDITOS}${creditoId}/cargos/`,
    "POST",
    datos
  )
}

export function eliminarCargo(id: number) {
  return escribir<void>(`/api/finanzas/cargos/${id}/`, "DELETE")
}

/** Tasa mensual (0,02 = 2 %) de una efectiva anual en % ("26.82"). */
export function tasaMensual(tasaEa: string | null) {
  if (tasaEa === null) return null
  return (1 + Number(tasaEa) / 100) ** (1 / 12) - 1
}

/**
 * Cuántos meses faltan pagando la cuota, con los intereses si se sabe la
 * tasa. `Infinity` si la cuota no alcanza ni para los intereses.
 */
export function mesesParaPagar(c: Credito) {
  if (!c.cuota || c.saldo <= 0) return null
  // Con el % de costos se sabe cuánto de la cuota baja la deuda de verdad.
  if (c.costo_pct !== null) {
    const capital = aCapital(c.cuota, c.costo_pct)
    return capital <= 0 ? Infinity : Math.ceil(c.saldo / capital)
  }
  const r = tasaMensual(c.tasa_ea)
  if (!r) return Math.ceil(c.saldo / c.cuota)
  if (c.cuota <= c.saldo * r) return Infinity
  return Math.ceil(-Math.log(1 - (r * c.saldo) / c.cuota) / Math.log(1 + r))
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

/** La parte de un pago que va a capital, según el % que se va en costos. */
export function aCapital(valor: number, costoPct: string | null) {
  return valor - Math.round((valor * Number(costoPct ?? 0)) / 100)
}

/**
 * Cuánto mueve el saldo un movimiento: un gasto (pago) lo baja solo por su
 * parte de capital; un ingreso (avance) lo sube entero.
 */
export function efecto(
  tipo: Tipo,
  valor: number,
  costoPct: string | null = null
) {
  return tipo === "gasto" ? -aCapital(valor, costoPct) : valor
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
        saldo += efecto(m.tipo, m.valor, credito.costo_pct)
      }
      for (const cargo of credito.cargos) {
        if (cargo.fecha.slice(0, 7) <= mes) saldo += cargo.valor
      }
      punto[`c${credito.id}`] = saldo
    }
    return punto
  })
}
