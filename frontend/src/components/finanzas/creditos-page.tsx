import * as React from "react"
import {
  CircleAlertIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react"
import { Link } from "react-router-dom"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  etiquetaMes,
  mesActual,
  moverMes,
} from "@/components/finanzas/analisis"
import {
  actualizarCredito,
  crearCredito,
  efecto,
  eliminarCredito,
  movimientosDe,
  RUTA_API_CREDITOS,
  serieSaldos,
  type Credito,
  type NuevoCredito,
} from "@/components/finanzas/creditos"
import {
  claveConcepto,
  escribirValor,
  formatearFechaLocal,
  hoyISO,
  leerValor,
  RUTA_API,
  RUTAS_FINANZAS,
  VALOR_MAX,
  type Movimiento,
} from "@/components/finanzas/finanzas"
import { FinanzasShell } from "@/components/finanzas/finanzas-shell"
import { useSugerencias } from "@/components/finanzas/use-sugerencias"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useApi } from "@/hooks/use-api"
import {
  formatearPesos,
  formatearPesosCompacto,
  formatearPorcentaje,
} from "@/lib/format"
import { cn } from "@/lib/utils"

const COLORES = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
]

/**
 * Página suelta: /creditos/gastos/julian/palacios.
 *
 * Cada crédito con lo que se debe hoy. No hay que anotar los pagos aquí: un
 * gasto con el concepto del crédito (en el formulario de siempre) es un abono
 * y baja la deuda, y un ingreso con ese concepto es un avance y la sube.
 */
export function CreditosGastosPage() {
  const creditos = useApi<Credito[]>(RUTA_API_CREDITOS)
  const movimientos = useApi<Movimiento[]>(RUTA_API)
  const { sugerencias, nombres } = useSugerencias()
  // En el desplegable van primero los conceptos del grupo Deudas.
  const opciones = React.useMemo(
    () =>
      sugerencias
        ? [...sugerencias]
            .sort(
              (a, b) =>
                Number(b.grupo === "deuda") - Number(a.grupo === "deuda") ||
                a.nombre.localeCompare(b.nombre, "es")
            )
            .map((s) => s.nombre)
        : nombres,
    [sugerencias, nombres]
  )
  const [editando, setEditando] = React.useState<Credito | "nuevo" | null>(null)
  const [borrando, setBorrando] = React.useState<Credito | null>(null)

  const recargar = () => {
    creditos.recargar()
    movimientos.recargar()
  }
  const lista = creditos.data

  return (
    <FinanzasShell
      titulo="Créditos"
      acciones={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={recargar}
            disabled={creditos.cargando}
            aria-label="Actualizar datos"
          >
            <RefreshCwIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <Button size="sm" onClick={() => setEditando("nuevo")}>
            <PlusIcon data-icon="inline-start" />
            Nuevo crédito
          </Button>
        </>
      }
    >
      <title>Créditos · Mis finanzas</title>

      <div className="flex min-w-0 flex-col gap-4 p-4 pb-10 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Créditos
          </h1>
          <p className="text-sm text-muted-foreground">
            Un gasto con el nombre del crédito es un abono y baja la deuda; un
            ingreso es un avance y la sube.
          </p>
        </div>

        {creditos.error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>No se pudieron cargar los créditos</AlertTitle>
            <AlertDescription>
              Puede que el servidor esté despertando. Vuelve a intentarlo.
            </AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={recargar}>
                Reintentar
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        <Resumen creditos={lista} />

        {lista && lista.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-medium">Todavía no hay créditos.</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Agrega Nu, Addi, Mt15, Solventa, LuckyPlata… con lo que debes
                hoy. Desde ahí, lo que registres con ese concepto mueve el saldo
                solo.
              </p>
              <Button onClick={() => setEditando("nuevo")}>
                <PlusIcon data-icon="inline-start" />
                Agregar el primero
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <GraficaSaldos creditos={lista} movimientos={movimientos.data} />
            <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
              {lista
                ? lista.map((c) => (
                    <TarjetaCredito
                      key={c.id}
                      credito={c}
                      movimientos={movimientos.data}
                      onEditar={() => setEditando(c)}
                      onBorrar={() => setBorrando(c)}
                    />
                  ))
                : Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-72 w-full rounded-xl" />
                  ))}
            </div>
          </>
        )}
      </div>

      <DialogoCredito
        credito={editando}
        registrados={lista ?? []}
        sugerencias={opciones}
        onCerrar={() => setEditando(null)}
        onGuardado={() => {
          setEditando(null)
          recargar()
        }}
      />
      <DialogoBorrarCredito
        credito={borrando}
        onCerrar={() => setBorrando(null)}
        onBorrado={() => {
          setBorrando(null)
          recargar()
        }}
      />
    </FinanzasShell>
  )
}

