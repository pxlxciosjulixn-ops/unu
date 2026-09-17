import type { Utilidad } from "@/components/dashboard/tipos"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { aNumero, formatearPesos, formatearPorcentaje } from "@/lib/format"

/** Aro de margen: igual que el de la imagen, pero en monocromo. */
function AroMargen({ margen }: { margen: number | null }) {
  const radio = 52
  const circunferencia = 2 * Math.PI * radio
  const avance = Math.min(Math.max(margen ?? 0, 0), 100) / 100

  return (
    <div className="relative mx-auto size-40">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radio}
          fill="none"
          strokeWidth="10"
          className="stroke-muted"
        />
        <circle
          cx="64"
          cy="64"
          r={radio}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - avance)}
          className="stroke-foreground"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {margen === null ? "—" : `${Math.round(margen)}%`}
        </span>
        <span className="text-xs text-muted-foreground">margen</span>
      </div>
    </div>
  )
}

/** Barra comparativa: la más alta marca el 100 % del ancho. */
function Barra({
  etiqueta,
  valor,
  maximo,
  tenue,
}: {
  etiqueta: string
  valor: number
  maximo: number
  tenue?: boolean
}) {
  const ancho = maximo > 0 ? Math.max((valor / maximo) * 100, 2) : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{etiqueta}</span>
        <span className="font-medium tabular-nums">{formatearPesos(valor)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={tenue ? "h-full rounded-full bg-muted-foreground/50" : "h-full rounded-full bg-foreground"}
          style={{ width: `${ancho}%` }}
        />
      </div>
    </div>
  )
}

export function ProfitCard({ datos }: { datos: Utilidad | null }) {
  if (!datos) {
    return (
      <Card id="utilidad" className="scroll-mt-20">
        <CardHeader className="border-b">
          <CardTitle>Utilidad</CardTitle>
          <CardDescription>Cargando…</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Skeleton className="mx-auto size-40 rounded-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    )
  }

  const ingresos = aNumero(datos.income)
  const gastos = aNumero(datos.expenses)
  const maximo = Math.max(ingresos, gastos)

  return (
    <Card id="utilidad" className="scroll-mt-20">
      <CardHeader className="border-b">
        <CardTitle>Utilidad</CardTitle>
        <CardDescription>{datos.month_label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <AroMargen margen={datos.margin_pct} />

        <div className="flex flex-col gap-4">
          <Barra etiqueta="Ingresos" valor={ingresos} maximo={maximo} />
          <Barra etiqueta="Gastos" valor={gastos} maximo={maximo} tenue />
        </div>

        <Separator />

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">Utilidad del mes</span>
          <span className="text-lg font-semibold tabular-nums">
            {formatearPesos(datos.profit)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Margen calculado sobre los ingresos pagados:{" "}
          {formatearPorcentaje(datos.margin_pct)}.
        </p>
      </CardContent>
    </Card>
  )
}
