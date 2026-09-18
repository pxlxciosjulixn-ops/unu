import type { LucideIcon } from "lucide-react"
import {
  BoxesIcon,
  BotIcon,
  ChartAreaIcon,
  FileTextIcon,
  GaugeIcon,
  GlobeIcon,
  PackageIcon,
  ReceiptIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { SidebarMarca } from "@/components/sidebar-marca"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type Ancla = { title: string; hash: string; icon: LucideIcon }

/** Bloques del tablero: el enlace baja hasta cada uno. */
const PANELES: Ancla[] = [
  { title: "Indicadores", hash: "#indicadores", icon: GaugeIcon },
  { title: "Metas y ventas", hash: "#ventas", icon: ChartAreaIcon },
  { title: "Utilidad", hash: "#utilidad", icon: TargetIcon },
  { title: "Países", hash: "#paises", icon: GlobeIcon },
  { title: "Pedidos", hash: "#pedidos", icon: ReceiptIcon },
  { title: "Productos", hash: "#productos", icon: PackageIcon },
]

/** Espacio reservado para lo que se construya después. */
const PENDIENTES = [
  { title: "Clientes", icon: UsersIcon },
  { title: "Inventario", icon: BoxesIcon },
  { title: "Informes", icon: FileTextIcon },
]

export function DashboardSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarMarca seccion="Panel de ventas" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Panel</SidebarGroupLabel>
          <SidebarMenu>
            {PANELES.map((panel) => (
              <SidebarMenuItem key={panel.hash}>
                <SidebarMenuButton
                  tooltip={panel.title}
                  render={<a href={panel.hash} />}
                >
                  <panel.icon />
                  <span>{panel.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Por construir</SidebarGroupLabel>
          <SidebarMenu>
            {PENDIENTES.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  disabled
                  tooltip={`${item.title} (pendiente)`}
                  className="opacity-60"
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Ir al chatbot" render={<Link to="/chatbot" />}>
              <BotIcon />
              <span>Ir al chatbot</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
