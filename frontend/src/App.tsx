import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { ChatProvider } from "@/components/chat/chat-context"
import { ChatWidget } from "@/components/chat/chat-widget"
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
    <Routes>
      <Route path="/" element={<ResumeScreen />} />
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
  )
}

export default App
