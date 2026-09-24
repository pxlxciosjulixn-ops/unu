/**
 * Gastos e ingresos personales: tipos, llamadas a la API y los cálculos que
 * usa el dashboard.
 *
 * El backend devuelve la lista completa y aquí se agrupa por periodo y por
 * concepto; para un registro personal son pocas filas y así el dashboard no
 * necesita un endpoint por gráfica.
 */
import { ApiError, fetchJson } from "@/lib/api"

export const RUTA_API = "/api/finanzas/movimientos/"
export const RUTA_API_SUGERENCIAS = "/api/finanzas/sugerencias/"

/** Las tres páginas. No se enlazan desde ninguna otra parte del sitio. */
export const RUTAS_FINANZAS = {
  dashboard: "/dashboard/gastos/julian/palacios",
  formulario: "/formulario/gastos/julian/palacios",
  editar: "/editar/gastos/julian/palacios",
}

/**
 * Las sugerencias de verdad viven en el backend y se piden con
 * `listarSugerencias`; se agregan y se quitan desde la página de edición.
 *
 * Esta lista es solo el respaldo con el que arrancó la tabla: se usa mientras
 * la petición no ha llegado o si falló, para que el formulario nunca quede sin
 * sugerencias.
 */
export const CONCEPTOS_POR_DEFECTO = [
  "Mt15",
  "Nu",
  "Addi",
  "Comida",
  "Comida gatos",
  "Prestamo",
  "Abuelos",
  "Pago deuda",
  "Gasolina",
  "Mama",
]

export type Sugerencia = {
  id: number
  nombre: string
  created_at: string
}

/** Forma de comparar conceptos: sin tildes, en minúsculas, espacios simples. */
export function claveConcepto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
}

/**
 * El nombre de la sugerencia que coincida; si no, lo escrito sin espacios de
 * sobra. Es lo mismo que hace el backend al guardar, repetido aquí para poder
 * mostrar en la vista previa lo que va a quedar guardado.
 */
export function homogenizarConcepto(
  texto: string,
  sugerencias: string[] = CONCEPTOS_POR_DEFECTO
) {
  const limpio = texto.split(/\s+/).filter(Boolean).join(" ")
  return porClave(sugerencias).get(claveConcepto(limpio)) ?? limpio
}

// El índice se arma una vez por lista: `porConcepto` homogeniza cada
// movimiento y rehacerlo en cada llamada sería recorrer las sugerencias
// enteras por fila.
const indices = new WeakMap<string[], Map<string, string>>()

function porClave(sugerencias: string[]) {
  let indice = indices.get(sugerencias)
  if (!indice) {
    indice = new Map(sugerencias.map((n) => [claveConcepto(n), n]))
    indices.set(sugerencias, indice)
  }
  return indice
}

/** Los mismos topes que valida el modelo en Django. */
export const CONCEPTO_MAX = 100
export const VALOR_MAX = 999_999_999_999_999

export type Tipo = "gasto" | "ingreso"

export type Movimiento = {
  id: number
  /** AAAA-MM-DD, sin hora. */
  fecha: string
  tipo: Tipo
  concepto: string
  valor: number
  created_at: string
}

export type NuevoMovimiento = Pick<
  Movimiento,
  "fecha" | "tipo" | "concepto" | "valor"
>

/** Errores por campo del formulario. */
export type ErroresCampo = Partial<Record<keyof NuevoMovimiento, string>>

/**
 * Envía algo a la API y traduce el 429 del cupo por IP, que es el único error
 * con un mensaje que le sirve a quien está en la página.
 */
async function escribir<T>(path: string, method: string, datos?: unknown) {
  try {
    return await fetchJson<T>(path, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: datos === undefined ? undefined : JSON.stringify(datos),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      throw new Error("Demasiados cambios seguidos. Espera un minuto.", {
        cause: error,
      })
    }
    throw error
  }
}

