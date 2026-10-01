import * as React from "react"
import {
  CheckIcon,
  CircleAlertIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { nombreMesLargo } from "@/components/finanzas/analisis"
import { LineaProximoPago } from "@/components/finanzas/proximo-pago"
import {
  actualizarGastoFijo,
  crearGastoFijo,
  eliminarGastoFijo,
  fijoTerminado,
  seVe,
  type GastoFijo,
  type MesFijo,
  type NuevoGastoFijo,
  type Vista,
} from "@/components/finanzas/fijos"
import {
  claveConcepto,
  escribirValor,
  hoyISO,
  leerValor,
  RUTAS_FINANZAS,
  VALOR_MAX,
} from "@/components/finanzas/finanzas"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { formatearPesos } from "@/lib/format"
import { cn } from "@/lib/utils"

const mesCorto = new Intl.DateTimeFormat("es-CO", { month: "short" })
const etiquetaMes = (mes: string) =>
  mesCorto.format(new Date(`${mes}-01T12:00:00`)).replace(".", "")

/**
 * La sección de gastos fijos de la página de créditos: lo de cada mes, con
 * cuánto falta y si ya se pagó. Se renueva solo cada mes.
 */
export function GastosFijos({
  fijos,
  vista,
  sugerencias,
  ocupados,
  onCambio,
}: {
  fijos: GastoFijo[] | null
  /** Pendientes, ya pagados o todos (el filtro de arriba de la página). */
  vista: Vista
  sugerencias: string[]
  /** Conceptos que ya son crédito: no pueden ser también gasto fijo. */
  ocupados: string[]
  onCambio: () => void
}) {
  const [editando, setEditando] = React.useState<GastoFijo | "nuevo" | null>(
    null
  )
  const [borrando, setBorrando] = React.useState<GastoFijo | null>(null)

  const total = fijos?.reduce((s, f) => s + (f.este_mes?.total ?? 0), 0) ?? 0
  const pagado = fijos?.reduce((s, f) => s + (f.este_mes?.pagado ?? 0), 0) ?? 0
  const falta = fijos?.reduce((s, f) => s + f.pendiente_mes, 0) ?? 0
  const visibles = fijos?.filter((f) => seVe(fijoTerminado(f), vista)) ?? []

  return (
    <section id="fijos" className="flex scroll-mt-20 flex-col gap-4 sm:gap-6">
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Gastos fijos
          </h2>
          <p className="text-sm text-muted-foreground">
            {fijos && fijos.length
              ? `Este mes: ${formatearPesos(pagado)} pagado de ${formatearPesos(total)} · faltan ${formatearPesos(falta)}`
              : "Lo que pagas todos los meses: se renueva solo cada mes."}
          </p>
        </div>
        <Button size="sm" onClick={() => setEditando("nuevo")}>
          <PlusIcon data-icon="inline-start" />
          Nuevo gasto fijo
        </Button>
      </div>

      {!fijos ? (
        <Skeleton className="h-60 w-full rounded-xl" />
      ) : fijos.length > 0 && visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {vista === "pagados"
            ? "Nada terminado todavía: lo de una sola vez aparece aquí cuando lo pagas."
            : "No hay gastos fijos pendientes."}
        </p>
      ) : fijos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Todavía no hay gastos fijos.
            </p>
            <p className="max-w-md">
              Agrega lo de Mamá, el arriendo… Un gasto con ese concepto lo va
              llenando y un ingreso (si te presta) se suma a lo del mes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
          {visibles.map((f) => (
            <TarjetaFijo
              key={f.id}
              fijo={f}
              onEditar={() => setEditando(f)}
              onBorrar={() => setBorrando(f)}
            />
          ))}
        </div>
      )}

      <DialogoFijo
        fijo={editando}
        opciones={sugerencias.filter((s) => {
          const clave = claveConcepto(s)
          const actual = editando !== "nuevo" ? editando?.nombre : undefined
          return (
            !ocupados.some((o) => claveConcepto(o) === clave) &&
            (!fijos?.some((f) => claveConcepto(f.nombre) === clave) ||
              (actual !== undefined && claveConcepto(actual) === clave))
          )
        })}
        onCerrar={() => setEditando(null)}
        onGuardado={() => {
          setEditando(null)
          onCambio()
        }}
      />
      <DialogoBorrarFijo
        fijo={borrando}
        onCerrar={() => setBorrando(null)}
        onBorrado={() => {
          setBorrando(null)
          onCambio()
        }}
      />
    </section>
  )
}

