import {
  BotIcon,
  FolderIcon,
  LogInIcon,
  PrinterIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { useChat } from "@/components/chat/chat-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { profile } from "@/data/resume"

/**
 * Barra de la aplicación: marca y acciones. No lleva enlaces a las secciones
 * de la hoja de vida; queda libre para la navegación de la app.
 */
export function SiteHeader() {
  const { abrir } = useChat()
  const nombreCorto = `${profile.firstName.split(" ")[0]} ${profile.lastName.split(" ")[0]}`

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar size="sm">
            <AvatarFallback className="text-[0.625rem] font-semibold">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-semibold">{nombreCorto}</span>
          <span className="hidden truncate text-sm text-muted-foreground sm:inline">
            · {profile.title}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/home" />}
          >
            <LogInIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Ingresar</span>
          </Button>
          {/* Proyectos reemplaza el enlace directo al dashboard: desde ahí se
              entra al panel y al chatbot, y la barra no se llena de botones. */}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to="/proyectos" />}
          >
            <FolderIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Proyectos</span>
          </Button>
          <Button variant="outline" size="sm" onClick={abrir}>
            <BotIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Pregúntale a la IA</span>
            <span className="sm:hidden">IA</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            aria-label="Imprimir o guardar en PDF"
          >
            <PrinterIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Descargar PDF</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
