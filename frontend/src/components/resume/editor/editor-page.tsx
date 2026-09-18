/**
 * Editor de la hoja de vida (detrás del login).
 *
 * Cada tarjeta es una sección del CV y se guarda por separado contra
 * `/api/resume/…`. Los topes de caracteres los manda el propio backend, así
 * que los contadores de los campos y la validación del servidor cuentan lo
 * mismo: lo que se deja escribir es lo que cabe en la hoja sin desbordarla.
 */
import * as React from "react"
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { useSesion } from "@/components/auth/auth-context"
import { CampoTexto, ListaDeTextos } from "@/components/resume/editor/campos"
import { Seccion, SeccionDeLista } from "@/components/resume/editor/seccion"
import { useBorrador } from "@/components/resume/editor/use-borrador"
import { useHojaDeVida } from "@/components/resume/resume-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  guardarPerfil,
  guardarSeccion,
  type Formacion,
  type HojaDeVida,
  type Limites,
  type NivelIdioma,
  type NombreDeSeccion,
  type OpcionDeNivel,
  type Secciones,
} from "@/lib/resume-api"

export function EditorHojaDeVidaPage() {
  const { hoja, limites, niveles, cargando, deRespaldo, recargar } =
    useHojaDeVida()

  return (
    <div className="min-h-svh bg-muted/40">
      <CabeceraDelEditor />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Hoja de vida
          </h1>
          <p className="text-sm text-muted-foreground">
            Lo que guardes aquí queda en la base de datos y se ve de inmediato
            en la página pública. Cada campo tiene un tope de caracteres para
            que el texto no se salga de su caja.
          </p>
        </div>

        {cargando ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : limites === null ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>No se pudo cargar la hoja de vida</AlertTitle>
            <AlertDescription>
              El servidor no respondió. En el plan gratis de Render puede estar
              despertando: espera unos segundos y vuelve a intentar.
              <Button variant="outline" size="sm" onClick={recargar}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {deRespaldo ? (
              <Alert>
                <TriangleAlertIcon />
                <AlertTitle>Todavía no hay nada guardado</AlertTitle>
                <AlertDescription>
                  Lo que ves es la copia que viene con el sitio. Guarda primero
                  «Encabezado y contacto»: desde ahí la página pública empieza a
                  leer de la base de datos, y después puedes ir guardando el
                  resto de las secciones.
                </AlertDescription>
              </Alert>
            ) : null}

            <SeccionesDelEditor
              hoja={hoja}
              limites={limites}
              niveles={niveles}
              recargar={recargar}
            />
          </>
        )}
      </main>
    </div>
  )
}

function CabeceraDelEditor() {
  const { usuario } = useSesion()

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link to="/home" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {usuario?.username}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/" target="_blank" />}
          >
            Ver la hoja
            <ExternalLinkIcon data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </header>
  )
}

function SeccionesDelEditor({
  hoja,
  limites,
  niveles,
  recargar,
}: {
  hoja: HojaDeVida
  limites: Limites
  niveles: OpcionDeNivel[]
  recargar: () => void
}) {
  /**
   * Guardar una sección y volver a pedir la hoja: así el resto de la app —la
   * barra superior, la página pública— muestra lo nuevo sin recargar el
   * navegador.
   */
  function alGuardar<N extends NombreDeSeccion>(nombre: N) {
    return async (items: Secciones[N]) => {
      await guardarSeccion(nombre, items)
      recargar()
    }
  }

  return (
    <>
      <PerfilEditable hoja={hoja} limites={limites} recargar={recargar} />
      <AboutEditable
        hoja={hoja}
        limites={limites}
        guardar={alGuardar("about")}
      />
      <ExperienciaEditable
        hoja={hoja}
        limites={limites}
        guardar={alGuardar("experiences")}
      />
      <FormacionEditable
        titulo="Formación"
        descripcion="Los estudios que aparecen completos, con su descripción."
        items={hoja.education}
        limites={limites.education}
        textoAgregar="Agregar estudio"
        guardar={alGuardar("education")}
      />
      <FormacionEditable
        titulo="Cursos y certificaciones"
        descripcion="Van en la rejilla de dos columnas, debajo de la formación."
        items={hoja.certifications}
        limites={limites.certifications}
        textoAgregar="Agregar certificación"
        guardar={alGuardar("certifications")}
      />
      <HerramientasEditable
        hoja={hoja}
        limites={limites}
        guardar={alGuardar("skill_groups")}
      />
      <IdiomasEditable
        hoja={hoja}
        limites={limites}
        niveles={niveles}
        guardar={alGuardar("languages")}
      />
      <DatosEditable
        hoja={hoja}
        limites={limites}
        guardar={alGuardar("personal_details")}
      />
      <ReferenciasEditable
        hoja={hoja}
        limites={limites}
        guardar={alGuardar("references")}
      />
    </>
  )
}

