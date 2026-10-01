import { RotateCcwIcon } from "lucide-react"

import { ControlesEstilo } from "@/components/chatbot/controles-estilo"
import {
  APARIENCIA_POR_DEFECTO,
  cambiarApariencia,
  useApariencia,
} from "@/components/finanzas/apariencia"
import { FinanzasShell } from "@/components/finanzas/finanzas-shell"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Página suelta: /configuracion/gastos/julian/palacios.
 *
 * Cómo se ven las páginas de finanzas. Se aplica al instante y se guarda en
 * el backend con la IP, así que en otro equipo de la misma red sale igual.
 */
export function ConfiguracionGastosPage() {
  const apariencia = useApariencia()

  return (
    <FinanzasShell titulo="Configuración">
      <title>Configuración · Mis finanzas</title>

      <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4 p-4 pb-10 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Configuración
          </h1>
          <p className="text-sm text-muted-foreground">
            Cómo se ven el dashboard, el formulario y la edición.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
            <CardDescription>
              Se aplica al instante y se recuerda en cualquier equipo que entre
              desde esta misma conexión.
            </CardDescription>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => cambiarApariencia(APARIENCIA_POR_DEFECTO)}
              >
                <RotateCcwIcon data-icon="inline-start" />
                Restablecer
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ControlesEstilo
              valor={apariencia}
              onCambiar={cambiarApariencia}
              ejemplo="Este mes van $ 1.250.000 en gastos y $ 2.800.000 en ingresos."
            />
          </CardContent>
        </Card>
      </div>
    </FinanzasShell>
  )
}

export default ConfiguracionGastosPage
