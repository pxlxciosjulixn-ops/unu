import * as React from "react"
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react"

import {
  ACENTOS,
  ACENTOS_CLAROS,
  ACENTOS_INTENSOS,
  cargarFuentes,
  LETRA_DEL_ESTILO,
  LETRAS,
  type Estilo,
  type Personalizacion,
  type Tema,
} from "@/components/chatbot/personalizacion"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/**
 * Los controles de estilo, tema, color de acento y letra. Los usan los
 * ajustes del chat y la configuración de finanzas, cada uno con su propio
 * lugar donde guardar lo elegido.
 */

export type Apariencia = Pick<
  Personalizacion,
  "estilo" | "tema" | "acento" | "letra"
>

export function Campo({
  etiqueta,
  children,
}: {
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-medium">{etiqueta}</p>
      {children}
    </div>
  )
}

export function Opcion({
  elegida,
  onElegir,
  className,
  children,
}: {
  elegida: boolean
  onElegir: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={elegida}
      onClick={onElegir}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition hover:border-foreground/30",
        elegida
          ? "border-foreground bg-muted/60 ring-1 ring-foreground"
          : "bg-background",
        className
      )}
    >
      {children}
    </button>
  )
}

const TEMAS: { valor: Tema; nombre: string; icono: typeof SunIcon }[] = [
  { valor: "claro", nombre: "Claro", icono: SunIcon },
  { valor: "oscuro", nombre: "Oscuro", icono: MoonIcon },
  { valor: "sistema", nombre: "Sistema", icono: MonitorIcon },
]

const ESTILOS: { valor: Estilo; nombre: string; detalle: string }[] = [
  { valor: "normal", nombre: "Normal", detalle: "Limpio y moderno" },
  {
    valor: "vintage",
    nombre: "Vintage",
    detalle: "Papel, tinta y máquina de escribir",
  },
  {
    valor: "y2k",
    nombre: "Web 1.0 / Y2K",
    detalle: "Windows 98 y escritorio rosado",
  },
]

/** Muestra en miniatura de cada estilo, dibujada con sus propios colores. */
function MuestraEstilo({ estilo }: { estilo: Estilo }) {
  if (estilo === "y2k") {
    // Ventanita de Windows 98 sobre el escritorio rosado.
    return (
      <div
        aria-hidden
        className="flex h-20 w-full items-center justify-center overflow-hidden p-2.5"
        style={{
          backgroundColor: "#f7b2ea",
          backgroundImage:
            "repeating-conic-gradient(#f59ce3 0% 25%, #fbc9f1 0% 50%)",
          backgroundSize: "6px 6px",
        }}
      >
        <div
          className="flex w-4/5 flex-col bg-[#c0c0c0] p-[3px]"
          style={{
            boxShadow:
              "inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf",
          }}
        >
          <span className="h-2.5 bg-linear-to-r from-[#000080] to-[#1084d0]" />
          <span className="mt-1 h-3 bg-white shadow-[inset_1px_1px_#808080]" />
        </div>
      </div>
    )
  }
  const vintage = estilo === "vintage"
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-20 w-full flex-col justify-end gap-1.5 overflow-hidden border p-2.5",
        vintage
          ? "rounded-[5px] border-[#cdb991] bg-[#f3ead6]"
          : "rounded-lg border-neutral-200 bg-white"
      )}
    >
      <span
        className={cn(
          "h-3 w-3/5 self-end",
          vintage
            ? "rounded-[3px] bg-[#7a3b24] shadow-[2px_2px_0_#00000030]"
            : "rounded-full bg-neutral-900"
        )}
      />
      <span
        className={cn(
          "h-3 w-4/5",
          vintage
            ? "rounded-[3px] border border-[#cdb991] bg-[#fbf6ea] shadow-[2px_2px_0_#00000020]"
            : "rounded-full border border-neutral-200 bg-neutral-50"
        )}
      />
    </div>
  )
}

