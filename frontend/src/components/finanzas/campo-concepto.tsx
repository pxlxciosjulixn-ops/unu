import * as React from "react"

import {
  CONCEPTO_MAX,
  type Tipo,
} from "@/components/finanzas/finanzas"
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@/components/ui/autocomplete"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { InputGroupText } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Concepto y tipo en un solo campo.
 *
 * Al corregir un movimiento casi siempre se toca el concepto y el tipo a la
 * vez ("esto no era un gasto, era un ingreso"), así que el desplegable de
 * gasto/ingreso va pegado al campo del concepto y no en otra fila.
 */
export function CampoConcepto({
  concepto,
  tipo,
  sugerencias,
  error,
  onConcepto,
  onTipo,
  inputRef,
  id = "concepto",
}: {
  concepto: string
  tipo: Tipo
  /** Los conceptos que se ofrecen mientras se escribe. */
  sugerencias: string[]
  error?: string
  onConcepto: (texto: string) => void
  onTipo: (tipo: Tipo) => void
  inputRef?: React.Ref<HTMLInputElement>
  id?: string
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>Concepto y tipo</FieldLabel>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
        <Select
          value={tipo}
          onValueChange={(elegido: string | null) => {
            if (elegido) onTipo(elegido as Tipo)
          }}
        >
          <SelectTrigger
            aria-label="Tipo de movimiento"
            className="w-full shrink-0 justify-between sm:w-32"
          >
            <SelectValue>
              {(elegido: string) =>
                elegido === "ingreso" ? "Ingreso" : "Gasto"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gasto">Gasto</SelectItem>
            <SelectItem value="ingreso">Ingreso</SelectItem>
          </SelectContent>
        </Select>

        {/* El campo es libre: la lista solo sugiere, pero si lo escrito
            coincide con una sugerencia se guarda con ese nombre. */}
        <div className="min-w-0 flex-1">
          <Autocomplete
            items={sugerencias}
            value={concepto}
            onValueChange={(texto: string) =>
              onConcepto(texto.slice(0, CONCEPTO_MAX))
            }
          >
            <AutocompleteInput
              ref={inputRef}
              id={id}
              maxLength={CONCEPTO_MAX}
              placeholder="Ej.: Comida, Nu, Mama…"
              aria-invalid={error ? true : undefined}
              showTrigger={false}
              required
            >
              <InputGroupText className="tabular-nums">
                {concepto.length}/{CONCEPTO_MAX}
              </InputGroupText>
            </AutocompleteInput>
            {/* Sin coincidencias la lista se esconde: escribir un concepto
                nuevo no llena la pantalla de avisos. */}
            <AutocompleteContent className="data-empty:hidden">
              <AutocompleteList>
                {(opcion: string) => (
                  <AutocompleteItem key={opcion} value={opcion}>
                    {opcion}
                  </AutocompleteItem>
                )}
              </AutocompleteList>
            </AutocompleteContent>
          </Autocomplete>
        </div>
      </div>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <FieldDescription>
          Elige una sugerencia o escribe otro concepto, y di si suma o resta.
        </FieldDescription>
      )}
    </Field>
  )
}
