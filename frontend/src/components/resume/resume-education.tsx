import { useHojaDeVida } from "@/components/resume/resume-context"
import { SectionTitle } from "@/components/resume/resume-section"
import type { Formacion } from "@/lib/resume-api"

function ItemDeFormacion({ item }: { item: Formacion }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-bold tracking-wide text-pretty uppercase">
        {item.title}
      </h3>
      <p className="text-sm font-semibold italic">
        {item.institution}{" "}
        <span className="font-normal tabular-nums">({item.year})</span>
      </p>
      {item.description ? (
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          {item.description}
        </p>
      ) : null}
    </div>
  )
}

export function ResumeEducation() {
  const { hoja } = useHojaDeVida()

  return (
    <section aria-labelledby="formacion-titulo" className="flex flex-col gap-5">
      <SectionTitle id="formacion-titulo">Formación</SectionTitle>

      <div className="flex flex-col gap-6">
        {hoja.education.map((item) => (
          <ItemDeFormacion key={item.title} item={item} />
        ))}
      </div>

      <div className="flex flex-col gap-4 pt-1">
        <h3 className="text-sm font-bold tracking-[0.14em] text-muted-foreground uppercase">
          Cursos y certificaciones
        </h3>
        <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {hoja.certifications.map((item) => (
            <ItemDeFormacion key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
