import * as React from "react"
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"

import ilustracion from "@/assets/login-datos.svg"
import { useSesion } from "@/components/auth/auth-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { usePerfil } from "@/components/resume/resume-context"

export function LoginPage() {
  const { usuario, comprobando, entrar } = useSesion()
  const profile = usePerfil()
  const navegar = useNavigate()
  const ubicacion = useLocation()

  const [nombre, setNombre] = React.useState("")
  const [clave, setClave] = React.useState("")
  const [verClave, setVerClave] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [enviando, setEnviando] = React.useState(false)

  // A dónde iba antes de que lo mandaran al login.
  const destino =
    (ubicacion.state as { desde?: string } | null)?.desde ?? "/home"

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (enviando) return

    setError(null)
    setEnviando(true)
    try {
      await entrar(nombre.trim(), clave)
      navegar(destino, { replace: true })
    } catch (fallo: unknown) {
      setError(
        fallo instanceof Error
          ? fallo.message
          : "No se pudo conectar con el servidor."
      )
    } finally {
      setEnviando(false)
    }
  }

  // Si ya hay sesión, no tiene sentido mostrar el formulario.
  if (!comprobando && usuario) return <Navigate to={destino} replace />

  return (
    // A pantalla completa y sin márgenes: la imagen ocupa su mitad de borde a
    // borde. En móvil la fila de la imagen mide lo que ocupa su contenido
    // (`auto`) y el formulario se queda con el resto.
    <div className="grid min-h-svh grid-rows-[auto_1fr] bg-background md:grid-cols-2 md:grid-rows-none">
      {/* Mitad de la imagen. */}
      <div className="relative h-28 bg-band md:h-auto">
        {/* Absoluta a propósito: si la imagen queda en el flujo, su alto
            natural estira la fila y la página termina con scroll. */}
        <img
          src={ilustracion}
          alt="Red de nodos y una serie de datos, en blanco y negro"
          className="absolute inset-0 size-full object-cover"
        />
        {/* Velo arriba: la marca tiene que leerse sobre cualquier parte de la
            ilustración. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-band/80 to-transparent"
        />
        <div className="absolute top-0 left-0 flex items-center gap-2.5 p-5 text-band-foreground md:p-8">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-band-foreground text-xs font-semibold text-band">
            {profile.initials}
          </span>
          <span className="text-sm font-semibold tracking-[0.2em] uppercase">
            unu
          </span>
        </div>
      </div>

      {/* Mitad del formulario. */}
      <div className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Ingresar</h1>
            <p className="text-sm text-muted-foreground">
              Entra con tu usuario y contraseña.
            </p>
          </div>

          {comprobando ? (
            // Mientras se revisa el token guardado: sin esto, quien ya tiene
            // sesión vería el formulario un instante antes de entrar.
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={enviar}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="usuario">Usuario</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="usuario"
                      name="username"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      autoComplete="username"
                      autoFocus
                      required
                      disabled={enviando}
                      placeholder="tu usuario"
                    />
                  </InputGroup>
                </Field>

                <Field>
                  <FieldLabel htmlFor="clave">Contraseña</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="clave"
                      name="password"
                      type={verClave ? "text" : "password"}
                      value={clave}
                      onChange={(e) => setClave(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={enviando}
                      placeholder="••••••••"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        type="button"
                        size="icon-xs"
                        aria-label={
                          verClave ? "Ocultar contraseña" : "Mostrar contraseña"
                        }
                        onClick={() => setVerClave((v) => !v)}
                        disabled={enviando}
                      >
                        {verClave ? <EyeOffIcon /> : <EyeIcon />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                  <FieldDescription>
                    La sesión se mantiene hasta que cierres sesión.
                  </FieldDescription>
                </Field>

                {error ? (
                  <Alert role="status" variant="destructive">
                    <TriangleAlertIcon />
                    <AlertTitle>No se pudo entrar</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="h-10 w-full"
                  disabled={enviando || !nombre.trim() || !clave}
                >
                  {enviando ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      Entrando…
                    </>
                  ) : (
                    <>
                      Entrar
                      <ArrowRightIcon data-icon="inline-end" />
                    </>
                  )}
                </Button>
              </FieldGroup>
            </form>
          )}

          <div className="flex flex-col gap-3">
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                ¿No tienes usuario? Se crea desde el servidor.
              </p>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link to="/" />}
              >
                Hoja de vida
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {profile.first_name}{" "}
              {profile.last_name} · {profile.title}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
