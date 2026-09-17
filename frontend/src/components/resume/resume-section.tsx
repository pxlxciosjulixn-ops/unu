import { cn } from "@/lib/utils"

/** Título de sección de la columna principal: mayúsculas y muy espaciado. */
export function SectionTitle({
  id,
  children,
  className,
}: {
  id?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      id={id}
      className={cn(
        "text-lg font-bold tracking-[0.18em] uppercase sm:text-xl",
        className
      )}
    >
      {children}
    </h2>
  )
}

/**
 * Título de sección de la columna lateral. Va sobre una barra blanca que llega
 * hasta los bordes de la columna, como en las hojas de vida impresas.
 */
export function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="-mx-6 bg-background px-6 py-2 text-sm font-bold tracking-[0.16em] uppercase sm:-mx-8 sm:px-8">
      {children}
    </h2>
  )
}
