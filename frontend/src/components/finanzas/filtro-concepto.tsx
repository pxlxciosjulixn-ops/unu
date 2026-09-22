import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** Valor del ítem "todos": Select necesita un texto, no `null`. */
const TODOS = "__todos__"

/**
 * Filtro del dashboard por concepto. Con uno elegido, todo el dashboard
 * (tarjetas, gráficas, datos y tabla) muestra solo el dinero de ese concepto.
 */
export function FiltroConcepto({
  valor,
  opciones,
  onChange,
}: {
  valor: string | null
  opciones: { fijos: string[]; otros: string[] }
  onChange: (concepto: string | null) => void
}) {
  return (
    <Select
      value={valor ?? TODOS}
      onValueChange={(elegido: string | null) =>
        onChange(!elegido || elegido === TODOS ? null : elegido)
      }
    >
      <SelectTrigger
        size="sm"
        aria-label="Filtrar por concepto"
        className="w-full lg:w-48"
      >
        <SelectValue>
          {(elegido: string) =>
            elegido === TODOS ? "Todos los conceptos" : elegido
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={TODOS}>Todos los conceptos</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Fijos</SelectLabel>
          {opciones.fijos.map((concepto) => (
            <SelectItem key={concepto} value={concepto}>
              {concepto}
            </SelectItem>
          ))}
        </SelectGroup>
        {opciones.otros.length > 0 ? (
          <>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Otros</SelectLabel>
              {opciones.otros.map((concepto) => (
                <SelectItem key={concepto} value={concepto}>
                  {concepto}
                </SelectItem>
              ))}
            </SelectGroup>
          </>
        ) : null}
      </SelectContent>
    </Select>
  )
}
