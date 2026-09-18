import { useHojaDeVida } from "@/components/resume/resume-context"
import { SectionTitle } from "@/components/resume/resume-section"

export function ResumeAbout() {
  const { hoja } = useHojaDeVida()

  return (
    <section aria-labelledby="perfil-titulo" className="flex flex-col gap-4">
      <SectionTitle id="perfil-titulo">Mi perfil</SectionTitle>

      <p className="text-sm leading-relaxed text-pretty">
        {hoja.profile.summary}
      </p>

      <dl className="grid gap-x-10 gap-y-4 lg:grid-cols-2">
        {hoja.about.map((punto) => (
          <div key={punto.title} className="flex flex-col gap-1">
            <dt className="text-sm font-semibold">{punto.title}</dt>
            <dd className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {punto.text}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
