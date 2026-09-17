import { ResumeAbout } from "@/components/resume/resume-about"
import { ResumeEducation } from "@/components/resume/resume-education"
import { ResumeExperience } from "@/components/resume/resume-experience"
import { ResumeHeader } from "@/components/resume/resume-header"
import { ResumeSidebar } from "@/components/resume/resume-sidebar"
import { ResumeSkills } from "@/components/resume/resume-skills"
import { Separator } from "@/components/ui/separator"
import { profile } from "@/data/resume"

export function ResumePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* La hoja: banda oscura arriba, columna gris a la izquierda y el
          contenido a la derecha. En móvil las dos columnas se apilan. */}
      <article className="overflow-hidden rounded-xl bg-background ring-1 ring-foreground/10 print:rounded-none print:ring-0">
        <ResumeHeader />

        <div className="grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-stretch">
          <ResumeSidebar />

          <div className="flex flex-col gap-8 px-6 py-8 sm:px-8 md:gap-10 md:py-10 lg:px-10">
            <ResumeAbout />
            <Separator />
            <ResumeExperience />
            <Separator />
            <ResumeEducation />
            <Separator />
            <ResumeSkills />
          </div>
        </div>
      </article>

      <footer className="pb-20 text-center text-xs text-muted-foreground sm:pb-4">
        {profile.firstName} {profile.lastName} · {profile.title} ·{" "}
        {new Date().getFullYear()}
      </footer>
    </div>
  )
}
