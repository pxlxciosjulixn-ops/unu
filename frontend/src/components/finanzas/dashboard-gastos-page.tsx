import * as React from "react"
import { CircleAlertIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import { Link } from "react-router-dom"

import {
  acumuladoComparado,
  calendario,
  desdeElPrimero,
  fueraDeLoNormal,
  historialConcepto,
  mapaDeGrupos,
  mesActual,
  moverMes,
  nombreMesLargo,
  porDiaSemana,
  presupuestos,
  promedioMeses,
  proyeccion,
  recurrentes,
  resumenPorMes,
} from "@/components/finanzas/analisis"
import { AsistenteFinanzas } from "@/components/finanzas/asistente-finanzas"
import { BotonExportar } from "@/components/finanzas/boton-exportar"
import { CompararMeses } from "@/components/finanzas/comparar-meses"
import { RUTA_API_CREDITOS, type Credito } from "@/components/finanzas/creditos"
import { DatosDelPeriodo } from "@/components/finanzas/datos-periodo"
import {
  compararConcepto,
  datosPeriodo,
  describirComparacion,
  describirPeriodo,
  esPorDia,
  filtrarAnterior,
  filtrarConcepto,
  conSaldoAnterior,
  filtrarPeriodo,
  hoyISO,
  iniciosDe,
  mesesConMovimientos,
  nombreMes,
  opcionesDeConcepto,
  PERIODOS,
  RUTA_API,
  RUTAS_FINANZAS,
  serieTemporal,
  totales,
  type Filtro,
  type Movimiento,
  type Periodo,
} from "@/components/finanzas/finanzas"
import { FiltroConcepto } from "@/components/finanzas/filtro-concepto"
import { FinanzasShell } from "@/components/finanzas/finanzas-shell"
import { GastosPorConcepto } from "@/components/finanzas/gastos-por-concepto"
import { GraficaDistribucion } from "@/components/finanzas/grafica-distribucion"
import { GraficaEvolucion } from "@/components/finanzas/grafica-evolucion"
import {
  CalendarioCalor,
  GraficaAcumulado,
  GraficaAhorro,
  GraficaDiaSemana,
  GraficaGrupos,
  HistorialConcepto,
} from "@/components/finanzas/graficas-historial"
import {
  FamiliaMascotas,
  FueraDeLoNormal,
  ListaRecurrentes,
} from "@/components/finanzas/listas-analisis"
import { PanelDeudas } from "@/components/finanzas/panel-deudas"
import {
  Presupuestos,
  ProyeccionMes,
} from "@/components/finanzas/proyeccion-presupuestos"
import { TablaMovimientos } from "@/components/finanzas/tabla-movimientos"
import { TarjetasConcepto } from "@/components/finanzas/tarjetas-concepto"
import { TarjetasResumen } from "@/components/finanzas/tarjetas-resumen"
import { useSugerencias } from "@/components/finanzas/use-sugerencias"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useApi } from "@/hooks/use-api"

/**
 * Página suelta: /dashboard/gastos/julian/palacios.
 *
 * Pública pero sin enlazar desde el resto del sitio; solo el formulario
 * apunta aquí. Todo se calcula en el navegador a partir de la lista completa
 * de movimientos.
 */
