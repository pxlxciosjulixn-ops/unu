import { MessageCircleHeartIcon, SettingsIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { BotonInstalar } from "@/components/chatbot/boton-instalar"
import { FOTO_CONSEJERO } from "@/components/chatbot/inicio-consejero"
import { SidebarMarca } from "@/components/sidebar-marca"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

/** Barra lateral de las páginas sueltas del consejero (ajustes, análisis). */
export function SidebarConsejero() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarMarca seccion="Chatbot" foto={FOTO_CONSEJERO} />
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Chat" render={<Link to="/chatbot" />}>
                <MessageCircleHeartIcon />
                <span>Chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Ajustes"
                isActive={pathname === "/chatbot/ajustes"}
                render={<Link to="/chatbot/ajustes" />}
              >
                <SettingsIcon />
                <span>Ajustes</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <BotonInstalar />
        </SidebarMenu>
        <p className="px-2 pb-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          Desarrollado por{" "}
          <span className="font-semibold text-foreground">Julian Palacios</span>
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
