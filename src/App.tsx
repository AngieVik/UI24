import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useTerminalStore } from '@/stores/useTerminalStore'

// ── Auth / Layout ──────────────────────────────────────────────────────────
import { AutorizarTerminalScreen } from '@/components/auth/AutorizarTerminalScreen'
import { CheckinInicialScreen } from '@/components/auth/CheckinInicialScreen'
import { AppShell } from '@/components/layout/AppShell'
import { VisualInfoHome } from '@/components/layout/VisualInfoHome'
import { useBlackColumn } from '@/contexts/BlackColumnContext'
import { usePersonalEnTurno } from '@/hooks/usePersonalEnTurno'
import { findNode } from '@/components/layout/black-column-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// ── D.1 Operativa ─────────────────────────────────────────────────────────
import { PresenciaScreen } from '@/components/operativa/PresenciaScreen'
import { VehiculosScreen } from '@/components/operativa/VehiculosScreen'
import { Doc6GastoMaterialScreen } from '@/components/operativa/Doc6GastoMaterialScreen'
import { Doc10EnvioMaterialScreen } from '@/components/operativa/Doc10EnvioMaterialScreen'
import { Doc8ParteTrabajoScreen } from '@/components/operativa/Doc8ParteTrabajoScreen'
import { Checklist360Screen } from '@/components/operativa/Checklist360Screen'
import { Doc2InformeAsistencialScreen } from '@/components/operativa/Doc2InformeAsistencialScreen'
import { Doc11AvisoUrgenteScreen } from '@/components/operativa/Doc11AvisoUrgenteScreen'
import { RepostajeCombustibleScreen } from '@/components/operativa/RepostajeCombustibleScreen'
import { RepostajeAdBlueScreen } from '@/components/operativa/RepostajeAdBlueScreen'
import { Doc7InformeAveriaScreen } from '@/components/operativa/Doc7InformeAveriaScreen'

// ── D.2 DRP ────────────────────────────────────────────────────────────────
import { VisorDrpScreen } from '@/components/drp/VisorDrpScreen'
import { CrearDrpScreen } from '@/components/drp/CrearDrpScreen'
import { EstadosDrpScreen } from '@/components/drp/EstadosDrpScreen'
import { OperativaDrpScreen } from '@/components/drp/OperativaDrpScreen'
import { LogisticaDrpScreen } from '@/components/drp/LogisticaDrpScreen'
import { ResumenDrpScreen } from '@/components/drp/ResumenDrpScreen'

// ── D.3 Módulos especiales ─────────────────────────────────────────────────
import { ModuloPsaScreen } from '@/components/especiales/ModuloPsaScreen'
import { ModuloFiliacionScreen } from '@/components/especiales/ModuloFiliacionScreen'

// ── D.4 Logística ──────────────────────────────────────────────────────────
import { InventarioMaestroScreen } from '@/components/logistica/InventarioMaestroScreen'
import { CatalogoItemsScreen } from '@/components/logistica/CatalogoItemsScreen'
import { DescuadresScreen } from '@/components/logistica/DescuadresScreen'
import { StockScreen } from '@/components/logistica/StockScreen'
import { MovimientosScreen } from '@/components/logistica/MovimientosScreen'
import { Doc9EntradaAlmacenScreen } from '@/components/logistica/Doc9EntradaAlmacenScreen'
import { BandejaLogisticaScreen } from '@/components/logistica/BandejaLogisticaScreen'

// ── D.5 Flota ──────────────────────────────────────────────────────────────
import { IncidenciasScreen } from '@/components/flota/IncidenciasScreen'
import { VisorMantenimientoScreen } from '@/components/flota/VisorMantenimientoScreen'
import { MantenimientoFlotaScreen } from '@/components/flota/MantenimientoFlotaScreen'
import { VehiculosMetadataScreen } from '@/components/flota/VehiculosMetadataScreen'
import { BandejaFlotaScreen } from '@/components/flota/BandejaFlotaScreen'

// ── D.6 Coordinación ───────────────────────────────────────────────────────
import { ModuloEmergenciasScreen } from '@/components/coordinacion/ModuloEmergenciasScreen'
import { DispositivosValidadosScreen } from '@/components/coordinacion/DispositivosValidadosScreen'
import { VisorSeguimientoScreen } from '@/components/coordinacion/VisorSeguimientoScreen'
import { RbacScreen } from '@/components/coordinacion/RbacScreen'
import { ForzarCheckoutScreen } from '@/components/coordinacion/ForzarCheckoutScreen'
import { CambioPasswordScreen } from '@/components/coordinacion/CambioPasswordScreen'
import { BandejaCoordScreen } from '@/components/coordinacion/BandejaCoordScreen'

