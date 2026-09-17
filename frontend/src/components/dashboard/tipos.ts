/** Contratos de la API del dashboard (`/api/dashboard/...`). */

export type Tarjeta = {
  key: "revenue" | "orders" | "visits" | "avg_ticket"
  label: string
  value: number | string
  format: "currency" | "number"
  previous: number | string
  change_pct: number | null
  target: number | string | null
  target_pct: number | null
}

export type Resumen = {
  month: string
  month_label: string
  previous_month_label: string
  partial: boolean
  country: string
  targets_available: boolean
  cards: Tarjeta[]
}

export type PuntoVentas = {
  month: string
  label: string
  sales: number | string
  refunds: number | string
  orders: number
  target: number | string | null
  compliance_pct: number | null
  gap: number | string | null
}

export type SerieVentas = {
  months: number
  targets_available: boolean
  series: PuntoVentas[]
}

export type Utilidad = {
  month: string
  month_label: string
  income: number | string
  expenses: number | string
  profit: number | string
  margin_pct: number | null
  history: {
    month: string
    label: string
    income: number | string
    expenses: number | string
  }[]
}

export type Pais = {
  country: string
  country_code: string
  revenue: number | string
  orders: number
  share_pct: number
}

export type Paises = {
  total_revenue: number | string
  months: number
  from: string
  to: string
  results: Pais[]
}

export type Pedido = {
  code: string
  customer: string
  country: string
  country_code: string
  status: "paid" | "pending" | "refunded" | "failed"
  status_label: string
  payment_method: string
  payment_method_label: string
  total: string
  placed_at: string
}

export type Pedidos = {
  status: string
  results: Pedido[]
}

export type OpcionesFiltros = {
  months: { value: string; label: string }[]
  countries: { country: string; country_code: string; orders: number }[]
  order_statuses: { value: string; label: string }[]
  windows: number[]
}

export type Producto = {
  sku: string
  name: string
  category: string
  price: string
  status: "active" | "low_stock" | "out_of_stock"
  status_label: string
  units_sold: number
  revenue: string
}

export type PaginaProductos = {
  count: number
  next: string | null
  previous: string | null
  results: Producto[]
}

/** Respuesta de `/overview/`: todo el tablero en una sola llamada. */
export type Overview = {
  summary: Resumen
  sales: SerieVentas
  profit: Utilidad
  countries: Paises
  recent_orders: Pedidos
  filters: OpcionesFiltros
}
