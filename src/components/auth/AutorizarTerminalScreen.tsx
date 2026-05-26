import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, FlaskConical, ShieldCheck, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useAutorizarTerminal } from '@/hooks/useAutorizarTerminal'
import { useGlobalStore } from '@/stores/useGlobalStore'
import logoUrl from '@/assets/logo.svg'

const schema = z.object({
  identificador: z.string().min(1, 'Identificador requerido'),
  password:      z.string().min(8, 'Mínimo 8 caracteres'),
})
type Schema = z.infer<typeof schema>

const APP_VERSION = (typeof window !== 'undefined' && (window as { __APP_VERSION__?: string }).__APP_VERSION__) || '0.1.0'

/**
 * AutorizarTerminalScreen — estado_0a.
 *
 * Aparece cuando el terminal no tiene sesión Supabase. Gerencia
 * introduce sus credenciales para autorizar este dispositivo. El
 * backend crea el usuario máquina `terminal_<fp>@u24.local` y devuelve
 * una sesión Supabase que persistirá indefinidamente (refresh
 * automático del JWT).
 *
 * Online obligatorio.
 */
export function AutorizarTerminalScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const { autorizar, isSubmitting, error } = useAutorizarTerminal()
  const isOnline = useGlobalStore((s) => s.isOnline)

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { identificador: '', password: '' },
    mode: 'onBlur',
  })

  async function onSubmit(values: Schema) {
    await autorizar({
      id_nombre_gerencia: values.identificador.trim(),
      password:           values.password,
    })
  }

  return (
    <main
      className="grid min-h-dvh place-items-center bg-background p-6"
      role="main"
      aria-label="Autorización del terminal"
    >
      <div className="flex w-full max-w-[360px] flex-col items-center gap-5">
        <img src={logoUrl} alt="U24 Servicios Sanitarios" className="h-24 w-auto" />

        <Card className="w-full">
          <CardContent className="space-y-4 p-6">
            <header className="space-y-1">
              <h1 className="flex items-center gap-2 font-display text-xl font-bold leading-tight">
                <ShieldCheck aria-hidden="true" className="size-5" />
                Autorizar terminal
              </h1>
              <p className="font-body text-base font-light text-muted-foreground">
                Este dispositivo aún no está vinculado a U24. Gerencia introduce
                sus credenciales una sola vez para autorizar el terminal.
              </p>
            </header>

            {!isOnline && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-base text-destructive"
              >
                <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>Sin conexión. La autorización requiere red.</span>
              </div>
            )}

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
              aria-label="Formulario de autorización"
              noValidate
            >
              <Controller
                control={form.control}
                name="identificador"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="autorizar-identificador">Identificador (gerencia)</FieldLabel>
                    <Input
                      {...field}
                      id="autorizar-identificador"
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
                    <FieldLabel htmlFor="autorizar-password">Contraseña</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="autorizar-password"
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

              <Button type="submit" className="w-full" disabled={isSubmitting || !isOnline}>
                {isSubmitting ? 'Autorizando…' : 'Autorizar este terminal'}
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
                  onClick={() => autorizar({ id_nombre_gerencia: 'admin', password: '12345678' })}
                  disabled={isSubmitting || !isOnline}
                >
                  <FlaskConical aria-hidden="true" className="size-4" />
                  Acceso dev (admin/12345678)
                </Button>
                <p className="font-body text-[11px] font-light text-muted-foreground">
                  Atajo de desarrollo: autoriza el terminal con la cuenta{' '}
                  <code className="font-medium text-foreground">admin</code>.
                  Solo visible en dev.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <p className="font-body text-xs font-light text-muted-foreground">
          U24 Servicios Sanitarios · v{APP_VERSION}
        </p>
      </div>
    </main>
  )
}
