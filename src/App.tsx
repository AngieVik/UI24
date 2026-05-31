import { lazy, Suspense, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useTerminalStore } from '@/stores/useTerminalStore'

// ── Auth / Layout — estáticos (critical path) ──────────────────────────────
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BandejaCanal } from '@/components/layout/BandejaModal'

// ── D.1 Operativa — lazy ───────────────────────────────────────────────────
const PresenciaScreen = lazy(() =>
  import('@/components/operativa/PresenciaScreen').then((m) => ({ default: m.PresenciaScreen }))
)
const VehiculosScreen = lazy(() =>
  import('@/components/operativa/VehiculosScreen').then((m) => ({ default: m.VehiculosScreen }))
)
const Doc6GastoMaterialScreen = lazy(() =>
  import('@/components/operativa/Doc6GastoMaterialScreen').then((m) => ({
    default: m.Doc6GastoMaterialScreen,
  }))
)
const Doc10EnvioMaterialScreen = lazy(() =>
  import('@/components/operativa/Doc10EnvioMaterialScreen').then((m) => ({
    default: m.Doc10EnvioMaterialScreen,
  }))
)
const Doc8ParteTrabajoScreen = lazy(() =>
  import('@/components/operativa/Doc8ParteTrabajoScreen').then((m) => ({
    default: m.Doc8ParteTrabajoScreen,
  }))
)
const Checklist360Screen = lazy(() =>
  import('@/components/operativa/Checklist360Screen').then((m) => ({
    default: m.Checklist360Screen,
  }))
)
const Doc2InformeAsistencialScreen = lazy(() =>
  import('@/components/operativa/Doc2InformeAsistencialScreen').then((m) => ({
    default: m.Doc2InformeAsistencialScreen,
  }))
)
const Doc11AvisoUrgenteScreen = lazy(() =>
  import('@/components/operativa/Doc11AvisoUrgenteScreen').then((m) => ({
    default: m.Doc11AvisoUrgenteScreen,
  }))
)
const RepostajeCombustibleScreen = lazy(() =>
  import('@/components/operativa/RepostajeCombustibleScreen').then((m) => ({
    default: m.RepostajeCombustibleScreen,
  }))
)
const RepostajeAdBlueScreen = lazy(() =>
  import('@/components/operativa/RepostajeAdBlueScreen').then((m) => ({
    default: m.RepostajeAdBlueScreen,
  }))
)
const Doc7InformeAveriaScreen = lazy(() =>
  import('@/components/operativa/Doc7InformeAveriaScreen').then((m) => ({
    default: m.Doc7InformeAveriaScreen,
  }))
)

// ── D.2 DRP — lazy ────────────────────────────────────────────────────────
const VisorDrpScreen = lazy(() =>
  import('@/components/drp/VisorDrpScreen').then((m) => ({ default: m.VisorDrpScreen }))
)
const CrearDrpScreen = lazy(() =>
  import('@/components/drp/CrearDrpScreen').then((m) => ({ default: m.CrearDrpScreen }))
)
const EstadosDrpScreen = lazy(() =>
  import('@/components/drp/EstadosDrpScreen').then((m) => ({ default: m.EstadosDrpScreen }))
)
const OperativaDrpScreen = lazy(() =>
  import('@/components/drp/OperativaDrpScreen').then((m) => ({ default: m.OperativaDrpScreen }))
)
const LogisticaDrpScreen = lazy(() =>
  import('@/components/drp/LogisticaDrpScreen').then((m) => ({ default: m.LogisticaDrpScreen }))
)
const ResumenDrpScreen = lazy(() =>
  import('@/components/drp/ResumenDrpScreen').then((m) => ({ default: m.ResumenDrpScreen }))
)

// ── D.3 Módulos especiales — lazy ─────────────────────────────────────────
const ModuloPsaScreen = lazy(() =>
  import('@/components/especiales/ModuloPsaScreen').then((m) => ({ default: m.ModuloPsaScreen }))
)
const ModuloFiliacionScreen = lazy(() =>
  import('@/components/especiales/ModuloFiliacionScreen').then((m) => ({
    default: m.ModuloFiliacionScreen,
  }))
)

