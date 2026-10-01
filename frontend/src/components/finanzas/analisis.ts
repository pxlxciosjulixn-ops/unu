/**
 * Análisis sobre el historial completo: grupos, deudas, pagos que se repiten,
 * proyección del mes, presupuestos, gastos fuera de lo normal y las series de
 * las gráficas nuevas.
 *
 * Son las mismas reglas de `backend/finanzas/analisis.py` (el asistente y el
 * correo leen de allá): si se cambia una, hay que cambiar la otra.
 */
import {
  aFecha,
  aISO,
  claveConcepto,
  diasEntre,
  homogenizarConcepto,
  hoyISO,
  saldoAntesDe,
  type Grupo,
  type Movimiento,
  type Sugerencia,
  type Tipo,
  type Totales,
} from "@/components/finanzas/finanzas"

// ---------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------

/** "2026-09" de una fecha AAAA-MM-DD. */
export const claveMes = (fecha: string) => fecha.slice(0, 7)

export function mesActual() {
  return claveMes(hoyISO())
}

/** El mes `n` meses antes (o después, con `n` negativo). */
export function moverMes(mes: string, n: number) {
  const [anio, m] = mes.split("-").map(Number)
  return aISO(new Date(anio, m - 1 - n, 1)).slice(0, 7)
}

/** Los `n` meses que terminan en `hasta`, del más viejo al más nuevo. */
export function ultimosMeses(n: number, hasta = mesActual()) {
  return Array.from({ length: n }, (_, i) => moverMes(hasta, n - 1 - i))
}

export function diasDelMes(mes: string) {
  const [anio, m] = mes.split("-").map(Number)
  return new Date(anio, m, 0).getDate()
}

const formatoMes = new Intl.DateTimeFormat("es-CO", { month: "short" })
const formatoMesLargo = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
})

/** "sep" o "sep 25" si hace falta el año. */
export function etiquetaMes(mes: string, conAnio = false) {
  const fecha = aFecha(`${mes}-01`)
  const nombre = formatoMes.format(fecha).replace(".", "")
  return conAnio ? `${nombre} ${String(fecha.getFullYear()).slice(2)}` : nombre
}

export function nombreMesLargo(mes: string) {
  return formatoMesLargo.format(aFecha(`${mes}-01`))
}

function mediana(valores: number[]) {
  const orden = [...valores].sort((a, b) => a - b)
  const mitad = Math.floor(orden.length / 2)
  return orden.length % 2 ? orden[mitad] : (orden[mitad - 1] + orden[mitad]) / 2
}

function primerMes(movimientos: Movimiento[]) {
  let min: string | null = null
  for (const m of movimientos) if (min === null || m.fecha < min) min = m.fecha
  return min === null ? null : claveMes(min)
}

// ---------------------------------------------------------------------------
// Grupos
// ---------------------------------------------------------------------------

/** Con qué grupo arranca cada concepto conocido mientras llegan las sugerencias. */
const GRUPOS_CONOCIDOS: Record<string, Grupo> = {
  mt15: "deuda",
  nu: "deuda",
  addi: "deuda",
  comida: "comida",
  "comida gatos": "mascotas",
  prestamo: "deuda",
  abuelos: "familia",
  "pago deuda": "deuda",
  gasolina: "transporte",
  mama: "familia",
  indrive: "transporte",
  luckyplata: "deuda",
  solventa: "deuda",
  cerveza: "gustos",
  cigarrillos: "gustos",
}

export type MapaGrupos = Map<string, Grupo>

export function mapaDeGrupos(sugerencias: Sugerencia[] | null | undefined) {
  if (!sugerencias) return new Map(Object.entries(GRUPOS_CONOCIDOS))
  return new Map(sugerencias.map((s) => [claveConcepto(s.nombre), s.grupo]))
}

export function grupoDe(concepto: string, mapa: MapaGrupos): Grupo {
  return mapa.get(claveConcepto(concepto)) ?? "otro"
}

// ---------------------------------------------------------------------------
// Por mes
// ---------------------------------------------------------------------------

export type MesResumen = {
  clave: string
  etiqueta: string
  ingresos: number
  gastos: number
  balance: number
  grupos: Record<Grupo, number>
}

const GRUPOS_EN_CERO = (): Record<Grupo, number> => ({
  deuda: 0,
  familia: 0,
  comida: 0,
  transporte: 0,
  mascotas: 0,
  hogar: 0,
  gustos: 0,
  otro: 0,
})

