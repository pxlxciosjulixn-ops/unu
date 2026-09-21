import { ReceiptTextIcon } from "lucide-react"

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

export function SinMovimientos({
  texto = "No hay movimientos en este periodo.",
  className,
}: {
  texto?: string
  className?: string
}) {
  return (
    <Empty className={cn("border", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ReceiptTextIcon />
        </EmptyMedia>
        <EmptyTitle>Sin datos</EmptyTitle>
        <EmptyDescription>{texto}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
