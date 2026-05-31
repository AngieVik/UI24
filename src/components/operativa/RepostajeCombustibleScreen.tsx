import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Fuel } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'

const schema = z.object({
  litros: z.coerce.number().positive('Introduce los litros repostados'),
  precio_por_litro: z.coerce.number().positive('Introduce el precio por litro').optional(),
  proveedor: z.string().optional(),
  tipo: z.enum(['gasoil', 'gasolina_95', 'gasolina_98'] as const, {
    message: 'Selecciona el tipo',
  }),
  km_actual: z.coerce.number().int().positive('Introduce el km actual').optional(),
  notas: z.string().optional(),
})
type Schema = z.infer<typeof schema>

const TIPO_LABELS: Record<string, string> = {
  gasoil: 'Gasóleo',
  gasolina_95: 'Gasolina 95',
  gasolina_98: 'Gasolina 98',
}

interface RepostajeResult {
  online: boolean
  id_repostaje?: string
}

export function RepostajeCombustibleScreen() {
  const matricula = useActivacionStore((s) => s.matricula)
  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const [resultado, setResultado] = useState<RepostajeResult | null>(null)

  const mut = useOfflineMutation<{
    p_mutation_uuid: string
    p_matricula: string
    p_id_activacion: string
    p_litros: number
    p_tipo: string
    p_km_actual: number | null
    p_precio: number | null
    p_proveedor: string | null
    p_notas: string | null
  }>({
    rpcName: 'rpc_registrar_repostaje_combustible',
    invalidates: [['repostajes', matricula]],
  })

  const form = useForm<Schema>({
    // z.coerce.number() input-type mismatch → cast resolver
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { tipo: 'gasoil', litros: undefined as unknown as number },
    mode: 'onBlur',
  })

  // Gate
  if (!idActivacion || !matricula) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <Fuel aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold leading-tight">Repostaje de combustible</h2>
        <p className="font-body text-base font-light text-muted-foreground">
          No hay turno activo. Inicia un turno desde Operativa → Vehículos.
        </p>
      </div>
    )
  }

  if (resultado) {
    return (
      <div
        role="status"
        aria-label="Repostaje registrado"
        className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center"
      >
        <CheckCircle2 className="size-10 text-green-600" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Repostaje registrado</h2>
        <p className="font-body text-sm text-muted-foreground">
          {resultado.online
            ? 'El repostaje se ha guardado correctamente.'
            : 'El repostaje se guardará cuando recuperes la conexión.'}
        </p>
        <Button
          onClick={() => {
            setResultado(null)
            form.reset({ tipo: 'gasoil' })
          }}
          variant="outline"
          size="sm"
        >
          Nuevo repostaje
        </Button>
      </div>
    )
  }

  async function onSubmit(values: Schema) {
    const res = await mut.mutateAsync({
      p_mutation_uuid: crypto.randomUUID(),
      p_matricula: matricula,
      p_id_activacion: idActivacion,
      p_litros: values.litros,
      p_tipo: values.tipo,
      p_km_actual: values.km_actual ?? null,
      p_precio: values.precio_por_litro ?? null,
      p_proveedor: values.proveedor?.trim() || null,
      p_notas: values.notas?.trim() || null,
    })
    setResultado({
      online: !res.queued,
      id_repostaje: (res.data as { id_repostaje?: string })?.id_repostaje,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Fuel aria-hidden="true" className="size-5" />
            Repostaje de combustible
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" aria-label={`Matrícula ${matricula}`}>
              {matricula}
            </Badge>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label="Formulario de repostaje"
            noValidate
          >
            {/* Tipo */}
            <Controller
              control={form.control}
              name="tipo"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="rp-tipo">Tipo de combustible</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rp-tipo" aria-label="Tipo de combustible">
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIPO_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Litros */}
            <Controller
              control={form.control}
              name="litros"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="rp-litros">Litros repostados</FieldLabel>
                  <Input
                    {...field}
                    id="rp-litros"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej. 42.5"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Precio por litro (opcional) */}
            <Controller
              control={form.control}
              name="precio_por_litro"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="rp-precio">
                    Precio/litro (€){' '}
                    <span className="font-light text-muted-foreground">— opcional</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="rp-precio"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Ej. 1.459"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Km actual (opcional) */}
            <Controller
              control={form.control}
              name="km_actual"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="rp-km">
                    Km actual <span className="font-light text-muted-foreground">— opcional</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="rp-km"
                    type="number"
                    min="0"
                    placeholder="Ej. 123456"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Proveedor (opcional) */}
            <Controller
              control={form.control}
              name="proveedor"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="rp-prov">
                    Proveedor / Gasolinera{' '}
                    <span className="font-light text-muted-foreground">— opcional</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="rp-prov"
                    placeholder="Ej. Repsol Avda. España"
                    aria-invalid={fieldState.invalid}
                  />
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
                  <FieldLabel htmlFor="rp-notas">
                    Notas <span className="font-light text-muted-foreground">— opcional</span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="rp-notas"
                    rows={2}
                    placeholder="Observaciones…"
                    className="resize-none"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Button type="submit" className="w-full" disabled={mut.isPending}>
              <Fuel aria-hidden="true" className="size-4" />
              {mut.isPending ? 'Guardando…' : 'Registrar repostaje'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