export function crearMovimiento(datos: NuevoMovimiento) {
  return escribir<Movimiento>(RUTA_API, "POST", datos)
}

export function actualizarMovimiento(id: number, datos: NuevoMovimiento) {
  return escribir<Movimiento>(`${RUTA_API}${id}/`, "PUT", datos)
}

export function eliminarMovimiento(id: number) {
  return escribir<void>(`${RUTA_API}${id}/`, "DELETE")
}

export function crearSugerencia(nombre: string) {
  return escribir<Sugerencia>(RUTA_API_SUGERENCIAS, "POST", { nombre })
}

export function renombrarSugerencia(id: number, nombre: string) {
  return escribir<Sugerencia>(`${RUTA_API_SUGERENCIAS}${id}/`, "PATCH", {
    nombre,
  })
}

export function eliminarSugerencia(id: number) {
  return escribir<void>(`${RUTA_API_SUGERENCIAS}${id}/`, "DELETE")
}

/**
 * `fetchJson` descarta el cuerpo de las respuestas con error, así que para
 * poder marcar cada campo el formulario valida aquí primero, con las mismas
 * reglas del modelo.
 */
export function validar(datos: {
  fecha: string
  concepto: string
  valor: number | null
}): ErroresCampo {
  const errores: ErroresCampo = {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
    errores.fecha = "Elige la fecha."
  }
  const concepto = datos.concepto.trim()
  if (!concepto) errores.concepto = "Escribe el concepto."
  else if (concepto.length > CONCEPTO_MAX) {
    errores.concepto = `Máximo ${CONCEPTO_MAX} caracteres.`
  }
  if (datos.valor === null || datos.valor < 1) {
    errores.valor = "Escribe un valor mayor que cero."
  } else if (datos.valor > VALOR_MAX) {
    errores.valor = "El valor es demasiado grande."
  }
  return errores
}

// ---------------------------------------------------------------------------
// Fechas: siempre en hora local. `new Date("2026-09-21")` se lee en UTC y en
// Bogotá caería el día anterior, por eso aquí se arma a mano.
// ---------------------------------------------------------------------------

function aISO(fecha: Date) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0")
  const dia = String(fecha.getDate()).padStart(2, "0")
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export function hoyISO() {
  return aISO(new Date())
}

function aFecha(iso: string) {
  const [anio, mes, dia] = iso.split("-").map(Number)
  return new Date(anio, mes - 1, dia)
}

const fechaCorta = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})
const mesCorto = new Intl.DateTimeFormat("es-CO", { month: "short" })
const mesLargo = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
})

export function formatearFechaLocal(iso: string) {
  return fechaCorta.format(aFecha(iso))
}

// ---------------------------------------------------------------------------
// Campo de valor: se escribe con separador de miles.
// ---------------------------------------------------------------------------

const miles = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 })

/** "1.500.000" → 1500000. Vacío → null. */
export function leerValor(texto: string): number | null {
  const digitos = texto.replace(/\D/g, "")
  return digitos ? Number(digitos) : null
}

export function escribirValor(valor: number | null) {
  return valor === null ? "" : miles.format(valor)
}

// ---------------------------------------------------------------------------
// Periodos del dashboard
// ---------------------------------------------------------------------------

export type Periodo = "mes" | "3m" | "12m" | "todo"

export const PERIODOS: { valor: Periodo; etiqueta: string }[] = [
  { valor: "mes", etiqueta: "Este mes" },
  { valor: "3m", etiqueta: "3 meses" },
  { valor: "12m", etiqueta: "12 meses" },
  { valor: "todo", etiqueta: "Todo" },
]

/** Fechas incluidas, en AAAA-MM-DD; `null` es sin límite por ese lado. */
type Rango = { desde: string | null; hasta: string | null }

const MESES: Record<Exclude<Periodo, "todo">, number> = {
  mes: 1,
  "3m": 3,
  "12m": 12,
}

function inicioDeMes(mesesAtras: number) {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth() - mesesAtras, 1)
}

