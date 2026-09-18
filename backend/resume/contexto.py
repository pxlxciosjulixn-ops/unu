"""
La hoja de vida escrita como texto, para dársela al modelo del chat.

Se arma leyendo la base en cada llamada, a proposito: asi lo que se acaba de
editar en `/home/hoja-de-vida` es lo que el asistente responde en el siguiente
mensaje, sin cache que invalidar ni reinicio del servidor. Son unas pocas
consultas, nada al lado de lo que tarda el modelo en contestar.
"""

from __future__ import annotations

from resume import models


def _lista(titulo: str, lineas: list[str]) -> list[str]:
    """Un bloque con titulo, o nada si no hay que contar."""
    if not lineas:
        return []
    return [f"## {titulo}", *lineas, ""]


def hoja_de_vida_como_texto() -> str | None:
    """
    Toda la hoja de vida en Markdown, o `None` si todavia no hay nada guardado.

    Es el mismo contenido que se ve en la pagina: si algo no esta aqui, no
    esta en el CV, y el asistente tiene que decir que no lo sabe.
    """
    perfil = models.ResumeProfile.objects.first()
    if perfil is None:
        return None

    partes: list[str] = [
        f"# {perfil.first_name} {perfil.last_name}",
        f"Cargo: {perfil.title}",
        "",
    ]

    if perfil.summary:
        partes += ["## Resumen", perfil.summary, ""]

    contacto = [
        f"- Teléfono: {perfil.phone}" if perfil.phone else "",
        f"- Correo: {perfil.email}" if perfil.email else "",
        f"- Sitio web: {perfil.website}" if perfil.website else "",
        f"- Dirección: {perfil.address}" if perfil.address else "",
    ]
    partes += _lista("Contacto", [linea for linea in contacto if linea])

    partes += _lista(
        "Información personal",
        [f"- {dato.label}: {dato.value}" for dato in models.PersonalDetail.objects.all()],
    )

    partes += _lista(
        "Perfil",
        [f"- {punto.title}: {punto.text}" for punto in models.Highlight.objects.all()],
    )

    experiencias: list[str] = []
    for cargo in models.Experience.objects.all():
        experiencias.append(f"### {cargo.role} — {cargo.company}")
        experiencias.append(f"{cargo.location} · {cargo.period}")
        experiencias += [
            f"- {linea.strip()}"
            for linea in cargo.bullets.splitlines()
            if linea.strip()
        ]
        if cargo.stack:
            experiencias.append(f"Tecnologías: {cargo.stack}")
        experiencias.append("")
    partes += _lista("Experiencia", experiencias)

    formacion: list[str] = []
    certificaciones: list[str] = []
    for item in models.Formation.objects.all():
        linea = f"- {item.title} — {item.institution} ({item.year})"
        if item.description:
            linea += f". {item.description}"
        destino = (
            formacion
            if item.kind == models.Formation.Kind.EDUCATION
            else certificaciones
        )
        destino.append(linea)
    partes += _lista("Formación", formacion)
    partes += _lista("Cursos y certificaciones", certificaciones)

    herramientas = [
        f"- {grupo.name}: {grupo.skills}"
        for grupo in models.SkillGroup.objects.all()
        if grupo.skills
    ]
    partes += _lista("Herramientas", herramientas)

    partes += _lista(
        "Idiomas",
        [
            f"- {idioma.name}: {idioma.get_level_display()}"
            for idioma in models.Language.objects.all()
        ],
    )

    # El interruptor de la hoja manda tambien aqui: si los contactos de las
    # referencias estan ocultos en la pagina, el asistente tampoco los tiene.
    referencias = []
    for referencia in models.Reference.objects.all():
        linea = f"- {referencia.name} ({referencia.relation})"
        if perfil.show_reference_contacts:
            datos = ", ".join(filter(None, [referencia.phone, referencia.email]))
            if datos:
                linea += f": {datos}"
        referencias.append(linea)
    partes += _lista("Referencias", referencias)

    return "\n".join(partes).strip()
