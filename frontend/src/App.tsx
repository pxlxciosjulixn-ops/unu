import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { AvisoPrimeraCarga } from "@/components/aviso-primera-carga"
import { SesionProvider } from "@/components/auth/auth-context"
import { RutaProtegida } from "@/components/auth/ruta-protegida"
import { ChatProvider } from "@/components/chat/chat-context"
import { ChatWidget } from "@/components/chat/chat-widget"
import { HojaDeVidaProvider } from "@/components/resume/resume-context"
import { ResumePage } from "@/components/resume/resume-page"
import { SiteHeader } from "@/components/resume/site-header"
import { Skeleton } from "@/components/ui/skeleton"

// El dashboard carga aparte: arrastra las graficas y no hace falta en la
// pagina de la hoja de vida.
const DashboardPage = lazy(() =>
  import("@/components/dashboard/dashboard-page").then((m) => ({
    default: m.DashboardPage,
  }))
)

const ChatbotPage = lazy(() =>
  import("@/components/chatbot/chatbot-page").then((m) => ({
    default: m.ChatbotPage,
  }))
)

const ProyectosPage = lazy(() =>
  import("@/components/proyectos/proyectos-page").then((m) => ({
    default: m.ProyectosPage,
  }))
)

// Página personal suelta: no comparte cabecera ni tema con el resto.
const Min2026Page = lazy(() =>
  import("@/components/min/min-2026-page").then((m) => ({
    default: m.Min2026Page,
  }))
)

// Finanzas personales: publicas pero sin enlace desde ningun lado del sitio.
const FormularioGastosPage = lazy(() =>
  import("@/components/finanzas/formulario-page").then((m) => ({
    default: m.FormularioGastosPage,
  }))
)

const DashboardGastosPage = lazy(() =>
  import("@/components/finanzas/dashboard-gastos-page").then((m) => ({
    default: m.DashboardGastosPage,
  }))
)

const EditarGastosPage = lazy(() =>
  import("@/components/finanzas/editar-page").then((m) => ({
    default: m.EditarGastosPage,
  }))
)

const LoginPage = lazy(() =>
  import("@/components/auth/login-page").then((m) => ({ default: m.LoginPage }))
)

const HomeDelLoginPage = lazy(() =>
  import("@/components/auth/home-page").then((m) => ({
    default: m.HomeDelLoginPage,
  }))
)

// El editor sólo lo abre quien entra: carga aparte para no pesarle a la
// página pública.
const EditorHojaDeVidaPage = lazy(() =>
  import("@/components/resume/editor/editor-page").then((m) => ({
    default: m.EditorHojaDeVidaPage,
  }))
)

function CargandoPagina() {
  return (
    <div className="flex min-h-svh flex-col gap-4 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function ResumeScreen() {
  return (
    <ChatProvider>
      <div className="min-h-svh bg-muted/40">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
          <ResumePage />
        </main>
        <ChatWidget />
      </div>
    </ChatProvider>
  )
}

export function App() {
  return (
    // La sesión envuelve todo: el login y la home protegida la comparten, y
    // así el estado sobrevive al navegar entre rutas. La hoja de vida hace lo
    // mismo con los datos del CV: se piden una vez y los usan tanto la página
    // pública como el editor.
    <SesionProvider>
      <HojaDeVidaProvider>
        {/* Va fuera de las rutas: la espera del servidor es la misma se entre
            por donde se entre. */}
        <AvisoPrimeraCarga />
        <Routes>
          <Route path="/" element={<ResumeScreen />} />
          <Route
            path="/proyectos"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <ProyectosPage />
              </Suspense>
            }
          />
          <Route
            path="/min-2026"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <Min2026Page />
              </Suspense>
            }
          />
          <Route
            path="/formulario/gastos/julian/palacios"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <FormularioGastosPage />
              </Suspense>
            }
          />
          <Route
            path="/dashboard/gastos/julian/palacios"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <DashboardGastosPage />
              </Suspense>
            }
          />
          <Route
            path="/editar/gastos/julian/palacios"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <EditarGastosPage />
              </Suspense>
            }
          />
          <Route
            path="/login"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route
            path="/home"
            element={
              <RutaProtegida>
                <Suspense fallback={<CargandoPagina />}>
                  <HomeDelLoginPage />
                </Suspense>
              </RutaProtegida>
            }
          />
          <Route
            path="/home/hoja-de-vida"
            element={
              <RutaProtegida>
                <Suspense fallback={<CargandoPagina />}>
                  <EditorHojaDeVidaPage />
                </Suspense>
              </RutaProtegida>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/chatbot"
            element={
              <Suspense fallback={<CargandoPagina />}>
                <ChatbotPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HojaDeVidaProvider>
    </SesionProvider>
  )
}

export default App
