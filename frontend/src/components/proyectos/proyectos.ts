/**
 * Los proyectos que se muestran en `/proyectos`.
 *
 * Son las tres aplicaciones que corren en este mismo despliegue; nada de
 * maquetas ni de trabajos que no se puedan abrir. Cada uno declara las
 * tecnologías con las que está hecho, que son las que alimentan el filtro de
 * la página: no hay una lista de tecnologías aparte que se pueda desfasar.
 */
import type { LucideIcon } from "lucide-react"
import { BotIcon, ChartColumnIcon, FileTextIcon } from "lucide-react"

export type Proyecto = {
  titulo: string
  ruta: string
  icono: LucideIcon
  resumen: string
  anio: string
  detalle: string[]
  stack: string[]
}

export const PROYECTOS: Proyecto[] = [
  {
    titulo: "Hoja de vida editable",
    ruta: "/",
    icono: FileTextIcon,
    resumen:
      "El CV que estás viendo: vive en la base de datos y se edita desde el sitio.",
    anio: "2026",
    detalle: [
      "Cada sección se guarda desde un editor detrás del login con JWT.",
      "Los topes de caracteres los define el backend, así que ningún texto desborda su caja.",
      "Si el servidor está dormido, la página muestra una copia local en vez de una hoja en blanco.",
    ],
    stack: [
      "React",
      "TypeScript",
      "shadcn",
      "Django REST",
      "PostgreSQL",
      "JWT",
    ],
  },
  {
    titulo: "Chatbot",
    ruta: "/chatbot",
    icono: BotIcon,
    resumen: "Chat con un modelo de lenguaje, respondiendo en vivo.",
    anio: "2026",
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
    anio: "2025",
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

/** Todas las tecnologías que aparecen, sin repetir y en orden alfabético. */
export const TECNOLOGIAS = [
  ...new Set(PROYECTOS.flatMap((proyecto) => proyecto.stack)),
].sort((a, b) => a.localeCompare(b, "es"))

/** Con qué está hecho todo esto, para el bloque del final. */
export const COMO_ESTA_HECHO = [
  {
    titulo: "Frontend",
    texto: "React con TypeScript, Vite, Tailwind y componentes shadcn/ui.",
  },
  {
    titulo: "Backend",
    texto:
      "Django REST Framework con PostgreSQL, autenticación JWT y respuestas del chat en streaming.",
  },
  {
    titulo: "Infraestructura",
    texto:
      "Todo desplegado en Render, en el plan gratuito: por eso la primera carga se demora.",
  },
]
