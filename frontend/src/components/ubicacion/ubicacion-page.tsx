import * as React from "react"
import {
  CircleCheckIcon,
  MapPinIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  pedirGps,
  registrarUbicacion,
  TEXTOS_POR_DEFECTO,
  type RegistroUbicacion,
  type TextosUbicacion,
} from "@/lib/ubicacion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

type Estado = "aviso" | "procesando" | "listo" | "error"

/**
 * Página pública: /ubicacion.
 *
 * Muestra primero el aviso de que se va a tomar la IP y la ubicación. No se
 * guarda nada hasta que la persona presiona "Aceptar"; ahí se pide el GPS al
 * navegador y se registra la visita. Luego se muestra de qué se trata.
 */
export function UbicacionPage() {
  const [textos, setTextos] =
    React.useState<TextosUbicacion>(TEXTOS_POR_DEFECTO)
  const [estado, setEstado] = React.useState<Estado>("aviso")
  const [registro, setRegistro] = React.useState<RegistroUbicacion | null>(null)

  async function aceptar() {
    setEstado("procesando")
    try {
      // El GPS se pide solo tras el clic (lo exige el navegador). Si lo niegan,
      // `pedirGps` devuelve null y se guarda solo la IP.
      const coords = await pedirGps()
      setRegistro(await registrarUbicacion(coords))
      setEstado("listo")
    } catch {
      setEstado("error")
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        {estado === "listo" ? (
          <Listo textos={textos} registro={registro} />
        ) : estado === "error" ? (
          <ErrorAlGuardar onReintentar={aceptar} />
        ) : (
          <Aviso
            textos={textos}
            procesando={estado === "procesando"}
            onAceptar={aceptar}
          />
        )}
      </Card>
    </main>
  )
}

function Aviso({
  textos,
  procesando,
  onAceptar,
}: {
  textos: TextosUbicacion
  procesando: boolean
  onAceptar: () => void
}) {
  return (
    <>
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPinIcon className="size-6" />
        </div>
        <CardTitle className="text-xl">{textos.aviso_titulo}</CardTitle>
        <CardDescription className="leading-relaxed">
          {textos.aviso_mensaje}
        </CardDescription>
      </CardHeader>
      <CardContent>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Button size="lg" onClick={onAceptar} disabled={procesando}>
          {procesando ? (
            <>
              <Spinner data-icon="inline-start" />
              ¡gracias!
            </>
          ) : (
            "Ver información"
          )}
        </Button>
        {procesando ? (
          <p className="text-center text-xs text-muted-foreground">
            hola
          </p>
        ) : null}
      </CardFooter>
    </>
  )
}

function Listo({
  textos,
  registro,
}: {
  textos: TextosUbicacion
  registro: RegistroUbicacion | null
}) {
  const lugar = registro
    ? [registro.ciudad, registro.region, registro.pais]
        .filter(Boolean)
        .join(", ")
    : ""
  return (
    <>
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CircleCheckIcon className="size-6" />
        </div>
        <CardTitle className="text-xl">¡Listo!</CardTitle>
        <CardDescription className="leading-relaxed">
          {textos.texto_final}
        </CardDescription>
      </CardHeader>
      {registro ? (
        <CardContent>
          <div className="flex flex-col gap-1 rounded-lg border bg-background p-3 text-sm">
            <p className="text-muted-foreground">JAJAJA</p>
            {lugar ? (
              <p className="font-medium">{lugar}</p>
            ) : (
              <p className="font-medium">JAJAJA</p>
            )}
            <p className="text-xs text-muted-foreground">
              {registro.tiene_gps
                ? "Con ubicación exacta por GPS."
                : "Solo por IP (no se dio permiso de GPS)."}
            </p>
          </div>
        </CardContent>
      ) : null}
    </>
  )
}

function ErrorAlGuardar({ onReintentar }: { onReintentar: () => void }) {
  return (
    <CardContent className="pt-6">
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>No se pudo registrar</AlertTitle>
        <AlertDescription>
          Revisa tu conexión e inténtalo de nuevo.
        </AlertDescription>
      </Alert>
      <Button className="mt-4 w-full" onClick={onReintentar}>
        Reintentar
      </Button>
    </CardContent>
  )
}

export default UbicacionPage
