import { SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <Badge variant="secondary" className="mb-2 w-fit">
            <SparklesIcon data-icon="inline-start" />
            unu
          </Badge>
          <CardTitle className="text-2xl">Hola 👋</CardTitle>
          <CardDescription>
            Bienvenido. Esta app corre con React, Vite y shadcn/ui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todo listo para empezar a construir. Agrega componentes y arma la
            interfaz desde aquí.
          </p>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button className="w-full">Comenzar</Button>
          <Button variant="outline" className="w-full">
            Ver documentación
          </Button>
        </CardFooter>
      </Card>
      <p className="font-mono text-xs text-muted-foreground">
        Presiona <kbd>d</kbd> para cambiar el tema
      </p>
    </div>
  )
}

export default App