function PerfilEditable({
  hoja,
  limites,
  recargar,
}: {
  hoja: HojaDeVida
  limites: Limites
  recargar: () => void
}) {
  const tope = limites.profile
  const guardar = React.useCallback(
    async (perfil: HojaDeVida["profile"]) => {
      await guardarPerfil(perfil)
      recargar()
    },
    [recargar]
  )
  const control = useBorrador(hoja.profile, guardar)
  const perfil = control.valor
  const cambiar = (cambios: Partial<HojaDeVida["profile"]>) =>
    control.cambiar({ ...perfil, ...cambios })

  return (
    <Seccion
      titulo="Encabezado y contacto"
      descripcion="El nombre de la banda superior y los datos de la columna gris."
      control={control}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          etiqueta="Nombre"
          valor={perfil.first_name}
          onChange={(first_name) => cambiar({ first_name })}
          maximo={tope.first_name}
        />
        <CampoTexto
          etiqueta="Apellidos"
          valor={perfil.last_name}
          onChange={(last_name) => cambiar({ last_name })}
          maximo={tope.last_name}
        />
        <CampoTexto
          etiqueta="Cargo"
          valor={perfil.title}
          onChange={(title) => cambiar({ title })}
          maximo={tope.title}
        />
        <CampoTexto
          etiqueta="Iniciales"
          valor={perfil.initials}
          onChange={(initials) => cambiar({ initials })}
          maximo={tope.initials}
          descripcion="Las del círculo de la foto y la barra superior."
        />
        <CampoTexto
          etiqueta="Teléfono"
          valor={perfil.phone}
          onChange={(phone) => cambiar({ phone })}
          maximo={tope.phone}
          tipo="tel"
        />
        <CampoTexto
          etiqueta="Correo"
          valor={perfil.email}
          onChange={(email) => cambiar({ email })}
          maximo={tope.email}
          tipo="email"
        />
        <CampoTexto
          etiqueta="Sitio web"
          valor={perfil.website}
          onChange={(website) => cambiar({ website })}
          maximo={tope.website}
          tipo="url"
          placeholder="https://…"
        />
        <CampoTexto
          etiqueta="Texto del enlace"
          valor={perfil.website_label}
          onChange={(website_label) => cambiar({ website_label })}
          maximo={tope.website_label}
          descripcion="Lo que se lee en vez de la dirección completa."
        />
        <CampoTexto
          etiqueta="Nota del enlace"
          valor={perfil.website_note}
          onChange={(website_note) => cambiar({ website_note })}
          maximo={tope.website_note}
          className="sm:col-span-2"
        />
        <CampoTexto
          etiqueta="Dirección"
          valor={perfil.address}
          onChange={(address) => cambiar({ address })}
          maximo={tope.address}
          className="sm:col-span-2"
        />
        <CampoTexto
          etiqueta="Resumen"
          valor={perfil.summary}
          onChange={(summary) => cambiar({ summary })}
          maximo={tope.summary}
          multilinea
          descripcion="El párrafo que abre “Mi perfil”."
          className="sm:col-span-2"
        />
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-foreground"
          checked={perfil.show_reference_contacts}
          onChange={(e) =>
            cambiar({ show_reference_contacts: e.target.checked })
          }
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">
            Mostrar el contacto de las referencias
          </span>
          <span className="text-xs text-muted-foreground">
            Si lo apagas, en la hoja quedan sólo los nombres y la relación.
          </span>
        </span>
      </label>
    </Seccion>
  )
}

