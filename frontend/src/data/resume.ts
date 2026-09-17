export type Experience = {
  role: string
  company: string
  location: string
  period: string
  /** Inicio y fin en formato AAAA-MM; sin `end` el cargo sigue vigente. */
  start: string
  end?: string
  current?: boolean
  bullets: string[]
  /** Tecnologías que aparecen en las funciones del cargo. */
  stack: string[]
}

export type Education = {
  title: string
  institution: string
  location: string
  year: string
  description: string
}

export type Highlight = {
  title: string
  text: string
}

export type SkillGroup = {
  name: string
  skills: string[]
}

export type Reference = {
  name: string
  relation: string
  phone: string
  email: string
}

/**
 * Ponlo en `false` para ocultar teléfono y correo de las referencias en la
 * versión pública del sitio. Los nombres siguen visibles.
 */
export const SHOW_REFERENCE_CONTACTS = true

export const profile = {
  firstName: "Julian Estif",
  lastName: "Herreño Palacios",
  title: "Data Engineer",
  initials: "JH",
  address:
    "Calle 74 #87c 90 sur, Bosa San Bernardino, Bogotá D.C., 110721, Colombia",
  phone: "324 959 8631",
  email: "palaciosjulian286@gmail.com",
  website: "https://julianpalaciosflask.onrender.com/inicio/",
  websiteLabel: "julianpalaciosflask.onrender.com",
  websiteNote: "Puede tardar ~15 segundos en despertar",
  summary:
    "Diseño arquitecturas de datos, pipelines ETL / ELT y dashboards que convierten la información operativa en decisiones de negocio.",
}

export const about: Highlight[] = [
  {
    title: "Retail y telecomunicaciones",
    text: "Experiencia desarrollando soluciones de análisis de datos y automatización para compañías como Claro, Falabella y Homecenter.",
  },
  {
    title: "Estandarización y automatización",
    text: "Liderazgo en proyectos de estandarización de datos y automatización de procesos, utilizando Python, SQL, Excel, Power BI y Metabase, logrando reducir tiempos operativos y errores en la gestión de información.",
  },
  {
    title: "Dashboards y modelos analíticos",
    text: "Desarrollo de dashboards y modelos analíticos con Python, Power BI y Excel, facilitando la visualización de indicadores y la toma de decisiones basada en datos.",
  },
  {
    title: "Investigación en Data Analytics",
    text: "Tesis de pregrado enfocada en Data Analytics, proponiendo una metodología para la creación de áreas de análisis de datos en microempresas del sector tecnológico en Colombia.",
  },
]

export const skillGroups: SkillGroup[] = [
  {
    name: "Datos e ingeniería",
    skills: ["SQL", "Python", "Data Warehouse", "Cloud (GCP)"],
  },
  {
    name: "BI y visualización",
    skills: ["Power BI", "Excel", "Tableau", "Metabase", "Looker Studio"],
  },
  {
    name: "Automatización y versionado",
    skills: ["n8n", "GitHub"],
  },
]

export const skills = skillGroups.flatMap((group) => group.skills)

export const languages = [
  { name: "Español", level: "Nativo" },
  { name: "Inglés", level: "Intermedio" },
]

export const personalDetails = [
  { label: "Fecha de nacimiento", value: "21 mar. 2002" },
  { label: "Nacionalidad", value: "Colombiano" },
  { label: "Estado civil", value: "Soltero" },
]

export const references: Reference[] = [
  {
    name: "Adriana Caicedo",
    relation: "IYCSA",
    phone: "(601) 208 8080",
    email: "recursos.humanos@iycsa.com.co",
  },
  {
    name: "Johani Herreño Palacios",
    relation: "Personal",
    phone: "302 583 0404",
    email: "Jherreno57@gmail.com",
  },
]

