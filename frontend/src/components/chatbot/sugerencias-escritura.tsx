import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Lista de sugerencias encima de la caja de texto. */
export function SugerenciasEscritura({
  sugerencias,
  activa,
  onElegir,
  onResaltar,
}: {
  sugerencias: string[]
  /** La resaltada con las flechas del teclado; -1 si ninguna. */
  activa: number
  onElegir: (texto: string) => void
  onResaltar: (indice: number) => void
}) {
  if (sugerencias.length === 0) return null

  return (
    <div
      role="listbox"
      aria-label="Sugerencias"
      className="flex flex-col gap-0.5 rounded-2xl border bg-popover p-1.5 shadow-lg motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in"
    >
      {sugerencias.map((sugerencia, i) => (
        <button
          key={sugerencia}
          type="button"
          role="option"
          aria-selected={i === activa}
          // `onMouseDown` + `preventDefault`: elegir no le quita el foco a la
          // caja de texto.
          onMouseDown={(e) => {
            e.preventDefault()
            onElegir(sugerencia)
          }}
          onMouseEnter={() => onResaltar(i)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors",
            i === activa ? "bg-muted" : "hover:bg-muted"
          )}
        >
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{sugerencia}</span>
        </button>
      ))}
      <p className="px-3 pt-1 pb-0.5 text-[0.6875rem] text-muted-foreground">
        ↑ ↓ para moverte · Tab o Enter para elegir
      </p>
    </div>
  )
}
