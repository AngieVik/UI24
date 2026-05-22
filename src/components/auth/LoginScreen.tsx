import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, FlaskConical, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useLoginFlow } from '@/hooks/useLoginFlow'
import { useAuthStore } from '@/stores/useAuthStore'
import { useGlobalStore } from '@/stores/useGlobalStore'
import logoUrl from '@/assets/logo.svg'

/* ─────────────────────────────────────────────────────────────────────────
 *  Bypass de desarrollo — SOLO se renderiza si `import.meta.env.DEV === true`.
 *  Inyecta una sesión falsa en el store para poder navegar la UI sin tocar
 *  Supabase. Útil mientras reconstruimos el frontend sin depender de red.
 *  Borrar este bloque entero al cerrar Fase B.
 * ───────────────────────────────────────────────────────────────────────── */
function buildFakeSession(id_nombre = 'admin', rol = 'gerencia') {
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    access_token:  'dev-bypass-token',
    refresh_token: 'dev-bypass-refresh',
    token_type:    'bearer',
    expires_in:    3600,
    expires_at:    nowSec + 3600,
    user: {
      id: '00000000-0000-0000-0000-000000000dev',
      aud: 'authenticated',
      role: 'authenticated',
      email: `${id_nombre}@u24.com`,
      // app_metadata es la fuente de verdad — el hook real inyecta aquí.
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        rol,
        id_nombre,
      },
      user_metadata: { id_nombre, rol },
      identities: [],
      created_at: new Date(0).toISOString(),
      updated_at: new Date().toISOString(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

const schema = z.object({
  identificador: z.string().min(1, 'Identificador requerido'),
  password:      z.string().min(8, 'Mínimo 8 caracteres'),
})
type Schema = z.infer<typeof schema>

const APP_VERSION = (typeof window !== 'undefined' && (window as { __APP_VERSION__?: string }).__APP_VERSION__) || '0.1.0'

export function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false)
  const { isLoading, error, loginNormal, loginEmergencia } = useLoginFlow()
  const isOnline = useGlobalStore((s) => s.isOnline)

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { identificador: '', password: '' },
    mode: 'onBlur',
  })

  async function onSubmit(values: Schema) {
    const id = values.identificador.trim()
    if (id === 'PIN') {
      await loginEmergencia('PIN', values.password)
    } else {
      await loginNormal(id, values.password)
    }
  }

  return (
    <main
      className="grid min-h-dvh place-items-center bg-background p-6"
      role="main"
      aria-label="Acceso al terminal"
    >
      <div className="flex w-full max-w-[360px] flex-col items-center gap-5">
        <img
          src={logoUrl}
          alt="U24 Servicios Sanitarios"
          className="h-16 w-auto"
        />

        <Card className="w-full">
          <CardContent className="space-y-4 p-6">
            <header className="space-y-1">
              <h1 className="font-display text-xl font-bold leading-tight">
                Acceso al terminal
              </h1>
              <p className="font-body text-base font-light text-muted-foreground">
                Identifícate para entrar al control operativo.
              </p>
            </header>

            {!isOnline && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-base text-destructive"
              >
                <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>Sin conexión. El acceso al terminal requiere red.</span>
              </div>
            )}

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-3"
              aria-label="Formulario de login"
              noValidate
            >
              <Controller
                control={form.control}
                name="identificador"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="identificador">Identificador</FieldLabel>
                    <Input
                      {...field}
                      id="identificador"
                      autoComplete="username"
                      aria-invalid={fieldState.invalid}
                      disabled={isLoading || !isOnline}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        aria-invalid={fieldState.invalid}
                        disabled={isLoading || !isOnline}
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
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div
                role="alert"
                aria-live="polite"
                className="min-h-5 text-base text-destructive"
              >
                {error}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isOnline}
              >
                {isLoading ? 'Verificando…' : 'Login'}
              </Button>
            </form>

            {/* ── Bypass de desarrollo — eliminar al cerrar Fase B ── */}
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
                  onClick={() => useAuthStore.getState().setSession(buildFakeSession('admin'))}
                >
                  <FlaskConical aria-hidden="true" className="size-4" />
                  Acceso dev (saltar Supabase)
                </Button>
                <p className="font-body text-[11px] font-light text-muted-foreground">
                  Inyecta una sesión local como <code className="font-medium text-foreground">admin</code> sin
                  llamar a Supabase. Útil para navegar la UI sin red. No persiste tras cerrar sesión.
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
