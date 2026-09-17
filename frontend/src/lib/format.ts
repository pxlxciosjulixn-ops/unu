/** Formatos en español de Colombia, compartidos por todo el dashboard. */

const pesos = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
})

const pesosCompacto = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
})

const numero = new Intl.NumberFormat("es-CO")

const fechaCorta = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

const fechaHora = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
})

/** Acepta números y los decimales que DRF serializa como texto. */
function aNumero(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined) return 0
  return typeof valor === "number" ? valor : Number(valor)
}

export function formatearPesos(valor: number | string | null | undefined) {
  return pesos.format(aNumero(valor))
}

export function formatearPesosCompacto(valor: number | string | null | undefined) {
  return pesosCompacto.format(aNumero(valor))
}

export function formatearNumero(valor: number | string | null | undefined) {
  return numero.format(aNumero(valor))
}

export function formatearPorcentaje(
  valor: number | null | undefined,
  decimales = 1
) {
  if (valor === null || valor === undefined) return "—"
  return `${valor.toFixed(decimales).replace(".", ",")} %`
}

export function formatearFecha(iso: string) {
  return fechaCorta.format(new Date(iso))
}

export function formatearFechaHora(iso: string) {
  return fechaHora.format(new Date(iso))
}

export { aNumero }
