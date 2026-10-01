import * as React from "react"
import { CheckIcon } from "lucide-react"

import {
  mesActual,
  moverMes,
  nombreMesLargo,
} from "@/components/finanzas/analisis"
import type { Credito } from "@/components/finanzas/creditos"
import type { GastoFijo } from "@/components/finanzas/fijos"
import {
  escribir,
  escribirValor,
  hoyISO,
  leerValor,
  VALOR_MAX,
  type Movimiento,
} from "@/components/finanzas/finanzas"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useApi } from "@/hooks/use-api"
import { formatearPesos } from "@/lib/format"
import { cn } from "@/lib/utils"

const RUTA_CONFIGURACION = "/api/finanzas/configuracion/"

type Configuracion = { salario: number | null; updated_at: string }
type Pago = { nombre: string; valor: number }

/**
 * Cuánto quedaría a fin del mes siguiente: lo que hay hoy (todo lo que entró
 * menos todo lo que salió), más el salario, menos lo que falta pagar este mes
 * y menos las cuotas y gastos fijos del siguiente.
 *
 * No cuenta lo del día a día (comida, gasolina…): es lo que queda libre para
 * eso.
 */
export function Simulacion({
  creditos,
  fijos,
  movimientos,
}: {
  creditos: Credito[] | null
  fijos: GastoFijo[] | null
  movimientos: Movimiento[] | null
}) {
  const configuracion = useApi<Configuracion>(RUTA_CONFIGURACION)
  const actual = mesActual()
  const siguiente = moverMes(actual, -1)

  const cuentas = React.useMemo(() => {
    if (!creditos || !fijos || !movimientos) return null
    const hoy = hoyISO()
    const tienes = movimientos.reduce(
      (s, m) =>
        m.fecha > hoy ? s : s + (m.tipo === "ingreso" ? m.valor : -m.valor),
      0
    )
    const todos = [...creditos, ...fijos]
    const faltaEsteMes: Pago[] = todos
      .filter((x) => x.pendiente_mes > 0)
      .map((x) => ({ nombre: x.nombre, valor: x.pendiente_mes }))
    const delSiguiente: Pago[] = todos
      .filter((x) => x.siguiente > 0)
      .map((x) => ({ nombre: x.nombre, valor: x.siguiente }))
    const suma = (lista: Pago[]) => lista.reduce((s, p) => s + p.valor, 0)
    return {
      tienes,
      faltaEsteMes,
      delSiguiente,
      totalFalta: suma(faltaEsteMes),
      totalSiguiente: suma(delSiguiente),
    }
  }, [creditos, fijos, movimientos])

  const salario = configuracion.data?.salario ?? 0
  const quedaria = cuentas
    ? cuentas.tienes + salario - cuentas.totalFalta - cuentas.totalSiguiente
    : 0

  return (
    <Card id="simulacion" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>¿Cuánto me queda?</CardTitle>
        <CardDescription className="first-letter:uppercase">
          Simulación a fin de {nombreMesLargo(siguiente)}, con lo que hay hoy,
          el salario y todo lo que hay que pagar
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!cuentas || configuracion.cargando ? (
          <Skeleton className="h-56 w-full" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <dl className="flex flex-col gap-2 text-sm">
              <Fila
                titulo="Tienes hoy"
                detalle="Todo lo que entró menos todo lo que salió"
                valor={cuentas.tienes}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 py-1">
                <dt className="flex flex-col">
                  <span className="first-letter:uppercase">
                    + Salario de {nombreMesLargo(siguiente)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Se guarda para la próxima vez
                  </span>
                </dt>
                <dd>
                  <CampoSalario
                    key={configuracion.data?.updated_at ?? "nuevo"}
                    inicial={configuracion.data?.salario ?? null}
                    onGuardado={configuracion.recargar}
                  />
                </dd>
              </div>
              <Fila
                titulo={`− Falta pagar en ${nombreMesLargo(actual)}`}
                valor={-cuentas.totalFalta}
              />
              <Fila
                titulo={`− Pagos de ${nombreMesLargo(siguiente)}`}
                detalle="Cuotas de créditos y gastos fijos"
                valor={-cuentas.totalSiguiente}
              />
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t pt-3">
                <dt className="font-medium first-letter:uppercase">
                  Te quedaría a fin de {nombreMesLargo(siguiente)}
                </dt>
                <dd
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    quedaria < 0 && "text-destructive"
                  )}
                >
                  {formatearPesos(quedaria)}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-4">
              <ListaPagos
                titulo={`Falta de ${nombreMesLargo(actual)}`}
                pagos={cuentas.faltaEsteMes}
                vacio="Todo lo de este mes está pagado."
              />
              <ListaPagos
                titulo={`Pagos de ${nombreMesLargo(siguiente)}`}
                pagos={cuentas.delSiguiente}
                vacio="Nada programado para el otro mes."
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        No cuenta lo del día a día (comida, gasolina…): lo que te quede es para
        eso. Los créditos sin cuota registrada no entran.
      </CardFooter>
    </Card>
  )
}

function Fila({
  titulo,
  detalle,
  valor,
}: {
  titulo: string
  detalle?: string
  valor: number
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="flex flex-col">
        <span className="first-letter:uppercase">{titulo}</span>
        {detalle ? (
          <span className="text-xs text-muted-foreground">{detalle}</span>
        ) : null}
      </dt>
      <dd className="font-medium tabular-nums">{formatearPesos(valor)}</dd>
    </div>
  )
}

function ListaPagos({
  titulo,
  pagos,
  vacio,
}: {
  titulo: string
  pagos: Pago[]
  vacio: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground first-letter:uppercase">
        {titulo}
      </p>
      {pagos.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckIcon className="size-4" />
          {vacio}
        </p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {pagos.map((p) => (
            <li key={p.nombre} className="flex justify-between gap-3 py-1.5">
              <span className="truncate">{p.nombre}</span>
              <span className="tabular-nums">{formatearPesos(p.valor)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** El salario: se guarda en el servidor al salir del campo o con Enter. */
function CampoSalario({
  inicial,
  onGuardado,
}: {
  inicial: number | null
  onGuardado: () => void
}) {
  const [valor, setValor] = React.useState<number | null>(inicial)
  const [guardando, setGuardando] = React.useState(false)

  async function guardar() {
    if (valor === inicial) return
    setGuardando(true)
    try {
      await escribir(RUTA_CONFIGURACION, "PUT", { salario: valor })
      onGuardado()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <InputGroup className="w-44">
      <InputGroupAddon>
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        inputMode="numeric"
        value={escribirValor(valor)}
        onChange={(e) => {
          const leido = leerValor(e.target.value)
          if (leido === null || leido <= VALOR_MAX) setValor(leido)
        }}
        onBlur={() => void guardar()}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        placeholder="Tu salario"
        aria-label="Salario mensual"
        className="text-right tabular-nums"
      />
      {guardando ? (
        <InputGroupAddon align="inline-end">
          <Spinner />
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}
