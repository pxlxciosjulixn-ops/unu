import { FilterXIcon } from "lucide-react"

import {
  FILTROS_INICIALES,
  TODOS,
  type Filtros,
} from "@/components/dashboard/filtros"
import type { OpcionesFiltros } from "@/components/dashboard/tipos"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"


function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
      {children}
    </label>
  )
}

export function FiltersBar({
  opciones,
  filtros,
  onChange,
}: {
  opciones: OpcionesFiltros | null
  filtros: Filtros
  onChange: (filtros: Filtros) => void
}) {
  const hayFiltros =
    filtros.month !== "" ||
    filtros.country !== "" ||
    filtros.orderStatus !== "" ||
    filtros.months !== FILTROS_INICIALES.months

  if (!opciones) {
    return (
      <div className="flex flex-wrap gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-40" />
        ))}
      </div>
    )
  }

  const mesActual = filtros.month || opciones.months[0]?.value || ""
  const etiquetaMes = (valor: string) =>
    opciones.months.find((m) => m.value === valor)?.label ?? valor
  const etiquetaPais = (valor: string) =>
    valor === TODOS
      ? "Todos los países"
      : (opciones.countries.find((p) => p.country_code === valor)?.country ??
        valor)
  const etiquetaEstado = (valor: string) =>
    valor === TODOS
      ? "Todos los estados"
      : (opciones.order_statuses.find((e) => e.value === valor)?.label ?? valor)

  return (
    <div className="flex flex-wrap items-end gap-3 sm:gap-4">
      <Campo etiqueta="Mes">
        <Select
          value={mesActual}
          onValueChange={(valor: string | null) =>
            onChange({ ...filtros, month: valor ?? "" })
          }
        >
          <SelectTrigger aria-label="Mes" className="w-44">
            <SelectValue>{(valor) => etiquetaMes(String(valor))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {opciones.months.map((mes) => (
                <SelectItem key={mes.value} value={mes.value}>
                  {mes.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Campo>

      <Campo etiqueta="Ventana">
        <ToggleGroup
          variant="outline"
          size="sm"
          value={[String(filtros.months)]}
          onValueChange={(valores: string[]) => {
            const valor = Number(valores[0])
            if (valor) onChange({ ...filtros, months: valor })
          }}
          aria-label="Meses de la ventana"
        >
          {opciones.windows.map((meses) => (
            <ToggleGroupItem key={meses} value={String(meses)}>
              {meses} m
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Campo>

      <Campo etiqueta="País">
        <Select
          value={filtros.country || TODOS}
          onValueChange={(valor: string | null) =>
            onChange({
              ...filtros,
              country: !valor || valor === TODOS ? "" : valor,
            })
          }
        >
          <SelectTrigger aria-label="País" className="w-44">
            <SelectValue>{(valor) => etiquetaPais(String(valor))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={TODOS}>Todos los países</SelectItem>
              {opciones.countries.map((pais) => (
                <SelectItem key={pais.country_code} value={pais.country_code}>
                  {pais.country}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Campo>

      <Campo etiqueta="Estado del pedido">
        <Select
          value={filtros.orderStatus || TODOS}
          onValueChange={(valor: string | null) =>
            onChange({
              ...filtros,
              orderStatus: !valor || valor === TODOS ? "" : valor,
            })
          }
        >
          <SelectTrigger aria-label="Estado del pedido" className="w-44">
            <SelectValue>{(valor) => etiquetaEstado(String(valor))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={TODOS}>Todos los estados</SelectItem>
              {opciones.order_statuses.map((estado) => (
                <SelectItem key={estado.value} value={estado.value}>
                  {estado.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Campo>

      {hayFiltros ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(FILTROS_INICIALES)}
        >
          <FilterXIcon data-icon="inline-start" />
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  )
}
