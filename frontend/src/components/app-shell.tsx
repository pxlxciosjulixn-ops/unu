import { Link } from "react-router-dom"

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
 * y el contenido.
 *
 * La barra lateral la pone cada página, porque el dashboard y el chatbot
 * tienen opciones distintas y mezclarlas confunde.
 */
export function AppShell({
  titulo,
  sidebar,
  acciones,
  altoFijo = false,
  raiz = { etiqueta: "Hoja de vida", to: "/" },
  children,
}: {
  /** Último nivel de la ruta que se muestra en la barra superior. */
  titulo: string
  sidebar: React.ReactNode
  /** Botones de la derecha de la barra superior. */
  acciones?: React.ReactNode
  /**
   * Con `true` la página mide exactamente la pantalla y el scroll queda dentro
   * del contenido. Es lo que necesita el chat para que la caja de escribir no
   * se vaya con la conversación.
   */
  altoFijo?: boolean
  /** Primer nivel de la ruta. Por defecto, la hoja de vida. */
  raiz?: { etiqueta: string; to: string }
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset
        className={
          altoFijo ? "h-svh min-w-0 overflow-hidden" : "min-h-svh min-w-0"
        }
      >
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur-md">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-5" />
          <Breadcrumb>
            <BreadcrumbList>
              {/* En el celular no cabe junto a los botones: queda solo el
                  nivel actual, y la barra lateral lleva al resto. */}
              <BreadcrumbItem className="hidden sm:inline-flex">
                <BreadcrumbLink render={<Link to={raiz.to} />}>
                  {raiz.etiqueta}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
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
