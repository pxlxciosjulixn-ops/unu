import type { LucideIcon } from "lucide-react"
import { ArrowRightIcon, BotIcon, ChartColumnIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { ChatProvider } from "@/components/chat/chat-context"
import { ChatWidget } from "@/components/chat/chat-widget"
import { SiteHeader } from "@/components/resume/site-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { usePerfil } from "@/components/resume/resume-context"

type Proyecto = {
  titulo: string
  ruta: string
  icono: LucideIcon
  resumen: string
  detalle: string[]
  stack: string[]
}

const PROYECTOS: Proyecto[] = [
  {
    titulo: "Chatbot",
    ruta: "/chatbot",
    icono: BotIcon,
    resumen: "Chat con un modelo de lenguaje, respondiendo en vivo.",
    detalle: [
      "La respuesta llega por partes mientras se escribe.",
      "Cada conversación queda guardada, con su historial.",
      "La llave del modelo no sale del servidor.",
    ],
    stack: [
      "React",
      "TypeScript",
      "shadcn",
      "Django REST",
      "PostgreSQL",
      "SSE",
    ],
  },
  {
    titulo: "BI con React TS",
    ruta: "/dashboard",
    icono: ChartColumnIcon,
    resumen: "Panel de ventas con metas, cumplimiento y catálogo.",
    detalle: [
      "Indicadores del mes contra su meta y el mes anterior.",
      "Ventas por país en un mapa con zoom.",
      "Filtros por mes, ventana, país y estado del pedido.",
    ],
    stack: [
      "React",
      "TypeScript",
      "shadcn",
      "Recharts",
      "d3-geo",
      "Django REST",
    ],
  },
]

export function ProyectosPage() {
  const profile = usePerfil()
  return (
    <ChatProvider>
      <div className="min-h-svh bg-muted/40">
        <SiteHeader />

        <main className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Proyectos
              </h1>
              <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
                Dos aplicaciones en funcionamiento, no maquetas: comparten el
                backend en Django y la misma base de datos. Entra a cualquiera.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {PROYECTOS.map((proyecto) => (
                <Link
                  key={proyecto.ruta}
                  to={proyecto.ruta}
                  // La tarjeta entera es el enlace: así el área de clic es
                  // grande y el foco del teclado cae en un solo sitio.
                  className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Card className="h-full transition-shadow group-hover:shadow-md">
                    <CardHeader className="gap-3">
                      <span
                        aria-hidden
                        className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                      >
                        <proyecto.icono className="size-5" />
                      </span>
                      <CardTitle className="text-lg">
                        {proyecto.titulo}
                      </CardTitle>
                      <CardDescription>{proyecto.resumen}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-4">
                      <ul className="flex list-outside list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-foreground/30">
                        {proyecto.detalle.map((linea) => (
                          <li key={linea}>{linea}</li>
                        ))}
                      </ul>

                      <ul className="flex flex-wrap gap-1.5">
                        {proyecto.stack.map((tecnologia) => (
                          <li key={tecnologia}>
                            <Badge variant="secondary">{tecnologia}</Badge>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter className="justify-between">
                      <span className="text-sm font-medium">
                        Abrir {proyecto.titulo}
                      </span>
                      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              {profile.first_name} {profile.last_name} · {profile.title}
            </p>
          </div>
        </main>

        <ChatWidget />
      </div>
    </ChatProvider>
  )
}
