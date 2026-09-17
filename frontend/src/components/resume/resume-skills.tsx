import { SectionTitle } from "@/components/resume/resume-section"
import { Badge } from "@/components/ui/badge"
import { skillGroups } from "@/data/resume"

export function ResumeSkills() {
  return (
    <section
      aria-labelledby="herramientas-titulo"
      className="flex flex-col gap-5"
    >
      <SectionTitle id="herramientas-titulo">Herramientas</SectionTitle>

      <div className="grid gap-5 sm:grid-cols-2">
        {skillGroups.map((grupo) => (
          <div key={grupo.name} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
              {grupo.name}
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {grupo.skills.map((skill) => (
                <li key={skill}>
                  <Badge variant="secondary">{skill}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