export const experiences: Experience[] = [
  {
    role: "Data Engineering Lead",
    company: "Colombian Trade Company SAS (COLTRADE)",
    location: "Bogotá D.C.",
    period: "jul. 2025 — Actualidad",
    start: "2025-07",
    current: true,
    bullets: [
      "Lideré el desarrollo de la arquitectura de datos de la empresa, diseñando y optimizando bases de datos en PostgreSQL y SQL Server, aplicando modelado relacional y consultas SQL avanzadas, además del diseño de un Data Warehouse para centralizar la información del negocio.",
      "Diseñé e implementé pipelines de datos ETL / ELT utilizando Python (Pandas, Numpy), SQL y n8n, automatizando la extracción, transformación y carga de datos desde múltiples fuentes para su análisis.",
      "Implementé procesos de integración y orquestación de flujos de datos con n8n y servicios en GCP, mejorando la automatización, disponibilidad y escalabilidad de la información.",
      "Desarrollé dashboards analíticos en Power BI y Excel, permitiendo el seguimiento de indicadores clave y facilitando la toma de decisiones basada en datos.",
    ],
    stack: ["PostgreSQL", "SQL Server", "Data Warehouse", "Python", "Pandas", "n8n", "GCP", "Power BI", "Excel"],
  },
  {
    role: "Data Analyst",
    company: "Colombian Trade Company SAS (COLTRADE)",
    location: "Bogotá D.C.",
    period: "dic. 2023 — jun. 2025",
    start: "2023-12",
    end: "2025-06",
    bullets: [
      "Trabajé de manera transversal con áreas como Trade Marketing, Procurement, Operaciones y Calidad, analizando datos y desarrollando soluciones para mejorar la toma de decisiones basada en información.",
      "Diseñé y optimicé estructuras de datos en SQL Server y MySQL, estandarizando información proveniente de múltiples fuentes para su análisis en Excel, Power BI y Python.",
      "Desarrollé procesos de automatización y transformación de datos con Python (Pandas, Numpy), reduciendo tareas manuales y mejorando la eficiencia en la gestión de información.",
      "Construí dashboards interactivos en Power BI y Excel (Power Query y Power Pivot) para el seguimiento de indicadores de negocio y análisis de desempeño.",
      "Desarrollé herramientas de análisis y visualización de datos mediante Python (Dash, Matplotlib, Flask) para facilitar el acceso a la información dentro de la organización.",
      "Elaboré modelos de proyección de inventarios y análisis de tendencias, apoyando la planificación operativa y la toma de decisiones estratégicas.",
    ],
    stack: ["SQL Server", "MySQL", "Python", "Pandas", "Power BI", "Power Query", "Power Pivot", "Dash", "Flask"],
  },
  {
    role: "Data Analyst Trade Marketing",
    company: "Colombian Trade Company SAS (COLTRADE)",
    location: "Bogotá D.C.",
    period: "may. 2023 — dic. 2023",
    start: "2023-05",
    end: "2023-12",
    bullets: [
      "Analicé datos de ventas Sell Out de clientes como Claro, Homecenter y Falabella mediante Python (Pandas, Numpy), SQL y Excel, generando dashboards y reportes para el seguimiento del desempeño comercial.",
      "Desarrollé modelos de forecast y proyección de ventas para planificación de metas e inventarios a nivel nacional por punto de venta.",
      "Construí dashboards y modelos analíticos en Power BI, Power Pivot y DAX, permitiendo monitorear indicadores comerciales y prevenir sobrestock o quiebres de inventario.",
      "Generé insights de negocio para la Gerencia de Trade Marketing, apoyando decisiones estratégicas, propuestas comerciales y análisis de comisiones basadas en desempeño.",
    ],
    stack: ["Python", "Pandas", "SQL", "Excel", "Power BI", "Power Pivot", "DAX"],
  },
  {
    role: "Analista de Operaciones Internacionales",
    company: "Colombian Trade Company SAS (COLTRADE)",
    location: "Bogotá D.C.",
    period: "dic. 2022 — abr. 2023",
    start: "2022-12",
    end: "2023-04",
    bullets: [
      "Desarrollé dashboards y reportes analíticos en Excel avanzado (Power Query, Power Pivot, VBA) y Looker Studio para el seguimiento de costos, compras y desempeño de proveedores.",
      "Estandaricé y estructuré información de órdenes de compra y proveedores utilizando SQL y Excel, facilitando el análisis y control de datos del proceso de abastecimiento.",
      "Implementé modelos de forecast de compras y análisis de costos, generando reportes estratégicos para la gerencia y apoyando la toma de decisiones.",
    ],
    stack: ["Excel", "Power Query", "Power Pivot", "VBA", "Looker Studio", "SQL"],
  },
  {
    role: "Auxiliar de Logística y Compras",
    company: "Instrumentos y Controles S.A. (IYCSA)",
    location: "Bogotá D.C.",
    period: "feb. 2021 — nov. 2022",
    start: "2021-02",
    end: "2022-11",
    bullets: [
      "Analicé datos de facturación utilizando Python (Pandas) y Excel, automatizando cruces de información entre facturas, órdenes de compra y registros internos para mejorar el control y seguimiento de la información.",
      "Desarrollé scripts en Python para limpieza, transformación y validación de datos, optimizando procesos de conciliación y reduciendo errores en los reportes de facturación.",
      "Gestioné y estructuré información financiera mediante Excel y Python, facilitando el análisis mensual de facturación y control de registros asociados a compras y pagos.",
      "Realicé análisis y verificación de información de proveedores, apoyándome en Python y Excel para organizar datos, validar documentación y apoyar procesos de evaluación y aprobación.",
    ],
    stack: ["Python", "Pandas", "Excel"],
  },
]

