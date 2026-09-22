import * as React from "react"
import { CircleAlertIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { AsistenteFinanzas } from "@/components/finanzas/asistente-finanzas"
import { DatosDelPeriodo } from "@/components/finanzas/datos-periodo"
import {
  datosPeriodo,
  describirComparacion,
  describirPeriodo,
  filtrarAnterior,
  filtrarConcepto,
  filtrarPeriodo,
  opcionesDeConcepto,
  PERIODOS,
  RUTA_API,
  RUTAS_FINANZAS,
  serieTemporal,
  totales,
  type Movimiento,
  type Periodo,
} from "@/components/finanzas/finanzas"
import { FiltroConcepto } from "@/components/finanzas/filtro-concepto"
import { FinanzasShell } from "@/components/finanzas/finanzas-shell"
import { GastosPorConcepto } from "@/components/finanzas/gastos-por-concepto"
import { GraficaDistribucion } from "@/components/finanzas/grafica-distribucion"
import { GraficaEvolucion } from "@/components/finanzas/grafica-evolucion"
import { TablaMovimientos } from "@/components/finanzas/tabla-movimientos"
import { TarjetasResumen } from "@/components/finanzas/tarjetas-resumen"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
  const [periodo, setPeriodo] = React.useState<Periodo>("mes")
  const [concepto, setConcepto] = React.useState<string | null>(null)

  // Las opciones salen de todos los datos, no del periodo: un concepto sin
  // movimientos este mes sigue apareciendo en la lista.
  const opciones = React.useMemo(() => opcionesDeConcepto(data ?? []), [data])

  const calculos = React.useMemo(() => {
    if (!data) return null
    // Primero el concepto y después el periodo: así la comparación con el
    // periodo anterior también es solo de ese concepto.
    const delConcepto = filtrarConcepto(data, concepto)
    const movimientos = filtrarPeriodo(delConcepto, periodo)
    const anteriores = filtrarAnterior(delConcepto, periodo)
    return {
      movimientos,
      resumen: totales(movimientos),
      resumenAnterior: anteriores ? totales(anteriores) : null,
      serie: serieTemporal(movimientos, periodo),
      datos: datosPeriodo(movimientos, periodo),
    }
  }, [data, periodo, concepto])

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
              {describirPeriodo(periodo)}
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
                if (valores[0]) setPeriodo(valores[0] as Periodo)
              }}
              aria-label="Periodo"
              className="w-full lg:w-fit"
            >
              {PERIODOS.map((p) => (
                <ToggleGroupItem
                  key={p.valor}
                  value={p.valor}
                  className="flex-1 lg:flex-none"
                >
                  {p.etiqueta}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
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
          <TarjetasResumen
            actual={calculos?.resumen ?? null}
            anterior={calculos?.resumenAnterior ?? null}
            comparacion={describirComparacion(periodo)}
          />
        </section>

        <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <GraficaEvolucion
            serie={calculos?.serie ?? null}
            porDia={periodo === "mes"}
          />
          <GraficaDistribucion resumen={calculos?.resumen ?? null} />
        </div>

        <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0 lg:col-span-2 xl:col-span-1">
            <AsistenteFinanzas />
          </div>
          <GastosPorConcepto
            movimientos={calculos?.movimientos ?? null}
            onElegir={setConcepto}
          />
          <DatosDelPeriodo datos={calculos?.datos ?? null} />
        </div>

        <TablaMovimientos
          movimientos={calculos?.movimientos ?? null}
          cargando={cargando && data !== null}
        />
      </div>
    </FinanzasShell>
  )
}

export default DashboardGastosPage
