import { Link } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

/**
 * Armazón de las páginas de la app: barra lateral, barra superior con la ruta
 * y el contenido. Lo comparten el dashboard y el chatbot.
 */
export function AppShell({
  titulo,
  acciones,
  children,
}: {
  /** Último nivel de la ruta que se muestra en la barra superior. */
  titulo: string
  /** Botones de la derecha de la barra superior. */
  acciones?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur-md">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-5" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link to="/" />}>
                  Hoja de vida
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{titulo}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {acciones ? (
            <div className="ml-auto flex items-center gap-2">{acciones}</div>
          ) : null}
        </header>

        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
