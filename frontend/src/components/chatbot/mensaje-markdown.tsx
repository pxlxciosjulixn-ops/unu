import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Copia al portapapeles y confirma durante dos segundos. */
export function BotonCopiar({
  texto,
  className,
}: {
  texto: string
  className?: string
}) {
  const [copiado, setCopiado] = React.useState(false)

  React.useEffect(() => {
    if (!copiado) return
    const id = window.setTimeout(() => setCopiado(false), 2000)
    return () => window.clearTimeout(id)
  }, [copiado])

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={copiado ? "Copiado" : "Copiar respuesta"}
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto)
          setCopiado(true)
        } catch {
          // Sin permiso de portapapeles no se puede hacer nada útil.
        }
      }}
    >
      {copiado ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}

/**
 * Respuesta del modelo con formato: listas, tablas, código y enlaces.
 * Sin esto, el Markdown que devuelve DeepSeek se lee como texto con asteriscos.
 */
export function MensajeMarkdown({
  texto,
  className,
}: {
  texto: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 text-sm leading-relaxed break-words",
        className
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="text-pretty">{children}</p>,
          ul: ({ children }) => (
            <ul className="flex list-outside list-disc flex-col gap-1 pl-5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="flex list-outside list-decimal flex-col gap-1 pl-5">
              {children}
            </ol>
          ),
          h1: ({ children }) => (
            <h3 className="text-base font-semibold">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="text-base font-semibold">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="text-sm font-semibold">{children}</h4>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ className: clase, children }) => {
            const enBloque = /language-/.test(clase ?? "")
            if (!enBloque) {
              return (
                <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">
                  {children}
                </code>
              )
            }
            return (
              <code className="font-mono text-xs leading-relaxed">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-lg bg-foreground/5 p-3 ring-1 ring-foreground/10">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b px-2 py-1.5 font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b px-2 py-1.5 align-top">{children}</td>
          ),
          hr: () => <hr className="border-border" />,
        }}
      >
        {texto}
      </Markdown>
    </div>
  )
}