// ── D.4 Logística — lazy ──────────────────────────────────────────────────
const InventarioMaestroScreen = lazy(() =>
  import('@/components/logistica/InventarioMaestroScreen').then((m) => ({
    default: m.InventarioMaestroScreen,
  }))
)
const CatalogoItemsScreen = lazy(() =>
  import('@/components/logistica/CatalogoItemsScreen').then((m) => ({
    default: m.CatalogoItemsScreen,
  }))
)
const DescuadresScreen = lazy(() =>
  import('@/components/logistica/DescuadresScreen').then((m) => ({ default: m.DescuadresScreen }))
)
const StockScreen = lazy(() =>
  import('@/components/logistica/StockScreen').then((m) => ({ default: m.StockScreen }))
)
const MovimientosScreen = lazy(() =>
  import('@/components/logistica/MovimientosScreen').then((m) => ({ default: m.MovimientosScreen }))
)
const Doc9EntradaAlmacenScreen = lazy(() =>
  import('@/components/logistica/Doc9EntradaAlmacenScreen').then((m) => ({
    default: m.Doc9EntradaAlmacenScreen,
  }))
)

// ── D.5 Flota — lazy ──────────────────────────────────────────────────────
const IncidenciasScreen = lazy(() =>
  import('@/components/flota/IncidenciasScreen').then((m) => ({ default: m.IncidenciasScreen }))
)
const VisorMantenimientoScreen = lazy(() =>
  import('@/components/flota/VisorMantenimientoScreen').then((m) => ({
    default: m.VisorMantenimientoScreen,
  }))
)
const MantenimientoFlotaScreen = lazy(() =>
  import('@/components/flota/MantenimientoFlotaScreen').then((m) => ({
    default: m.MantenimientoFlotaScreen,
  }))
)
const VehiculosMetadataScreen = lazy(() =>
  import('@/components/flota/VehiculosMetadataScreen').then((m) => ({
    default: m.VehiculosMetadataScreen,
  }))
)

// ── D.6 Coordinación — lazy ───────────────────────────────────────────────
const ModuloEmergenciasScreen = lazy(() =>
  import('@/components/coordinacion/ModuloEmergenciasScreen').then((m) => ({
    default: m.ModuloEmergenciasScreen,
  }))
)
const DispositivosValidadosScreen = lazy(() =>
  import('@/components/coordinacion/DispositivosValidadosScreen').then((m) => ({
    default: m.DispositivosValidadosScreen,
  }))
)
const VisorSeguimientoScreen = lazy(() =>
  import('@/components/coordinacion/VisorSeguimientoScreen').then((m) => ({
    default: m.VisorSeguimientoScreen,
  }))
)
const RbacScreen = lazy(() =>
  import('@/components/coordinacion/RbacScreen').then((m) => ({ default: m.RbacScreen }))
)
const ForzarCheckoutScreen = lazy(() =>
  import('@/components/coordinacion/ForzarCheckoutScreen').then((m) => ({
    default: m.ForzarCheckoutScreen,
  }))
)
const CambioPasswordScreen = lazy(() =>
  import('@/components/coordinacion/CambioPasswordScreen').then((m) => ({
    default: m.CambioPasswordScreen,
  }))
)