export default CreditosGastosPage

// ---------------------------------------------------------------------------

function Resumen({ creditos }: { creditos: Credito[] | null }) {
  if (!creditos) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  const suma = (f: (c: Credito) => number) =>
    creditos.reduce((s, c) => s + f(c), 0)
  const conCupo = creditos.filter((c) => c.cupo !== null)
  const cifras = [
    {
      titulo: "Deuda total",
      valor: formatearPesos(suma((c) => c.saldo)),
      detalle: `${creditos.length} ${creditos.length === 1 ? "crédito" : "créditos"}`,
    },
    {
      titulo: "Abonado",
      valor: formatearPesos(suma((c) => c.abonado)),
      detalle: "Desde que se registró cada uno",
    },
    {
      titulo: "Avances",
      valor: formatearPesos(suma((c) => c.avances)),
      detalle: "Plata que se sacó de los créditos",
    },
    {
      titulo: "Cuotas al mes",
      valor: formatearPesos(suma((c) => c.cuota ?? 0)),
      detalle: conCupo.length
        ? `Cupo libre: ${formatearPesos(conCupo.reduce((s, c) => s + Math.max(0, c.cupo! - c.saldo), 0))}`
        : "Sin cupos registrados",
    },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cifras.map((c) => (
        <Card key={c.titulo}>
          <CardHeader>
            <CardDescription>{c.titulo}</CardDescription>
            <CardTitle className="text-2xl break-all tabular-nums">
              {c.valor}
            </CardTitle>
          </CardHeader>
          <CardFooter className="mt-auto text-xs text-muted-foreground">
            {c.detalle}
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

function GraficaSaldos({
  creditos,
  movimientos,
}: {
  creditos: Credito[] | null
  movimientos: Movimiento[] | null
}) {
  const datos = React.useMemo(() => {
    if (!creditos?.length || !movimientos) return null
    const primero = creditos.reduce(
      (min, c) => (c.fecha_inicio < min ? c.fecha_inicio : min),
      hoyISO()
    )
    const meses: string[] = []
    for (let m = mesActual(); m >= primero.slice(0, 7); m = moverMes(m, 1))
      meses.unshift(m)
    const variosAnios = meses[0].slice(0, 4) !== meses.at(-1)!.slice(0, 4)
    return serieSaldos(creditos, movimientos, meses.slice(-12)).map((p) => ({
      ...p,
      etiqueta: etiquetaMes(String(p.mes), variosAnios),
    }))
  }, [creditos, movimientos])

  const config = Object.fromEntries(
    (creditos ?? []).map((c, i) => [
      `c${c.id}`,
      { label: c.nombre, color: COLORES[i % COLORES.length] },
    ])
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cómo va cada deuda</CardTitle>
        <CardDescription>Saldo al cierre de cada mes</CardDescription>
      </CardHeader>
      <CardContent>
        {!datos ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <LineChart data={datos} margin={{ left: 4, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="etiqueta"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(v: number) => formatearPesosCompacto(v)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(valor, nombre) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span
                            className="size-2.5 rounded-[2px]"
                            style={{
                              background: `var(--color-${String(nombre)})`,
                            }}
                          />
                          {config[String(nombre)]?.label}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formatearPesos(Number(valor))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              {creditos?.map((c) => (
                <Line
                  key={c.id}
                  dataKey={`c${c.id}`}
                  type="linear"
                  stroke={`var(--color-c${c.id})`}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

function TarjetaCredito({
  credito: c,
  movimientos,
  onEditar,
  onBorrar,
}: {
  credito: Credito
  movimientos: Movimiento[] | null
  onEditar: () => void
  onBorrar: () => void
}) {
  // Lo que se llegó a deber (lo inicial más los avances) y cuánto se ha pagado.
  const total = c.saldo_inicial + c.avances
  const pagadoPct = total > 0 ? (c.abonado / total) * 100 : 0
  const usoCupo = c.cupo ? (c.saldo / c.cupo) * 100 : null
  const mesesFaltan =
    c.cuota && c.saldo > 0 ? Math.ceil(c.saldo / c.cuota) : null
  const ultimos = movimientos
    ? movimientosDe(c, movimientos).slice(-5).reverse()
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{c.nombre}</CardTitle>
        <CardDescription>
          Desde el {formatearFechaLocal(c.fecha_inicio)}
        </CardDescription>
        <CardAction className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onEditar}
            aria-label={`Editar ${c.nombre}`}
          >
            <PencilIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onBorrar}
            aria-label={`Quitar ${c.nombre}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Debes hoy</p>
          <p
            className={cn(
              "text-3xl font-semibold tabular-nums",
              c.saldo <= 0 && "text-primary"
            )}
          >
            {c.saldo <= 0 ? "¡Pagado!" : formatearPesos(c.saldo)}
          </p>
          {c.saldo < 0 ? (
            <p className="text-xs text-muted-foreground">
              {formatearPesos(-c.saldo)} a favor
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="flex justify-between text-xs text-muted-foreground">
            <span>Pagado</span>
            <span className="tabular-nums">
              {formatearPorcentaje(Math.min(pagadoPct, 100), 0)}
            </span>
          </span>
          <Progress
            value={Math.min(pagadoPct, 100)}
            aria-label={`Pagado de ${c.nombre}`}
          />
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Dato
            titulo="Saldo inicial"
            valor={formatearPesos(c.saldo_inicial)}
          />
          <Dato titulo="Abonado" valor={`−${formatearPesos(c.abonado)}`} />
          <Dato titulo="Avances" valor={`+${formatearPesos(c.avances)}`} />
          {c.cupo !== null ? (
            <Dato
              titulo="Cupo libre"
              valor={formatearPesos(Math.max(0, c.cupo - c.saldo))}
              detalle={`${formatearPorcentaje(usoCupo, 0)} usado de ${formatearPesos(c.cupo)}`}
              alerta={usoCupo !== null && usoCupo >= 90}
            />
          ) : null}
          {c.cuota !== null ? (
            <Dato
              titulo="Cuota"
              valor={formatearPesos(c.cuota)}
              detalle={
                mesesFaltan
                  ? `Faltan ~${mesesFaltan} ${mesesFaltan === 1 ? "mes" : "meses"}`
                  : undefined
              }
            />
          ) : null}
        </dl>

        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">Últimos movimientos</p>
          {!ultimos ? (
            <Skeleton className="h-20 w-full" />
          ) : ultimos.length === 0 ? (
            <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
              Todavía no hay abonos ni avances. Registra un gasto con el
              concepto “{c.nombre}” para abonar.
            </p>
          ) : (
            <ul className="flex flex-col divide-y text-sm">
              {ultimos.map((m) => (
                <li key={m.id} className="flex items-center gap-2 py-1.5">
                  <span className="w-28 shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatearFechaLocal(m.fecha)}
                  </span>
                  <span className="flex-1 text-xs">
                    {m.tipo === "gasto" ? "Abono" : "Avance"}
                  </span>
                  <span className="font-medium tabular-nums">
                    {efecto(m.tipo, m.valor) > 0 ? "+" : "−"}
                    {formatearPesos(m.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Dato({
  titulo,
  valor,
  detalle,
  alerta = false,
}: {
  titulo: string
  valor: string
  detalle?: string
  alerta?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd
        className={cn("font-medium tabular-nums", alerta && "text-destructive")}
      >
        {valor}
      </dd>
      {detalle ? (
        <dd className="text-xs text-muted-foreground">{detalle}</dd>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------

function DialogoCredito({
  credito,
  registrados,
  sugerencias,
  onCerrar,
  onGuardado,
}: {
  /** El que se edita, "nuevo" para agregar uno, `null` cerrado. */
  credito: Credito | "nuevo" | null
  registrados: Credito[]
  sugerencias: string[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [guardando, setGuardando] = React.useState(false)
  const existente = credito !== null && credito !== "nuevo" ? credito : null

  return (
    <Dialog
      open={credito !== null}
      onOpenChange={(abierto: boolean) => {
        if (!abierto && !guardando) onCerrar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existente ? `Editar ${existente.nombre}` : "Nuevo crédito"}
          </DialogTitle>
          <DialogDescription>
            Pon lo que debes a la fecha de “Desde”. De ahí en adelante, cada
            gasto con este nombre baja la deuda y cada ingreso (avance) la sube.
          </DialogDescription>
        </DialogHeader>
        {credito !== null ? (
          <FormularioCredito
            key={existente?.id ?? "nuevo"}
            credito={existente}
            registrados={registrados}
            sugerencias={sugerencias}
            guardando={guardando}
            setGuardando={setGuardando}
            onGuardado={onGuardado}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type Errores = Partial<Record<keyof NuevoCredito, string>>

function FormularioCredito({
  credito,
  registrados,
  sugerencias,
  guardando,
  setGuardando,
  onGuardado,
}: {
  credito: Credito | null
  /** Los créditos que ya existen, para no ofrecer su concepto otra vez. */
  registrados: Credito[]
  sugerencias: string[]
  guardando: boolean
  setGuardando: (valor: boolean) => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = React.useState(credito?.nombre ?? "")
  const [saldo, setSaldo] = React.useState<number | null>(
    credito?.saldo_inicial ?? null
  )
  const [desde, setDesde] = React.useState(credito?.fecha_inicio ?? hoyISO())
  const [cupo, setCupo] = React.useState<number | null>(credito?.cupo ?? null)
  const [cuota, setCuota] = React.useState<number | null>(
    credito?.cuota ?? null
  )
  const [errores, setErrores] = React.useState<Errores>({})
  const [fallo, setFallo] = React.useState<string | null>(null)

  const opciones = React.useMemo(() => {
    const ocupados = new Set(
      registrados
        .filter((c) => c.id !== credito?.id)
        .map((c) => claveConcepto(c.nombre))
    )
    const libres = sugerencias.filter((s) => !ocupados.has(claveConcepto(s)))
    // El nombre guardado siempre se puede volver a elegir.
    return credito && !libres.includes(credito.nombre)
      ? [credito.nombre, ...libres]
      : libres
  }, [sugerencias, registrados, credito])

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const encontrados: Errores = {}
    if (!nombre.trim()) encontrados.nombre = "Elige el concepto del crédito."
    if (saldo === null) encontrados.saldo_inicial = "Escribe cuánto debes."
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde))
      encontrados.fecha_inicio = "Elige la fecha."
    setErrores(encontrados)
    if (Object.keys(encontrados).length || saldo === null) return

    const datos: NuevoCredito = {
      nombre: nombre.trim(),
      saldo_inicial: saldo,
      fecha_inicio: desde,
      cupo: cupo || null,
      cuota: cuota || null,
    }
    setGuardando(true)
    setFallo(null)
    try {
      if (credito) await actualizarCredito(credito.id, datos)
      else await crearCredito(datos)
      onGuardado()
    } catch (causa) {
      setFallo(
        causa instanceof Error && causa.message.startsWith("Demasiados")
          ? causa.message
          : "No se pudo guardar. Revisa que no exista ya un crédito con ese nombre."
      )
    } finally {
      setGuardando(false)
    }
  }

  const campoPesos = (
    id: string,
    valor: number | null,
    cambiar: (v: number | null) => void,
    invalido?: boolean
  ) => (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        inputMode="numeric"
        value={escribirValor(valor)}
        onChange={(e) => {
          const leido = leerValor(e.target.value)
          if (leido === null || leido <= VALOR_MAX) cambiar(leido)
        }}
        placeholder="0"
        autoComplete="off"
        aria-invalid={invalido ? true : undefined}
        className="tabular-nums"
      />
    </InputGroup>
  )

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={errores.nombre ? true : undefined}>
          <FieldLabel htmlFor="credito-nombre">Nombre</FieldLabel>
          {/* Solo de la lista de conceptos: escrito a mano, "Lucky Plata" y
              "LuckyPlata" serían dos cosas y los pagos no moverían el saldo. */}
          <Select
            value={nombre || null}
            onValueChange={(elegido: string | null) => {
              if (elegido) setNombre(elegido)
            }}
          >
            <SelectTrigger
              id="credito-nombre"
              className="w-full"
              aria-invalid={errores.nombre ? true : undefined}
            >
              <SelectValue placeholder="Elige el concepto del crédito" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {opciones.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errores.nombre ? (
            <FieldError>{errores.nombre}</FieldError>
          ) : (
            <FieldDescription>
              El mismo concepto con que registras los pagos. ¿No está? Agrégalo
              en{" "}
              <Link
                to={`${RUTAS_FINANZAS.editar}#sugerencias`}
                className="underline underline-offset-4"
              >
                Editar → Sugerencias
              </Link>
              .
            </FieldDescription>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errores.saldo_inicial ? true : undefined}>
            <FieldLabel htmlFor="credito-saldo">Debes</FieldLabel>
            {campoPesos(
              "credito-saldo",
              saldo,
              setSaldo,
              !!errores.saldo_inicial
            )}
            <FieldError>{errores.saldo_inicial}</FieldError>
          </Field>
          <Field data-invalid={errores.fecha_inicio ? true : undefined}>
            <FieldLabel htmlFor="credito-desde">Desde</FieldLabel>
            <Input
              id="credito-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              aria-invalid={errores.fecha_inicio ? true : undefined}
            />
            <FieldError>{errores.fecha_inicio}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="credito-cupo">Cupo (opcional)</FieldLabel>
            {campoPesos("credito-cupo", cupo, setCupo)}
            <FieldDescription>Hasta cuánto presta.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="credito-cuota">
              Cuota al mes (opcional)
            </FieldLabel>
            {campoPesos("credito-cuota", cuota, setCuota)}
            <FieldDescription>Para saber cuánto falta.</FieldDescription>
          </Field>
        </div>
      </FieldGroup>

      {fallo ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>No se guardó</AlertTitle>
          <AlertDescription>{fallo}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" disabled={guardando} />}>
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={guardando}>
          {guardando ? <Spinner data-icon="inline-start" /> : null}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}

function DialogoBorrarCredito({
  credito,
  onCerrar,
  onBorrado,
}: {
  credito: Credito | null
  onCerrar: () => void
  onBorrado: () => void
}) {
  const [borrando, setBorrando] = React.useState(false)
  const [fallo, setFallo] = React.useState(false)

  async function borrar() {
    if (!credito) return
    setBorrando(true)
    setFallo(false)
    try {
      await eliminarCredito(credito.id)
      onBorrado()
    } catch {
      setFallo(true)
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Dialog
      open={credito !== null}
      onOpenChange={(abierto: boolean) => {
        if (!abierto && !borrando) onCerrar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Quitar {credito?.nombre}?</DialogTitle>
          <DialogDescription>
            Los movimientos no se borran: los pagos siguen en el dashboard. Solo
            se deja de llevar la cuenta de lo que se debe.
          </DialogDescription>
        </DialogHeader>
        {fallo ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>No se pudo quitar</AlertTitle>
            <AlertDescription>Inténtalo de nuevo.</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" disabled={borrando} />}
          >
            Cancelar
          </DialogClose>
          <Button variant="destructive" onClick={borrar} disabled={borrando}>
            {borrando ? <Spinner data-icon="inline-start" /> : null}
            Quitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
