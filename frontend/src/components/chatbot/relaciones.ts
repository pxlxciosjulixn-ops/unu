import type { Relacion } from "@/components/chatbot/tipos"

/** Las relaciones que puede elegir quien sube un chat, en el orden en que se ven. */
export const RELACIONES: { valor: Relacion; nombre: string }[] = [
  { valor: "me_gusta", nombre: "Me gusta" },
  { valor: "pareja", nombre: "Pareja" },
  { valor: "amante", nombre: "Amante" },
  { valor: "ex", nombre: "Ex" },
  { valor: "amistad", nombre: "Amigo o amiga" },
  { valor: "familia", nombre: "Familiar" },
  { valor: "trabajo", nombre: "Trabajo o estudio" },
  { valor: "otra", nombre: "Otra" },
]

export function nombreRelacion(relacion: Relacion | "") {
  return RELACIONES.find((r) => r.valor === relacion)?.nombre ?? null
}

/** Relaciones románticas: cambian las preguntas que se sugieren. */
export function esRomantica(relacion: Relacion | "") {
  return ["me_gusta", "pareja", "amante", "ex"].includes(relacion)
}

/** Los export traen los nombres como los guardó el teléfono: "samuel". */
export function capitalizar(nombre: string) {
  return nombre.charAt(0).toUpperCase() + nombre.slice(1)
}

/** "Tú y Samuel": los participantes de un chat, para mostrarlos. */
export function nombresDelChat(participantes: string[]) {
  return participantes.map(capitalizar).join(" y ")
}
