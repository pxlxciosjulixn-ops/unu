import * as React from "react"
import {
  BotIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UserIcon,
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { useSesion } from "@/components/auth/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

/** Página a la que llega el usuario después de entrar. */
export function HomeDelLoginPage() {
  const { usuario, salir } = useSesion()
  const navegar = useNavigate()
  const [saliendo, setSaliendo] = React.useState(false)

  async function cerrar() {
    setSaliendo(true)
    try {
      await salir()
      navegar("/login", { replace: true })
    } finally {
      setSaliendo(false)
    }
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-3 px-4 sm:px-6">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
            JH
          </span>
          <span className="truncate text-sm font-semibold">unu</span>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              <UserIcon data-icon="inline-start" />
              {usuario?.username}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void cerrar()}
              disabled={saliendo}
            >
              <LogOutIcon data-icon="inline-start" />
              {saliendo ? "Saliendo…" : "Cerrar sesión"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          HOME DEL LOGIN
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Sesión activa</CardTitle>
            <CardDescription>
              Entraste con JWT: el navegador guarda un token de acceso y otro de
              refresco, y los manda en cada petición al backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">Usuario</dt>
                <dd className="font-medium">{usuario?.username}</dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">Nombre</dt>
                <dd className="font-medium">{usuario?.first_name || "—"}</dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">Correo</dt>
                <dd className="font-medium break-words">
                  {usuario?.email || "—"}
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-xs text-muted-foreground">
                  Acceso al admin
                </dt>
                <dd className="font-medium">
                  {usuario?.is_staff ? "Sí" : "No"}
                </dd>
              </div>
            </dl>

            <Separator />

            <p className="text-xs text-muted-foreground">
              Estos datos los responde <code>/api/auth/me/</code>, que exige el
              token: sin sesión válida devuelve 401 y esta página manda al
              login.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/dashboard" />}
          >
            <LayoutDashboardIcon data-icon="inline-start" />
            Ir al dashboard
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/chatbot" />}
          >
            <BotIcon data-icon="inline-start" />
            Ir al chatbot
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link to="/" />}>
            Hoja de vida
          </Button>
        </div>
      </main>
    </div>
  )
}