function AboutEditable({
  hoja,
  limites,
  guardar,
}: {
  hoja: HojaDeVida
  limites: Limites
  guardar: (items: Secciones["about"]) => Promise<void>
}) {
  const tope = limites.about
  const control = useBorrador(hoja.about, guardar)

  return (
    <SeccionDeLista
      titulo="Puntos del perfil"
      descripcion="Las dos columnas que van debajo del resumen, en “Mi perfil”."
      control={control}
      maximo={tope.max_items}
      nuevo={() => ({ title: "", text: "" })}
      etiquetaDeFila={(punto) => punto.title}
      textoAgregar="Agregar punto"
      campos={(punto, cambiar) => (
        <>
          <CampoTexto
            etiqueta="Título"
            valor={punto.title}
            onChange={(title) => cambiar({ title })}
            maximo={tope.title}
          />
          <CampoTexto
            etiqueta="Texto"
            valor={punto.text}
            onChange={(text) => cambiar({ text })}
            maximo={tope.text}
            multilinea
          />
        </>
      )}
    />
  )
}

function ExperienciaEditable({
  hoja,
  limites,
  guardar,
}: {
  hoja: HojaDeVida
  limites: Limites
  guardar: (items: Secciones["experiences"]) => Promise<void>
}) {
  const tope = limites.experiences
  const control = useBorrador(hoja.experiences, guardar)

  return (
    <SeccionDeLista
      titulo="Experiencia"
      descripcion="Los cargos. El período y la duración se calculan con las fechas."
      control={control}
      maximo={tope.max_items}
      nuevo={() => ({
        role: "",
        company: "",
        location: "",
        start: "",
        end: "",
        current: false,
        period: "",
        bullets: [],
        stack: [],
      })}
      etiquetaDeFila={(cargo) => cargo.role}
      textoAgregar="Agregar cargo"
      campos={(cargo, cambiar) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Cargo"
              valor={cargo.role}
              onChange={(role) => cambiar({ role })}
              maximo={tope.role}
            />
            <CampoTexto
              etiqueta="Empresa"
              valor={cargo.company}
              onChange={(company) => cambiar({ company })}
              maximo={tope.company}
            />
            <CampoTexto
              etiqueta="Ciudad"
              valor={cargo.location}
              onChange={(location) => cambiar({ location })}
              maximo={tope.location}
            />
            <div className="flex items-end gap-3">
              <CampoTexto
                etiqueta="Inicio"
                valor={cargo.start}
                onChange={(start) => cambiar({ start })}
                maximo={tope.start}
                placeholder="2025-07"
                descripcion="AAAA-MM"
              />
              <CampoTexto
                etiqueta="Fin"
                valor={cargo.end}
                onChange={(end) => cambiar({ end })}
                maximo={tope.end}
                placeholder="2026-03"
                deshabilitado={cargo.current}
                descripcion={cargo.current ? "Cargo vigente" : "AAAA-MM"}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={cargo.current}
              onChange={(e) =>
                cambiar({
                  current: e.target.checked,
                  // Un cargo vigente no lleva fecha de fin; el backend la
                  // borra igual, y así el formulario no muestra una que ya
                  // no cuenta.
                  end: e.target.checked ? "" : cargo.end,
                })
              }
            />
            Sigo en este cargo
          </label>

          <ListaDeTextos
            etiqueta="Funciones"
            valores={cargo.bullets}
            onChange={(bullets) => cambiar({ bullets })}
            maximoPorTexto={tope.bullet}
            maximoElementos={tope.max_bullets}
            multilinea
            textoAgregar="Agregar función"
          />

          <ListaDeTextos
            etiqueta="Tecnologías"
            valores={cargo.stack}
            onChange={(stack) => cambiar({ stack })}
            maximoPorTexto={tope.tech}
            maximoElementos={tope.max_stack}
            placeholder="Power BI"
            textoAgregar="Agregar tecnología"
          />
        </>
      )}
    />
  )
}

