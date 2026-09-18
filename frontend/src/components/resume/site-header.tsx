import { FileTextIcon, FolderIcon, LogInIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { usePerfil } from "@/components/resume/resume-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const SECCIONES = [
  { ruta: "/", etiqueta: "Hoja de vida", icono: FileTextIcon },
  { ruta: "/proyectos", etiqueta: "Proyectos", icono: FolderIcon },
]

/**
 * Barra de la aplicación: marca, las dos secciones públicas y el ingreso.
 *
 * No lleva enlaces a los apartados de la hoja de vida; es navegación de la
 * app, no un índice de la página.
 */
export function SiteHeader() {
  const profile = usePerfil()
  const { pathname } = useLocation()
  const nombreCorto = `${profile.first_name.split(" ")[0]} ${profile.last_name.split(" ")[0]}`

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar size="sm">
            <AvatarFallback className="text-[0.625rem] font-semibold">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-semibold">{nombreCorto}</span>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            · {profile.title}
          </span>
        </Link>

        <nav aria-label="Secciones" className="flex items-center gap-2">
          {SECCIONES.map((seccion) => {
            const activa = pathname === seccion.ruta

            return (
              <Button
                key={seccion.ruta}
                // La sección en la que ya se está se marca, pero sigue siendo
                // un enlace: sin esto no hay forma de saber dónde se está.
                variant={activa ? "secondary" : "ghost"}
                size="sm"
                nativeButton={false}
                render={
                  <Link
                    to={seccion.ruta}
                    aria-label={seccion.etiqueta}
                    aria-current={activa ? "page" : undefined}
                  />
                }
              >
                <seccion.icono data-icon="inline-start" />
                {/* En móvil quedan solo los iconos: tres botones con texto no
                    caben al lado de la marca. */}
                <span className="hidden sm:inline">{seccion.etiqueta}</span>
              </Button>
            )
          })}
        </nav>

        {/* `ml-auto` lo empuja al borde derecho, separado de la navegación. */}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          nativeButton={false}
          render={<Link to="/home" />}
        >
          <LogInIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Ingresar</span>
        </Button>
      </div>
    </header>
  )
}
