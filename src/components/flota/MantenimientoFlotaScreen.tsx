import { useState } from 'react'
import { Droplets } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
// Textarea not used in current forms — removed
import { useFlotaCompleta } from '@/hooks/useFlotaCompleta'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schemaAceite = z.object({
  matricula: z.string().min(1, 'Selecciona un vehículo'),
  km_actual: z.coerce.number().int().positive('Introduce el km actual'),
  tipo_aceite: z.string().min(1, 'Selecciona el tipo de aceite'),
  litros: z.coerce.number().positive('Introduce los litros'),
  notas: z.string().optional(),
})

const schemaFrenosNeum = z.object({
  matricula: z.string().min(1, 'Selecciona un vehículo'),
  km_actual: z.coerce.number().int().positive('Introduce el km actual'),
  resultado: z.enum(['conforme', 'no_conforme', 'advertencia'] as const, {
    message: 'Selecciona el resultado',
  }),
  notas: z.string().optional(),
})

type SchemaAceite = z.infer<typeof schemaAceite>
type SchemaFrenosNeum = z.infer<typeof schemaFrenosNeum>

function FormMantenimiento({
  tipo,
  matriculas,
}: {
  tipo: 'aceite' | 'frenos' | 'neumaticos'
  matriculas: string[]
}) {
  const [done, setDone] = useState(false)

  const rpcName =
    tipo === 'aceite'
      ? 'rpc_registro_cambio_aceite'
      : tipo === 'frenos'
        ? 'rpc_revision_frenos'
        : 'rpc_revision_neumaticos'

  const mut = useOfflineMutation({ rpcName, invalidates: [['flota_completa']] })

  const aceiteForm = useForm<SchemaAceite>({
    // z.coerce.number() causes input-type mismatch → cast resolver
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schemaAceite) as any,
    mode: 'onBlur',
    defaultValues: { tipo_aceite: '5W30' },
  })

  const frenosForm = useForm<SchemaFrenosNeum>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schemaFrenosNeum) as any,
    mode: 'onBlur',
  })

  if (done) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Badge variant="ok">Registrado</Badge>
        <p className="text-sm text-muted-foreground">Registro guardado correctamente.</p>
        <Button size="sm" variant="outline" onClick={() => setDone(false)}>
          Nuevo registro
        </Button>
      </div>
    )
  }

  if (tipo === 'aceite') {
    return (
      <form
        onSubmit={aceiteForm.handleSubmit(async (v) => {
          await mut.mutateAsync({ p_mutation_uuid: crypto.randomUUID(), ...v })
          setDone(true)
        })}
        className="space-y-4"
        noValidate
      >
        <Controller
          control={aceiteForm.control}
          name="matricula"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="mant-ac-mat">Vehículo</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={mut.isPending}>
                <SelectTrigger id="mant-ac-mat">
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  {matriculas.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={aceiteForm.control}
          name="km_actual"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="mant-ac-km">Km actual</FieldLabel>
              <Input
                {...field}
                id="mant-ac-km"
                type="number"
                min="0"
                disabled={mut.isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={aceiteForm.control}
          name="tipo_aceite"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="mant-ac-tipo">Tipo de aceite</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={mut.isPending}>
                <SelectTrigger id="mant-ac-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['5W30', '5W40', '10W40', '15W40', '0W30'].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={aceiteForm.control}
          name="litros"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="mant-ac-lit">Litros añadidos</FieldLabel>
              <Input
                {...field}
                id="mant-ac-lit"
                type="number"
                step="0.1"
                min="0"
                disabled={mut.isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" className="w-full" disabled={mut.isPending}>
          {mut.isPending ? 'Guardando…' : 'Registrar cambio de aceite'}
        </Button>
      </form>
    )
  }

  return (
    <form
      onSubmit={frenosForm.handleSubmit(async (v) => {
        await mut.mutateAsync({ p_mutation_uuid: crypto.randomUUID(), ...v })
        setDone(true)
      })}
      className="space-y-4"
      noValidate
    >
      <Controller
        control={frenosForm.control}
        name="matricula"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`mant-${tipo}-mat`}>Vehículo</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={mut.isPending}>
              <SelectTrigger id={`mant-${tipo}-mat`}>
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent>
                {matriculas.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={frenosForm.control}
        name="km_actual"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`mant-${tipo}-km`}>Km actual</FieldLabel>
            <Input
              {...field}
              id={`mant-${tipo}-km`}
              type="number"
              min="0"
              disabled={mut.isPending}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        control={frenosForm.control}
        name="resultado"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`mant-${tipo}-res`}>Resultado revisión</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={mut.isPending}>
              <SelectTrigger id={`mant-${tipo}-res`}>
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conforme">Conforme</SelectItem>
                <SelectItem value="advertencia">Advertencia</SelectItem>
                <SelectItem value="no_conforme">No conforme</SelectItem>
              </SelectContent>
            </Select>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Button type="submit" className="w-full" disabled={mut.isPending}>
        {mut.isPending ? 'Guardando…' : `Registrar revisión ${tipo}`}
      </Button>
    </form>
  )
}

export function MantenimientoFlotaScreen({
  vista,
}: {
  vista?: 'aceite' | 'frenos' | 'neumaticos' | 'umbrales'
}) {
  const { data: vehiculos, isLoading } = useFlotaCompleta()
  const matriculas = vehiculos.map((v) => v.matricula)

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Droplets aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">Mantenimiento flota</h2>
      </div>

      {(['aceite', 'frenos', 'neumaticos'] as const).map((t) => (
        (vista ?? 'aceite') === t && (
          <div key={t} className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base capitalize">
                  {t === 'aceite' ? 'Cambio de aceite' : `Revisión de ${t}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-60 w-full" />
                ) : (
                  <FormMantenimiento tipo={t} matriculas={matriculas} />
                )}
              </CardContent>
            </Card>
          </div>
        )
      ))}

      {(vista ?? 'aceite') === 'umbrales' && (
        <div className="mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">
                Configuración de umbrales de alerta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-body text-sm text-muted-foreground">
                Configura los umbrales de km para alertas de mantenimiento preventivo (aceite,
                frenos, neumáticos). Solo disponible para responsables de flota.
              </p>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Cambio de aceite (km)', key: 'umbral_aceite_km', def: '15000' },
                  { label: 'Revisión de frenos (km)', key: 'umbral_frenos_km', def: '30000' },
                  { label: 'Revisión de neumáticos (km)', key: 'umbral_neum_km', def: '50000' },
                ].map((u) => (
                  <Field key={u.key}>
                    <FieldLabel htmlFor={u.key}>{u.label}</FieldLabel>
                    <Input id={u.key} type="number" defaultValue={u.def} min="0" step="1000" />
                  </Field>
                ))}
                <Button className="w-full" variant="outline" disabled>
                  Guardar umbrales (solo responsables)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
