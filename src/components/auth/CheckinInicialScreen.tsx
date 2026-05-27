import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, FlaskConical, LogIn, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCheckinTrabajador } from '@/hooks/useCheckinTrabajador'
import { useAbrirTurno } from '@/hooks/useAbrirTurno'
import { useGlobalStore } from '@/stores/useGlobalStore'
import { useTerminalStore } from '@/stores/useTerminalStore'
import logoUrl from '@/assets/logo.svg'

const schema = z.object({
  identificador: z.string().min(1, 'Identificador requerido'),
  password:      z.string().min(8, 'Mínimo 8 caracteres'),
})
type Schema = z.infer<typeof schema>

const APP_VERSION = (typeof window !== 'undefined' && (window as { __APP_VERSION__?: string }).__APP_VERSION__) || '0.1.0'

/**
 * CheckinInicialScreen — estado_0b.
 *
 * Aparece cuando el terminal está autorizado (sesión Supabase del
 * usuario máquina activa) pero NO hay presencias en
 * `presencias_activas_terminal`. Cualquier trabajador autorizado
 * introduce sus credenciales para hacer check-in.
 *
 * La sesión Supabase del terminal NO se ve afectada por el check-in.
 *
 * Una vez completado el check-in, App.tsx detecta que
 * `personal.length > 0` y pasa al estado_1 (AppShell).
 */
export function CheckinInicialScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const { checkin, isSubmitting, error }   = useCheckinTrabajador()
  const { abrir, isSubmitting: abriendo } = useAbrirTurno()
  const isOnline   = useGlobalStore((s) => s.isOnline)
  const idTerminal = useTerminalStore((s) => s.id_terminal)

  const isBusy = isSubmitting || abriendo

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { identificador: '', password: '' },
    mode: 'onBlur',
  })

  async function onSubmit(values: Schema) {
    const id_nombre = values.identificador.trim()
    const res = await checkin({ id_nombre, password: values.password })
    if (!res) return
    // Open the shift Doc-8 for this worker
    await abrir({ id_nombre })
  }

  return (
    <main
      className="grid min-h-dvh place-items-center bg-background p-6"
      role="main"
      aria-label="Check-in del trabajador"
    >
      <div className="flex w-full max-w-[360px] flex-col items-center gap-5">
        <img src={logoUrl} alt="U24 Servicios Sanitarios" className="h-24 w-auto" />

        <Card className="w-full">
          <CardContent className="space-y-4 p-6">
            <header className="space-y-1">
              <h1 className="flex items-center gap-2 font-display text-xl font-bold leading-tight">
                <LogIn aria-hidden="true" className="size-5" />
                Check-in al turno
              </h1>
              <p className="font-body text-base font-light text-muted-foreground">
                El terminal está listo. Cualquier trabajador (TES, DUE, médico,
                flota, coordinación…) introduce sus credenciales para abrir su turno.
              </p>
            </header>

            {!isOnline && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-base text-destructive"
              >
                <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>Sin conexión. El check-in requiere red.</span>
              </div>
            )}

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
              aria-label="Formulario de check-in"
              noValidate
            >
              <Controller
                control={form.control}
                name="identificador"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="checkin-identificador">Identificador</FieldLabel>
                    <Input
                      {...field}
                      id="checkin-identificador"
                      autoComplete="username"
                      aria-invalid={fieldState.invalid}
                      disabled={isSubmitting || !isOnline}
                    />
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="checkin-password">Contraseña</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="checkin-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        aria-invalid={fieldState.invalid}
                        disabled={isSubmitting || !isOnline}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword
                          ? <EyeOff aria-hidden="true" className="size-4" />
                          : <Eye   aria-hidden="true" className="size-4" />}
                      </button>
                    </div>
                    {fieldState.error && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
                {error}
              </div>

              <Button type="submit" className="w-full" disabled={isBusy || !isOnline}>
                {isBusy ? 'Verificando…' : 'Hacer check-in'}
              </Button>
            </form>

            {/* ── Bypass de desarrollo — eliminar al cerrar Fase E (D-01) ── */}
            {import.meta.env.DEV && (
              <>
                <div className="flex items-center gap-2 pt-1">
                  <Separator className="flex-1" />
                  <span className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">
                    Solo desarrollo
                  </span>
                  <Separator className="flex-1" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={async () => {
                    const res = await checkin({ id_nombre: 'admin', password: '12345678' })
                    if (res) await abrir({ id_nombre: 'admin' })
                  }}
                  disabled={isBusy || !isOnline}
                >
                  <FlaskConical aria-hidden="true" className="size-4" />
                  Acceso dev (admin/12345678)
                </Button>
                <p className="font-body text-[11px] font-light text-muted-foreground">
                  Atajo de desarrollo: check-in directo con{' '}
                  <code className="font-medium text-foreground">admin</code>.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <p className="font-body text-xs font-light text-muted-foreground">
          U24 Servicios Sanitarios · v{APP_VERSION}
          {idTerminal && (
            <>
              {' · '}terminal <span className="font-medium text-foreground">{idTerminal.slice(0, 8)}</span>
            </>
          )}
        </p>
      </div>
    </main>
  )
}
