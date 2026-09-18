"""
Carga en la base la hoja de vida que hasta ahora vivia en el frontend.

Es idempotente: si ya hay perfil guardado no toca nada, asi se puede dejar
corriendo en cada despliegue sin miedo a pisar lo que se edito desde el sitio.
Con `--reset` si borra y vuelve a escribir los datos de origen.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from resume import models

PERFIL = {
    "first_name": "Julian Estif",
    "last_name": "Herreño Palacios",
    "title": "Data Engineer",
    "initials": "JH",
    "address": "Calle 74 #87c 90 sur, Bosa San Bernardino, Bogotá D.C., 110721, Colombia",
    "phone": "324 959 8631",
    "email": "palaciosjulian286@gmail.com",
    "website": "https://julianpalaciosflask.onrender.com/inicio/",
    "website_label": "julianpalaciosflask.onrender.com",
    "website_note": "Puede tardar ~15 segundos en despertar",
    "summary": (
        "Diseño arquitecturas de datos, pipelines ETL / ELT y dashboards que "
        "convierten la información operativa en decisiones de negocio."
    ),
    "show_reference_contacts": True,
}

ABOUT = [
    (
        "Retail y telecomunicaciones",
        "Experiencia desarrollando soluciones de análisis de datos y automatización "
        "para compañías como Claro, Falabella y Homecenter.",
    ),
    (
        "Estandarización y automatización",
        "Liderazgo en proyectos de estandarización de datos y automatización de "
        "procesos, utilizando Python, SQL, Excel, Power BI y Metabase, logrando "
        "reducir tiempos operativos y errores en la gestión de información.",
    ),
    (
        "Dashboards y modelos analíticos",
        "Desarrollo de dashboards y modelos analíticos con Python, Power BI y Excel, "
        "facilitando la visualización de indicadores y la toma de decisiones basada "
        "en datos.",
    ),
    (
        "Investigación en Data Analytics",
        "Tesis de pregrado enfocada en Data Analytics, proponiendo una metodología "
        "para la creación de áreas de análisis de datos en microempresas del sector "
        "tecnológico en Colombia.",
    ),
]

GRUPOS_DE_HERRAMIENTAS = [
    ("Datos e ingeniería", "SQL, Python, Data Warehouse, Cloud (GCP)"),
    ("BI y visualización", "Power BI, Excel, Tableau, Metabase, Looker Studio"),
    ("Automatización y versionado", "n8n, GitHub"),
]

IDIOMAS = [
    ("Español", models.Language.Level.NATIVO),
    ("Inglés", models.Language.Level.INTERMEDIO),
]

DATOS_PERSONALES = [
    ("Fecha de nacimiento", "21 mar. 2002"),
    ("Nacionalidad", "Colombiano"),
    ("Estado civil", "Soltero"),
]

REFERENCIAS = [
    ("Adriana Caicedo", "IYCSA", "(601) 208 8080", "recursos.humanos@iycsa.com.co"),
    ("Johani Herreño Palacios", "Personal", "302 583 0404", "Jherreno57@gmail.com"),
]

EXPERIENCIAS = [
    {
        "role": "Data Engineering Lead",
        "company": "Colombian Trade Company SAS (COLTRADE)",
        "location": "Bogotá D.C.",
        "start": "2025-07",
        "end": "",
        "current": True,
        "bullets": [
            "Lideré el desarrollo de la arquitectura de datos de la empresa, diseñando y optimizando bases de datos en PostgreSQL y SQL Server, aplicando modelado relacional y consultas SQL avanzadas, además del diseño de un Data Warehouse para centralizar la información del negocio.",
            "Diseñé e implementé pipelines de datos ETL / ELT utilizando Python (Pandas, Numpy), SQL y n8n, automatizando la extracción, transformación y carga de datos desde múltiples fuentes para su análisis.",
            "Implementé procesos de integración y orquestación de flujos de datos con n8n y servicios en GCP, mejorando la automatización, disponibilidad y escalabilidad de la información.",
            "Desarrollé dashboards analíticos en Power BI y Excel, permitiendo el seguimiento de indicadores clave y facilitando la toma de decisiones basada en datos.",
        ],
        "stack": "PostgreSQL, SQL Server, Data Warehouse, Python, Pandas, n8n, GCP, Power BI, Excel",
    },
    {
        "role": "Data Analyst",
        "company": "Colombian Trade Company SAS (COLTRADE)",
        "location": "Bogotá D.C.",
        "start": "2023-12",
        "end": "2025-06",
        "current": False,
        "bullets": [
            "Trabajé de manera transversal con áreas como Trade Marketing, Procurement, Operaciones y Calidad, analizando datos y desarrollando soluciones para mejorar la toma de decisiones basada en información.",
            "Diseñé y optimicé estructuras de datos en SQL Server y MySQL, estandarizando información proveniente de múltiples fuentes para su análisis en Excel, Power BI y Python.",
            "Desarrollé procesos de automatización y transformación de datos con Python (Pandas, Numpy), reduciendo tareas manuales y mejorando la eficiencia en la gestión de información.",
            "Construí dashboards interactivos en Power BI y Excel (Power Query y Power Pivot) para el seguimiento de indicadores de negocio y análisis de desempeño.",
            "Desarrollé herramientas de análisis y visualización de datos mediante Python (Dash, Matplotlib, Flask) para facilitar el acceso a la información dentro de la organización.",
            "Elaboré modelos de proyección de inventarios y análisis de tendencias, apoyando la planificación operativa y la toma de decisiones estratégicas.",
        ],
        "stack": "SQL Server, MySQL, Python, Pandas, Power BI, Power Query, Power Pivot, Dash, Flask",
    },
    {
        "role": "Data Analyst Trade Marketing",
        "company": "Colombian Trade Company SAS (COLTRADE)",
        "location": "Bogotá D.C.",
        "start": "2023-05",
        "end": "2023-12",
        "current": False,
        "bullets": [
            "Analicé datos de ventas Sell Out de clientes como Claro, Homecenter y Falabella mediante Python (Pandas, Numpy), SQL y Excel, generando dashboards y reportes para el seguimiento del desempeño comercial.",
            "Desarrollé modelos de forecast y proyección de ventas para planificación de metas e inventarios a nivel nacional por punto de venta.",
            "Construí dashboards y modelos analíticos en Power BI, Power Pivot y DAX, permitiendo monitorear indicadores comerciales y prevenir sobrestock o quiebres de inventario.",
            "Generé insights de negocio para la Gerencia de Trade Marketing, apoyando decisiones estratégicas, propuestas comerciales y análisis de comisiones basadas en desempeño.",
        ],
        "stack": "Python, Pandas, SQL, Excel, Power BI, Power Pivot, DAX",
    },
    {
        "role": "Analista de Operaciones Internacionales",
        "company": "Colombian Trade Company SAS (COLTRADE)",
        "location": "Bogotá D.C.",
        "start": "2022-12",
        "end": "2023-04",
        "current": False,
        "bullets": [
            "Desarrollé dashboards y reportes analíticos en Excel avanzado (Power Query, Power Pivot, VBA) y Looker Studio para el seguimiento de costos, compras y desempeño de proveedores.",
            "Estandaricé y estructuré información de órdenes de compra y proveedores utilizando SQL y Excel, facilitando el análisis y control de datos del proceso de abastecimiento.",
            "Implementé modelos de forecast de compras y análisis de costos, generando reportes estratégicos para la gerencia y apoyando la toma de decisiones.",
        ],
        "stack": "Excel, Power Query, Power Pivot, VBA, Looker Studio, SQL",
    },
    {
        "role": "Auxiliar de Logística y Compras",
        "company": "Instrumentos y Controles S.A. (IYCSA)",
        "location": "Bogotá D.C.",
        "start": "2021-02",
        "end": "2022-11",
        "current": False,
        "bullets": [
            "Analicé datos de facturación utilizando Python (Pandas) y Excel, automatizando cruces de información entre facturas, órdenes de compra y registros internos para mejorar el control y seguimiento de la información.",
            "Desarrollé scripts en Python para limpieza, transformación y validación de datos, optimizando procesos de conciliación y reduciendo errores en los reportes de facturación.",
            "Gestioné y estructuré información financiera mediante Excel y Python, facilitando el análisis mensual de facturación y control de registros asociados a compras y pagos.",
            "Realicé análisis y verificación de información de proveedores, apoyándome en Python y Excel para organizar datos, validar documentación y apoyar procesos de evaluación y aprobación.",
        ],
        "stack": "Python, Pandas, Excel",
    },
]

FORMACION = [
    {
        "title": "Ingeniería Industrial",
        "institution": "Areandina",
        "location": "Bogotá D.C.",
        "year": "2025",
        "description": (
            "El programa busca diseñar, optimizar y controlar sistemas de producción "
            "en diversas industrias, con el fin de potenciar los recursos humano, "
            "técnico y financiero de las organizaciones para adaptarlas a los cambios "
            "científicos, económicos y culturales de la sociedad globalizada en la era "
            "de la cuarta revolución industrial. Destaca competencias clave para la "
            "industria 4.0, como big data, simulación, integración de sistemas e "
            "internet de las cosas."
        ),
    },
    {
        "title": "Gestión Administrativa",
        "institution": "SENA",
        "location": "Bogotá D.C.",
        "year": "2022",
        "description": (
            "El tecnólogo en Gestión Administrativa del SENA es un profesional "
            "capacitado para planificar y administrar programas que mejoren la "
            "productividad y el desarrollo de una organización, comprendiendo el "
            "entorno laboral, la cultura empresarial y aplicando estrategias para "
            "optimizar el rendimiento de una empresa."
        ),
    },
]

CERTIFICACIONES = [
    {
        "title": "Master en SQL",
        "institution": "Udemy",
        "location": "Bogotá D.C.",
        "year": "2025",
        "description": (
            "Formación integral sobre el uso y administración de SQL Server, desde "
            "conceptos básicos hasta técnicas avanzadas de bases de datos relacionales."
        ),
    },
    {
        "title": "Curso de Power BI",
        "institution": "MinTIC",
        "location": "Bogotá D.C.",
        "year": "2025",
        "description": "Curso completo de la herramienta Power BI.",
    },
    {
        "title": "Gobierno de Datos",
        "institution": "MinTIC",
        "location": "Bogotá D.C.",
        "year": "2025",
        "description": (
            "Estructuración y gestión de datos de calidad para una toma de decisiones "
            "efectiva."
        ),
    },
    {
        "title": "Inteligencia Artificial Aplicada",
        "institution": "MinTIC",
        "location": "Bogotá D.C.",
        "year": "2025",
        "description": "Implementación de Inteligencia Artificial en el sector comercial.",
    },
    {
        "title": "Seguridad y Privacidad de la Información",
        "institution": "MinTIC",
        "location": "Bogotá D.C.",
        "year": "2025",
        "description": (
            "Protección de datos y sistemas informáticos frente a amenazas como accesos "
            "no autorizados, ciberataques, filtraciones, pérdida de información o mal "
            "uso de los datos personales."
        ),
    },
]

TABLAS = [
    models.Highlight,
    models.SkillGroup,
    models.Language,
    models.PersonalDetail,
    models.Reference,
    models.Experience,
    models.Formation,
]


class Command(BaseCommand):
    help = "Carga la hoja de vida inicial. No pisa nada si ya hay datos."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Borra lo que haya y vuelve a escribir los datos de origen.",
        )

    @transaction.atomic
    def handle(self, *args, **opciones):
        if models.ResumeProfile.objects.exists() and not opciones["reset"]:
            self.stdout.write(
                "La hoja de vida ya está en la base; no se toca. "
                "Usa --reset para reemplazarla."
            )
            return

        if opciones["reset"]:
            for tabla in TABLAS:
                tabla.objects.all().delete()
            models.ResumeProfile.objects.all().delete()

        models.ResumeProfile.objects.create(**PERFIL)

        models.Highlight.objects.bulk_create(
            models.Highlight(order=i, title=titulo, text=texto)
            for i, (titulo, texto) in enumerate(ABOUT)
        )
        models.SkillGroup.objects.bulk_create(
            models.SkillGroup(order=i, name=nombre, skills=herramientas)
            for i, (nombre, herramientas) in enumerate(GRUPOS_DE_HERRAMIENTAS)
        )
        models.Language.objects.bulk_create(
            models.Language(order=i, name=nombre, level=nivel)
            for i, (nombre, nivel) in enumerate(IDIOMAS)
        )
        models.PersonalDetail.objects.bulk_create(
            models.PersonalDetail(order=i, label=etiqueta, value=valor)
            for i, (etiqueta, valor) in enumerate(DATOS_PERSONALES)
        )
        models.Reference.objects.bulk_create(
            models.Reference(
                order=i, name=nombre, relation=relacion, phone=telefono, email=correo
            )
            for i, (nombre, relacion, telefono, correo) in enumerate(REFERENCIAS)
        )
        models.Experience.objects.bulk_create(
            models.Experience(
                order=i,
                role=cargo["role"],
                company=cargo["company"],
                location=cargo["location"],
                start=cargo["start"],
                end=cargo["end"],
                current=cargo["current"],
                bullets="\n".join(cargo["bullets"]),
                stack=cargo["stack"],
            )
            for i, cargo in enumerate(EXPERIENCIAS)
        )
        models.Formation.objects.bulk_create(
            [
                models.Formation(
                    order=i, kind=models.Formation.Kind.EDUCATION, **estudio
                )
                for i, estudio in enumerate(FORMACION)
            ]
            + [
                models.Formation(
                    order=i, kind=models.Formation.Kind.CERTIFICATION, **curso
                )
                for i, curso in enumerate(CERTIFICACIONES)
            ]
        )

        self.stdout.write(self.style.SUCCESS("Hoja de vida cargada en la base."))
