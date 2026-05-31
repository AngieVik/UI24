import { useState } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { resolveRpcError } from '@/lib/resolveRpcError'
import { useQuery } from '@tanstack/react-query'

interface Empleado {
  id_nombre: string
  nombre_real: string
}

const schema = z
  .object({
    id_nombre: z.string().min(1, 'Selecciona el empleado'),
    nueva_password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string().min(8, 'Confirma la contraseña'),
  })
  .refine((v) => v.nueva_password === v.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  })
type Schema = z.infer<typeof schema>

function useEmpleados() {
  return useQuery({
    queryKey: ['empleados_password'],
    queryFn: async (): Promise<Empleado[]> => {
      const { data, error } = await supabase
        .from('fichas_empleados')
        .select('id_nombre, nombre_real')
        .eq('activo', true)
        .order('id_nombre')
      if (error) throw error
      return (data ?? []) as Empleado[]
    },
  })
}

export function CambioPasswordScreen() {
  const { data: empleados } = useEmpleados()
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { id_nombre: '', nueva_password: '', confirmar: '' },
  })

  if (done) {
    return (
      <div
        role="status"
        aria-label="Contraseña cambiada"
        className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center"
      >
        <CheckCircle2 className="size-10 text-green-600" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Contraseña actualizada</h2>
        <p className="font-body text-sm text-muted-foreground">
          La contraseña del empleado se ha actualizado correctamente.
        </p>
        <Button
          onClick={() => {
            setDone(false)
            form.reset()
          }}
          variant="outline"
          size="sm"
        >
          Cambiar otra contraseña
        </Button>
      </div>
    )
  }

  async function onSubmit(values: Schema) {
    setSubmitting(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).rpc('rpc_cambiar_password_empleado', {
        p_mutation_uuid: crypto.randomUUID(),
        p_id_nombre: values.id_nombre,
        p_nueva_password: values.nueva_password,
      })
      if (err) throw err
      setDone(true)
    } catch (e) {
      setError(resolveRpcError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <KeyRound aria-hidden="true" className="size-5" />
            Cambio de contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label="Formulario de cambio de contraseña"
            noValidate
          >
            <Controller
              control={form.control}
              name="id_nombre"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="cp-empleado">Empleado</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                    <SelectTrigger id="cp-empleado" aria-label="Empleado">
                      <SelectValue placeholder="Seleccionar empleado…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(empleados ?? []).map((e) => (
                        <SelectItem key={e.id_nombre} value={e.id_nombre}>
                          {e.id_nombre}
                          {e.nombre_real ? ` — ${e.nombre_real}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="nueva_password"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="cp-nueva">Nueva contraseña</FieldLabel>
                  <Input
                    {...field}
                    id="cp-nueva"
                    type="password"
                    autoComplete="new-password"
                    disabled={submitting}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="confirmar"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="cp-confirmar">Confirmar contraseña</FieldLabel>
                  <Input
                    {...field}
                    id="cp-confirmar"
                    type="password"
                    autoComplete="new-password"
                    disabled={submitting}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <div role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
              {error}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              <KeyRound aria-hidden="true" className="size-4" />
              {submitting ? 'Actualizando…' : 'Cambiar contraseña'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
