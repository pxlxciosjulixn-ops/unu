import { SquareIcon, Volume2Icon } from "lucide-react"

import { usePersonalizacion } from "@/components/chatbot/personalizacion"
import { detener, hablar, HAY_VOZ, useSonando } from "@/components/chatbot/voz"
import { Button } from "@/components/ui/button"

/**
 * Lee la respuesta en voz alta con la voz del navegador; si ya está sonando,
 * la detiene. En navegadores sin voz no aparece.
 */
export function BotonEscuchar({ id, texto }: { id: string; texto: string }) {
  const { voz, velocidad } = usePersonalizacion()
  const sonando = useSonando() === id

  if (!HAY_VOZ) return null

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={sonando ? "Detener lectura" : "Escuchar respuesta"}
      title={sonando ? "Detener" : "Escuchar"}
      aria-pressed={sonando}
      onClick={() =>
        sonando ? detener() : hablar(id, texto, { voz, velocidad })
      }
      className={sonando ? "text-primary" : undefined}
    >
      {sonando ? <SquareIcon className="fill-current" /> : <Volume2Icon />}
    </Button>
  )
}