// ── D.7 RRHH — lazy ───────────────────────────────────────────────────────
const FichasEmpleadosScreen = lazy(() =>
  import('@/components/rrhh/FichasEmpleadosScreen').then((m) => ({
    default: m.FichasEmpleadosScreen,
  }))
)
const GestionBajasScreen = lazy(() =>
  import('@/components/rrhh/GestionBajasScreen').then((m) => ({ default: m.GestionBajasScreen }))
)
const CuadrantesScreen = lazy(() =>
  import('@/components/rrhh/CuadrantesScreen').then((m) => ({ default: m.CuadrantesScreen }))
)
const Doc12VacacionesScreen = lazy(() =>
  import('@/components/rrhh/Doc12VacacionesScreen').then((m) => ({
    default: m.Doc12VacacionesScreen,
  }))
)
const ComunicacionScreen = lazy(() =>
  import('@/components/rrhh/ComunicacionScreen').then((m) => ({ default: m.ComunicacionScreen }))
)
const ServiciosScreen = lazy(() =>
  import('@/components/rrhh/ServiciosScreen').then((m) => ({ default: m.ServiciosScreen }))
)
const RepositorioScreen = lazy(() =>
  import('@/components/rrhh/RepositorioScreen').then((m) => ({ default: m.RepositorioScreen }))
)

// ── Modal overlays — lazy ─────────────────────────────────────────────────
const BandejaModal = lazy(() =>
  import('@/components/layout/BandejaModal').then((m) => ({ default: m.BandejaModal }))
)

// ── D.8 Tablón + Buzón — lazy ─────────────────────────────────────────────
const TablonCentralScreen = lazy(() =>
  import('@/components/tablonBuzon/TablonCentralScreen').then((m) => ({
    default: m.TablonCentralScreen,
  }))
)
const BuzonInternoScreen = lazy(() =>
  import('@/components/tablonBuzon/BuzonInternoScreen').then((m) => ({
    default: m.BuzonInternoScreen,
  }))
)

