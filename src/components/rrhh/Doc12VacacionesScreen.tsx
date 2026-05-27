import { useState } from 'react'
import { CheckCircle2, Palmtree } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useVacaciones } from '@/hooks/useVacaciones'

const schema = z.object({
  periodo_anual:  z.string().min(4, 'Introduce el año (ej. 2026)'),
  fecha_inicio:   z.string().min(1, 'Selecciona la fecha de inicio'),
  fecha_fin:      z.string().min(1, 'Selecciona la fecha de fin'),
  preferencia:    z.enum(['opcion_1', 'opcion_2', 'opcion_3']).optional(),
  observaciones:  z.string().optional(),
}).refine((v) => v.fecha_inicio <= v.fecha_fin, {
  message: 'La fecha de fin debe ser igual o posterior a la de inicio',
  path: ['fecha_fin'],
})
type Schema = z.infer<typeof schema>

const ESTADO_VARIANT: Record<string, 'ok' | 'warn' | 'secondary' | 'destructive' | 'info'> = {
  Aprobada:            'ok',
  Pendiente_Aprobacion:'warn',
  Borrador:            'secondary',
  Denegada:            'destructive',
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function Doc12VacacionesScreen() {
  const { propias, pendientes, loading, submitting, error, enviarSolicitud, resolverSolicitud } = useVacaciones()
  const [done, setDone] = useState(false)

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { periodo_anual: new Date().getFullYear().toString(), preferencia: 'opcion_1' },
    mode: 'onBlur',
  })

  if (done) {
    return (
      <div role="status" aria-label="Solicitud enviada" className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <CheckCircle2 className="size-10 text-green-600" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Solicitud enviada</h2>
        <p className="font-body text-sm text-muted-foreground">Tu solicitud de vacaciones se ha enviado a RRHH para su revisión.</p>
        <Button onClick={() => { setDone(false); form.reset({ periodo_anual: new Date().getFullYear().toString(), preferencia: 'opcion_1' }) }} variant="outline" size="sm">
          Nueva solicitud
        </Button>
      </div>
    )
  }

  async function onSubmit(values: Schema) {
    const id = await enviarSolicitud({
      periodo_anual: values.periodo_anual,
      fecha_inicio:  values.fecha_inicio,
      fecha_fin:     values.fecha_fin,
      preferencia:   values.preferencia,
      observaciones: values.observaciones,
    })
    if (id) setDone(true)
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">

      {/* Formulario */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Palmtree aria-hidden="true" className="size-5 text-green-600" />
            Doc-12 — Solicitud de vacaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate aria-label="Formulario solicitud vacaciones">
            <Controller control={form.control} name="periodo_anual" render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="vac-periodo">Año de vacaciones</FieldLabel>
                <Input {...field} id="vac-periodo" placeholder="Ej. 2026" disabled={submitting} aria-invalid={fieldState.invalid} />
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <Controller control={form.control} name="fecha_inicio" render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="vac-inicio">Fecha de inicio</FieldLabel>
                  <Input {...field} id="vac-inicio" type="date" disabled={submitting} aria-invalid={fieldState.invalid} />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
              <Controller control={form.control} name="fecha_fin" render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="vac-fin">Fecha de fin</FieldLabel>
                  <Input {...field} id="vac-fin" type="date" disabled={submitting} aria-invalid={fieldState.invalid} />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )} />
            </div>
            <Controller control={form.control} name="preferencia" render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="vac-pref">Preferencia</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                  <SelectTrigger id="vac-pref"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opcion_1">Opción 1 (primera preferencia)</SelectItem>
                    <SelectItem value="opcion_2">Opción 2 (segunda preferencia)</SelectItem>
                    <SelectItem value="opcion_3">Opción 3 (tercera preferencia)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )} />
            <Controller control={form.control} name="observaciones" render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="vac-obs">Observaciones <span className="font-light text-muted-foreground">— opcional</span></FieldLabel>
                <Textarea {...field} id="vac-obs" rows={2} className="resize-none" disabled={submitting} placeholder="Cualquier comentario adicional…" />
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
            <div role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">{error}</div>
            <Button type="submit" className="w-full" disabled={submitting}>
              <Palmtree aria-hidden="true" className="size-4" />
              {submitting ? 'Enviando…' : 'Enviar solicitud'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historial de mis solicitudes */}
      {propias.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">Mis solicitudes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? <Skeleton className="h-16 w-full" /> : propias.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                <div className="text-sm">
                  <span className="font-medium">{s.periodo_anual}</span>
                  <span className="ml-2 text-muted-foreground">{fmtDate(s.fecha_inicio)} — {fmtDate(s.fecha_fin)}</span>
                </div>
                <Badge variant={ESTADO_VARIANT[s.estado] ?? 'secondary'} className="text-xs">
                  {s.estado.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pendientes para RRHH */}
      {pendientes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm">
              Pendientes de aprobación
              <Badge variant="warn" className="ml-2">{pendientes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendientes.map((s) => (
              <div key={s.id} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.id_nombre}</span>
                  <span className="text-sm text-muted-foreground">{fmtDate(s.fecha_inicio)} — {fmtDate(s.fecha_fin)}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => resolverSolicitud(s.id, 'Aprobada')} disabled={submitting}>Aprobar</Button>
                  <Button size="sm" variant="outline" onClick={() => resolverSolicitud(s.id, 'Denegada')} disabled={submitting}>Denegar</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
