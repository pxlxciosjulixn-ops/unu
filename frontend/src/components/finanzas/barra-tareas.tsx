import * as React from "react"

import { useSidebar } from "@/components/ui/sidebar"

const hora = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
})

function useHora() {
  const [ahora, setAhora] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])
  return hora.format(ahora)
}

const RELIEVE =
  "shadow-[inset_-1px_-1px_#0a0a0a,inset_1px_1px_#ffffff,inset_-2px_-2px_#808080,inset_2px_2px_#dfdfdf]"
const HUNDIDO = "shadow-[inset_-1px_-1px_#ffffff,inset_1px_1px_#808080]"

/**
 * La barra de tareas de Windows 98 al pie de las páginas en estilo Y2K. El
 * botón Inicio abre y cierra la barra lateral; al lado va la ventana actual
 * y el reloj.
 */
export function BarraTareas({ titulo }: { titulo: string }) {
  const { toggleSidebar } = useSidebar()
  const ahora = useHora()

  return (
    <div
      className={`sticky bottom-0 z-20 mt-auto flex h-10 shrink-0 items-center gap-1.5 bg-[var(--y2k-plata)] px-1.5 text-sm text-foreground print:hidden ${RELIEVE}`}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        className={`flex h-7 items-center gap-1.5 bg-[var(--y2k-plata)] px-2 font-bold active:shadow-[inset_1px_1px_#0a0a0a,inset_-1px_-1px_#ffffff] ${RELIEVE}`}
      >
        <span aria-hidden className="grid size-4 grid-cols-2 gap-px">
          <span className="bg-[#e4352a]" />
          <span className="bg-[#3aa935]" />
          <span className="bg-[#1c63c9]" />
          <span className="bg-[#f6c400]" />
        </span>
        Inicio
      </button>
      <span
        className={`flex h-7 max-w-56 min-w-0 flex-1 items-center truncate bg-[#e4e4e4] px-2 font-bold text-black dark:bg-[#2a2433] dark:text-white ${HUNDIDO}`}
      >
        {titulo}
      </span>
      <span
        className={`ml-auto flex h-7 items-center px-3 tabular-nums ${HUNDIDO}`}
      >
        {ahora}
      </span>
    </div>
  )
}