/** Ingresos, gastos y gasto por grupo de cada uno de los últimos `n` meses. */
export function resumenPorMes(
  movimientos: Movimiento[],
  mapa: MapaGrupos,
  n = 12,
  hasta = mesActual()
): MesResumen[] {
  const meses = ultimosMeses(n, hasta)
  const variosAnios = meses[0].slice(0, 4) !== meses.at(-1)!.slice(0, 4)
  const porClave = new Map<string, MesResumen>(
    meses.map((clave) => [
      clave,
      {
        clave,
        etiqueta: etiquetaMes(clave, variosAnios),
        ingresos: 0,
        gastos: 0,
        balance: 0,
        grupos: GRUPOS_EN_CERO(),
      },
    ])
  )
  for (const m of movimientos) {
    const mes = porClave.get(claveMes(m.fecha))
    if (!mes) continue
    if (m.tipo === "ingreso") mes.ingresos += m.valor
    else {
      mes.gastos += m.valor
      mes.grupos[grupoDe(m.concepto, mapa)] += m.valor
    }
  }
  for (const mes of porClave.values()) mes.balance = mes.ingresos - mes.gastos
  return [...porClave.values()]
}

/** Los meses desde el primero con datos: los de antes son ceros que confunden. */
export function desdeElPrimero(meses: MesResumen[], movimientos: Movimiento[]) {
  const primero = primerMes(movimientos)
  return primero ? meses.filter((m) => m.clave >= primero) : []
}

/**
 * Promedio de los últimos `n` meses cerrados con datos; `null` sin ninguno.
 * Va junto a la comparación con el mes anterior, que sola engaña.
 */
export function promedioMeses(
  movimientos: Movimiento[],
  n = 3
): Totales | null {
  const meses = desdeElPrimero(
    resumenPorMes(movimientos, new Map(), n, moverMes(mesActual(), 1)),
    movimientos
  )
  if (!meses.length) return null
  const ingresos = meses.reduce((s, m) => s + m.ingresos, 0) / meses.length
  const gastos = meses.reduce((s, m) => s + m.gastos, 0) / meses.length
  const balance = ingresos - gastos
  return {
    ingresos: Math.round(ingresos),
    gastos: Math.round(gastos),
    balance: Math.round(balance),
    ahorroPct: ingresos > 0 ? (balance / ingresos) * 100 : null,
  }
}

// ---------------------------------------------------------------------------
// Lo que se repite y la proyección del mes
// ---------------------------------------------------------------------------

export type Recurrente = {
  concepto: string
  clave: string
  tipo: Tipo
  /** Lo típico de un mes: la mediana de los meses en que hubo. */
  monto: number
  meses: number
  pagadoEsteMes: number
  /** Cuántas veces sale en un mes típico: 1 o 2 es un pago fijo. */
  vecesAlMes: number
  /** Lo que falta para llegar a lo típico (un sueldo por quincenas). */
  pendiente: number
}

/**
 * Lo que aparece casi todos los meses: en 3 de los últimos 4 meses cerrados,
 * o en todos si el historial es más corto (y por lo menos 2).
 */
export function recurrentes(movimientos: Movimiento[], mes = mesActual()) {
  const primero = primerMes(movimientos)
  if (!primero) return []
  const meses = ultimosMeses(4, moverMes(mes, 1)).filter((m) => m >= primero)
  if (meses.length < 2) return []
  const umbral = meses.length >= 4 ? 3 : meses.length

  const porConcepto = new Map<
    string,
    {
      tipo: Tipo
      clave: string
      nombre: string
      porMes: Map<string, number>
      vecesPorMes: Map<string, number>
    }
  >()
  for (const m of movimientos) {
    const mesM = claveMes(m.fecha)
    if (mesM < meses[0] || mesM > mes) continue
    const clave = claveConcepto(m.concepto)
    const llave = `${m.tipo}:${clave}`
    let item = porConcepto.get(llave)
    if (!item) {
      item = {
        tipo: m.tipo,
        clave,
        nombre: homogenizarConcepto(m.concepto),
        porMes: new Map(),
        vecesPorMes: new Map(),
      }
      porConcepto.set(llave, item)
    }
    item.porMes.set(mesM, (item.porMes.get(mesM) ?? 0) + m.valor)
    item.vecesPorMes.set(mesM, (item.vecesPorMes.get(mesM) ?? 0) + 1)
  }

  const lista: Recurrente[] = []
  for (const item of porConcepto.values()) {
    const enMeses = meses
      .map((m) => item.porMes.get(m) ?? 0)
      .filter((v) => v > 0)
    if (enMeses.length < umbral) continue
    lista.push({
      concepto: item.nombre,
      clave: item.clave,
      tipo: item.tipo,
      monto: Math.round(mediana(enMeses)),
      meses: enMeses.length,
      pagadoEsteMes: item.porMes.get(mes) ?? 0,
      vecesAlMes: Math.round(
        mediana(
          meses.map((m) => item.vecesPorMes.get(m) ?? 0).filter((v) => v > 0)
        )
      ),
      pendiente: Math.max(
        0,
        Math.round(mediana(enMeses)) - (item.porMes.get(mes) ?? 0)
      ),
    })
  }
  return lista.sort((a, b) => b.monto - a.monto)
}