function FormacionEditable({
  titulo,
  descripcion,
  items,
  limites,
  textoAgregar,
  guardar,
}: {
  titulo: string
  descripcion: string
  items: Formacion[]
  limites: Record<string, number>
  textoAgregar: string
  guardar: (items: Formacion[]) => Promise<void>
}) {
  const control = useBorrador(items, guardar)

  return (
    <SeccionDeLista
      titulo={titulo}
      descripcion={descripcion}
      control={control}
      maximo={limites.max_items}
      nuevo={() => ({
        title: "",
        institution: "",
        location: "",
        year: "",
        description: "",
      })}
      etiquetaDeFila={(item) => item.title}
      textoAgregar={textoAgregar}
      campos={(item, cambiar) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto
              etiqueta="Título"
              valor={item.title}
              onChange={(title) => cambiar({ title })}
              maximo={limites.title}
            />
            <CampoTexto
              etiqueta="Institución"
              valor={item.institution}
              onChange={(institution) => cambiar({ institution })}
              maximo={limites.institution}
            />
            <CampoTexto
              etiqueta="Ciudad"
              valor={item.location}
              onChange={(location) => cambiar({ location })}
              maximo={limites.location}
            />
            <CampoTexto
              etiqueta="Año"
              valor={item.year}
              onChange={(year) => cambiar({ year })}
              maximo={limites.year}
              placeholder="2025"
            />
          </div>
          <CampoTexto
            etiqueta="Descripción"
            valor={item.description}
            onChange={(description) => cambiar({ description })}
            maximo={limites.description}
            multilinea
          />
        </>
      )}
    />
  )
}

function HerramientasEditable({
  hoja,
  limites,
  guardar,
}: {
  hoja: HojaDeVida
  limites: Limites
  guardar: (items: Secciones["skill_groups"]) => Promise<void>
}) {
  const tope = limites.skill_groups
  const control = useBorrador(hoja.skill_groups, guardar)

  return (
    <SeccionDeLista
      titulo="Herramientas"
      descripcion="Los grupos de etiquetas del final de la hoja."
      control={control}
      maximo={tope.max_items}
      nuevo={() => ({ name: "", skills: [] })}
      etiquetaDeFila={(grupo) => grupo.name}
      textoAgregar="Agregar grupo"
      campos={(grupo, cambiar) => (
        <>
          <CampoTexto
            etiqueta="Nombre del grupo"
            valor={grupo.name}
            onChange={(name) => cambiar({ name })}
            maximo={tope.name}
          />
          <ListaDeTextos
            etiqueta="Herramientas"
            valores={grupo.skills}
            onChange={(skills) => cambiar({ skills })}
            maximoPorTexto={tope.skill}
            maximoElementos={tope.max_skills}
            placeholder="SQL"
            textoAgregar="Agregar herramienta"
          />
        </>
      )}
    />
  )
}

