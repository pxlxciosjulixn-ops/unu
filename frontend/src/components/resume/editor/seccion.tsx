/**
 * Las tarjetas del editor.
 *
 * `Seccion` es el marco común: título, contenido, aviso de cambios sin guardar
 * y el botón que guarda. `SeccionDeLista` le agrega lo de las listas —agregar,
 * quitar y mover elementos—, que es lo mismo para experiencia, formación,
 * idiomas o referencias: sólo cambian los campos de cada fila.
 *
 * Se guarda una sección a la vez y completa: el backend reemplaza la lista con
 * lo que llega, así el orden que quedó en pantalla es el que queda guardado.
 */
import * as React from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  PlusIcon,
  TrashIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import type { ControlDeSeccion } from "@/components/resume/editor/use-borrador"

export function Seccion<T>({
  titulo,
  descripcion,
  control,
  children,
}: {
  titulo: string
  descripcion: string
  control: ControlDeSeccion<T>
  children: React.ReactNode
}) {
  const { estado, error, guardar } = control

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">{children}</CardContent>

      <CardFooter className="flex flex-col items-stretch gap-3">
        {error ? (
          <Alert role="status" variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>No se guardó</AlertTitle>
            <AlertDescription>
              <p>{error.message}</p>
              {error.detalles.length ? (
                <ul className="flex list-outside list-disc flex-col gap-0.5 pl-4">
                  {error.detalles.map((detalle) => (
                    <li key={detalle}>{detalle}</li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <span
            role="status"
            className="text-xs text-muted-foreground empty:hidden"
          >
            {estado === "sucio" ? "Cambios sin guardar" : null}
            {estado === "guardado" ? (
              <span className="inline-flex items-center gap-1.5">
                <CircleCheckIcon className="size-3.5" />
                Guardado
              </span>
            ) : null}
          </span>
          <Button onClick={guardar} disabled={estado !== "sucio"}>
            {estado === "guardando" ? (
              <>
                <Spinner data-icon="inline-start" />
                Guardando…
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

export function SeccionDeLista<T>({
  titulo,
  descripcion,
  control,
  maximo,
  nuevo,
  etiquetaDeFila,
  textoAgregar,
  campos,
}: {
  titulo: string
  descripcion: string
  control: ControlDeSeccion<T[]>
  /** Cuántos elementos acepta el backend en esta sección. */
  maximo: number
  nuevo: () => T
  etiquetaDeFila: (item: T, indice: number) => string
  textoAgregar: string
  campos: (item: T, cambiar: (cambios: Partial<T>) => void) => React.ReactNode
}) {
  const items = control.valor

  function reemplazar(indice: number, cambios: Partial<T>) {
    control.cambiar(
      items.map((item, i) => (i === indice ? { ...item, ...cambios } : item))
    )
  }

  function mover(indice: number, salto: number) {
    const destino = indice + salto
    if (destino < 0 || destino >= items.length) return
    const copia = [...items]
    ;[copia[indice], copia[destino]] = [copia[destino], copia[indice]]
    control.cambiar(copia)
  }

  return (
    <Seccion titulo={titulo} descripcion={descripcion} control={control}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta sección está vacía; no aparecerá en la hoja de vida.
        </p>
      ) : null}

      <ol className="flex flex-col gap-5">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-3">
            {i > 0 ? <Separator /> : null}

            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {etiquetaDeFila(item, i) || `Sin título (${i + 1})`}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Subir"
                disabled={i === 0}
                onClick={() => mover(i, -1)}
              >
                <ChevronUpIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Bajar"
                disabled={i === items.length - 1}
                onClick={() => mover(i, 1)}
              >
                <ChevronDownIcon />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Eliminar"
                onClick={() => control.cambiar(items.filter((_, j) => j !== i))}
              >
                <TrashIcon />
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {campos(item, (cambios) => reemplazar(i, cambios))}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={items.length >= maximo}
          onClick={() => control.cambiar([...items, nuevo()])}
        >
          <PlusIcon data-icon="inline-start" />
          {textoAgregar}
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length}/{maximo}
        </span>
      </div>
    </Seccion>
  )
}