export const education: Education[] = [
  {
    title: "Ingeniería Industrial",
    institution: "Areandina",
    location: "Bogotá D.C.",
    year: "2025",
    description:
      "El programa busca diseñar, optimizar y controlar sistemas de producción en diversas industrias, con el fin de potenciar los recursos humano, técnico y financiero de las organizaciones para adaptarlas a los cambios científicos, económicos y culturales de la sociedad globalizada en la era de la cuarta revolución industrial. Destaca competencias clave para la industria 4.0, como big data, simulación, integración de sistemas e internet de las cosas.",
  },
  {
    title: "Gestión Administrativa",
    institution: "SENA",
    location: "Bogotá D.C.",
    year: "2022",
    description:
      "El tecnólogo en Gestión Administrativa del SENA es un profesional capacitado para planificar y administrar programas que mejoren la productividad y el desarrollo de una organización, comprendiendo el entorno laboral, la cultura empresarial y aplicando estrategias para optimizar el rendimiento de una empresa.",
  },
]

export const certifications: Education[] = [
  {
    title: "Master en SQL",
    institution: "Udemy",
    location: "Bogotá D.C.",
    year: "2025",
    description:
      "Formación integral sobre el uso y administración de SQL Server, desde conceptos básicos hasta técnicas avanzadas de bases de datos relacionales.",
  },
  {
    title: "Curso de Power BI",
    institution: "MinTIC",
    location: "Bogotá D.C.",
    year: "2025",
    description: "Curso completo de la herramienta Power BI.",
  },
  {
    title: "Gobierno de Datos",
    institution: "MinTIC",
    location: "Bogotá D.C.",
    year: "2025",
    description:
      "Estructuración y gestión de datos de calidad para una toma de decisiones efectiva.",
  },
  {
    title: "Inteligencia Artificial Aplicada",
    institution: "MinTIC",
    location: "Bogotá D.C.",
    year: "2025",
    description:
      "Implementación de Inteligencia Artificial en el sector comercial.",
  },
  {
    title: "Seguridad y Privacidad de la Información",
    institution: "MinTIC",
    location: "Bogotá D.C.",
    year: "2025",
    description:
      "Protección de datos y sistemas informáticos frente a amenazas como accesos no autorizados, ciberataques, filtraciones, pérdida de información o mal uso de los datos personales.",
  },
]
