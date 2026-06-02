import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAutorizarTerminal } from '@/hooks/useAutorizarTerminal'
import { useGlobalStore } from '@/stores/useGlobalStore'
import logoUrl from '@/assets/logo.svg'

const schema = z.object({
  identificador: z.string().min(1, 'Identificador requerido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type Schema = z.infer<typeof schema>

const APP_VERSION =
  (typeof window !== 'undefined' && (window as { __APP_VERSION__?: string }).__APP_VERSION__) ||
  '0.1.0'

/**
 * AutorizarTerminalScreen — estado_0a.
 *
 * Pantalla de acceso sin texto explicativo visible. Solo gerencia puede
 * autorizar un terminal (el servidor verifica el rol). NUNCA añadir
 * copy que indique quién debe entrar, por qué no puede o qué hace esta
 * pantalla — compromete la seguridad física del dispositivo.
 *
 * Flujo: credenciales gerencia → ef-autorizar-terminal verifica rol,
 * crea usuario máquina `terminal_<fp>@u24.local` + galleta permanente
 * + fichas_empleados con rol gerencia → sesión del terminal persiste
 * en IndexedDB indefinidamente (refresh automático JWT).
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
      password: values.password,
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
                    <FieldLabel htmlFor="autorizar-identificador">Identificador</FieldLabel>
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
                        {showPassword ? (
                          <EyeOff aria-hidden="true" className="size-4" />
                        ) : (
                          <Eye aria-hidden="true" className="size-4" />
                        )}
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
                {isSubmitting ? 'Verificando…' : 'Acceder'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="font-body text-xs font-light text-muted-foreground">
          U24 Servicios Sanitarios · v{APP_VERSION}
        </p>
      </div>
    </main>
  )
}
