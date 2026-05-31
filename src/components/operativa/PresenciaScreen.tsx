import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LogOut, UserCheck, UserPlus, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useMiPresencia } from '@/hooks/useMiPresencia'
import { useCheckinTrabajador } from '@/hooks/useCheckinTrabajador'
import { formatRol, getInitials } from '@/lib/formatRol'
import { supabase } from '@/lib/supabase'

const schema = z.object({
  identificador: z.string().min(1, 'Identificador requerido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})
type Schema = z.infer<typeof schema>

/**
 * PresenciaScreen — hoja `checkin` del BlackColumn. Modelo v4 (D.1.1d.2).
 *
 * El terminal ya tiene sesión Supabase activa (del usuario máquina).
 * Esta pantalla sirve para:
 *   1. Sumar un trabajador adicional (form de check-in via EF).
 *   2. Ver el personal presente y poder sacar a cualquiera (check-out
 *      por item). La sesión del terminal NO se toca.
 *
 * Si el último trabajador hace check-out, `App.tsx` detecta
 * `personal.length === 0` y muestra `CheckinInicialScreen` (estado_0b).
 */
export function PresenciaScreen() {
  const {
    ejecutorId,
    personal,
    isLoading,
    checkout,
    isSubmitting,
    error: presenciaError,
  } = useMiPresencia()

  const { checkin, isSubmitting: isCheckingIn, error: checkinError } = useCheckinTrabajador()
  const [showPassword, setShowPassword] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { identificador: '', password: '' },
    mode: 'onBlur',
  })

  async function onSubmitSumar(values: Schema) {
    setActionError(null)
    const id_nombre = values.identificador.trim()

    // 1. Verificar credenciales y registrar presencia
    const res = await checkin({ id_nombre, password: values.password })
    if (!res) return

    // 2. Abrir turno para el trabajador adicional (silencioso, no actualiza
    //    useTurnoStore porque este trabajador no es el ejecutor del terminal)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('rpc_abrir_turno', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_nombre: id_nombre,
      })
      // Ignorar ERR_TURNO_001 (ya tiene turno abierto — edge case offline/retry)
    } catch {
      // No bloquear el flujo si la apertura falla; el turno se intentará
      // de nuevo en la próxima sesión.
    }

    form.reset()
  }

  async function onCheckout(id_nombre: string) {
    setActionError(null)
    const res = await checkout(id_nombre)
    if (!res) {
      setActionError('No se pudo completar el check-out. Reintenta.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      {/* ─── Sección 1: sumar otro trabajador ────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <UserPlus aria-hidden="true" className="size-5" />
            Sumar otro trabajador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm font-light text-muted-foreground">
            Otro TES, DUE, médico o miembro del equipo introduce sus credenciales. La sesión del
            terminal NO cambia — solo se añade la presencia del nuevo trabajador.
          </p>
          <form
            onSubmit={form.handleSubmit(onSubmitSumar)}
            className="space-y-3"
            aria-label="Formulario de check-in"
            noValidate
          >
            <Controller
              control={form.control}
              name="identificador"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="sumar-identificador">Identificador</FieldLabel>
                  <Input
                    {...field}
                    id="sumar-identificador"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    disabled={isCheckingIn}
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
                  <FieldLabel htmlFor="sumar-password">Contraseña</FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      id="sumar-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      disabled={isCheckingIn}
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
              {actionError ?? checkinError ?? presenciaError?.message}
            </div>

            <Button type="submit" className="w-full" disabled={isCheckingIn}>
              {isCheckingIn ? 'Verificando…' : 'Sumar al turno'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ─── Sección 2: lista de personal con check-out por item ─── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Users aria-hidden="true" className="size-4" />
            Personal en este terminal
            <Badge variant="secondary">{personal.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2" role="status" aria-label="Cargando personal">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-3/4" />
            </div>
          )}

          {!isLoading && personal.length === 0 && (
            <p className="text-sm font-light text-muted-foreground">
              Nadie tiene presencia activa.
            </p>
          )}

          {!isLoading && personal.length > 0 && (
            <ul className="flex flex-col gap-2">
              {personal.map((p) => {
                const isSelf = p.id_nombre === ejecutorId
                return (
                  <li
                    key={p.id_nombre}
                    className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="text-[10px] font-bold">
                        {getInitials(p.nombre_real)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col leading-tight">
                      <span className="font-bold">{p.nombre_real}</span>
                      <span className="text-xs font-light text-muted-foreground">
                        {p.id_nombre}
                        {isSelf && ' · Tú'}
                      </span>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {formatRol(p.rol)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCheckout(p.id_nombre)}
                      disabled={isSubmitting}
                      aria-label={`Check-out de ${p.nombre_real}`}
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                      Salir
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="px-2 text-xs font-light text-muted-foreground">
        <UserCheck aria-hidden="true" className="mr-1 inline size-3" />
        Si sale la última persona, el terminal vuelve a la pantalla de check-in. La sesión del
        terminal persiste hasta que coordinación revoque la galleta.
      </p>
    </div>
  )
}
