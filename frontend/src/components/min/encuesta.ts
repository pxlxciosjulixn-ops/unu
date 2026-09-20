/**
 * Resultados de la encuesta del proyecto del colegio.
 *
 * Salen de tabular "Formulario sin título (Respuestas).xlsx" (hoja
 * TABULACION): 30 respuestas, 10 preguntas. Los porcentajes vienen
 * redondeados de ahí, así que un par de preguntas suman 99 o 101.
 */

export type OpcionEncuesta = {
  texto: string
  n: number
  pct: number
}

export type PreguntaEncuesta = {
  n: number
  corta: string
  completa: string
  total: number
  opciones: OpcionEncuesta[]
}

export const ENCUESTA_TOTAL = 30

export const ENCUESTA: PreguntaEncuesta[] = [
  {
    n: 1,
    corta: "¿Has probado los mochis?",
    completa: "¿Has probado los Mochis?",
    total: 30,
    opciones: [
      {
        texto: "No",
        n: 20,
        pct: 67
      },
      {
        texto: "Si",
        n: 10,
        pct: 33
      }
    ]
  },
  {
    n: 2,
    corta: "¿Probarías un mochi en nitrógeno líquido?",
    completa: "¿Te gustaría probar Mochis sumergidos en nitrógeno liquido, con una experiencia de \"humo\" que da el nitrógeno liquido?",
    total: 30,
    opciones: [
      {
        texto: "Si",
        n: 17,
        pct: 57
      },
      {
        texto: "No",
        n: 8,
        pct: 27
      },
      {
        texto: "No por que siento que seria peligroso",
        n: 5,
        pct: 17
      }
    ]
  },
  {
    n: 3,
    corta: "¿Lo probarías sin esperar indicaciones?",
    completa: "¿Probarías un Mochi recién sumergido en el nitrógeno liquido sin esperar indicaciones?",
    total: 30,
    opciones: [
      {
        texto: "No",
        n: 15,
        pct: 50
      },
      {
        texto: "Si",
        n: 14,
        pct: 47
      },
      {
        texto: "Opción 3",
        n: 1,
        pct: 3
      }
    ]
  },
  {
    n: 4,
    corta: "¿Es importante recibir instrucciones antes?",
    completa: "¿Consideras importante recibir instrucciones del consumo del nitrógeno liquido antes de probarlo?",
    total: 30,
    opciones: [
      {
        texto: "Si",
        n: 22,
        pct: 73
      },
      {
        texto: "Ya las conozco",
        n: 5,
        pct: 17
      },
      {
        texto: "No",
        n: 3,
        pct: 10
      }
    ]
  },
  {
    n: 5,
    corta: "¿Aceptarías las instrucciones del vendedor?",
    completa: "¿Estarías dispuesto a recibir instrucciones antes de consumir el Mochi sumergido en nitrógeno liquido si el vendedor te indica?",
    total: 30,
    opciones: [
      {
        texto: "Si",
        n: 23,
        pct: 77
      },
      {
        texto: "Tal vez",
        n: 5,
        pct: 17
      },
      {
        texto: "No",
        n: 2,
        pct: 7
      }
    ]
  },
  {
    n: 6,
    corta: "¿Te atrae el efecto del humo?",
    completa: "¿Te parece atractivo el efecto del humo saliendo del mochi y expulsando vapor por tu boca?",
    total: 30,
    opciones: [
      {
        texto: "Si",
        n: 24,
        pct: 80
      },
      {
        texto: "No",
        n: 6,
        pct: 20
      }
    ]
  },
  {
    n: 7,
    corta: "¿Conocías los postres con nitrógeno?",
    completa: "¿Conocías los postres sumergidos en nitrógeno liquido en los postres antes de hoy?",
    total: 30,
    opciones: [
      {
        texto: "Si",
        n: 12,
        pct: 40
      },
      {
        texto: "No",
        n: 9,
        pct: 30
      },
      {
        texto: "Solo los habia Visto en internet",
        n: 9,
        pct: 30
      }
    ]
  },
  {
    n: 8,
    corta: "¿Verías la preparación en vivo?",
    completa: "¿Te gustaría mirar la preparación de como se sumerje el mochi bajo nitrógeno liquido",
    total: 30,
    opciones: [
      {
        texto: "Si",
        n: 24,
        pct: 80
      },
      {
        texto: "No",
        n: 6,
        pct: 20
      }
    ]
  },
  {
    n: 9,
    corta: "¿El nitrógeno líquido es innovador?",
    completa: "¿Consideras que el Nitrógeno liquido es algo innovador para la implementación en la comida además de los postres y cócteles?",
    total: 30,
    opciones: [
      {
        texto: "Si",
        n: 22,
        pct: 73
      },
      {
        texto: "No",
        n: 8,
        pct: 27
      }
    ]
  },
  {
    n: 10,
    corta: "¿Esto atrae a los jóvenes?",
    completa: "¿Crees que este tipo de preparación pude atraer a los jóvenes?",
    total: 30,
    opciones: [
      {
        texto: "Si",
        n: 23,
        pct: 77
      },
      {
        texto: "No",
        n: 7,
        pct: 23
      }
    ]
  }
]
