import * as React from "react"
import {
  CheckIcon,
  CircleAlertIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"

import {
  claveConcepto,
  CONCEPTO_MAX,
  crearSugerencia,
  eliminarSugerencia,
  renombrarSugerencia,
  type Sugerencia,
} from "@/components/finanzas/finanzas"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

/**
 * Los conceptos que se ofrecen al escribir, en el formulario y al corregir.
 *
 * Además de sugerir, homogenizan: un movimiento anotado como "mt15" se guarda
 * como "Mt15" si esa sugerencia existe, y así todo lo de ese concepto suma
 * junto en el dashboard. Quitar una no toca lo ya guardado; solo deja de
 * sugerirse de ahí en adelante.
 */
export function PanelSugerencias({
  sugerencias,
  onCambio,
}: {
  sugerencias: Sugerencia[] | null
  onCambio: () => void
}) {
  const [nueva, setNueva] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [fallo, setFallo] = React.useState<string | null>(null)
  /** La fila que está esperando respuesta del servidor. */
  const [ocupada, setOcupada] = React.useState<number | "nueva" | null>(null)
  const [editando, setEditando] = React.useState<Sugerencia | null>(null)
  const [nombreEditado, setNombreEditado] = React.useState("")

  /** El nombre ya está en la lista, sin contar la fila que se está editando. */
  function repetida(nombre: string, exceptoId?: number) {
    const buscada = claveConcepto(nombre)
    return (sugerencias ?? []).some(
      (s) => s.id !== exceptoId && claveConcepto(s.nombre) === buscada
    )
  }

  function mensajeDeFallo(causa: unknown) {
    return causa instanceof Error && causa.message.startsWith("Demasiados")
      ? causa.message
      : "No se pudo guardar. Inténtalo de nuevo."
  }

  async function agregar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const nombre = nueva.trim()
    setFallo(null)
    if (!nombre) return setError("Escribe el concepto.")
    if (repetida(nombre)) return setError("Esa sugerencia ya está en la lista.")

    setError(null)
    setOcupada("nueva")
    try {
      await crearSugerencia(nombre)
      setNueva("")
      onCambio()
    } catch (causa) {
      setFallo(mensajeDeFallo(causa))
    } finally {
      setOcupada(null)
    }
  }

  async function renombrar() {
    if (!editando) return
    const nombre = nombreEditado.trim()
    setFallo(null)
    if (!nombre) return setFallo("Escribe el concepto.")
    if (repetida(nombre, editando.id)) {
      return setFallo("Esa sugerencia ya está en la lista.")
    }
    // Sin cambios no hay a qué llamar al servidor.
    if (nombre === editando.nombre) return setEditando(null)

    setOcupada(editando.id)
    try {
      await renombrarSugerencia(editando.id, nombre)
      setEditando(null)
      onCambio()
    } catch (causa) {
      setFallo(mensajeDeFallo(causa))
    } finally {
      setOcupada(null)
    }
  }

  async function quitar(sugerencia: Sugerencia) {
    setFallo(null)
    setOcupada(sugerencia.id)
    try {
      await eliminarSugerencia(sugerencia.id)
      onCambio()
    } catch (causa) {
      setFallo(mensajeDeFallo(causa))
    } finally {
      setOcupada(null)
    }
  }

  return (
    <Card id="sugerencias" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Sugerencias de concepto</CardTitle>
        <CardDescription>
          Lo que se ofrece al escribir el concepto, aquí y en el formulario.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <form onSubmit={agregar} noValidate>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="nueva-sugerencia">Nueva sugerencia</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="nueva-sugerencia"
                value={nueva}
                maxLength={CONCEPTO_MAX}
                onChange={(e) => {
                  setNueva(e.target.value)
                  setError(null)
                }}
                placeholder="Ej.: Arriendo"
                autoComplete="off"
                aria-invalid={error ? true : undefined}
              />
              <Button type="submit" disabled={ocupada === "nueva"}>
                {ocupada === "nueva" ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PlusIcon data-icon="inline-start" />
                )}
                Agregar
              </Button>
            </div>
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>
                Lo que se anote con ese nombre —sin importar tildes ni
                mayúsculas— queda guardado tal como se escriba aquí.
              </FieldDescription>
            )}
          </Field>
        </form>

        {fallo ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>Algo salió mal</AlertTitle>
            <AlertDescription>{fallo}</AlertDescription>
          </Alert>
        ) : null}

        {!sugerencias ? (
          <Skeleton className="h-40 w-full" />
        ) : sugerencias.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            No hay sugerencias: al escribir un concepto no se ofrecerá ninguna.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border">
            {sugerencias.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 p-2 pl-3 text-sm"
              >
                {editando?.id === s.id ? (
                  <>
                    <Input
                      value={nombreEditado}
                      maxLength={CONCEPTO_MAX}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          void renombrar()
                        }
                        if (e.key === "Escape") setEditando(null)
                      }}
                      aria-label={"Nuevo nombre de " + s.nombre}
                      autoFocus
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={renombrar}
                      disabled={ocupada === s.id}
                      aria-label="Guardar nombre"
                    >
                      {ocupada === s.id ? <Spinner /> : <CheckIcon />}
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditando(null)}
                      aria-label="Cancelar"
                    >
                      <XIcon />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate">{s.nombre}</span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setEditando(s)
                        setNombreEditado(s.nombre)
                        setFallo(null)
                      }}
                      aria-label={"Renombrar " + s.nombre}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => quitar(s)}
                      disabled={ocupada === s.id}
                      aria-label={"Quitar " + s.nombre}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {ocupada === s.id ? <Spinner /> : <Trash2Icon />}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
