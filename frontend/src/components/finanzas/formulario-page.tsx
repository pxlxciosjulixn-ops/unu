import * as React from "react"
import { CircleCheckIcon, CircleAlertIcon } from "lucide-react"
import { Link } from "react-router-dom"

import {
  CONCEPTO_MAX,
  CONCEPTOS_FIJOS,
  crearMovimiento,
  escribirValor,
  formatearFechaLocal,
  hoyISO,
  leerValor,
  RUTAS_FINANZAS,
  validar,
  type ErroresCampo,
  type Movimiento,
  type NuevoMovimiento,
  type Tipo,
} from "@/components/finanzas/finanzas"
import { FinanzasShell } from "@/components/finanzas/finanzas-shell"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/ui/autocomplete"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatearPesos } from "@/lib/format"

/**
 * Página suelta: /formulario/gastos/julian/palacios.
 *
 * Sin login a propósito: la protege que la dirección no está enlazada desde
 * el resto del sitio; solo el dashboard de finanzas apunta aquí. "Guardar" abre primero una vista previa y solo al aceptar
 * se envía. Después de guardar se limpian concepto y valor pero se
 * conservan fecha y tipo, que es lo que se repite al anotar varios gastos del
 * mismo día.
 */
export function FormularioGastosPage() {
  const [fecha, setFecha] = React.useState(hoyISO)
  const [tipo, setTipo] = React.useState<Tipo>("gasto")
  const [concepto, setConcepto] = React.useState("")
  const [valor, setValor] = React.useState<number | null>(null)
  const [errores, setErrores] = React.useState<ErroresCampo>({})
  const [enviando, setEnviando] = React.useState(false)
  const [guardado, setGuardado] = React.useState<Movimiento | null>(null)
  const [fallo, setFallo] = React.useState<string | null>(null)
  // Lo que se va a guardar, congelado al abrir la vista previa: si hay
  // preview abierto, esto es exactamente lo que se envía al aceptar.
  const [preview, setPreview] = React.useState<NuevoMovimiento | null>(null)
  const conceptoRef = React.useRef<HTMLInputElement>(null)
  // Los gastos fijos solo tienen sentido como gasto.
  const sugerencias = tipo === "gasto" ? CONCEPTOS_FIJOS : []

  /** "Guardar" solo valida y abre la vista previa; aún no envía nada. */
  function revisar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const encontrados = validar({ fecha, concepto, valor })
    setErrores(encontrados)
    setFallo(null)
    if (Object.keys(encontrados).length > 0 || valor === null) return

    setGuardado(null)
    setPreview({ fecha, tipo, concepto: concepto.trim(), valor })
  }

  async function confirmar() {
    if (!preview) return
    setEnviando(true)
    setFallo(null)
    try {
      const nuevo = await crearMovimiento(preview)
      setGuardado(nuevo)
      setConcepto("")
      setValor(null)
      setPreview(null)
    } catch (error) {
      // El preview sigue abierto con el error, para reintentar sin volver a
      // llenar nada.
      setFallo(
        error instanceof Error && error.message.startsWith("Demasiados")
          ? error.message
          : "No se pudo guardar. Revisa la conexión e inténtalo de nuevo."
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <FinanzasShell titulo="Registrar movimiento">
      <title>Registrar movimiento</title>

      <div className="flex justify-center px-4 py-6 sm:px-6 sm:py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Registrar movimiento</CardTitle>
            <CardDescription>Anota un gasto o un ingreso.</CardDescription>
          </CardHeader>

          <form onSubmit={revisar} noValidate>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={errores.fecha ? true : undefined}>
                  <FieldLabel htmlFor="fecha">Fecha de registro</FieldLabel>
                  <Input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    aria-invalid={errores.fecha ? true : undefined}
                    required
                  />
                  <FieldError>{errores.fecha}</FieldError>
                </Field>

                <Field>
                  <FieldLabel id="tipo-etiqueta">Tipo</FieldLabel>
                  <ToggleGroup
                    variant="outline"
                    spacing={0}
                    value={[tipo]}
                    onValueChange={(valores: string[]) => {
                      // Un clic sobre el ya elegido lo soltaría: se ignora.
                      if (valores[0]) setTipo(valores[0] as Tipo)
                    }}
                    aria-labelledby="tipo-etiqueta"
                    className="w-full"
                  >
                    <ToggleGroupItem value="gasto" className="flex-1">
                      Gasto
                    </ToggleGroupItem>
                    <ToggleGroupItem value="ingreso" className="flex-1">
                      Ingreso
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>

                <Field data-invalid={errores.concepto ? true : undefined}>
                  <FieldLabel htmlFor="concepto">Concepto</FieldLabel>
                  {/* Los gastos fijos salen en la lista, pero el campo es
                      libre: lo que se escriba es lo que se guarda. */}
                  <Autocomplete
                    items={sugerencias}
                    value={concepto}
                    onValueChange={(texto) =>
                      setConcepto(texto.slice(0, CONCEPTO_MAX))
                    }
                    openOnInputClick
                  >
                    <AutocompleteInput
                      ref={conceptoRef}
                      id="concepto"
                      maxLength={CONCEPTO_MAX}
                      placeholder={
                        tipo === "gasto"
                          ? "Mt15, Nu, Addi o escribe otro…"
                          : "Salario, venta…"
                      }
                      aria-invalid={errores.concepto ? true : undefined}
                      showTrigger={sugerencias.length > 0}
                      required
                    >
                      <InputGroupText className="tabular-nums">
                        {concepto.length}/{CONCEPTO_MAX}
                      </InputGroupText>
                    </AutocompleteInput>
                    <AutocompleteContent>
                      <AutocompleteEmpty>
                        Se guardará tal como lo escribiste.
                      </AutocompleteEmpty>
                      <AutocompleteList>
                        {(opcion: string) => (
                          <AutocompleteItem key={opcion} value={opcion}>
                            {opcion}
                          </AutocompleteItem>
                        )}
                      </AutocompleteList>
                    </AutocompleteContent>
                  </Autocomplete>
                  {errores.concepto ? (
                    <FieldError>{errores.concepto}</FieldError>
                  ) : sugerencias.length > 0 ? (
                    <FieldDescription>
                      Elige un gasto fijo o escribe otro concepto.
                    </FieldDescription>
                  ) : null}
                </Field>

                <Field data-invalid={errores.valor ? true : undefined}>
                  <FieldLabel htmlFor="valor">Valor</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <InputGroupText>$</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="valor"
                      inputMode="numeric"
                      value={escribirValor(valor)}
                      onChange={(e) => {
                        const leido = leerValor(e.target.value)
                        // Tope de 15 dígitos: más allá JavaScript pierde exactitud.
                        if (leido === null || String(leido).length <= 15) {
                          setValor(leido)
                        }
                      }}
                      placeholder="0"
                      autoComplete="off"
                      aria-invalid={errores.valor ? true : undefined}
                      className="tabular-nums"
                      required
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupText>COP</InputGroupText>
                    </InputGroupAddon>
                  </InputGroup>
                  {errores.valor ? (
                    <FieldError>{errores.valor}</FieldError>
                  ) : (
                    <FieldDescription>
                      Número entero, sin centavos.
                    </FieldDescription>
                  )}
                </Field>
              </FieldGroup>
            </CardContent>

            <CardFooter className="mt-6 flex flex-col items-stretch gap-4">
              <Button type="submit" size="lg">
                Guardar
              </Button>

              {guardado ? (
                <Alert>
                  <CircleCheckIcon />
                  <AlertTitle>
                    {guardado.tipo === "gasto" ? "Gasto" : "Ingreso"} guardado
                  </AlertTitle>
                  <AlertDescription className="break-words">
                    {guardado.concepto} · {formatearPesos(guardado.valor)}
                  </AlertDescription>
                  <AlertAction>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link to={RUTAS_FINANZAS.dashboard} />}
                    >
                      Ver dashboard
                    </Button>
                  </AlertAction>
                </Alert>
              ) : null}
            </CardFooter>
          </form>
        </Card>
      </div>

      <Dialog
        open={preview !== null}
        onOpenChange={(abierto) => {
          // Mientras se envía no se cierra: la respuesta decide.
          if (!abierto && !enviando) {
            setPreview(null)
            setFallo(null)
          }
        }}
      >
        <DialogContent showCloseButton={false} finalFocus={conceptoRef}>
          <DialogHeader>
            <DialogTitle>¿Guardar este movimiento?</DialogTitle>
            <DialogDescription>
              Revisa los datos antes de aceptar.
            </DialogDescription>
          </DialogHeader>

          {preview ? (
            <dl className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="tabular-nums">
                  {formatearFechaLocal(preview.fecha)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>
                  <Badge
                    variant={
                      preview.tipo === "ingreso" ? "default" : "secondary"
                    }
                  >
                    {preview.tipo === "ingreso" ? "Ingreso" : "Gasto"}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">Concepto</dt>
                <dd className="min-w-0 text-right break-words">
                  {preview.concepto}
                </dd>
              </div>
              <Separator />
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {formatearPesos(preview.valor)}
                </dd>
              </div>
            </dl>
          ) : null}

          {fallo ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>No se guardó</AlertTitle>
              <AlertDescription>{fallo}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={enviando} />}
            >
              Corregir
            </DialogClose>
            <Button onClick={confirmar} disabled={enviando} autoFocus>
              {enviando ? <Spinner data-icon="inline-start" /> : null}
              {enviando ? "Guardando…" : "Aceptar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanzasShell>
  )
}

export default FormularioGastosPage
