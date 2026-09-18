/**
 * Piezas del formulario del editor.
 *
 * Todas llevan contador de caracteres: el tope lo manda el backend y es el
 * mismo con el que valida al guardar, así que lo que quepa en el campo cabe en
 * su caja de la hoja de vida. El `maxLength` del input frena el texto de más
 * antes de escribirlo; el contador avisa desde que quedan pocos caracteres.
 */
import * as React from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

/** Desde qué porcentaje del tope el contador se pone en aviso. */
const AVISO = 0.9

function Contador({ usados, maximo }: { usados: number; maximo: number }) {
  const lleno = usados >= maximo
  const cerca = usados >= maximo * AVISO

  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 text-xs tabular-nums",
        lleno
          ? "font-medium text-destructive"
          : cerca
            ? "text-foreground"
            : "text-muted-foreground"
      )}
    >
      {usados}/{maximo}
    </span>
  )
}

export function CampoTexto({
  etiqueta,
  valor,
  onChange,
  maximo,
  multilinea = false,
  descripcion,
  tipo = "text",
  placeholder,
  deshabilitado,
  className,
}: {
  etiqueta: string
  valor: string
  onChange: (valor: string) => void
  maximo: number
  multilinea?: boolean
  descripcion?: string
  tipo?: string
  placeholder?: string
  deshabilitado?: boolean
  className?: string
}) {
  const id = React.useId()
  const comun = {
    id,
    value: valor,
    maxLength: maximo,
    placeholder,
    disabled: deshabilitado,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>{etiqueta}</Label>
        <Contador usados={valor.length} maximo={maximo} />
      </div>
      {multilinea ? (
        <Textarea {...comun} rows={3} />
      ) : (
        <Input {...comun} type={tipo} />
      )}
      {descripcion ? (
        <p className="text-xs text-muted-foreground">{descripcion}</p>
      ) : null}
    </div>
  )
}

/**
 * Lista de textos cortos dentro de un elemento: las funciones de un cargo o
 * las herramientas de un grupo. Cada línea es un campo con su propio tope.
 */
export function ListaDeTextos({
  etiqueta,
  valores,
  onChange,
  maximoPorTexto,
  maximoElementos,
  multilinea = false,
  placeholder,
  textoAgregar,
}: {
  etiqueta: string
  valores: string[]
  onChange: (valores: string[]) => void
  maximoPorTexto: number
  maximoElementos: number
  multilinea?: boolean
  placeholder?: string
  textoAgregar: string
}) {
  function cambiar(indice: number, texto: string) {
    onChange(valores.map((valor, i) => (i === indice ? texto : valor)))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{etiqueta}</Label>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {valores.length}/{maximoElementos}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {valores.map((valor, i) => (
          <li key={i} className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {multilinea ? (
                <Textarea
                  value={valor}
                  rows={2}
                  maxLength={maximoPorTexto}
                  placeholder={placeholder}
                  aria-label={`${etiqueta} ${i + 1}`}
                  onChange={(e) => cambiar(i, e.target.value)}
                />
              ) : (
                <Input
                  value={valor}
                  maxLength={maximoPorTexto}
                  placeholder={placeholder}
                  aria-label={`${etiqueta} ${i + 1}`}
                  onChange={(e) => cambiar(i, e.target.value)}
                />
              )}
              <div className="flex justify-end">
                <Contador usados={valor.length} maximo={maximoPorTexto} />
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Quitar ${etiqueta.toLowerCase()} ${i + 1}`}
              onClick={() => onChange(valores.filter((_, j) => j !== i))}
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>

      <div>
        <Button
          variant="outline"
          size="sm"
          disabled={valores.length >= maximoElementos}
          onClick={() => onChange([...valores, ""])}
        >
          <PlusIcon data-icon="inline-start" />
          {textoAgregar}
        </Button>
      </div>
    </div>
  )
}
