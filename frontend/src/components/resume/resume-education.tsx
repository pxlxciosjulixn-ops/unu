import { SectionTitle } from "@/components/resume/resume-section"
import { certifications, education, type Education } from "@/data/resume"

function Formacion({ item, compacta }: { item: Education; compacta?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-bold tracking-wide uppercase text-pretty">
        {item.title}
      </h3>
      <p className="text-sm font-semibold italic">
        {item.institution}{" "}
        <span className="font-normal tabular-nums">({item.year})</span>
      </p>
      {compacta ? null : (
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          {item.description}
        </p>
      )}
    </div>
  )
}

export function ResumeEducation() {
  return (
    <section aria-labelledby="formacion-titulo" className="flex flex-col gap-5">
      <SectionTitle id="formacion-titulo">Formación</SectionTitle>

      <div className="flex flex-col gap-6">
        {education.map((item) => (
          <Formacion key={item.title} item={item} />
        ))}
      </div>

      <div className="flex flex-col gap-4 pt-1">
        <h3 className="text-sm font-bold tracking-[0.14em] uppercase text-muted-foreground">
          Cursos y certificaciones
        </h3>
        <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {certifications.map((item) => (
            <Formacion key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  )
}