export type Proyeccion = {
  /** Lo que sobró de los meses anteriores y entra a este. */
  saldoAnterior: number
  ingresos: number
  gastos: number
  ingresosFinal: number
  gastosFinal: number
  balanceFinal: number
  ritmoDiario: number
  diasRestantes: number
  pendientes: Recurrente[]
}

/**
 * Cómo cerraría el mes en curso. De lo que se repite cada mes se suma lo
 * que falta para lo típico; el resto del gasto se estira al ritmo diario que
 * lleva el mes, mezclado con el de los 3 meses anteriores hasta la quincena
 * (los primeros días ese ritmo dice poco).
 */
export function proyeccion(
  movimientos: Movimiento[],
  recs: Recurrente[]
): Proyeccion {
  const hoy = aFecha(hoyISO())
  const mes = mesActual()
  const dia = hoy.getDate()
  const fijos = new Set(
    recs.filter((r) => r.tipo === "gasto").map((r) => r.clave)
  )

  let ingresos = 0
  let gastos = 0
  let variable = 0
  for (const m of movimientos) {
    if (claveMes(m.fecha) !== mes) continue
    if (m.tipo === "ingreso") ingresos += m.valor
    else {
      gastos += m.valor
      if (!fijos.has(claveConcepto(m.concepto))) variable += m.valor
    }
  }
  let ritmo = variable / dia

  const desde = moverMes(mes, 3)
  let historico = 0
  let primeraFecha: string | null = null
  for (const m of movimientos) {
    if (primeraFecha === null || m.fecha < primeraFecha) primeraFecha = m.fecha
    const mesM = claveMes(m.fecha)
    if (mesM < desde || mesM >= mes || m.tipo !== "gasto") continue
    if (!fijos.has(claveConcepto(m.concepto))) historico += m.valor
  }
  // Días entre el inicio del tramo (o el primer registro) y el 1 de este mes.
  const inicioHist =
    primeraFecha && primeraFecha > `${desde}-01` ? primeraFecha : `${desde}-01`
  const diasHist = diasEntre(inicioHist, `${mes}-01`) - 1
  if (diasHist > 0) {
    const peso = Math.min(dia / 15, 1)
    ritmo = ritmo * peso + (historico / diasHist) * (1 - peso)
  }

  const diasRestantes = diasDelMes(mes) - dia
  const saldoAnterior = saldoAntesDe(movimientos, `${mes}-01`)
  const pendientes = recs.filter((r) => r.pendiente > 0)
  const pendienteDe = (tipo: Tipo) =>
    pendientes
      .filter((r) => r.tipo === tipo)
      .reduce((s, r) => s + r.pendiente, 0)
  const ingresosFinal = ingresos + pendienteDe("ingreso")
  const gastosFinal = Math.round(
    gastos + ritmo * diasRestantes + pendienteDe("gasto")
  )
  return {
    saldoAnterior,
    ingresos,
    gastos,
    ingresosFinal,
    gastosFinal,
    balanceFinal: saldoAnterior + ingresosFinal - gastosFinal,
    ritmoDiario: Math.round(ritmo),
    diasRestantes,
    pendientes,
  }
}

// ---------------------------------------------------------------------------
// Presupuestos
// ---------------------------------------------------------------------------

export type EstadoPresupuesto = {
  id: number
  concepto: string
  tope: number
  gastado: number
  pct: number
}

/** Cada concepto con tope y lo que lleva en ese mes, del más pasado al menos. */
export function presupuestos(
  movimientos: Movimiento[],
  sugerencias: Sugerencia[],
  mes: string
): EstadoPresupuesto[] {
  const gastado = new Map<string, number>()
  for (const m of movimientos) {
    if (m.tipo !== "gasto" || claveMes(m.fecha) !== mes) continue
    const clave = claveConcepto(m.concepto)
    gastado.set(clave, (gastado.get(clave) ?? 0) + m.valor)
  }
  return sugerencias
    .filter((s) => s.presupuesto)
    .map((s) => {
      const total = gastado.get(claveConcepto(s.nombre)) ?? 0
      return {
        id: s.id,
        concepto: s.nombre,
        tope: s.presupuesto!,
        gastado: total,
        pct: (total / s.presupuesto!) * 100,
      }
    })
    .sort((a, b) => b.pct - a.pct)
}

