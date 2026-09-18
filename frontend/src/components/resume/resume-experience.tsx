import { useHojaDeVida } from "@/components/resume/resume-context"
import { SectionTitle } from "@/components/resume/resume-section"
import { Badge } from "@/components/ui/badge"
import { formatearDuracion, mesesEntre } from "@/lib/fechas"

export function ResumeExperience() {
  const { hoja } = useHojaDeVida()

  return (
    <section
      aria-labelledby="experiencia-titulo"
      className="flex flex-col gap-5"
    >
      <SectionTitle id="experiencia-titulo">Experiencia</SectionTitle>

      <ol className="flex flex-col gap-6">
        {hoja.experiences.map((experiencia) => (
          <li
            key={`${experiencia.role}-${experiencia.start}`}
            className="relative flex flex-col gap-2 pl-5"
          >
            <span
              aria-hidden
              className="absolute top-[0.45rem] left-0 size-2 rounded-full bg-foreground"
            />

            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide uppercase">
                {experiencia.role}
              </h3>
              {experiencia.current ? <Badge>Actual</Badge> : null}
            </div>

            <p className="text-sm font-semibold italic">
              {experiencia.company} · {experiencia.location}{" "}
              <span className="font-normal tabular-nums">
                ({experiencia.period} ·{" "}
                {formatearDuracion(
                  mesesEntre(experiencia.start, experiencia.end || undefined)
                )}
                )
              </span>
            </p>

            <ul className="flex list-outside list-disc flex-col gap-1.5 pl-4 text-sm leading-relaxed text-muted-foreground marker:text-foreground/30">
              {experiencia.bullets.map((punto) => (
                <li key={punto} className="text-pretty">
                  {punto}
                </li>
              ))}
            </ul>

            <ul aria-label="Tecnologías" className="flex flex-wrap gap-1.5">
              {experiencia.stack.map((tecnologia) => (
                <li key={tecnologia}>
                  <Badge variant="outline">{tecnologia}</Badge>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}
