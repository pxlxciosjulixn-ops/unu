import { usePerfil } from "@/components/resume/resume-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function ResumeHeader() {
  const profile = usePerfil()

  return (
    <header className="relative bg-band text-band-foreground">
      <div className="grid gap-5 px-6 py-8 sm:px-8 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-center md:gap-0 md:px-0 md:py-12">
        {/* En escritorio la foto sobresale de la banda, sobre la columna gris. */}
        <div className="flex justify-center md:justify-start">
          <Avatar className="size-28 ring-8 ring-background sm:size-32 md:absolute md:bottom-0 md:left-8 md:size-40 md:translate-y-1/4 lg:left-10">
            <AvatarFallback className="bg-secondary text-3xl font-semibold text-secondary-foreground sm:text-4xl">
              {profile.initials}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col items-center gap-2 text-center md:items-start md:pr-8 md:text-left lg:pr-10">
          <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-xs font-semibold tracking-[0.28em] uppercase opacity-90 sm:text-sm">
            {profile.title}
          </p>
        </div>
      </div>
    </header>
  )
}
