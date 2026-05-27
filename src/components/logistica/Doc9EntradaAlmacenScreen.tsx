import { useState } from 'react'
import { CheckCircle2, PackageCheck } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'
import { useLocations } from '@/hooks/useLocations'

const schema = z.object({
  id_item:           z.coerce.number().int().positive('Selecciona o introduce el ítem'),
  cantidad:          z.coerce.number().int().positive('Introduce la cantidad'),
  location_destino:  z.string().min(1, 'Selecciona la location de destino'),
  notas:             z.string().optional(),
})
type Schema = z.infer<typeof schema>

interface Result { online: boolean }

export function Doc9EntradaAlmacenScreen() {
  const { data: locations } = useLocations()
  const [resultado, setResultado] = useState<Result | null>(null)

  const mut = useOfflineMutation<{
    p_mutation_uuid:   string
    p_id_item:         number
    p_cantidad:        number
    p_location_destino: string
    p_notas:           string | null
  }>({
    rpcName:   'rpc_entrada_almacen',
    invalidates: [['ultimos_movimientos'], ['stock_historial']],
  })

  const form = useForm<Schema>({
    // z.coerce.number() makes the resolver input type 'unknown'; cast to suppress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { cantidad: 1 },
    mode: 'onBlur',
  })

  if (resultado) {
    return (
      <div
        role="status"
        aria-label="Entrada registrada"
        className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center"
      >
        <CheckCircle2 className="size-10 text-green-600" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Entrada registrada</h2>
        <p className="font-body text-sm text-muted-foreground">
          {resultado.online
            ? 'La entrada de material se ha registrado correctamente.'
            : 'La entrada se guardará cuando recuperes la conexión.'}
        </p>
        <Button onClick={() => { setResultado(null); form.reset({ cantidad: 1 }) }} variant="outline" size="sm">
          Registrar otra entrada
        </Button>
      </div>
    )
  }

  async function onSubmit(values: Schema) {
    const res = await mut.mutateAsync({
      p_mutation_uuid:    crypto.randomUUID(),
      p_id_item:          values.id_item,
      p_cantidad:         values.cantidad,
      p_location_destino: values.location_destino,
      p_notas:            values.notas?.trim() || null,
    })
    setResultado({ online: !res.queued })
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <PackageCheck aria-hidden="true" className="size-5" />
            Doc-9 — Entrada de almacén
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label="Formulario de entrada de almacén"
            noValidate
          >
            {/* Ítem */}
            <Controller
              control={form.control}
              name="id_item"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="d9-item">ID de ítem</FieldLabel>
                  <Input
                    {...field}
                    id="d9-item"
                    type="number"
                    min="1"
                    placeholder="Ej. 42"
                    aria-invalid={fieldState.invalid}
                    disabled={mut.isPending}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Cantidad */}
            <Controller
              control={form.control}
              name="cantidad"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="d9-cant">Cantidad</FieldLabel>
                  <Input
                    {...field}
                    id="d9-cant"
                    type="number"
                    min="1"
                    placeholder="1"
                    aria-invalid={fieldState.invalid}
                    disabled={mut.isPending}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Location destino */}
            <Controller
              control={form.control}
              name="location_destino"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="d9-dest">Location destino</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={mut.isPending}>
                    <SelectTrigger id="d9-dest" aria-label="Location destino">
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.filter((l) => l.tipo === 'almacen' || l.tipo === 'vehiculo').map((l) => (
                        <SelectItem key={l.location_id} value={l.location_id}>
                          {l.nombre}
                          <Badge variant="info" className="ml-2 text-xs">{l.tipo}</Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Notas */}
            <Controller
              control={form.control}
              name="notas"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="d9-notas">
                    Notas <span className="font-light text-muted-foreground">— opcional</span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="d9-notas"
                    rows={2}
                    placeholder="Observaciones, número de albarán…"
                    className="resize-none"
                    disabled={mut.isPending}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button type="submit" className="w-full" disabled={mut.isPending}>
              <PackageCheck aria-hidden="true" className="size-4" />
              {mut.isPending ? 'Registrando…' : 'Registrar entrada'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
