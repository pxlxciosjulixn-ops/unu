/** Convierte "AAAA-MM" a un número de meses absoluto. */
function aMeses(valor: string) {
  const [anio, mes] = valor.split("-").map(Number)
  return anio * 12 + (mes - 1)
}

function mesActual() {
  const hoy = new Date()
  return hoy.getFullYear() * 12 + hoy.getMonth()
}

/** Meses entre inicio y fin, contando ambos meses. Sin fin, hasta hoy. */
export function mesesEntre(inicio: string, fin?: string) {
  const hasta = fin ? aMeses(fin) : mesActual()
  return Math.max(1, hasta - aMeses(inicio) + 1)
}

/** "1 año 3 meses", "8 meses", "2 años". */
export function formatearDuracion(meses: number) {
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  const partes = []

  if (anios > 0) partes.push(`${anios} ${anios === 1 ? "año" : "años"}`)
  if (resto > 0) partes.push(`${resto} ${resto === 1 ? "mes" : "meses"}`)

  return partes.join(" ")
}

/** Años completos desde el inicio más antiguo hasta hoy. */
export function aniosDesde(inicio: string) {
  return Math.floor(mesesEntre(inicio) / 12)
}