/** Lo que se suele gastar al mes en un concepto (últimos 3 meses con datos). */
export function promedioConcepto(movimientos: Movimiento[], concepto: string) {
  const clave = claveConcepto(concepto)
  const meses = ultimosMeses(3, moverMes(mesActual(), 1))
  const primero = primerMes(movimientos)
  const conDatos = meses.filter((m) => primero && m >= primero)
  if (!conDatos.length) return null
  let total = 0
  for (const m of movimientos) {
    if (m.tipo !== "gasto" || !conDatos.includes(claveMes(m.fecha))) continue
    if (claveConcepto(m.concepto) === clave) total += m.valor
  }
  return Math.round(total / conDatos.length)
}

// ---------------------------------------------------------------------------
// Fuera de lo normal
// ---------------------------------------------------------------------------

export type Anomalia = { movimiento: Movimiento; usual: number; veces: number }

/**
 * Gastos recientes de por lo menos el doble de lo usual en su concepto (la
 * mediana de los demás, con 3 o más para comparar) y 20 000 por encima.
 */
export function fueraDeLoNormal(movimientos: Movimiento[], dias = 60) {
  const porConcepto = new Map<string, Movimiento[]>()
  for (const m of movimientos) {
    if (m.tipo !== "gasto") continue
    const clave = claveConcepto(m.concepto)
    porConcepto.set(clave, [...(porConcepto.get(clave) ?? []), m])
  }
  const hoy = aFecha(hoyISO())
  const desde = aISO(
    new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - dias)
  )

  const raros: Anomalia[] = []
  for (const lista of porConcepto.values()) {
    if (lista.length < 4) continue
    for (const m of lista) {
      if (m.fecha < desde) continue
      const usual = mediana(
        lista.filter((o) => o.id !== m.id).map((o) => o.valor)
      )
      if (m.valor >= usual * 2 && m.valor - usual >= 20_000) {
        raros.push({
          movimiento: m,
          usual: Math.round(usual),
          veces: m.valor / usual,
        })
      }
    }
  }
  return raros.sort((a, b) =>
    b.movimiento.fecha.localeCompare(a.movimiento.fecha)
  )
}

// ---------------------------------------------------------------------------
// Calendario, días de la semana y acumulado
// ---------------------------------------------------------------------------

export type DiaCalendario = { fecha: string; gasto: number; futuro: boolean }

/** Las últimas `semanas` semanas, columna por semana, de lunes a domingo. */
export function calendario(movimientos: Movimiento[], semanas = 26) {
  const porDia = new Map<string, number>()
  for (const m of movimientos)
    if (m.tipo === "gasto")
      porDia.set(m.fecha, (porDia.get(m.fecha) ?? 0) + m.valor)

  const hoy = aFecha(hoyISO())
  const lunes = (hoy.getDay() + 6) % 7
  const inicio = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() - lunes - (semanas - 1) * 7
  )
  const hoyIso = hoyISO()
  const columnas: DiaCalendario[][] = []
  let maximo = 0
  for (let s = 0; s < semanas; s++) {
    const columna: DiaCalendario[] = []
    for (let d = 0; d < 7; d++) {
      const fecha = aISO(
        new Date(
          inicio.getFullYear(),
          inicio.getMonth(),
          inicio.getDate() + s * 7 + d
        )
      )
      const gasto = porDia.get(fecha) ?? 0
      maximo = Math.max(maximo, gasto)
      columna.push({ fecha, gasto, futuro: fecha > hoyIso })
    }
    columnas.push(columna)
  }
  return { columnas, maximo }
}

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

/**
 * Gasto promedio de cada día de la semana en los últimos `meses` meses, sin
 * los pagos fijos (lo que sale 1 o 2 veces al mes): un pago de Nu que cae un
 * lunes no dice nada de los lunes. La comida de todos los días sí cuenta.
 */
