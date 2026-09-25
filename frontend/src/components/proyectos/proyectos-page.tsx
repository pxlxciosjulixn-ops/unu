import * as React from "react"
import { ArrowRightIcon, SearchIcon, XIcon } from "lucide-react"
import { Link } from "react-router-dom"

import {
  PROYECTOS,
  TECNOLOGIAS,
  COMO_ESTA_HECHO,
  type Proyecto,
} from "@/components/proyectos/proyectos"
import { usePerfil } from "@/components/resume/resume-context"
import { SiteHeader } from "@/components/resume/site-header"
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
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"

/** Sin tildes ni mayúsculas: buscar "bi" tiene que encontrar "BI". */
function normalizar(texto: string) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function coincide(proyecto: Proyecto, busqueda: string) {
  if (!busqueda) return true
  const aguja = normalizar(busqueda)
  return normalizar(
    [
      proyecto.titulo,
      proyecto.resumen,
      ...proyecto.detalle,
      ...proyecto.stack,
    ].join(" ")
  ).includes(aguja)
}

export function ProyectosPage() {
  const profile = usePerfil()
  const [busqueda, setBusqueda] = React.useState("")
  const [tecnologia, setTecnologia] = React.useState<string | null>(null)

  const visibles = PROYECTOS.filter(
    (proyecto) =>
      coincide(proyecto, busqueda) &&
      (tecnologia === null || proyecto.stack.includes(tecnologia))
  )

  const filtrando = busqueda !== "" || tecnologia !== null

  function limpiar() {
    setBusqueda("")
    setTecnologia(null)
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Proyectos
            </h1>
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
              Tres aplicaciones en funcionamiento, no maquetas: comparten el
              backend en Django y la misma base de datos. Entra a cualquiera.
            </p>
          </div>

          {/* Filtros. Con tres proyectos no hacen falta para encontrar nada;
              sirven para ver de un vistazo con qué está hecho cada uno. */}
          <section aria-label="Filtros" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <InputGroup className="w-full sm:max-w-xs">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar proyecto o tecnología"
                  aria-label="Buscar proyecto"
                />
                {busqueda ? (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      aria-label="Limpiar la búsqueda"
                      onClick={() => setBusqueda("")}
                    >
                      <XIcon />
                    </InputGroupButton>
                  </InputGroupAddon>
                ) : null}
              </InputGroup>

              <p
                role="status"
                className="text-xs text-muted-foreground tabular-nums"
              >
                {visibles.length} de {PROYECTOS.length} proyectos
              </p>

              {filtrando ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limpiar}
                  className="sm:ml-auto"
                >
                  Limpiar filtros
                </Button>
              ) : null}
            </div>

            <ul className="flex flex-wrap gap-1.5">
              <li>
                <FiltroTecnologia
                  etiqueta="Todas"
                  activa={tecnologia === null}
                  onClick={() => setTecnologia(null)}
                />
              </li>
              {TECNOLOGIAS.map((nombre) => (
                <li key={nombre}>
                  <FiltroTecnologia
                    etiqueta={nombre}
                    activa={tecnologia === nombre}
                    // Volver a pulsar la tecnología activa quita el filtro.
                    onClick={() =>
                      setTecnologia((actual) =>
                        actual === nombre ? null : nombre
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          </section>

          {visibles.length === 0 ? (
            <Empty className="border bg-background py-12">
              <EmptyTitle>Ningún proyecto coincide</EmptyTitle>
              <EmptyDescription>
                Prueba con otra palabra o quita el filtro de tecnología.
              </EmptyDescription>
              <Button variant="outline" size="sm" onClick={limpiar}>
                Limpiar filtros
              </Button>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibles.map((proyecto) => (
                <TarjetaProyecto
                  key={proyecto.ruta}
                  proyecto={proyecto}
                  tecnologiaActiva={tecnologia}
                />
              ))}
            </div>
          )}

          <Separator />

          <section
            aria-labelledby="como-titulo"
            className="flex flex-col gap-4"
          >
            <h2
              id="como-titulo"
              className="text-sm font-bold tracking-[0.14em] uppercase"
            >
              Cómo está hecho
            </h2>
            <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-3">
              {COMO_ESTA_HECHO.map((bloque) => (
                <div key={bloque.titulo} className="flex flex-col gap-1">
                  <dt className="text-sm font-semibold">{bloque.titulo}</dt>
                  <dd className="text-sm leading-relaxed text-pretty text-muted-foreground">
                    {bloque.texto}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <p className="text-xs text-muted-foreground">
            {profile.first_name} {profile.last_name} · {profile.title}
          </p>
        </div>
      </main>
    </div>
  )
}

function FiltroTecnologia({
  etiqueta,
  activa,
  onClick,
}: {
  etiqueta: string
  activa: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant={activa ? "default" : "outline"}
      size="xs"
      aria-pressed={activa}
      onClick={onClick}
      className="rounded-4xl"
    >
      {etiqueta}
    </Button>
  )
}

function TarjetaProyecto({
  proyecto,
  tecnologiaActiva,
}: {
  proyecto: Proyecto
  tecnologiaActiva: string | null
}) {
  return (
    <Link
      to={proyecto.ruta}
      // La tarjeta entera es el enlace: así el área de clic es grande y el
      // foco del teclado cae en un solo sitio.
      className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            >
              <proyecto.icono className="size-5" />
            </span>
            <Badge variant="outline" className="tabular-nums">
              {proyecto.anio}
            </Badge>
          </div>
          <CardTitle className="text-lg">{proyecto.titulo}</CardTitle>
          <CardDescription>{proyecto.resumen}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <ul className="flex list-outside list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-foreground/30">
            {proyecto.detalle.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>

          <ul className="flex flex-wrap gap-1.5">
            {proyecto.stack.map((tecnologia) => (
              <li key={tecnologia}>
                {/* La tecnología filtrada se resalta para que se vea por qué
                    la tarjeta sigue en pantalla. */}
                <Badge
                  variant={
                    tecnologia === tecnologiaActiva ? "default" : "secondary"
                  }
                >
                  {tecnologia}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="justify-between">
          <span className="text-sm font-medium">Abrir {proyecto.titulo}</span>
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </CardFooter>
      </Card>
    </Link>
  )
}
