import type { LucideIcon } from "lucide-react"
import {
  BotIcon,
  ChartBarBigIcon,
  ChartLineIcon,
  ChartPieIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  ListIcon,
  NotebookPenIcon,
  SquarePlusIcon,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { AppShell } from "@/components/app-shell"
import { RUTAS_FINANZAS } from "@/components/finanzas/finanzas"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

type Pagina = { titulo: string; to: string; icon: LucideIcon }

const PAGINAS: Pagina[] = [
  {
    titulo: "Dashboard",
    to: RUTAS_FINANZAS.dashboard,
    icon: LayoutDashboardIcon,
  },
  {
    titulo: "Registrar movimiento",
    to: RUTAS_FINANZAS.formulario,
    icon: SquarePlusIcon,
  },
]

type Ancla = { titulo: string; hash: string; icon: LucideIcon }

/** Bloques del dashboard: el enlace baja hasta cada uno. */
const SECCIONES: Ancla[] = [
  { titulo: "Resumen", hash: "#resumen", icon: GaugeIcon },
  { titulo: "Evolución", hash: "#evolucion", icon: ChartLineIcon },
  { titulo: "Ingresos vs. gastos", hash: "#balance", icon: ChartPieIcon },
  { titulo: "Asistente IA", hash: "#asistente", icon: BotIcon },
  { titulo: "Por concepto", hash: "#conceptos", icon: ChartBarBigIcon },
  { titulo: "Datos del periodo", hash: "#datos", icon: NotebookPenIcon },
  { titulo: "Movimientos", hash: "#movimientos", icon: ListIcon },
]

function FinanzasSidebar() {
  const { pathname } = useLocation()
  const enDashboard = pathname === RUTAS_FINANZAS.dashboard

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="Mis finanzas"
              render={<Link to={RUTAS_FINANZAS.dashboard} />}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                $
              </span>
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate text-sm font-semibold">
                  Mis finanzas
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Gastos e ingresos
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Finanzas</SidebarGroupLabel>
          <SidebarMenu>
            {PAGINAS.map((pagina) => (
              <SidebarMenuItem key={pagina.to}>
                <SidebarMenuButton
                  isActive={pathname === pagina.to}
                  tooltip={pagina.titulo}
                  render={<Link to={pagina.to} />}
                >
                  <pagina.icon />
                  <span>{pagina.titulo}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {enDashboard ? (
          <SidebarGroup>
            <SidebarGroupLabel>En esta página</SidebarGroupLabel>
            <SidebarMenu>
              {SECCIONES.map((seccion) => (
                <SidebarMenuItem key={seccion.hash}>
                  <SidebarMenuButton
                    tooltip={seccion.titulo}
                    render={<a href={seccion.hash} />}
                  >
                    <seccion.icon />
                    <span>{seccion.titulo}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}

/**
 * Armazón de las páginas de finanzas: el dashboard y el formulario se
 * enlazan entre sí desde la barra lateral, pero nada del resto del sitio
 * apunta hacia aquí.
 */
export function FinanzasShell({
  titulo,
  acciones,
  children,
}: {
  titulo: string
  acciones?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <AppShell
      titulo={titulo}
      raiz={{ etiqueta: "Mis finanzas", to: RUTAS_FINANZAS.dashboard }}
      sidebar={<FinanzasSidebar />}
      acciones={acciones}
    >
      {/* Página personal: que no la indexe ningún buscador. */}
      <meta name="robots" content="noindex, nofollow" />
      {children}
    </AppShell>
  )
}
