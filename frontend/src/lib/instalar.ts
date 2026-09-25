import * as React from "react"

/**
 * "Instalar la app" en el celular o el computador.
 *
 * Chrome, Edge y Android avisan una sola vez, al cargar, que la página se
 * puede instalar (`beforeinstallprompt`): se guarda ese aviso para lanzarlo
 * cuando la persona toque "Instalar app". Safari en iPhone no avisa nada: ahí
 * se instala a mano con Compartir → Agregar a inicio.
 */

type AvisoInstalacion = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let aviso: AvisoInstalacion | null = null
let instalada = false
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())

export function escucharInstalacion() {
  window.addEventListener("beforeinstallprompt", (evento) => {
    // Sin esto el navegador muestra su propia barra; mejor el botón nuestro.
    evento.preventDefault()
    aviso = evento as AvisoInstalacion
    avisar()
  })
  window.addEventListener("appinstalled", () => {
    aviso = null
    instalada = true
    avisar()
  })
}

function abiertaComoApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari de iPhone lo dice así.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function esIPhone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

type Estado = {
  /** Ya está abierta como app: no hay nada que instalar. */
  instalada: boolean
  /** El navegador dejó instalar con un toque. */
  puede: boolean
  /** iPhone: se instala a mano, con instrucciones. */
  manual: boolean
}

let ultimo: Estado | null = null
const SIN_INSTALAR: Estado = { instalada: false, puede: false, manual: false }

function leer(): Estado {
  const estado = {
    instalada: instalada || abiertaComoApp(),
    puede: aviso !== null,
    manual: aviso === null && esIPhone(),
  }
  // Mismo objeto si nada cambió: `useSyncExternalStore` lo necesita.
  if (
    ultimo &&
    ultimo.instalada === estado.instalada &&
    ultimo.puede === estado.puede &&
    ultimo.manual === estado.manual
  ) {
    return ultimo
  }
  ultimo = estado
  return estado
}

export function useInstalacion() {
  return React.useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    leer,
    () => SIN_INSTALAR
  )
}

/** Muestra el diálogo de instalar del navegador. */
export async function instalar() {
  if (!aviso) return
  await aviso.prompt()
  await aviso.userChoice
  // El aviso sirve una sola vez.
  aviso = null
  avisar()
}