// ── D.7 RRHH ───────────────────────────────────────────────────────────────
import { FichasEmpleadosScreen } from '@/components/rrhh/FichasEmpleadosScreen'
import { GestionBajasScreen } from '@/components/rrhh/GestionBajasScreen'
import { CuadrantesScreen } from '@/components/rrhh/CuadrantesScreen'
import { Doc12VacacionesScreen } from '@/components/rrhh/Doc12VacacionesScreen'
import { ComunicacionScreen } from '@/components/rrhh/ComunicacionScreen'
import { ServiciosScreen } from '@/components/rrhh/ServiciosScreen'
import { RepositorioScreen } from '@/components/rrhh/RepositorioScreen'
import { BandejaRRHHScreen } from '@/components/rrhh/BandejaRRHHScreen'

// ── D.8 Tablón + Buzón ─────────────────────────────────────────────────────
import { TablonCentralScreen } from '@/components/tablonBuzon/TablonCentralScreen'
import { BuzonInternoScreen } from '@/components/tablonBuzon/BuzonInternoScreen'

/**
 * Punto de entrada — TRES estados.
 *
 *   estado_0a — terminal sin autorizar (sin sesión Supabase
 *               o sin id_terminal en cliente) → <AutorizarTerminalScreen />
 *
 *   estado_0b — terminal autorizado pero sin presencias activas
 *               (presencias_activas_terminal vacía para este terminal)
 *               → <CheckinInicialScreen />
 *
 *   estado_1  — terminal con sesión + al menos un trabajador presente
 *               → <AppShell> con routing por selectedLeafId
 *
 * La sesión Supabase es del TERMINAL (usuario máquina
 * terminal_<fp>@u24.local) y persiste indefinidamente. Los
 * trabajadores entran/salen sin tocar la sesión.
 */
export default function App() {
  const session    = useAuthStore((s) => s.session)
  const idTerminal = useTerminalStore((s) => s.id_terminal)
  const setOnline  = useGlobalStore((s) => s.setOnline)

  useEffect(() => {
    const onlineHandler  = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
    }
  }, [setOnline])

  // estado_0a — sin sesión o sin id_terminal
  if (!session || !idTerminal) {
    return <AutorizarTerminalScreen />
  }

  // estado_0b / estado_1 dependen de si hay presencias
  return <RouterPresencias />
}

/**
 * Decide entre CheckinInicialScreen (estado_0b) y AppShell (estado_1)
 * según haya o no personal en turno en este terminal.
 */