function diaAnterior(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - 1)
}

function rango(periodo: Periodo): Rango {
  if (periodo === "todo") return { desde: null, hasta: null }
  const desde = inicioDeMes(MESES[periodo] - 1)
  if (periodo === "mes") {
    // El mes completo: si se anotó algo con fecha de más adelante en el mes,
    // también cuenta.
    const fin = new Date(desde.getFullYear(), desde.getMonth() + 1, 0)
    return { desde: aISO(desde), hasta: aISO(fin) }
  }
  return { desde: aISO(desde), hasta: null }
}

/**
 * El mismo tramo justo antes, para comparar. El mes en curso se compara con
 * el mes pasado cortado en el mismo día: comparar 21 días contra un mes
 * entero siempre haría ver que se gastó menos.
 */
function rangoAnterior(periodo: Periodo): Rango | null {
  if (periodo === "todo") return null
  const meses = MESES[periodo]
  const desde = inicioDeMes(meses * 2 - 1)
  if (periodo === "mes") {
    const hoy = new Date()
    const finDeMes = new Date(desde.getFullYear(), desde.getMonth() + 1, 0)
    const corte = Math.min(hoy.getDate(), finDeMes.getDate())
    const hasta = new Date(desde.getFullYear(), desde.getMonth(), corte)
    return { desde: aISO(desde), hasta: aISO(hasta) }
  }
  return {
    desde: aISO(desde),
    hasta: aISO(diaAnterior(inicioDeMes(meses - 1))),
  }
}

function enRango(movimientos: Movimiento[], r: Rango) {
  // Las fechas AAAA-MM-DD se comparan bien como texto.
  return movimientos.filter(
    (m) =>
      (r.desde === null || m.fecha >= r.desde) &&
      (r.hasta === null || m.fecha <= r.hasta)
  )
}

export function filtrarPeriodo(movimientos: Movimiento[], periodo: Periodo) {
  return enRango(movimientos, rango(periodo))
}

/**
 * Movimientos del tramo anterior; `null` si no hay con qué comparar. Si el
 * registro empezó a mitad de ese tramo tampoco se compara: dos meses anotados
 * contra doce darían un "+400 %" que no dice nada.
 */
export function filtrarAnterior(movimientos: Movimiento[], periodo: Periodo) {
  const r = rangoAnterior(periodo)
  if (!r || r.desde === null) return null
  const primera = movimientos.reduce<string | null>(
    (min, m) => (min === null || m.fecha < min ? m.fecha : min),
    null
  )
  // El primer movimiento tiene que caer en el primer mes del tramo o antes.
  if (primera === null || primera.slice(0, 7) > r.desde.slice(0, 7)) return null
  return enRango(movimientos, r)
}

export function describirPeriodo(periodo: Periodo) {
  if (periodo === "mes") return mesLargo.format(new Date())
  if (periodo === "todo") return "Todo el historial"
  return `Desde ${mesLargo.format(aFecha(rango(periodo).desde!))}`
}

export function describirComparacion(periodo: Periodo) {
  if (periodo === "mes") {
    const pasado = inicioDeMes(1)
    const nombre = new Intl.DateTimeFormat("es-CO", { month: "long" }).format(
      pasado
    )
    return `vs. ${nombre} al mismo día`
  }
  if (periodo === "todo") return null
  return `vs. los ${MESES[periodo]} meses anteriores`
}

// ---------------------------------------------------------------------------
// Cálculos
// ---------------------------------------------------------------------------

export type Totales = {
  ingresos: number
  gastos: number
  balance: number
  /** Qué parte de lo que entró quedó sin gastar; null si no entró nada. */
  ahorroPct: number | null
}

export function totales(movimientos: Movimiento[]): Totales {
  let ingresos = 0
  let gastos = 0
  for (const m of movimientos) {
    if (m.tipo === "ingreso") ingresos += m.valor
    else gastos += m.valor
  }
  const balance = ingresos - gastos
  return {
    ingresos,
    gastos,
    balance,
    ahorroPct: ingresos > 0 ? (balance / ingresos) * 100 : null,
  }
}

