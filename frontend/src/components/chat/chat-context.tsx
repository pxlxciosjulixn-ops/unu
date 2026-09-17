/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

const ANUNCIO_KEY = "chat-anuncio-descartado"

type ChatState = {
  abierto: boolean
  abrir: () => void
  cerrar: () => void
  /** El anuncio flotante se muestra hasta que el visitante lo cierra o abre el chat. */
  anuncioVisible: boolean
  descartarAnuncio: () => void
}

const ChatContext = React.createContext<ChatState | undefined>(undefined)

// El almacenamiento puede fallar (modo privado, cookies bloqueadas): en ese
// caso el anuncio simplemente vuelve a salir en la siguiente visita.
function leerDescartado() {
  try {
    return sessionStorage.getItem(ANUNCIO_KEY) === "1"
  } catch {
    return false
  }
}

function guardarDescartado() {
  try {
    sessionStorage.setItem(ANUNCIO_KEY, "1")
  } catch {
    // Sin almacenamiento: se descarta solo en memoria.
  }
}

/** Comparte el estado del chat para poder abrirlo desde cualquier botón de la página. */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [abierto, setAbierto] = React.useState(false)
  const [descartado, setDescartado] = React.useState(leerDescartado)

  const descartarAnuncio = React.useCallback(() => {
    setDescartado(true)
    guardarDescartado()
  }, [])

  const abrir = React.useCallback(() => {
    setAbierto(true)
    descartarAnuncio()
  }, [descartarAnuncio])

  const cerrar = React.useCallback(() => setAbierto(false), [])

  const value = React.useMemo(
    () => ({
      abierto,
      abrir,
      cerrar,
      anuncioVisible: !descartado && !abierto,
      descartarAnuncio,
    }),
    [abierto, abrir, cerrar, descartado, descartarAnuncio]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const context = React.useContext(ChatContext)

  if (context === undefined) {
    throw new Error("useChat debe usarse dentro de ChatProvider")
  }

  return context
}