export function DashboardGastosPage() {
  const { data, error, cargando, recargar } = useApi<Movimiento[]>(RUTA_API)
  const { sugerencias: listaSugerencias, nombres: sugerencias } =
    useSugerencias()
  const [periodo, setPeriodo] = React.useState<Periodo | "fechas">("mes")
  const [mes, setMes] = React.useState(() => hoyISO().slice(0, 7))
  const [concepto, setConcepto] = React.useState<string | null>(null)
  const [medida, setMedida] = React.useState<"gastos" | "balance">("gastos")
  const { data: creditos } = useApi<Credito[]>(RUTA_API_CREDITOS)

  // Solo los meses con algo anotado; el mes en curso siempre está, aunque
  // todavía no tenga nada.
  const meses = React.useMemo(() => {
    const conDatos = mesesConMovimientos(data ?? [])
    const actual = hoyISO().slice(0, 7)
    return conDatos.includes(actual) ? conDatos : [actual, ...conDatos]
  }, [data])

  const filtro = React.useMemo<Filtro>(
    () => (periodo === "fechas" ? { mes } : periodo),
    [periodo, mes]
  )

  // Las opciones salen de todos los datos, no del periodo: un concepto sin
  // movimientos este mes sigue apareciendo en la lista.
  const opciones = React.useMemo(
    () => opcionesDeConcepto(data ?? [], sugerencias),
    [data, sugerencias]
  )

  const calculos = React.useMemo(() => {
    if (!data) return null
    // Primero el concepto y después el periodo: así la comparación con el
    // periodo anterior también es solo de ese concepto.
    const delConcepto = filtrarConcepto(data, concepto)
    // Lo que sobró de antes entra como ingreso automático del primer día. Con
    // un concepto elegido no: ese saldo no es de ningún concepto.
    const inicios = iniciosDe(filtro)
    const conSaldo = (lista: Movimiento[], desde: string | null) =>
      concepto ? lista : conSaldoAnterior(lista, data, desde)
    const movimientos = conSaldo(
      filtrarPeriodo(delConcepto, filtro),
      inicios.actual
    )
    const crudosAnteriores = filtrarAnterior(delConcepto, filtro)
    const anteriores =
      crudosAnteriores && conSaldo(crudosAnteriores, inicios.anterior)
    // El periodo entero, sin el filtro: con un concepto elegido, sus propios
    // ingresos suelen ser cero y es contra esto que hay que medirlo.
    const todos = concepto
      ? filtrarPeriodo(data, filtro)
      : movimientos.filter((m) => !m.automatico)
    return {
      movimientos,
      todos,
      // Ingresos y balance cuentan el saldo de antes; el % de ahorro no, que
      // mide qué parte de lo que entró en el periodo quedó sin gastar.
      resumen: {
        ...totales(movimientos),
        ahorroPct: totales(movimientos.filter((m) => !m.automatico)).ahorroPct,
      },
      resumenAnterior: anteriores ? totales(anteriores) : null,
      comparacion: concepto
        ? compararConcepto(movimientos, todos, concepto)
        : null,
      serie: serieTemporal(movimientos, filtro),
      datos: datosPeriodo(movimientos, filtro),
    }
  }, [data, filtro, concepto])

  // Los presupuestos son de un mes: el que se esté mirando, o el actual si
  // arriba hay un tramo más largo.
  const mesPresupuesto =
    periodo === "fechas"
      ? mes
      : periodo === "anterior"
        ? moverMes(mesActual(), 1)
        : mesActual()

  // El análisis mira todo el historial, sin el periodo ni el concepto de
  // arriba: tendencias, deudas y lo que se repite necesitan los meses de antes.
  const analisis = React.useMemo(() => {
    if (!data) return null
    const mapa = mapaDeGrupos(listaSugerencias)
    const recs = recurrentes(data)
    return {
      mapa,
      recs,
      meses: desdeElPrimero(resumenPorMes(data, mapa, 12), data),
      proyeccion: proyeccion(data, recs),
      promedio: promedioMeses(data),
      anomalias: fueraDeLoNormal(data),
      calendario: calendario(data, 26),
      diaSemana: porDiaSemana(data, recs),
    }
  }, [data, listaSugerencias])

  const estadosPresupuesto = React.useMemo(
    () =>
      data && listaSugerencias
        ? presupuestos(data, listaSugerencias, mesPresupuesto)
        : null,
    [data, listaSugerencias, mesPresupuesto]
  )
  const acumulado = React.useMemo(
    () => (data ? acumuladoComparado(data, medida) : null),
    [data, medida]
  )
  const historial = React.useMemo(
    () => (data && concepto ? historialConcepto(data, concepto) : null),
    [data, concepto]
  )

  return (
    <FinanzasShell
      titulo="Dashboard"
      acciones={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={recargar}
            disabled={cargando}
            aria-label="Actualizar datos"
          >
            <RefreshCwIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
          <BotonExportar />
          <Button
            size="sm"
            nativeButton={false}
            render={<Link to={RUTAS_FINANZAS.formulario} />}
          >
            <PlusIcon data-icon="inline-start" />
            Registrar
          </Button>
        </>
      }
    >
      <title>Mis finanzas</title>

      <div className="flex min-w-0 flex-col gap-4 p-4 pb-10 sm:gap-6 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Mis finanzas
            </h1>
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {describirPeriodo(filtro)}
              {concepto ? ` · solo ${concepto}` : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <FiltroConcepto
              valor={concepto}
              opciones={opciones}
              onChange={setConcepto}
            />
            <ToggleGroup
              variant="outline"
              size="sm"
              spacing={0}
              value={[periodo]}
              onValueChange={(valores: string[]) => {
                if (valores[0]) setPeriodo(valores[0] as Periodo | "fechas")
              }}
              aria-label="Periodo"
              className="w-full lg:w-fit"
            >
              {PERIODOS.map((p) => (
                <ToggleGroupItem
                  key={p.valor}
                  value={p.valor}
                  className="flex-1 px-1 text-xs sm:px-2.5 sm:text-[0.8rem] lg:flex-none"
                >
                  {p.etiqueta}
                </ToggleGroupItem>
              ))}
              <ToggleGroupItem
                value="fechas"
                className="flex-1 px-1 text-xs sm:px-2.5 sm:text-[0.8rem] lg:flex-none"
              >
                Fechas
              </ToggleGroupItem>
            </ToggleGroup>
            {periodo === "fechas" ? (
              <Select
                value={mes}
                onValueChange={(valor: string | null) => {
                  if (valor) setMes(valor)
                }}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Mes"
                  className="w-full lg:w-48"
                >
                  <SelectValue>
                    {(valor) => (
                      <span className="first-letter:uppercase">
                        {nombreMes(String(valor))}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {meses.map((m) => (
                    <SelectItem key={m} value={m}>
                      <span className="first-letter:uppercase">
                        {nombreMes(m)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertTitle>No se pudieron cargar los movimientos</AlertTitle>
            <AlertDescription>
              Puede que el servidor esté despertando. Vuelve a intentarlo.
            </AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={recargar}>
                Reintentar
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        <section id="resumen" className="scroll-mt-20">
          {/* Con un concepto elegido las cuatro cifras de siempre no dicen
              nada (ingresos en cero, ahorro en "—"): en su lugar va cuánto
              pesa ese concepto dentro del periodo. */}
          {concepto ? (
            <TarjetasConcepto
              comparacion={calculos?.comparacion ?? null}
              anterior={calculos?.resumenAnterior ?? null}
              descripcionComparacion={describirComparacion(filtro)}
            />
          ) : (
            <TarjetasResumen
              actual={calculos?.resumen ?? null}
              anterior={calculos?.resumenAnterior ?? null}
              comparacion={describirComparacion(filtro)}
              promedio={esPorDia(filtro) ? analisis?.promedio : null}
            />
          )}
        </section>

        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
          <ProyeccionMes datos={analisis?.proyeccion ?? null} />
          <Presupuestos
            estados={estadosPresupuesto}
            mes={nombreMesLargo(mesPresupuesto)}
          />
        </div>

        {/* La evolución va sola, a todo el ancho: con muchos días o meses se
            lee mucho mejor que en dos tercios. */}
        <GraficaEvolucion
          serie={calculos?.serie ?? null}
          porDia={esPorDia(filtro)}
          concepto={concepto}
        />

        {concepto ? (
          <HistorialConcepto concepto={concepto} meses={historial} />
        ) : null}

        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
          <GraficaDistribucion
            resumen={calculos?.resumen ?? null}
            comparacion={calculos?.comparacion ?? null}
          />
          <div className="min-w-0">
            <AsistenteFinanzas />
          </div>
        </div>

        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
          <GastosPorConcepto
            movimientos={calculos?.todos ?? null}
            activo={concepto}
            onElegir={setConcepto}
          />
          <DatosDelPeriodo datos={calculos?.datos ?? null} />
        </div>

        <div className="mt-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Análisis del historial
          </h2>
          <p className="text-sm text-muted-foreground">
            Todos los meses, sin el periodo ni el concepto de arriba.
          </p>
        </div>

        <PanelDeudas
          meses={analisis?.meses ?? null}
          movimientos={data}
          mapa={analisis?.mapa ?? mapaDeGrupos(null)}
          creditos={creditos}
        />

        <GraficaGrupos meses={analisis?.meses ?? null} />

        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
          <GraficaAhorro meses={analisis?.meses ?? null} />
          <GraficaAcumulado
            datos={acumulado}
            medida={medida}
            onMedida={setMedida}
          />
        </div>

        <CalendarioCalor datos={analisis?.calendario ?? null} />

        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
          <GraficaDiaSemana datos={analisis?.diaSemana ?? null} />
          <FamiliaMascotas meses={analisis?.meses ?? null} />
        </div>

        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
          <ListaRecurrentes datos={analisis?.recs ?? null} />
          <FueraDeLoNormal datos={analisis?.anomalias ?? null} />
        </div>

        <CompararMeses movimientos={data} meses={meses} />

        <TablaMovimientos
          movimientos={calculos?.movimientos ?? null}
          cargando={cargando && data !== null}
        />
      </div>
    </FinanzasShell>
  )
}

export default DashboardGastosPage