function RouterPresencias() {
  const personal = usePersonalEnTurno()

  // Primer pintado: mientras carga la primera vez, mostramos skeleton
  // para no parpadear entre estados.
  if (personal.isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center p-6" aria-busy="true">
        <Skeleton className="h-32 w-72" />
      </main>
    )
  }

  if (personal.data.length === 0) {
    return <CheckinInicialScreen />
  }

  return (
    <AppShell ticker="Tablón · BlackColumn drill-down activo · pulsa los grupos para entrar, pulsa el padre activo o el botón de atrás para volver.">
      <HomeArea />
    </AppShell>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
 *  HomeArea — lee selectedLeafId del Context y rutea al Screen correcto.
 *
 *  Orden de rutas:
 *    1. Home / check-in fijos
 *    2. D.1 Operativa
 *    3. D.2 DRP
 *    4. D.3 Módulos especiales
 *    5. D.4 Logística
 *    6. D.5 Flota
 *    7. D.6 Coordinación y seguridad
 *    8. D.7 Gestión y RRHH
 *    9. D.8 Tablón central + Buzón interno
 *   10. Placeholder honesto para hojas aún no implementadas
 * ───────────────────────────────────────────────────────────────────────── */
function HomeArea() {
  const { selectedLeafId, goCheckin } = useBlackColumn()

  // ── Home ──────────────────────────────────────────────────────────────────
  if (selectedLeafId === 'home' || selectedLeafId == null) {
    return <VisualInfoHome onGoCheckin={goCheckin} />
  }

  // ── D.1 Check-in / Check-out ──────────────────────────────────────────────
  if (selectedLeafId === 'checkin') {
    return <PresenciaScreen />
  }

  // ── D.1 Vehículos ──────────────────────────────────────────────────────────
  if (selectedLeafId === 'vehiculos_op') {
    return <VehiculosScreen />
  }

  // ── D.1 Operativas rutinarias ─────────────────────────────────────────────
  if (selectedLeafId === 'doc6')     return <Doc6GastoMaterialScreen />
  if (selectedLeafId === 'doc10_op') return <Doc10EnvioMaterialScreen />
  if (selectedLeafId === 'doc8')     return <Doc8ParteTrabajoScreen />
  if (selectedLeafId === 'chk360')   return <Checklist360Screen />

  // ── D.1 Documentos clínicos ───────────────────────────────────────────────
  if (selectedLeafId === 'doc2')  return <Doc2InformeAsistencialScreen />
  if (selectedLeafId === 'doc11') return <Doc11AvisoUrgenteScreen />

  // ── D.1 Mantenimiento operativa ───────────────────────────────────────────
  if (selectedLeafId === 'fuel')    return <RepostajeCombustibleScreen />
  if (selectedLeafId === 'adblue')  return <RepostajeAdBlueScreen />
  if (selectedLeafId === 'doc7_op') return <Doc7InformeAveriaScreen />

  // ── D.2 DRP ────────────────────────────────────────────────────────────────
  if (selectedLeafId === 'drp_vis') return <VisorDrpScreen />
  if (selectedLeafId === 'drp_new') return <CrearDrpScreen />
  if (selectedLeafId === 'drp_est') return <EstadosDrpScreen />
  if (selectedLeafId === 'drp_op')  return <OperativaDrpScreen />
  if (selectedLeafId === 'drp_log') return <LogisticaDrpScreen />
  if (selectedLeafId === 'drp_res') return <ResumenDrpScreen />

  // ── D.3 Módulos especiales ─────────────────────────────────────────────────
  if (selectedLeafId === 'mod_psa')       return <ModuloPsaScreen />
  if (selectedLeafId === 'mod_filiacion') return <ModuloFiliacionScreen />

  // ── D.4 Inventario maestro ─────────────────────────────────────────────────
  if (selectedLeafId === 'log_inv_locations') return <InventarioMaestroScreen vista="locations" />
  if (selectedLeafId === 'log_inv_auditoria') return <InventarioMaestroScreen vista="auditorias" />
  if (selectedLeafId === 'log_inv_dinamicos') return <InventarioMaestroScreen vista="dinamicos" />
  if (selectedLeafId === 'log_inv_catalogo')  return <CatalogoItemsScreen />
  if (selectedLeafId === 'log_descuadres')    return <DescuadresScreen />

  // ── D.4 Stock ──────────────────────────────────────────────────────────────
  if (selectedLeafId === 'log_stock_historial')  return <StockScreen vista="historial" />
  if (selectedLeafId === 'log_stock_plantillas') return <StockScreen vista="plantillas" />
  if (selectedLeafId === 'log_stock_gestion')    return <StockScreen vista="gestion" />
  if (selectedLeafId === 'log_stock_alertas')    return <StockScreen vista="alertas" />

  // ── D.4 Movimientos ────────────────────────────────────────────────────────
  if (selectedLeafId === 'log_mov_ultimos')  return <MovimientosScreen vista="ultimos" />
  if (selectedLeafId === 'log_mov_transito') return <MovimientosScreen vista="transito" />
  if (selectedLeafId === 'doc9')             return <Doc9EntradaAlmacenScreen />
  if (selectedLeafId === 'doc10_log')        return <Doc10EnvioMaterialScreen />  // mismo componente
  if (selectedLeafId === 'log_bandeja')      return <BandejaLogisticaScreen />

  // ── D.5 Incidencias ────────────────────────────────────────────────────────
  if (selectedLeafId === 'flota_inc_abiertas') return <IncidenciasScreen vista="abiertas" />
  if (selectedLeafId === 'flota_inc_ancladas') return <IncidenciasScreen vista="ancladas" />
  if (selectedLeafId === 'flota_inc_ultimas')  return <IncidenciasScreen vista="ultimas" />

  // ── D.5 Visor mantenimiento ────────────────────────────────────────────────
  if (selectedLeafId === 'fvm_tabla')   return <VisorMantenimientoScreen vista="tabla" />
  if (selectedLeafId === 'fvm_badges')  return <VisorMantenimientoScreen vista="badges" />
  if (selectedLeafId === 'fvm_filtros') return <VisorMantenimientoScreen vista="filtros" />
  if (selectedLeafId === 'fvm_detalle') return <VisorMantenimientoScreen vista="detalle" />

  // ── D.5 Mantenimiento flota ────────────────────────────────────────────────
  if (selectedLeafId === 'flota_mant_aceite')    return <MantenimientoFlotaScreen vista="aceite" />
  if (selectedLeafId === 'flota_mant_frenos')    return <MantenimientoFlotaScreen vista="frenos" />
  if (selectedLeafId === 'flota_mant_neum')      return <MantenimientoFlotaScreen vista="neumaticos" />
  if (selectedLeafId === 'flota_mant_umbrales')  return <MantenimientoFlotaScreen vista="umbrales" />
  if (selectedLeafId === 'flota_mant_doc7')      return <Doc7InformeAveriaScreen />  // mismo componente

  // ── D.5 Vehículos metadata ─────────────────────────────────────────────────
  if (selectedLeafId === 'fmeta_docs')    return <VehiculosMetadataScreen vista="docs" />
  if (selectedLeafId === 'fmeta_km')      return <VehiculosMetadataScreen vista="km" />
  if (selectedLeafId === 'fmeta_eventos') return <VehiculosMetadataScreen vista="eventos" />
  if (selectedLeafId === 'flota_bandeja') return <BandejaFlotaScreen />

  // ── D.6 Coordinación — emergencias ────────────────────────────────────────
  if (selectedLeafId === 'emerg_galleta_pq') return <ModuloEmergenciasScreen vista="pq" />
  if (selectedLeafId === 'emerg_galleta')    return <ModuloEmergenciasScreen vista="normal" />

  // ── D.6 Coordinación — resto ──────────────────────────────────────────────
  if (selectedLeafId === 'coord_dispositivos') return <DispositivosValidadosScreen />
  if (selectedLeafId === 'coord_visor')        return <VisorSeguimientoScreen />
  if (selectedLeafId === 'coord_rbac')         return <RbacScreen />
  if (selectedLeafId === 'coord_force_chk')    return <ForzarCheckoutScreen />
  if (selectedLeafId === 'coord_password')     return <CambioPasswordScreen />
  if (selectedLeafId === 'coord_bandeja')      return <BandejaCoordScreen />

  // ── D.7 RRHH — personal ───────────────────────────────────────────────────
  if (selectedLeafId === 'rrhh_fichas') return <FichasEmpleadosScreen />
  if (selectedLeafId === 'rrhh_bajas')  return <GestionBajasScreen />

  // ── D.7 RRHH — planificación laboral ─────────────────────────────────────
  if (selectedLeafId === 'rrhh_servicios')  return <ServiciosScreen />
  if (selectedLeafId === 'rrhh_cuadrantes') return <CuadrantesScreen />
  if (selectedLeafId === 'doc12')           return <Doc12VacacionesScreen />

  // ── D.7 RRHH — comunicación ───────────────────────────────────────────────
  if (selectedLeafId === 'rrhh_tablon')     return <ComunicacionScreen vista="tablon" />
  if (selectedLeafId === 'rrhh_marquesina') return <ComunicacionScreen vista="marquesina" />

  // ── D.7 RRHH — repositorio + bandeja ─────────────────────────────────────
  if (selectedLeafId === 'rrhh_repositorio') return <RepositorioScreen />
  if (selectedLeafId === 'rrhh_bandeja')     return <BandejaRRHHScreen />

  // ── D.8 Tablón central + Buzón interno ────────────────────────────────────
  if (selectedLeafId === 'tablon') return <TablonCentralScreen />
  if (selectedLeafId === 'doc13')  return <BuzonInternoScreen />

  // ── Placeholder honesto para cualquier hoja no cableada aún ──────────────
  return <LeafPlaceholder leafId={selectedLeafId} />
}

function LeafPlaceholder({ leafId }: { leafId: string }) {
  const node  = findNode(leafId)
  const label = node?.label ?? leafId

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="font-display text-lg">{label}</CardTitle>
          <Badge variant="outline">Fase D — pendiente</Badge>
        </CardHeader>
        <CardContent className="space-y-2 font-body text-base font-light text-muted-foreground">
          <p>
            Esta vista forma parte del terminal y está documentada en{' '}
            <code className="font-medium text-foreground">mapeo_visual_ui.md §3</code>,
            pero todavía no está reconstruida con shadcn/ui + tokens U24.
          </p>
          <p>
            Se implementará en la <strong>Fase D</strong> tras validar el chasis
            y <code className="font-medium text-foreground">visual_info_home</code>. Orden de Screens documentado en{' '}
            <code className="font-medium text-foreground">
              06_operaciones/Hoja de ruta/frontend_reconstruction_roadmap.md
            </code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
