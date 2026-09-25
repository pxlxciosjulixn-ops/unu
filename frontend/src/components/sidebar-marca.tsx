import { Link } from "react-router-dom"

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { usePerfil } from "@/components/resume/resume-context"

/**
 * Cabecera común de las barras laterales: marca y regreso a la hoja de vida.
 *
 * Con `foto` se muestra esa imagen en un círculo en vez de las iniciales.
 */
export function SidebarMarca({
  seccion,
  foto,
}: {
  seccion: string
  foto?: string
}) {
  const profile = usePerfil()

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltip="Volver a la hoja de vida"
            render={<Link to="/" />}
          >
            {foto ? (
              <img
                src={foto}
                alt=""
                className="size-8 shrink-0 rounded-full bg-black object-cover"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {profile.initials}
              </span>
            )}
            <span className="flex min-w-0 flex-col text-left leading-tight">
              <span className="truncate text-sm font-semibold">unu</span>
              <span className="truncate text-xs text-muted-foreground">
                {seccion}
              </span>
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}