function ScreenFallback() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

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
  const session = useAuthStore((s) => s.session)
  const idTerminal = useTerminalStore((s) => s.id_terminal)
  const setOnline = useGlobalStore((s) => s.setOnline)

  useEffect(() => {
    const onlineHandler = () => setOnline(true)
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
      <>
        <Suspense fallback={<ScreenFallback />}>
          <HomeArea />
        </Suspense>
        <Suspense fallback={null}>
          <ModalArea />
        </Suspense>
      </>
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
  if (selectedLeafId === 'doc6') return <Doc6GastoMaterialScreen />
  if (selectedLeafId === 'doc10_op') return <Doc10EnvioMaterialScreen />
  if (selectedLeafId === 'doc8') return <Doc8ParteTrabajoScreen />
  if (selectedLeafId === 'chk360') return <Checklist360Screen />

  // ── D.1 Documentos clínicos ───────────────────────────────────────────────
  if (selectedLeafId === 'doc2') return <Doc2InformeAsistencialScreen />
  if (selectedLeafId === 'doc11') return <Doc11AvisoUrgenteScreen />

  // ── D.1 Mantenimiento operativa ───────────────────────────────────────────
  if (selectedLeafId === 'fuel') return <RepostajeCombustibleScreen />
  if (selectedLeafId === 'adblue') return <RepostajeAdBlueScreen />
  if (selectedLeafId === 'doc7_op') return <Doc7InformeAveriaScreen />

  // ── D.2 DRP ────────────────────────────────────────────────────────────────
  if (selectedLeafId === 'drp_vis') return <VisorDrpScreen />
  if (selectedLeafId === 'drp_new') return <CrearDrpScreen />
  if (selectedLeafId === 'drp_est') return <EstadosDrpScreen />
  if (selectedLeafId === 'drp_op') return <OperativaDrpScreen />
  if (selectedLeafId === 'drp_log') return <LogisticaDrpScreen />
  // drp_res → opensModal=true, se abre en ModalArea como overlay. No ruta aquí.

  // ── D.3 Módulos especiales ─────────────────────────────────────────────────
  if (selectedLeafId === 'mod_psa') return <ModuloPsaScreen />
  if (selectedLeafId === 'mod_filiacion') return <ModuloFiliacionScreen />

  // ── D.4 Inventario maestro ─────────────────────────────────────────────────
  if (selectedLeafId === 'log_inv_locations') return <InventarioMaestroScreen vista="locations" />
  if (selectedLeafId === 'log_inv_auditoria') return <InventarioMaestroScreen vista="auditorias" />
  if (selectedLeafId === 'log_inv_dinamicos') return <InventarioMaestroScreen vista="dinamicos" />
  if (selectedLeafId === 'log_inv_catalogo') return <CatalogoItemsScreen />
  if (selectedLeafId === 'log_descuadres') return <DescuadresScreen />

  // ── D.4 Stock ──────────────────────────────────────────────────────────────
  if (selectedLeafId === 'log_stock_historial') return <StockScreen vista="historial" />
  if (selectedLeafId === 'log_stock_plantillas') return <StockScreen vista="plantillas" />
  if (selectedLeafId === 'log_stock_gestion') return <StockScreen vista="gestion" />
  if (selectedLeafId === 'log_stock_alertas') return <StockScreen vista="alertas" />

  // ── D.4 Movimientos ────────────────────────────────────────────────────────
  if (selectedLeafId === 'log_mov_ultimos') return <MovimientosScreen vista="ultimos" />
  if (selectedLeafId === 'log_mov_transito') return <MovimientosScreen vista="transito" />
  if (selectedLeafId === 'doc9') return <Doc9EntradaAlmacenScreen />
  if (selectedLeafId === 'doc10_log') return <Doc10EnvioMaterialScreen /> // mismo componente
  // log_bandeja → opensModal=true, se abre en ModalArea. No ruta aquí.

  // ── D.5 Incidencias ────────────────────────────────────────────────────────
  if (selectedLeafId === 'flota_inc_abiertas') return <IncidenciasScreen vista="abiertas" />
  if (selectedLeafId === 'flota_inc_ancladas') return <IncidenciasScreen vista="ancladas" />
  if (selectedLeafId === 'flota_inc_ultimas') return <IncidenciasScreen vista="ultimas" />

  // ── D.5 Visor mantenimiento ────────────────────────────────────────────────
  if (selectedLeafId === 'fvm_tabla') return <VisorMantenimientoScreen vista="tabla" />
  if (selectedLeafId === 'fvm_badges') return <VisorMantenimientoScreen vista="badges" />
  if (selectedLeafId === 'fvm_filtros') return <VisorMantenimientoScreen vista="filtros" />
  if (selectedLeafId === 'fvm_detalle') return <VisorMantenimientoScreen vista="detalle" />

  // ── D.5 Mantenimiento flota ────────────────────────────────────────────────
  if (selectedLeafId === 'flota_mant_aceite') return <MantenimientoFlotaScreen vista="aceite" />
  if (selectedLeafId === 'flota_mant_frenos') return <MantenimientoFlotaScreen vista="frenos" />
  if (selectedLeafId === 'flota_mant_neum') return <MantenimientoFlotaScreen vista="neumaticos" />
  if (selectedLeafId === 'flota_mant_umbrales') return <MantenimientoFlotaScreen vista="umbrales" />
  if (selectedLeafId === 'flota_mant_doc7') return <Doc7InformeAveriaScreen /> // mismo componente

  // ── D.5 Vehículos metadata ─────────────────────────────────────────────────
  if (selectedLeafId === 'fmeta_docs') return <VehiculosMetadataScreen vista="docs" />
  if (selectedLeafId === 'fmeta_km') return <VehiculosMetadataScreen vista="km" />
  if (selectedLeafId === 'fmeta_eventos') return <VehiculosMetadataScreen vista="eventos" />
  // flota_bandeja → opensModal=true, se abre en ModalArea. No ruta aquí.

  // ── D.6 Coordinación — emergencias ────────────────────────────────────────
  if (selectedLeafId === 'emerg_galleta_pq') return <ModuloEmergenciasScreen vista="pq" />
  if (selectedLeafId === 'emerg_galleta') return <ModuloEmergenciasScreen vista="normal" />

  // ── D.6 Coordinación — resto ──────────────────────────────────────────────
  if (selectedLeafId === 'coord_dispositivos') return <DispositivosValidadosScreen />
  if (selectedLeafId === 'coord_visor') return <VisorSeguimientoScreen />
  if (selectedLeafId === 'coord_rbac') return <RbacScreen />
  if (selectedLeafId === 'coord_force_chk') return <ForzarCheckoutScreen />
  if (selectedLeafId === 'coord_password') return <CambioPasswordScreen />
  // coord_bandeja → opensModal=true, se abre en ModalArea. No ruta aquí.

  // ── D.7 RRHH — personal ───────────────────────────────────────────────────
  if (selectedLeafId === 'rrhh_fichas') return <FichasEmpleadosScreen />
  if (selectedLeafId === 'rrhh_bajas') return <GestionBajasScreen />

  // ── D.7 RRHH — planificación laboral ─────────────────────────────────────
  if (selectedLeafId === 'rrhh_servicios') return <ServiciosScreen />
  if (selectedLeafId === 'rrhh_cuadrantes') return <CuadrantesScreen />
  if (selectedLeafId === 'doc12') return <Doc12VacacionesScreen />

  // ── D.7 RRHH — comunicación ───────────────────────────────────────────────
  if (selectedLeafId === 'rrhh_tablon') return <ComunicacionScreen vista="tablon" />
  if (selectedLeafId === 'rrhh_marquesina') return <ComunicacionScreen vista="marquesina" />

  // ── D.7 RRHH — repositorio + bandeja ─────────────────────────────────────
  if (selectedLeafId === 'rrhh_repositorio') return <RepositorioScreen />
  // rrhh_bandeja → opensModal=true, se abre en ModalArea. No ruta aquí.

  // ── D.8 Tablón central + Buzón interno ────────────────────────────────────
  if (selectedLeafId === 'tablon') return <TablonCentralScreen />
  if (selectedLeafId === 'doc13') return <BuzonInternoScreen />

  // ── Placeholder honesto para cualquier hoja no cableada aún ──────────────
  return <LeafPlaceholder leafId={selectedLeafId} />
}

/* ─────────────────────────────────────────────────────────────────────────
 *  ModalArea — renderiza hojas con opensModal=true como Dialog overlay.
 *  El contenido del home_area permanece detrás, sin ser reemplazado.
 *
 *  Bandejas → BandejaModal (self-contained, max-w-md).
 *  drp_res  → Dialog genérico con ResumenDrpScreen dentro.
 * ───────────────────────────────────────────────────────────────────────── */
const BANDEJA_CANAL: Partial<Record<string, BandejaCanal>> = {
  log_bandeja: 'logistica',
  flota_bandeja: 'flota',
  coord_bandeja: 'coordinacion',
  rrhh_bandeja: 'rrhh',
}

function ModalArea() {
  const { modalLeafId, closeModal } = useBlackColumn()

  if (!modalLeafId) return null

  const canal = BANDEJA_CANAL[modalLeafId]
  if (canal) {
    return <BandejaModal open onClose={closeModal} canal={canal} />
  }

  if (modalLeafId === 'drp_res') {
    return (
      <Dialog
        open
        onOpenChange={(v) => {
          if (!v) closeModal()
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-screen-lg overflow-y-auto p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="font-display text-lg font-bold">Resumen DRP</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <ResumenDrpScreen />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}

function LeafPlaceholder({ leafId }: { leafId: string }) {
  const node = findNode(leafId)
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
            <code className="font-medium text-foreground">mapeo_visual_ui.md §3</code>, pero todavía
            no está reconstruida con shadcn/ui + tokens U24.
          </p>
          <p>
            Se implementará en la <strong>Fase D</strong> tras validar el chasis y{' '}
            <code className="font-medium text-foreground">visual_info_home</code>. Orden de Screens
            documentado en{' '}
            <code className="font-medium text-foreground">
              06_operaciones/Hoja de ruta/frontend_reconstruction_roadmap.md
            </code>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
