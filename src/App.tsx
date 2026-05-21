import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { LoginScreen } from '@/components/auth/LoginScreen'
import { EstadoEspera } from '@/components/auth/EstadoEspera'
import { StepUpModal } from '@/components/auth/StepUpModal'
import { AppShell } from '@/components/layout/AppShell'
import { VehiclePickerScreen } from '@/components/flota/VehiclePickerScreen'
import { ChecklistScreen } from '@/components/flota/ChecklistScreen'
import { InventarioScreen } from '@/components/operativa/InventarioScreen'
import { SalaEsperaScreen } from '@/components/operativa/SalaEsperaScreen'
import { InformesScreen } from '@/components/operativa/InformesScreen'

export default function App() {
  const session = useAuthStore((s) => s.session)
  const setOnline = useGlobalStore((s) => s.setOnline)
  const [activeNav, setActiveNav] = useState('home')

  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const checklistCerrado = useActivacionStore((s) => s.checklistCerrado)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  if (!session) {
    return <LoginScreen />
  }

  if (!idActivacion) {
    return (
      <>
        <VehiclePickerScreen />
        <StepUpModal />
      </>
    )
  }

  if (!checklistCerrado) {
    return (
      <>
        <ChecklistScreen />
        <StepUpModal />
      </>
    )
  }

  function renderContent() {
    switch (activeNav) {
      case 'doc6':    return <InventarioScreen />
      case 'drp_op':  return <SalaEsperaScreen />
      case 'doc2':    return <InformesScreen />
      default:        return <EstadoEspera />
    }
  }

  return (
    <>
      <AppShell activeNav={activeNav} onNavSelect={setActiveNav}>
        {renderContent()}
      </AppShell>
      <StepUpModal />
    </>
  )
}
