import type { LucideIcon } from "lucide-react"
import { GlobeIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { useHojaDeVida } from "@/components/resume/resume-context"
import { PanelTitle } from "@/components/resume/resume-section"
import { Progress, ProgressLabel } from "@/components/ui/progress"

function Contacto({
  icon: Icon,
  children,
  href,
  note,
}: {
  icon: LucideIcon
  children: React.ReactNode
  href?: string
  note?: string
}) {
  const externo = href?.startsWith("http")

  return (
    <li className="flex min-w-0 items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col">
        {href ? (
          <a
            href={href}
            target={externo ? "_blank" : undefined}
            rel={externo ? "noreferrer" : undefined}
            className="rounded-sm break-words underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {children}
          </a>
        ) : (
          <span className="break-words">{children}</span>
        )}
        {note ? (
          <span className="text-xs text-muted-foreground">{note}</span>
        ) : null}
      </div>
    </li>
  )
}

export function ResumeSidebar() {
  const { hoja } = useHojaDeVida()
  const { profile } = hoja

  return (
    <aside className="flex flex-col gap-8 bg-sidebar px-6 py-8 sm:px-8 md:pt-28 lg:pt-32">
      <section
        aria-labelledby="contacto-titulo"
        className="flex flex-col gap-4"
      >
        <PanelTitle>
          <span id="contacto-titulo">Contacto</span>
        </PanelTitle>
        <ul className="flex flex-col gap-3 text-sm">
          {profile.phone ? (
            <Contacto
              icon={PhoneIcon}
              href={`tel:${profile.phone.replace(/\s/g, "")}`}
            >
              {profile.phone}
            </Contacto>
          ) : null}
          {profile.email ? (
            <Contacto icon={MailIcon} href={`mailto:${profile.email}`}>
              {profile.email}
            </Contacto>
          ) : null}
          {profile.website ? (
            <Contacto
              icon={GlobeIcon}
              href={profile.website}
              note={profile.website_note}
            >
              {profile.website_label || profile.website}
            </Contacto>
          ) : null}
          {profile.address ? (
            <Contacto icon={MapPinIcon}>{profile.address}</Contacto>
          ) : null}
        </ul>
      </section>

      <section
        aria-labelledby="informacion-titulo"
        className="flex flex-col gap-4"
      >
        <PanelTitle>
          <span id="informacion-titulo">Información</span>
        </PanelTitle>
        <dl className="flex flex-col gap-2 text-sm">
          {hoja.personal_details.map((dato) => (
            <div key={dato.label} className="flex flex-col">
              <dt className="text-xs text-muted-foreground">{dato.label}</dt>
              <dd>{dato.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="idiomas-titulo" className="flex flex-col gap-4">
        <PanelTitle>
          <span id="idiomas-titulo">Idiomas</span>
        </PanelTitle>
        <div className="flex flex-col gap-4">
          {hoja.languages.map((idioma) => (
            // El porcentaje viene del nivel escrito en el CV; no es un dato
            // que se invente aquí.
            <Progress
              key={idioma.name}
              value={idioma.percent}
              getAriaValueText={() => idioma.level_label}
            >
              <ProgressLabel className="text-sm font-semibold">
                {idioma.name}
              </ProgressLabel>
              <span className="ml-auto text-sm text-muted-foreground">
                {idioma.level_label}
              </span>
            </Progress>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="referencias-titulo"
        className="flex flex-col gap-4"
      >
        <PanelTitle>
          <span id="referencias-titulo">Referencias</span>
        </PanelTitle>
        <ul className="flex flex-col gap-3 text-sm">
          {hoja.references.map((referencia) => (
            <li key={referencia.name} className="flex min-w-0 flex-col">
              <span className="font-semibold">{referencia.name}</span>
              <span className="text-xs text-muted-foreground">
                {referencia.relation}
              </span>
              {profile.show_reference_contacts ? (
                <span className="flex min-w-0 flex-col text-xs text-muted-foreground">
                  {referencia.phone ? (
                    <a
                      href={`tel:${referencia.phone.replace(/[\s()]/g, "")}`}
                      className="w-fit underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {referencia.phone}
                    </a>
                  ) : null}
                  {referencia.email ? (
                    <a
                      href={`mailto:${referencia.email}`}
                      className="truncate underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {referencia.email}
                    </a>
                  ) : null}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
