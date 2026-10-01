import * as React from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowLeftRightIcon,
  BotIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  CalendarRangeIcon,
  ChartColumnStackedIcon,
  CreditCardIcon,
  HeartIcon,
  LandmarkIcon,
  PiggyBankIcon,
  RepeatIcon,
  TargetIcon,
  TelescopeIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  ChartBarBigIcon,
  ChartLineIcon,
  ChartPieIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  ListIcon,
  NotebookPenIcon,
  PencilLineIcon,
  SettingsIcon,
  SquarePlusIcon,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { AppShell } from "@/components/app-shell"
import { AplicarApariencia } from "@/components/chatbot/aplicar-personalizacion"
import { useApariencia } from "@/components/finanzas/apariencia"
import { BarraTareas } from "@/components/finanzas/barra-tareas"
import { RUTAS_FINANZAS } from "@/components/finanzas/finanzas"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  {
    titulo: "Editar movimientos",
    to: RUTAS_FINANZAS.editar,
    icon: PencilLineIcon,
  },
  {
    titulo: "Créditos y gastos fijos",
    to: RUTAS_FINANZAS.creditos,
    icon: CreditCardIcon,
  },
]

type Ancla = { titulo: string; hash: string; icon: LucideIcon }

/** Bloques de cada página: el enlace baja hasta cada uno. */
const SECCIONES: Record<string, Ancla[]> = {
  [RUTAS_FINANZAS.dashboard]: [
    { titulo: "Resumen", hash: "#resumen", icon: GaugeIcon },
    { titulo: "Proyección", hash: "#proyeccion", icon: TelescopeIcon },
    { titulo: "Presupuestos", hash: "#presupuestos", icon: TargetIcon },
    { titulo: "Evolución", hash: "#evolucion", icon: ChartLineIcon },
    { titulo: "Ingresos vs. gastos", hash: "#balance", icon: ChartPieIcon },
    { titulo: "Asistente IA", hash: "#asistente", icon: BotIcon },
    { titulo: "Por concepto", hash: "#conceptos", icon: ChartBarBigIcon },
    { titulo: "Datos del periodo", hash: "#datos", icon: NotebookPenIcon },
    { titulo: "Deudas", hash: "#deudas", icon: LandmarkIcon },
    { titulo: "Por grupo", hash: "#grupos", icon: ChartColumnStackedIcon },
    { titulo: "Ahorro por mes", hash: "#ahorro", icon: PiggyBankIcon },
    { titulo: "Este mes vs. pasado", hash: "#acumulado", icon: TrendingUpIcon },
    { titulo: "Calendario", hash: "#calendario", icon: CalendarDaysIcon },
    {
      titulo: "Día de la semana",
      hash: "#dia-semana",
      icon: CalendarRangeIcon,
    },
    { titulo: "Familia y mascotas", hash: "#familia", icon: HeartIcon },
    { titulo: "Lo que se repite", hash: "#recurrentes", icon: RepeatIcon },
    {
      titulo: "Fuera de lo normal",
      hash: "#anomalias",
      icon: TriangleAlertIcon,
    },
    { titulo: "Comparar meses", hash: "#comparar", icon: ArrowLeftRightIcon },
    { titulo: "Movimientos", hash: "#movimientos", icon: ListIcon },
  ],
  [RUTAS_FINANZAS.creditos]: [
    { titulo: "Resumen", hash: "#resumen-creditos", icon: GaugeIcon },
    { titulo: "¿Cuánto me queda?", hash: "#simulacion", icon: CalculatorIcon },
    { titulo: "Asesor financiero", hash: "#asesor", icon: BotIcon },
    { titulo: "Tus créditos", hash: "#lista-creditos", icon: CreditCardIcon },
    { titulo: "Gastos fijos", hash: "#fijos", icon: RepeatIcon },
  ],
  [RUTAS_FINANZAS.editar]: [
    { titulo: "Movimientos", hash: "#movimientos", icon: ListIcon },
    { titulo: "Sugerencias", hash: "#sugerencias", icon: LightbulbIcon },
  ],
}

function FinanzasSidebar() {
  const { pathname } = useLocation()
  const secciones = SECCIONES[pathname]

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

        {secciones ? (
          <SidebarGroup>
            <SidebarGroupLabel>En esta página</SidebarGroupLabel>
            <SidebarMenu>
              {secciones.map((seccion) => (
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === RUTAS_FINANZAS.configuracion}
              tooltip="Configuración"
              render={<Link to={RUTAS_FINANZAS.configuracion} />}
            >
              <SettingsIcon />
              <span>Configuración</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

/**
 * Armazón de las páginas de finanzas: el dashboard, el formulario y la página
 * de edición se enlazan entre sí desde la barra lateral, pero nada del resto
 * del sitio apunta hacia aquí.
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
  const apariencia = useApariencia()

  // Marca `<html>` para que el CSS sepa que son las páginas de finanzas: el
  // Y2K de aquí lleva barras de título y barra de tareas, el del chat no.
  React.useEffect(() => {
    document.documentElement.classList.add("finanzas-app")
    return () => document.documentElement.classList.remove("finanzas-app")
  }, [])

  return (
    <AppShell
      titulo={titulo}
      raiz={{ etiqueta: "Mis finanzas", to: RUTAS_FINANZAS.dashboard }}
      sidebar={<FinanzasSidebar />}
      acciones={acciones}
    >
      {/* Página personal: que no la indexe ningún buscador. */}
      <meta name="robots" content="noindex, nofollow" />
      <AplicarApariencia apariencia={apariencia} />
      {children}
      {apariencia.estilo === "y2k" ? <BarraTareas titulo={titulo} /> : null}
    </AppShell>
  )
}
