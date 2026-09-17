import type { LucideIcon } from "lucide-react"
import {
  BoxesIcon,
  BotIcon,
  ChartAreaIcon,
  FileTextIcon,
  GaugeIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  PackageIcon,
  ReceiptIcon,
  TargetIcon,
  UsersIcon,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { profile } from "@/data/resume"

type Pagina = { title: string; to: string; icon: LucideIcon }
type Ancla = { title: string; hash: string; icon: LucideIcon }

const PAGINAS: Pagina[] = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Chatbot", to: "/chatbot", icon: BotIcon },
]

/** Bloques de cada página: el enlace baja hasta ellos. */
const ANCLAS: Record<string, Ancla[]> = {
  "/dashboard": [
    { title: "Indicadores", hash: "#indicadores", icon: GaugeIcon },
    { title: "Cumplimiento", hash: "#ventas", icon: ChartAreaIcon },
    { title: "Utilidad", hash: "#utilidad", icon: TargetIcon },
    { title: "Países", hash: "#paises", icon: GlobeIcon },
    { title: "Pedidos", hash: "#pedidos", icon: ReceiptIcon },
    { title: "Productos", hash: "#productos", icon: PackageIcon },
  ],
}

/** Espacio reservado para lo que se construya después. */
const PENDIENTES = [
  { title: "Clientes", icon: UsersIcon },
  { title: "Inventario", icon: BoxesIcon },
  { title: "Informes", icon: FileTextIcon },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const anclas = ANCLAS[pathname] ?? []

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Volver a la hoja de vida"
              render={<Link to="/" />}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {profile.initials}
              </span>
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate text-sm font-semibold">unu</span>
                <span className="truncate text-xs text-muted-foreground">
                  Panel interno
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Páginas</SidebarGroupLabel>
          <SidebarMenu>
            {PAGINAS.map((pagina) => (
              <SidebarMenuItem key={pagina.to}>
                <SidebarMenuButton
                  isActive={pathname === pagina.to}
                  tooltip={pagina.title}
                  render={<Link to={pagina.to} />}
                >
                  <pagina.icon />
                  <span>{pagina.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {anclas.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>En esta página</SidebarGroupLabel>
            <SidebarMenu>
              {anclas.map((ancla) => (
                <SidebarMenuItem key={ancla.hash}>
                  <SidebarMenuButton
                    tooltip={ancla.title}
                    render={<a href={ancla.hash} />}
                  >
                    <ancla.icon />
                    <span>{ancla.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}

        <SidebarSeparator />

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

    </Sidebar>
  )
}
