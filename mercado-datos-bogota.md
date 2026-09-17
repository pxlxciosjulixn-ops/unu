# Qué piden las empresas — Datos en Bogotá (salario > $3.000.000)

Análisis de ofertas reales de Computrabajo para **Analista de Datos** e **Ingeniero de Datos** en Bogotá D.C.

> **Versión corregida.** Una primera versión de este informe contaba menciones que venían del menú del sitio y de la barra lateral de "ofertas similares", lo que inflaba todos los porcentajes. Ahora la descripción se recorta al texto real de la oferta antes de analizarla. Las conclusiones de fondo se sostienen; las cifras bajaron. Estos son los números buenos.

| | |
|---|---|
| **Fecha del scraping** | 28 de agosto de 2026 |
| **Fuentes** | [Analista de datos](https://co.computrabajo.com/trabajo-de-analista-de-datos-en-bogota-dc) · [Ingeniero de datos](https://co.computrabajo.com/trabajo-de-ingeniero-de-datos-en-bogota-dc) |
| **Ofertas recolectadas** | 497 únicas (300 analista + 197 ingeniero) |
| **Con salario publicado** | 333 (67%) |
| **Con salario > $3M** | **131** ← base de todos los porcentajes de este informe |

> **Cómo leer los porcentajes.** Cada número dice *en qué porcentaje de las 131 ofertas de más de $3M aparece esa tecnología*. Se detecta por mención en el título o la descripción, así que mide **demanda declarada**, no profundidad exigida.

Los mismos datos están disponibles como dashboard interactivo en `/dashboard`, servido por la API de Django de este proyecto.

---

## 1. Lo primero: el salario

De las 497 ofertas, **una de cada tres no publica salario** ("A convenir"). El filtro solo pudo aplicarse sobre las 333 que sí publican cifra.

| Rango | Ofertas | % |
|---|---:|---:|
| $3M – $4M | 58 | 44,3% |
| $4M – $5M | 39 | 29,8% |
| $5M – $6M | 16 | 12,2% |
| $6M – $8M | 14 | 10,7% |
| $8M – $10M | 2 | 1,5% |
| Más de $10M | 2 | 1,5% |

**Mediana: $4.400.000. Promedio: $4.773.274. Techo observado: $11.388.000.**

El grueso del mercado por encima de 3 millones vive entre **$3M y $5M (74% de las ofertas)**. Pasar de ahí es un salto real: solo 34 ofertas superan los $5M.

**Contratación:** 45,8% término indefinido, 41,2% obra o labor, 9,2% término fijo, 3,8% prestación de servicios. **98% tiempo completo.**

Un dato incómodo pero útil: **las empresas que más publican en este rango son temporales**, no empresas finales — Alianza Temporal (10 ofertas), Dar Ayuda Temporal (7), Adecco (5), Colsubsidio (5), Manpower (4). Buena parte del mercado visible pasa por intermediación.

---

## 2. El top 10 que realmente importa

| # | Qué piden | % de ofertas |
|---|---|---:|
| 1 | **Excel** | 42,0% |
| 2 | **KPIs / indicadores de negocio** | 39,7% |
| 3 | **Power BI** | 35,1% |
| 4 | **SQL** | 29,0% |
| 5 | **Automatización** | 26,7% |
| 6 | **Inglés** | 21,4% |
| 7 | **Python** | 17,6% |
| 8 | **Dashboards** | 15,3% |
| 9 | SQL Server | 13,0% |
| 10 | Estadística | 12,2% |

La foto es clara: **el núcleo del mercado es Excel + Power BI + SQL, orientado a construir indicadores.** No es un mercado de big data ni de machine learning — es un mercado de reporting y automatización de procesos.

---

## 3. Respuesta directa a tus tres preguntas

### ¿Piden dashboards? — **Sí, es de lo más pedido**

**Power BI 35,1%** y **dashboards 15,3%**, y entre analistas Power BI sube a **47,9%** con dashboards en **25,4%**. Es la habilidad más transversal después de Excel.

Detalle importante: piden **Power BI, no la competencia.**

| Herramienta de BI | % |
|---|---:|
| Power BI | 35,1% |
| Tableau | 6,1% |
| Looker / Data Studio | 1,5% |
| Qlik | 0,8% |
| Metabase | 0% |
| Superset | 0% |

Si tienes que invertir tiempo en una sola herramienta de BI, no hay duda. Dentro de Power BI, lo que diferencia: **DAX (5,3%)** y **Power Query / M (3,8%)** aparecen explícitos en ofertas de analista — esperan modelado, no solo arrastrar gráficos.

### ¿Piden automatización? — **Sí, y más de lo esperado**

**26,7%** — la quinta habilidad más pedida, y sube a **35,0% en ofertas de ingeniero**.

Pero ojo con qué significa: casi siempre es **automatización con Python/SQL de procesos y reportes**, no herramientas de RPA:

| Herramienta | % |
|---|---:|
| Automatización (concepto general) | 26,7% |
| Power Automate | 3,1% |
| RPA (genérico) | 2,3% |
| n8n / Zapier / Make | 0,8% |
| UiPath / Blue Prism | 0% |

**Traducción:** venden "automatización" como resultado, no como herramienta. Lo que evalúan es que sepas eliminar trabajo manual con scripts.

### ¿Piden IA? — **Poco, y superficialmente**

| Concepto | % |
|---|---:|
| IA / inteligencia artificial (mención) | 9,9% |
| Modelos predictivos / forecast | 6,1% |
| Machine Learning | 3,1% |
| Deep learning / redes neuronales | 0,8% |
| LLM / IA generativa / Copilot | 0,8% |
| Librerías ML (scikit, TensorFlow, PyTorch) | 0,8% |

Ese 9,9% es engañoso. Al revisar el texto de las ofertas, la mayoría dice cosas como *"conocimientos o interés en inteligencia artificial (IA)"* o *"participar en proyectos de analítica avanzada e inteligencia artificial"* — **es aspiracional, no un requisito técnico.** Solo 4 ofertas de 131 piden Machine Learning de verdad y **una sola** menciona LLMs.

**Conclusión:** la IA todavía no paga en este mercado. Mencionarla ayuda a pasar filtros; especializarte en ella para conseguir >$3M en Bogotá no es la mejor apuesta hoy.

---

## 4. Analista vs Ingeniero: son dos mercados distintos

Esta es la tabla más accionable del informe. Diferencia en puntos porcentuales:

### Marca a la ingeniería

| Habilidad | Analista | Ingeniero | Δ |
|---|---:|---:|---:|
| AWS | 1,4% | 18,3% | **+16,9** |
| Automatización | 19,7% | 35,0% | **+15,3** |
| SQL | 22,5% | 36,7% | **+14,2** |
| Azure | 2,8% | 16,7% | **+13,9** |
| SQL Server | 7,0% | 20,0% | +13,0 |
| Pipelines | 2,8% | 15,0% | +12,2 |
| CI/CD / DevOps | 1,4% | 13,3% | +11,9 |
| APIs | 5,6% | 16,7% | +11,1 |
| MySQL | 0,0% | 8,3% | +8,3 |
| Agile / Scrum | 1,4% | 8,3% | +6,9 |

### Marca al análisis

| Habilidad | Analista | Ingeniero | Δ |
|---|---:|---:|---:|
| Excel | 60,6% | 20,0% | **−40,6** |
| Power BI | 47,9% | 20,0% | **−27,9** |
| Dashboards | 25,4% | 3,3% | **−22,1** |
| KPIs | 47,9% | 30,0% | −17,9 |
| Estadística | 19,7% | 3,3% | −16,4 |
| DAX | 9,9% | 0,0% | −9,9 |
| Power Query / M | 7,0% | 0,0% | −7,0 |

**Ojo con SQL:** con los datos limpios resulta ser un marcador de ingeniería (+14,2), no un piso neutro como parecía antes. Python se reparte casi igual entre ambos perfiles.

---

## 5. Qué separa a las ofertas de más de $5M

Comparación entre las 97 ofertas de $3–5M y las 34 de más de $5M:

| Habilidad | $3–5M | > $5M | Δ |
|---|---:|---:|---:|
| **ETL / ELT** | 1,0% | 17,6% | **+16,6** |
| **Agile / Scrum** | 1,0% | 14,7% | **+13,7** |
| **Python** | 14,4% | 26,5% | **+12,1** |
| MySQL | 1,0% | 11,8% | +10,8 |
| **Gobierno / calidad de datos** | 4,1% | 14,7% | +10,6 |
| APIs | 8,2% | 17,6% | +9,4 |
| Pipelines | 6,2% | 14,7% | +8,5 |
| Oracle | 4,1% | 11,8% | +7,7 |
| Modelado de datos | 3,1% | 8,8% | +5,7 |
| Git | 4,1% | 8,8% | +4,7 |
| — | | | |
| Excel | 50,5% | 17,6% | **−32,9** |
| Dashboards | 19,6% | 2,9% | **−16,7** |
| KPIs | 42,3% | 32,4% | −9,9 |
| Estadística | 14,4% | 5,9% | −8,5 |
| SQL Server | 14,4% | 8,8% | −5,6 |
| Power BI | 36,1% | 32,4% | −3,7 |

**Esta es la señal más importante del informe.** El salto de $5M no lo dan más dashboards — lo dan **ETL, Python, gobierno de datos, APIs y trabajo en equipos ágiles**. Excel *baja 33 puntos* al subir de rango: es el marcador de los puestos de $3–5M, no la palanca para salir de ellos.

---

## 6. Inventario completo por categoría

### BI y visualización
| | % |
|---|---:|
| Excel | 42,0% |
| Power BI | 35,1% |
| Dashboards | 15,3% |
| Tableau | 6,1% |
| Looker / Data Studio | 1,5% |
| Qlik | 0,8% |

### Lenguajes
| | % |
|---|---:|
| SQL | 29,0% |
| Python | 17,6% |
| DAX | 5,3% |
| VBA / Macros | 4,6% |
| Java | 3,8% |
| Power Query / M | 3,8% |
| Bash / Shell | 2,3% |
| JavaScript | 2,3% |
| R | 0,8% |
| Scala | 0,8% |

### Bases de datos
| | % |
|---|---:|
| SQL Server | 13,0% |
| Oracle | 6,1% |
| MySQL | 3,8% |
| PostgreSQL | 3,8% |
| MongoDB / NoSQL | 2,3% |
| BigQuery | 1,5% |
| Redshift | 0,8% |
| Synapse | 0,8% |
| Snowflake / Databricks | 0% |

### Nube
| | % |
|---|---:|
| AWS | 9,2% |
| Azure | 9,2% |
| GCP | 3,1% |

### Ingeniería de datos
| | % |
|---|---:|
| Pipelines | 8,4% |
| Gobierno / calidad de datos | 6,9% |
| ETL / ELT | 5,3% |
| Modelado de datos | 4,6% |
| Spark | 3,8% |
| Big Data / Hadoop | 3,1% |
| Airflow | 1,5% |
| Kafka | 1,5% |
| Azure Data Factory | 0,8% |
| Data Lake | 0,8% |
| Data Warehouse | 0,8% |
| dbt | 0,8% |

### Prácticas y transversales
| | % |
|---|---:|
| KPIs / indicadores | 39,7% |
| Inglés | 21,4% |
| Estadística | 12,2% |
| APIs | 10,7% |
| SAP | 9,2% |
| CI/CD / DevOps | 6,9% |
| Git | 5,3% |
| Agile / Scrum | 4,6% |
| Docker / Kubernetes | 1,5% |

---

## 7. Las 10 ofertas mejor pagadas

| Salario | Cargo | Empresa |
|---:|---|---|
| $11.388.000 | Ingeniero Líder de Operaciones de TI / gerente de servicios IT | — |
| $9.720.000 | Ingeniero de sistemas — Especialista en gobierno de datos | S&A Servicios y Asesorías |
| $9.445.000 | Jefe/a de ingeniería de Plantas | Challenger S.A.S |
| $8.000.000 | **Ingeniero(a) de Datos Senior GCP y AWS** | S4L Colombia S.A.S |
| $8.000.000 | Profesional Experto Auditor / ICT | Michael Page |
| $7.925.428 | Director de Desarrollo e Ingeniería Logística | — |
| $7.700.000 | **Ingeniero de datos — sector seguros o financiero** | Recruiting Colombia |
| $7.500.000 | Coordinador de Sistemas | Activos S.A.S |
| $7.000.000 | **Data Engineer Data Technology APPS — bilingüe** | Zemsania Colombia |
| $7.000.000 | **Líder Técnico de Datos** | — |

Patrón evidente: arriba de $7M los títulos son **de liderazgo** (líder, jefe, director, coordinador) o **especializados con nube explícita y bilingüismo**.

---

## 8. Conclusiones accionables

1. **Excel + Power BI + SQL es el pasaporte.** Sin esos tres no entras al 29–42% de las ofertas de este rango. No es negociable.

2. **"Automatización" es la palabra clave subestimada.** Aparece en 27% de las ofertas y casi nadie la trata como habilidad nombrable. Cuantifícala: *"reduje X horas semanales automatizando Y con Python"*.

3. **La IA no paga todavía — pero abre puertas.** 9,9% la menciona de forma aspiracional. Mencionarla suma, especializarse no. Prioriza otra cosa.

4. **Para pasar de $5M: ETL, Python, gobierno de datos y APIs.** Son las que más crecen al subir de rango. Excel *baja* 33 puntos — es el techo, no la palanca.

5. **El inglés vale plata.** 21,4% general y aparece explícito en los títulos mejor pagados ("bilingüe"). Probablemente la inversión con mejor relación esfuerzo/retorno.

6. **Nube: AWS y Azure empatan (9,2%), GCP va muy detrás (3,1%).** Si el objetivo es empleabilidad local, AWS o Azure antes que GCP.

7. **Ignora Snowflake, Databricks, dbt y Airflow para el mercado local.** Entre 0% y 1,5%. Son buenas para tu carrera a largo plazo, no para conseguir empleo en Bogotá hoy.

---

## Limitaciones metodológicas

Para que interpretes los números con la precisión que merecen:

- **La búsqueda de "analista de datos" se cortó en 15 páginas (300 ofertas).** Había más resultados. La de "ingeniero de datos" sí se agotó por completo (197 ofertas, terminó en la página 11).
- **El 33% de ofertas sin salario publicado queda fuera del análisis.** Es posible que las mejor pagadas tiendan a no publicar cifra, lo que sesgaría los resultados hacia abajo.
- **Cuando la oferta publica un rango, se usó el tope.** Una oferta de "$2.800.000 – $3.500.000" cuenta como superior a $3M.
- **La detección es por coincidencia de texto.** "Power BI" mencionado al pasar pesa igual que "dominio avanzado de Power BI". Mide amplitud de demanda, no profundidad.
- **Ambas búsquedas devuelven ruido:** aparecen cargos como "Jefe de ingeniería de Plantas" o "Analista Documental" que Computrabajo asocia a los términos pero no son roles de datos puros.
- **Foto de un solo día.** El mercado rota semanalmente.