function IdiomasEditable({
  hoja,
  limites,
  niveles,
  guardar,
}: {
  hoja: HojaDeVida
  limites: Limites
  niveles: OpcionDeNivel[]
  guardar: (items: Secciones["languages"]) => Promise<void>
}) {
  const tope = limites.languages
  const control = useBorrador(hoja.languages, guardar)
  // Los niveles los define el backend; el primero es el que trae un idioma
  // recién agregado.
  const porDefecto = niveles[0]

  return (
    <SeccionDeLista
      titulo="Idiomas"
      descripcion="El nivel decide cuánto se llena la barra; no se escribe a mano."
      control={control}
      maximo={tope.max_items}
      nuevo={() => ({
        name: "",
        level: porDefecto.value,
        level_label: porDefecto.label,
        percent: porDefecto.percent,
      })}
      etiquetaDeFila={(idioma) => idioma.name}
      textoAgregar="Agregar idioma"
      campos={(idioma, cambiar) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Idioma"
            valor={idioma.name}
            onChange={(name) => cambiar({ name })}
            maximo={tope.name}
          />
          <div className="flex flex-col gap-1.5">
            <Label>Nivel</Label>
            <Select
              value={idioma.level}
              onValueChange={(valor: string | null) => {
                const elegido = niveles.find((n) => n.value === valor)
                if (!elegido) return
                cambiar({
                  level: elegido.value as NivelIdioma,
                  level_label: elegido.label,
                  percent: elegido.percent,
                })
              }}
            >
              <SelectTrigger aria-label="Nivel">
                <SelectValue>
                  {(valor) =>
                    niveles.find((n) => n.value === valor)?.label ??
                    String(valor)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {niveles.map((nivel) => (
                    <SelectItem key={nivel.value} value={nivel.value}>
                      {nivel.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    />
  )
}

function DatosEditable({
  hoja,
  limites,
  guardar,
}: {
  hoja: HojaDeVida
  limites: Limites
  guardar: (items: Secciones["personal_details"]) => Promise<void>
}) {
  const tope = limites.personal_details
  const control = useBorrador(hoja.personal_details, guardar)

  return (
    <SeccionDeLista
      titulo="Información"
      descripcion="Los datos sueltos de la columna lateral."
      control={control}
      maximo={tope.max_items}
      nuevo={() => ({ label: "", value: "" })}
      etiquetaDeFila={(dato) => dato.label}
      textoAgregar="Agregar dato"
      campos={(dato, cambiar) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Etiqueta"
            valor={dato.label}
            onChange={(label) => cambiar({ label })}
            maximo={tope.label}
          />
          <CampoTexto
            etiqueta="Valor"
            valor={dato.value}
            onChange={(value) => cambiar({ value })}
            maximo={tope.value}
          />
        </div>
      )}
    />
  )
}

function ReferenciasEditable({
  hoja,
  limites,
  guardar,
}: {
  hoja: HojaDeVida
  limites: Limites
  guardar: (items: Secciones["references"]) => Promise<void>
}) {
  const tope = limites.references
  const control = useBorrador(hoja.references, guardar)

  return (
    <SeccionDeLista
      titulo="Referencias"
      descripcion="Mostrar o no su teléfono y correo se decide en el encabezado."
      control={control}
      maximo={tope.max_items}
      nuevo={() => ({ name: "", relation: "", phone: "", email: "" })}
      etiquetaDeFila={(referencia) => referencia.name}
      textoAgregar="Agregar referencia"
      campos={(referencia, cambiar) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            etiqueta="Nombre"
            valor={referencia.name}
            onChange={(name) => cambiar({ name })}
            maximo={tope.name}
          />
          <CampoTexto
            etiqueta="Relación"
            valor={referencia.relation}
            onChange={(relation) => cambiar({ relation })}
            maximo={tope.relation}
          />
          <CampoTexto
            etiqueta="Teléfono"
            valor={referencia.phone}
            onChange={(phone) => cambiar({ phone })}
            maximo={tope.phone}
            tipo="tel"
          />
          <CampoTexto
            etiqueta="Correo"
            valor={referencia.email}
            onChange={(email) => cambiar({ email })}
            maximo={tope.email}
            tipo="email"
          />
        </div>
      )}
    />
  )
}
