import * as React from "react"
import { ThumbsDownIcon, ThumbsUpIcon } from "lucide-react"

import { valorarRespuesta } from "@/components/chatbot/api"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * "¿Te sirvió?" de una respuesta. Tocar el mismo otra vez lo quita. Se
 * muestra enseguida y, si el servidor falla, vuelve a como estaba.
 */
export function BotonesOpinion({
  id,
  inicial,
}: {
  /** Id de la respuesta en la base. */
  id: number
  inicial: boolean | null
}) {
  const [opinion, setOpinion] = React.useState(inicial)

  async function votar(util: boolean) {
    const antes = opinion
    const nueva = opinion === util ? null : util
    setOpinion(nueva)
    try {
      await valorarRespuesta(id, nueva)
    } catch {
      setOpinion(antes)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Me sirvió"
        aria-pressed={opinion === true}
        title="Me sirvió"
        onClick={() => void votar(true)}
        className={cn(opinion === true && "text-primary")}
      >
        <ThumbsUpIcon className={cn(opinion === true && "fill-current")} />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="No me sirvió"
        aria-pressed={opinion === false}
        title="No me sirvió"
        onClick={() => void votar(false)}
        className={cn(opinion === false && "text-primary")}
      >
        <ThumbsDownIcon className={cn(opinion === false && "fill-current")} />
      </Button>
    </>
  )
}
