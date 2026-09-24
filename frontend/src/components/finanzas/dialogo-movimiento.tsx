import * as React from "react"
import { CircleAlertIcon } from "lucide-react"

import { CampoConcepto } from "@/components/finanzas/campo-concepto"
import {
  actualizarMovimiento,
  escribirValor,
  homogenizarConcepto,
  leerValor,
  validar,
  type ErroresCampo,
  type Movimiento,
  type Tipo,
} from "@/components/finanzas/finanzas"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { Spinner } from "@/components/ui/spinner"

/**
 * Corregir un movimiento ya guardado.
 *
 * El diálogo solo decide si está abierto; los campos viven en `Formulario`,
 * que se monta con la fila que se va a editar. Así arrancan con lo guardado
 * sin tener que sincronizar nada después.
 */
export function DialogoMovimiento({
  movimiento,
  sugerencias,
  onCerrar,
  onGuardado,
}: {
  /** El que se está editando; `null` con el diálogo cerrado. */
  movimiento: Movimiento | null
  sugerencias: string[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  // Mientras se guarda el diálogo no se cierra: la respuesta decide.
  const [guardando, setGuardando] = React.useState(false)

  return (
    <Dialog
      open={movimiento !== null}
      onOpenChange={(abierto: boolean) => {
        if (!abierto && !guardando) onCerrar()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar movimiento</DialogTitle>
          <DialogDescription>
            Los cambios se reflejan de una vez en el dashboard.
          </DialogDescription>
        </DialogHeader>

        {movimiento ? (
          <Formulario
            // Cambiar de fila vuelve a montar el formulario con sus datos.
            key={movimiento.id}
            movimiento={movimiento}
            sugerencias={sugerencias}
            guardando={guardando}
            onGuardando={setGuardando}
            onGuardado={onGuardado}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Se manda completo con PUT: son cuatro campos y así lo que queda en la tabla
 * es exactamente lo que se ve aquí. El concepto se homogeniza igual que al
 * registrar, para que corregir una fila no la saque del grupo de su concepto
 * en el dashboard.
 */
function Formulario({
  movimiento,
  sugerencias,
  guardando,
  onGuardando,
  onGuardado,
}: {
  movimiento: Movimiento
  sugerencias: string[]
  guardando: boolean
  onGuardando: (guardando: boolean) => void
  onGuardado: () => void
}) {
  const [fecha, setFecha] = React.useState(movimiento.fecha)
  const [tipo, setTipo] = React.useState<Tipo>(movimiento.tipo)
  const [concepto, setConcepto] = React.useState(movimiento.concepto)
  const [valor, setValor] = React.useState<number | null>(movimiento.valor)
  const [errores, setErrores] = React.useState<ErroresCampo>({})
  const [fallo, setFallo] = React.useState<string | null>(null)

  async function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    const encontrados = validar({ fecha, concepto, valor })
    setErrores(encontrados)
    setFallo(null)
    if (Object.keys(encontrados).length > 0 || valor === null) return

    onGuardando(true)
    try {
      await actualizarMovimiento(movimiento.id, {
        fecha,
        tipo,
        concepto: homogenizarConcepto(concepto, sugerencias),
        valor,
      })
      onGuardado()
    } catch (causa) {
      setFallo(
        causa instanceof Error && causa.message.startsWith("Demasiados")
          ? causa.message
          : "No se pudo guardar el cambio. Inténtalo de nuevo."
      )
    } finally {
      onGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <FieldGroup>
        <Field data-invalid={errores.fecha ? true : undefined}>
          <FieldLabel htmlFor="editar-fecha">Fecha de registro</FieldLabel>
          <Input
            id="editar-fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            aria-invalid={errores.fecha ? true : undefined}
            required
          />
          <FieldError>{errores.fecha}</FieldError>
        </Field>

        <CampoConcepto
          id="editar-concepto"
          concepto={concepto}
          tipo={tipo}
          sugerencias={sugerencias}
          error={errores.concepto}
          onConcepto={setConcepto}
          onTipo={setTipo}
        />

        <Field data-invalid={errores.valor ? true : undefined}>
          <FieldLabel htmlFor="editar-valor">Valor</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>$</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              id="editar-valor"
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
            <FieldDescription>Número entero, sin centavos.</FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {fallo ? (
        <Alert variant="destructive" className="mt-4">
          <CircleAlertIcon />
          <AlertTitle>No se guardó</AlertTitle>
          <AlertDescription>{fallo}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter className="mt-6">
        <DialogClose
          render={<Button type="button" variant="outline" disabled={guardando} />}
        >
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={guardando}>
          {guardando ? <Spinner data-icon="inline-start" /> : null}
          {guardando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </DialogFooter>
    </form>
  )
}
