export type Filtros = {
  /** Mes analizado, en formato AAAA-MM. Vacío = último mes con pedidos. */
  month: string
  /** Meses de la ventana de las gráficas. */
  months: number
  /** País del cliente (ISO de dos letras). Vacío = todos. */
  country: string
  /** Estado de los pedidos recientes. Vacío = todos. */
  orderStatus: string
}

export const FILTROS_INICIALES: Filtros = {
  month: "",
  months: 12,
  country: "",
  orderStatus: "",
}

/** Valor interno para la opción "todos" de los selectores. */
export const TODOS = "__todos__"