function Paleta({
  titulo,
  claves,
  elegido,
  onElegir,
}: {
  titulo: string
  claves: string[]
  elegido: string
  onElegir: (clave: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-background p-3">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <div
        role="radiogroup"
        aria-label={`Colores ${titulo.toLowerCase()}`}
        className="grid grid-cols-7 gap-2"
      >
        {claves.map((clave) => {
          const color = ACENTOS[clave]
          const activo = elegido === clave
          const nombre = color?.nombre ?? "Neutro"
          return (
            <button
              key={clave}
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={nombre}
              title={nombre}
              onClick={() => onElegir(clave)}
              className={cn(
                "flex aspect-square w-full items-center justify-center rounded-full border ring-offset-2 ring-offset-background transition",
                activo ? "ring-2 ring-foreground" : "hover:scale-105"
              )}
              style={{ background: color?.claro ?? "var(--foreground)" }}
            >
              {activo ? (
                <CheckIcon
                  className="size-3.5"
                  style={{ color: color?.texto ?? "var(--background)" }}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Estilo, tema, color de acento y letra, con una frase para probar la letra. */
export function ControlesEstilo({
  valor,
  onCambiar,
  ejemplo,
}: {
  valor: Apariencia
  onCambiar: (cambios: Partial<Apariencia>) => void
  ejemplo: string
}) {
  const { estilo, tema, acento, letra } = valor

  // Para ver cada letra en la lista hay que tenerlas cargadas.
  React.useEffect(() => {
    cargarFuentes(Object.keys(LETRAS))
  }, [])

  const grupos = Object.entries(LETRAS).reduce<
    Record<string, [string, (typeof LETRAS)[string]][]>
  >((acumulado, entrada) => {
    ;(acumulado[entrada[1].grupo] ??= []).push(entrada)
    return acumulado
  }, {})
  const nombreLetra = (clave: string) =>
    clave === "auto"
      ? `Automática (${LETRAS[LETRA_DEL_ESTILO[estilo]].nombre})`
      : (LETRAS[clave]?.nombre ?? clave)

  return (
    <>
      <Campo etiqueta="Estilo">
        <div
          role="radiogroup"
          aria-label="Estilo"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {ESTILOS.map((e) => (
            <Opcion
              key={e.valor}
              elegida={estilo === e.valor}
              onElegir={() => onCambiar({ estilo: e.valor })}
              className="flex-col items-stretch gap-2.5 p-3 text-left"
            >
              <MuestraEstilo estilo={e.valor} />
              <span className="flex flex-col">
                <span className="font-medium">{e.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  {e.detalle}
                </span>
              </span>
            </Opcion>
          ))}
        </div>
      </Campo>

      <Campo etiqueta="Tema">
        <div
          role="radiogroup"
          aria-label="Tema"
          className="grid grid-cols-3 gap-2"
        >
          {TEMAS.map((t) => (
            <Opcion
              key={t.valor}
              elegida={tema === t.valor}
              onElegir={() => onCambiar({ tema: t.valor })}
            >
              <t.icono className="size-4" />
              {t.nombre}
            </Opcion>
          ))}
        </div>
      </Campo>

      <Campo etiqueta="Color de acento">
        <div className="grid gap-3 sm:grid-cols-2">
          <Paleta
            titulo="Intensos"
            claves={ACENTOS_INTENSOS}
            elegido={acento}
            onElegir={(clave) => onCambiar({ acento: clave })}
          />
          <Paleta
            titulo="Claritos"
            claves={ACENTOS_CLAROS}
            elegido={acento}
            onElegir={(clave) => onCambiar({ acento: clave })}
          />
        </div>
      </Campo>

      <Campo etiqueta="Letra">
        <Select
          value={letra}
          onValueChange={(nueva: string | null) => {
            if (nueva) onCambiar({ letra: nueva })
          }}
        >
          <SelectTrigger
            aria-label="Letra"
            className="h-11! w-full bg-background"
          >
            <SelectValue>
              {(elegida) => (
                <span
                  style={{
                    fontFamily:
                      LETRAS[
                        elegida === "auto"
                          ? LETRA_DEL_ESTILO[estilo]
                          : String(elegida)
                      ]?.familia ?? undefined,
                  }}
                >
                  {nombreLetra(String(elegida))}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="auto">
              Automática ({LETRAS[LETRA_DEL_ESTILO[estilo]].nombre})
            </SelectItem>
            {Object.entries(grupos).map(([grupo, letras]) => (
              <SelectGroup key={grupo}>
                <SelectLabel>{grupo}</SelectLabel>
                {letras.map(([clave, datos]) => (
                  <SelectItem
                    key={clave}
                    value={clave}
                    style={{ fontFamily: datos.familia ?? undefined }}
                  >
                    {datos.nombre}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <p
          className="rounded-xl bg-muted/50 px-4 py-3 text-sm"
          style={{
            fontFamily:
              LETRAS[letra === "auto" ? LETRA_DEL_ESTILO[estilo] : letra]
                ?.familia ?? undefined,
          }}
        >
          {ejemplo}
        </p>
      </Campo>
    </>
  )
}