/** "Para siempre", "Solo noviembre de 2026", "Hasta diciembre de 2027". */
function duracion(f: GastoFijo) {
  if (!f.fecha_fin) return "para siempre"
  const fin = f.fecha_fin.slice(0, 7)
  return fin === f.fecha_inicio.slice(0, 7)
    ? `solo ${nombreMesLargo(fin)}`
    : `hasta ${nombreMesLargo(fin)}`
}

function TarjetaFijo({
  fijo: f,
  onEditar,
  onBorrar,
}: {
  fijo: GastoFijo
  onEditar: () => void
  onBorrar: () => void
}) {
  const m = f.este_mes
  const hoy = Number(hoyISO().slice(8, 10))
  const debe = f.pendiente_mes > 0
  const vencido = debe && f.dia_pago !== null && hoy > f.dia_pago
  const pct = m && m.total > 0 ? Math.min((m.pagado / m.total) * 100, 100) : 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {f.nombre}
          {f.estado === "programado" ? (
            <Badge variant="outline">Programado</Badge>
          ) : f.estado === "terminado" ? (
            <Badge variant="secondary">Terminado</Badge>
          ) : !debe ? (
            <Badge>
              <CheckIcon data-icon="inline-start" />
              Pagado
            </Badge>
          ) : vencido ? (
            <Badge variant="destructive">Vencido</Badge>
          ) : f.estado === "parcial" ? (
            <Badge variant="outline">Parcial</Badge>
          ) : (
            <Badge variant="outline">Pendiente</Badge>
          )}
        </CardTitle>
        <CardDescription className="first-letter:uppercase">
          {formatearPesos(f.monto)} al mes · {duracion(f)}
          {f.dia_pago ? ` · hasta el día ${f.dia_pago}` : ""}
        </CardDescription>
        <CardAction className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onEditar}
            aria-label={`Editar ${f.nombre}`}
          >
            <PencilIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onBorrar}
            aria-label={`Quitar ${f.nombre}`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!m ? (
          // Todavía no empieza: solo se muestra cuándo y cuánto.
          <div>
            <p className="text-xs text-muted-foreground">
              Empieza en{" "}
              {f.proximo ? nombreMesLargo(f.proximo.mes) : "un mes que viene"}
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              {formatearPesos(f.monto)}
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs text-muted-foreground first-letter:uppercase">
                {debe
                  ? `Falta en ${nombreMesLargo(m.mes)}`
                  : nombreMesLargo(m.mes)}
              </p>
              <p
                className={cn(
                  "text-3xl font-semibold tabular-nums",
                  vencido && "text-destructive"
                )}
              >
                {debe ? formatearPesos(f.pendiente_mes) : "¡Al día!"}
              </p>
              {m.pendiente < 0 ? (
                <p className="text-xs text-muted-foreground">
                  Pagaste {formatearPesos(-m.pendiente)} de más: no pasa al otro
                  mes.
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>
                  Pagado {formatearPesos(m.pagado)} de {formatearPesos(m.total)}
                </span>
                <span>{Math.round(pct)} %</span>
              </span>
              <Progress value={pct} aria-label={`Pagado de ${f.nombre}`} />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Dato titulo="Fijo del mes" valor={formatearPesos(m.monto)} />
              <Dato
                titulo="Te prestó"
                valor={`+${formatearPesos(m.prestado)}`}
                detalle="Se suma a lo del mes"
              />
              <Dato
                titulo="Venía de antes"
                valor={`+${formatearPesos(m.arrastre)}`}
              />
              <Dato titulo="Pagado" valor={`−${formatearPesos(m.pagado)}`} />
            </dl>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-muted-foreground">Últimos meses</p>
              <ul className="flex flex-wrap gap-1.5">
                {f.historial.map((h) => (
                  <li key={h.mes}>
                    <ChipMes mes={h} actual={h.mes === m.mes} />
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <LineaProximoPago proximo={f.proximo} />
      </CardContent>
    </Card>
  )
}

function ChipMes({ mes, actual }: { mes: MesFijo; actual: boolean }) {
  const alDia = mes.pendiente <= 0
  return (
    <span
      title={`Pagado ${formatearPesos(mes.pagado)} de ${formatearPesos(mes.total)}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs tabular-nums",
        alDia ? "bg-muted/60" : "border-destructive/40 text-destructive"
      )}
    >
      {alDia ? <CheckIcon className="size-3" /> : null}
      {etiquetaMes(mes.mes)}
      {/* Lo que faltó en un mes ya cerrado pasó al siguiente. */}
      {alDia
        ? ""
        : ` · ${actual ? "falta" : "pasó"} ${formatearPesos(mes.pendiente)}`}
    </span>
  )
}

function Dato({
  titulo,
  valor,
  detalle,
}: {
  titulo: string
  valor: string
  detalle?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{titulo}</dt>
      <dd className="font-medium tabular-nums">{valor}</dd>
      {detalle ? (
        <dd className="text-xs text-muted-foreground">{detalle}</dd>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------

function DialogoFijo({
  fijo,
  opciones,
  onCerrar,
  onGuardado,
}: {
  fijo: GastoFijo | "nuevo" | null
  opciones: string[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [guardando, setGuardando] = React.useState(false)
  const existente = fijo !== null && fijo !== "nuevo" ? fijo : null
  return (
    <Dialog
      open={fijo !== null}
      onOpenChange={(abierto: boolean) => {
        if (!abierto && !guardando) onCerrar()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existente ? `Editar ${existente.nombre}` : "Nuevo gasto fijo"}
          </DialogTitle>
          <DialogDescription>
            Cada mes se debe el monto. Un gasto con este concepto es un pago; un
            ingreso es un préstamo y se suma a lo de ese mes.
          </DialogDescription>
        </DialogHeader>
        {fijo !== null ? (
          <FormularioFijo
            key={existente?.id ?? "nuevo"}
            fijo={existente}
            opciones={opciones}
            guardando={guardando}
            setGuardando={setGuardando}
            onGuardado={onGuardado}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type Duracion = "siempre" | "una_vez" | "hasta"

const DURACIONES: { valor: Duracion; etiqueta: string }[] = [
  { valor: "siempre", etiqueta: "Para siempre" },
  { valor: "una_vez", etiqueta: "Solo un mes" },
  { valor: "hasta", etiqueta: "Hasta un mes" },
]

function FormularioFijo({
  fijo,
  opciones,
  guardando,
  setGuardando,
  onGuardado,
}: {
  fijo: GastoFijo | null
  opciones: string[]
  guardando: boolean
  setGuardando: (valor: boolean) => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = React.useState(fijo?.nombre ?? "")
  const [monto, setMonto] = React.useState<number | null>(fijo?.monto ?? null)
  const [dia, setDia] = React.useState(
    fijo?.dia_pago ? String(fijo.dia_pago) : ""
  )
  // El primer mes que cuenta, como AAAA-MM.
  const [desde, setDesde] = React.useState(
    (fijo?.fecha_inicio ?? hoyISO()).slice(0, 7)
  )
  const [duracion, setDuracion] = React.useState<Duracion>(
    !fijo?.fecha_fin
      ? "siempre"
      : fijo.fecha_fin.slice(0, 7) === fijo.fecha_inicio.slice(0, 7)
        ? "una_vez"
        : "hasta"
  )
  const [hasta, setHasta] = React.useState(
    (fijo?.fecha_fin ?? fijo?.fecha_inicio ?? hoyISO()).slice(0, 7)
  )
  const [errores, setErrores] = React.useState<
    Partial<Record<"nombre" | "monto" | "dia" | "desde" | "hasta", string>>
  >({})
  const [fallo, setFallo] = React.useState<string | null>(null)

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const encontrados: typeof errores = {}
    if (!nombre) encontrados.nombre = "Elige el concepto."
    if (!monto) encontrados.monto = "Escribe cuánto es al mes."
    const numeroDia = dia.trim() ? Number(dia) : null
    if (numeroDia !== null && !(numeroDia >= 1 && numeroDia <= 31))
      encontrados.dia = "Un día entre 1 y 31."
    if (!/^\d{4}-\d{2}$/.test(desde)) encontrados.desde = "Elige el mes."
    if (
      duracion === "hasta" &&
      !(/^\d{4}-\d{2}$/.test(hasta) && hasta >= desde)
    )
      encontrados.hasta = "Elige un mes igual o después del primero."
    setErrores(encontrados)
    if (Object.keys(encontrados).length || !monto) return

    const datos: NuevoGastoFijo = {
      nombre,
      monto,
      dia_pago: numeroDia,
      fecha_inicio: `${desde}-01`,
      fecha_fin:
        duracion === "siempre"
          ? null
          : duracion === "una_vez"
            ? `${desde}-01`
            : `${hasta}-01`,
    }
    setGuardando(true)
    setFallo(null)
    try {
      if (fijo) await actualizarGastoFijo(fijo.id, datos)
      else await crearGastoFijo(datos)
      onGuardado()
    } catch {
      setFallo(
        "No se pudo guardar. Revisa que ese concepto no sea ya un crédito."
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={errores.nombre ? true : undefined}>
          <FieldLabel htmlFor="fijo-nombre">Concepto</FieldLabel>
          <Select
            value={nombre || null}
            onValueChange={(elegido: string | null) => {
              if (elegido) setNombre(elegido)
            }}
          >
            <SelectTrigger
              id="fijo-nombre"
              className="w-full"
              aria-invalid={errores.nombre ? true : undefined}
            >
              <SelectValue placeholder="Elige el concepto" />
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
              El mismo con que registras los pagos. ¿No está? Agrégalo en{" "}
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
          <Field
            data-invalid={errores.monto ? true : undefined}
            className="sm:col-span-2"
          >
            <FieldLabel htmlFor="fijo-monto">Al mes</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>$</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="fijo-monto"
                inputMode="numeric"
                value={escribirValor(monto)}
                onChange={(e) => {
                  const leido = leerValor(e.target.value)
                  if (leido === null || leido <= VALOR_MAX) setMonto(leido)
                }}
                placeholder="400.000"
                autoComplete="off"
                aria-invalid={errores.monto ? true : undefined}
                className="tabular-nums"
              />
            </InputGroup>
            <FieldError>{errores.monto}</FieldError>
          </Field>
          <Field data-invalid={errores.dia ? true : undefined}>
            <FieldLabel htmlFor="fijo-dia">Día de pago</FieldLabel>
            <Input
              id="fijo-dia"
              inputMode="numeric"
              value={dia}
              onChange={(e) =>
                setDia(e.target.value.replace(/\D/g, "").slice(0, 2))
              }
              placeholder="Opcional"
              aria-invalid={errores.dia ? true : undefined}
            />
            <FieldError>{errores.dia}</FieldError>
          </Field>
          <Field data-invalid={errores.desde ? true : undefined}>
            <FieldLabel htmlFor="fijo-desde">
              {duracion === "una_vez" ? "Mes" : "Desde"}
            </FieldLabel>
            <Input
              id="fijo-desde"
              type="month"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              aria-invalid={errores.desde ? true : undefined}
            />
            <FieldError>{errores.desde}</FieldError>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="fijo-duracion">¿Cuánto dura?</FieldLabel>
            <Select
              value={duracion}
              onValueChange={(elegido: string | null) => {
                if (elegido) setDuracion(elegido as Duracion)
              }}
            >
              <SelectTrigger id="fijo-duracion" className="w-full">
                <SelectValue>
                  {(v) => DURACIONES.find((d) => d.valor === v)?.etiqueta}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DURACIONES.map((d) => (
                  <SelectItem key={d.valor} value={d.valor}>
                    {d.etiqueta}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              {duracion === "una_vez"
                ? "Algo que se paga una vez, como lo que te prestó un amigo."
                : duracion === "hasta"
                  ? "Se debe cada mes hasta ese mes, incluido."
                  : "Se renueva cada mes."}
            </FieldDescription>
          </Field>
          {duracion === "hasta" ? (
            <Field data-invalid={errores.hasta ? true : undefined}>
              <FieldLabel htmlFor="fijo-hasta">Último mes</FieldLabel>
              <Input
                id="fijo-hasta"
                type="month"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                aria-invalid={errores.hasta ? true : undefined}
              />
              <FieldError>{errores.hasta}</FieldError>
            </Field>
          ) : null}
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

function DialogoBorrarFijo({
  fijo,
  onCerrar,
  onBorrado,
}: {
  fijo: GastoFijo | null
  onCerrar: () => void
  onBorrado: () => void
}) {
  const [borrando, setBorrando] = React.useState(false)
  const [fallo, setFallo] = React.useState(false)

  async function borrar() {
    if (!fijo) return
    setBorrando(true)
    setFallo(false)
    try {
      await eliminarGastoFijo(fijo.id)
      onBorrado()
    } catch {
      setFallo(true)
    } finally {
      setBorrando(false)
    }
  }

  return (
    <Dialog
      open={fijo !== null}
      onOpenChange={(abierto: boolean) => {
        if (!abierto && !borrando) onCerrar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Quitar {fijo?.nombre}?</DialogTitle>
          <DialogDescription>
            Los pagos que ya registraste no se borran; solo deja de llevarse la
            cuenta de cada mes.
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
