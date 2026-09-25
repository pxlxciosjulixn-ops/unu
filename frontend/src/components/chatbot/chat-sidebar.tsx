import {
  LayoutDashboardIcon,
  MessageSquareIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { BotonInstalar } from "@/components/chatbot/boton-instalar"
import { SidebarMarca } from "@/components/sidebar-marca"
import type { Conversacion } from "@/components/chatbot/tipos"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"

const fecha = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
})

/** Hoy y ayer se leen mejor que una fecha. */
function cuando(iso: string) {
  const dia = new Date(iso)
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)

  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (mismoDia(dia, hoy)) return "hoy"
  if (mismoDia(dia, ayer)) return "ayer"
  return fecha.format(dia)
}

export function ChatSidebar({
  conversaciones,
  activa,
  cargando,
  onNueva,
  onAbrir,
  onBorrar,
}: {
  conversaciones: Conversacion[]
  activa: string | null
  cargando: boolean
  onNueva: () => void
  onAbrir: (id: string) => void
  onBorrar: (id: string) => void
}) {
  return (
    <Sidebar collapsible="icon">
      <SidebarMarca seccion="Chatbot" foto="/img/chatbot-avatar.png" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* En modo icono el botón se encoge al ancho de la barra. */}
              <SidebarMenuButton
                tooltip="Nueva conversación"
                onClick={onNueva}
                className="bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground"
              >
                <PlusIcon />
                <span>Nueva conversación</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Historial</SidebarGroupLabel>
          {/* El menú viene con `gap-0`: con dos líneas por conversación se
              amontonan, así que aquí se les da aire. */}
          <SidebarMenu className="gap-1.5">
            {cargando ? (
              <>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              </>
            ) : conversaciones.length === 0 ? (
              <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                Todavía no hay conversaciones. Las que empieces quedan guardadas
                y las vuelves a encontrar aquí.
              </p>
            ) : (
              conversaciones.map((conversacion) => (
                <SidebarMenuItem key={conversacion.id}>
                  <SidebarMenuButton
                    isActive={conversacion.id === activa}
                    tooltip={conversacion.title || "Sin título"}
                    onClick={() => onAbrir(conversacion.id)}
                    className="h-auto items-start py-2 pr-8 leading-snug"
                  >
                    <MessageSquareIcon />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">
                        {conversacion.title || "Sin título"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {cuando(conversacion.updated_at)} ·{" "}
                        {conversacion.message_count} mensajes
                      </span>
                    </span>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    showOnHover
                    aria-label={`Borrar ${conversacion.title || "conversación"}`}
                    onClick={() => onBorrar(conversacion.id)}
                  >
                    <Trash2Icon />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <BotonInstalar />
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Ir al dashboard"
              render={<Link to="/dashboard" />}
            >
              <LayoutDashboardIcon />
              <span>Ir al dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <p className="px-2 pb-1 text-[0.6875rem] leading-snug text-muted-foreground group-data-[collapsible=icon]:hidden">
          Las conversaciones se guardan en la base y se agrupan por tu conexión,
          sin inicio de sesión.
        </p>
        <p className="px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Desarrollado por{" "}
          <span className="font-semibold text-foreground">Julian Palacios</span>
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}

/** Botón suelto para pantallas donde la barra está oculta. */
export function BotonNuevaConversacion({ onNueva }: { onNueva: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onNueva}>
      <PlusIcon data-icon="inline-start" />
      <span className="hidden sm:inline">Nueva</span>
    </Button>
  )
}