/** Cambio porcentual; null si antes no había con qué comparar. */
export function variacion(actual: number, anterior: number | null | undefined) {
  if (anterior === null || anterior === undefined || anterior === 0) {
    return null
  }
  return ((actual - anterior) / Math.abs(anterior)) * 100
}

export type PuntoSerie = {
  clave: string
  etiqueta: string
  ingresos: number
  gastos: number
}

/**
 * Ingresos y gastos agrupados en el tiempo. Un solo mes se parte por día;
 * lo demás, por mes. Los tramos sin movimientos salen en cero, para que un mes
 * sin nada no desaparezca de la gráfica.
 */
export function serieTemporal(
  movimientos: Movimiento[],
  periodo: Periodo
): PuntoSerie[] {
  const porDia = periodo === "mes"
  const puntos = new Map<string, PuntoSerie>()
  const hoy = new Date()
  const fechas = movimientos.map((m) => m.fecha).sort()
  // Si hay fechas futuras anotadas, la serie llega hasta ellas.
  const ultima = fechas.at(-1)

  if (porDia) {
    const hasta = Math.max(
      hoy.getDate(),
      ultima ? Number(ultima.slice(8, 10)) : 0
    )
    for (let dia = 1; dia <= hasta; dia++) {
      const clave = String(dia).padStart(2, "0")
      puntos.set(clave, {
        clave,
        etiqueta: String(dia),
        ingresos: 0,
        gastos: 0,
      })
    }
  } else {
    const desde = rango(periodo).desde ?? fechas[0]
    if (!desde) return []
    const inicio = aFecha(desde)
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
    let fin = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    if (ultima && aFecha(ultima) > fin) fin = aFecha(ultima)
    const variosAnios = inicio.getFullYear() !== fin.getFullYear()

    while (cursor <= fin) {
      const clave = aISO(cursor).slice(0, 7)
      const nombre = mesCorto.format(cursor).replace(".", "")
      puntos.set(clave, {
        clave,
        etiqueta: variosAnios
          ? `${nombre} ${String(cursor.getFullYear()).slice(2)}`
          : nombre,
        ingresos: 0,
        gastos: 0,
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }

  for (const m of movimientos) {
    const clave = porDia ? m.fecha.slice(8, 10) : m.fecha.slice(0, 7)
    const punto = puntos.get(clave)
    if (!punto) continue
    if (m.tipo === "ingreso") punto.ingresos += m.valor
    else punto.gastos += m.valor
  }

  return [...puntos.values()]
}

/** La misma serie sumada de corrido: dónde va cada línea en cada punto. */
export function acumular(serie: PuntoSerie[]): PuntoSerie[] {
  let ingresos = 0
  let gastos = 0
  return serie.map((punto) => {
    ingresos += punto.ingresos
    gastos += punto.gastos
    return { ...punto, ingresos, gastos }
  })
}

export type GrupoConcepto = {
  concepto: string
  total: number
  veces: number
  pct: number
  /** La fila "Otros (n)", que junta varios conceptos. */
  agrupado?: boolean
}

/**
 * Movimientos de un tipo agrupados por concepto, de mayor a menor. "Mercado"
 * y "mercado" cuentan juntos; los conceptos fijos salen con su nombre de la
 * lista y los demás con la forma escrita más reciente.
 * Pasado el tope, lo demás se junta en "Otros".
 */
export function porConcepto(
  movimientos: Movimiento[],
  tipo: Tipo,
  tope = 5
): GrupoConcepto[] {
  const grupos = new Map<
    string,
    { concepto: string; total: number; veces: number }
  >()
  let total = 0

  // Vienen del más reciente al más viejo: el primero que aparece de cada
  // concepto es el que le da el nombre.
  for (const m of movimientos) {
    if (m.tipo !== tipo) continue
    total += m.valor
    const clave = claveConcepto(m.concepto)
    const grupo = grupos.get(clave)
    if (grupo) {
      grupo.total += m.valor
      grupo.veces += 1
    } else {
      grupos.set(clave, {
        concepto: homogenizarConcepto(m.concepto),
        total: m.valor,
        veces: 1,
      })
    }
  }

  const ordenados = [...grupos.values()].sort((a, b) => b.total - a.total)
  const visibles: Omit<GrupoConcepto, "pct">[] = ordenados.slice(0, tope)
  const resto = ordenados.slice(tope)
  if (resto.length) {
    visibles.push({
      agrupado: true,
      concepto: `Otros (${resto.length})`,
      total: resto.reduce((suma, g) => suma + g.total, 0),
      veces: resto.reduce((suma, g) => suma + g.veces, 0),
    })
  }

  return visibles.map((g) => ({
    ...g,
    pct: total > 0 ? (g.total / total) * 100 : 0,
  }))
}

export type DatosPeriodo = {
  /** Gasto dividido entre los días corridos del periodo hasta hoy. */
  promedioDiario: number
  dias: number
  mayorGasto: Movimiento | null
  mayorIngreso: Movimiento | null
  movimientos: number
  conceptosDeGasto: number
}

function diasEntre(desde: string, hasta: string) {
  const ms = aFecha(hasta).getTime() - aFecha(desde).getTime()
  return Math.round(ms / 86_400_000) + 1
}

export function datosPeriodo(
  movimientos: Movimiento[],
  periodo: Periodo
): DatosPeriodo {
  const hoy = hoyISO()
  const primera = movimientos.map((m) => m.fecha).sort()[0] ?? hoy
  const desde = rango(periodo).desde ?? primera
  const dias = Math.max(1, diasEntre(desde, hoy))

  let mayorGasto: Movimiento | null = null
  let mayorIngreso: Movimiento | null = null
  let gastos = 0
  const conceptos = new Set<string>()
  for (const m of movimientos) {
    if (m.tipo === "gasto") {
      gastos += m.valor
      conceptos.add(claveConcepto(m.concepto))
      if (!mayorGasto || m.valor > mayorGasto.valor) mayorGasto = m
    } else if (!mayorIngreso || m.valor > mayorIngreso.valor) {
      mayorIngreso = m
    }
  }

  return {
    promedioDiario: Math.round(gastos / dias),
    dias,
    mayorGasto,
    mayorIngreso,
    movimientos: movimientos.length,
    conceptosDeGasto: conceptos.size,
  }
}

// ---------------------------------------------------------------------------
// Filtro por concepto
// ---------------------------------------------------------------------------

/** Solo los movimientos de ese concepto; `null` es sin filtro. */
export function filtrarConcepto(
  movimientos: Movimiento[],
  concepto: string | null
) {
  if (!concepto) return movimientos
  const buscada = claveConcepto(concepto)
  return movimientos.filter((m) => claveConcepto(m.concepto) === buscada)
}

/**
 * Opciones del filtro: las sugerencias (siempre, aunque aún no tengan
 * movimientos) y aparte los demás conceptos que aparezcan en los datos, en
 * orden alfabético.
 */
export function opcionesDeConcepto(
  movimientos: Movimiento[],
  sugerencias: string[] = CONCEPTOS_POR_DEFECTO
) {
  const sugeridas = new Set(sugerencias.map(claveConcepto))
  const otros = new Map<string, string>()
  for (const m of movimientos) {
    const clave = claveConcepto(m.concepto)
    if (!sugeridas.has(clave) && !otros.has(clave)) {
      otros.set(clave, homogenizarConcepto(m.concepto, sugerencias))
    }
  }
  return {
    fijos: sugerencias,
    otros: [...otros.values()].sort((a, b) => a.localeCompare(b, "es-CO")),
  }
}