export function porDiaSemana(
  movimientos: Movimiento[],
  recs: Recurrente[],
  meses = 6
) {
  const fijos = new Set(
    recs
      .filter((r) => r.tipo === "gasto" && r.vecesAlMes <= 2)
      .map((r) => r.clave)
  )
  const hoy = aFecha(hoyISO())
  const primero = movimientos.reduce<string | null>(
    (a, m) => (a === null || m.fecha < a ? m.fecha : a),
    null
  )
  const limite = aISO(
    new Date(hoy.getFullYear(), hoy.getMonth() - meses, hoy.getDate())
  )
  const desde = primero && primero > limite ? primero : limite

  const totales = Array(7).fill(0)
  const cuantos = Array(7).fill(0)
  const cursor = aFecha(desde)
  while (cursor <= hoy) {
    cuantos[(cursor.getDay() + 6) % 7]++
    cursor.setDate(cursor.getDate() + 1)
  }
  for (const m of movimientos) {
    if (m.tipo !== "gasto" || m.fecha < desde || m.fecha > hoyISO()) continue
    if (fijos.has(claveConcepto(m.concepto))) continue
    totales[(aFecha(m.fecha).getDay() + 6) % 7] += m.valor
  }
  return DIAS_SEMANA.map((dia, i) => ({
    dia,
    promedio: cuantos[i] ? Math.round(totales[i] / cuantos[i]) : 0,
  }))
}

export type PuntoAcumulado = {
  dia: number
  actual: number | null
  anterior: number | null
}

/**
 * Lo que se lleva gastado (o el balance) día a día este mes contra el mes
 * pasado. El mes en curso se corta en hoy.
 */
export function acumuladoComparado(
  movimientos: Movimiento[],
  medida: "gastos" | "balance",
  mes = mesActual()
): PuntoAcumulado[] {
  const pasado = moverMes(mes, 1)
  const hoy = hoyISO()
  const dias = Math.max(diasDelMes(mes), diasDelMes(pasado))
  const diarioActual = Array(dias + 1).fill(0)
  const diarioAnterior = Array(dias + 1).fill(0)
  for (const m of movimientos) {
    const mesM = claveMes(m.fecha)
    if (mesM !== mes && mesM !== pasado) continue
    const signo =
      m.tipo === "gasto"
        ? medida === "gastos"
          ? 1
          : -1
        : medida === "gastos"
          ? 0
          : 1
    const destino = mesM === mes ? diarioActual : diarioAnterior
    destino[Number(m.fecha.slice(8, 10))] += signo * m.valor
  }
  let actual = 0
  let anterior = 0
  const puntos: PuntoAcumulado[] = []
  for (let d = 1; d <= dias; d++) {
    actual += diarioActual[d]
    anterior += diarioAnterior[d]
    const fecha = `${mes}-${String(d).padStart(2, "0")}`
    puntos.push({
      dia: d,
      actual:
        d <= diasDelMes(mes) && (mes !== claveMes(hoy) || fecha <= hoy)
          ? actual
          : null,
      anterior: d <= diasDelMes(pasado) ? anterior : null,
    })
  }
  return puntos
}

// ---------------------------------------------------------------------------
// Comparar meses y concepto en el tiempo
// ---------------------------------------------------------------------------

export type FilaComparacion = {
  concepto: string
  a: number
  b: number
  diferencia: number
}

/** Cada concepto de un tipo en dos meses, de la mayor diferencia a la menor. */
export function compararMeses(
  movimientos: Movimiento[],
  mesA: string,
  mesB: string,
  tipo: Tipo
): FilaComparacion[] {
  const filas = new Map<string, FilaComparacion>()
  for (const m of movimientos) {
    if (m.tipo !== tipo) continue
    const mes = claveMes(m.fecha)
    if (mes !== mesA && mes !== mesB) continue
    const clave = claveConcepto(m.concepto)
    let fila = filas.get(clave)
    if (!fila) {
      fila = {
        concepto: homogenizarConcepto(m.concepto),
        a: 0,
        b: 0,
        diferencia: 0,
      }
      filas.set(clave, fila)
    }
    if (mes === mesA) fila.a += m.valor
    else fila.b += m.valor
  }
  for (const fila of filas.values()) fila.diferencia = fila.b - fila.a
  return [...filas.values()].sort(
    (x, y) => Math.abs(y.diferencia) - Math.abs(x.diferencia)
  )
}

/** Gasto e ingreso de un solo concepto en los últimos 12 meses. */
export function historialConcepto(movimientos: Movimiento[], concepto: string) {
  const clave = claveConcepto(concepto)
  const delConcepto = movimientos.filter(
    (m) => claveConcepto(m.concepto) === clave
  )
  return desdeElPrimero(resumenPorMes(delConcepto, new Map(), 12), movimientos)
}
