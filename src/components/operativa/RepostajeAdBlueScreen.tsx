import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Droplet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useOfflineMutation } from '@/hooks/useOfflineMutation'

const schema = z.object({
  litros: z.coerce.number().positive('Introduce los litros repostados'),
  km_actual: z.coerce.number().int().positive('Introduce el km actual').optional(),
  notas: z.string().optional(),
})
type Schema = z.infer<typeof schema>

interface RepostajeResult {
  online: boolean
}

export function RepostajeAdBlueScreen() {
  const matricula = useActivacionStore((s) => s.matricula)
  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const [resultado, setResultado] = useState<RepostajeResult | null>(null)

  const mut = useOfflineMutation<{
    p_mutation_uuid: string
    p_matricula: string
    p_id_activacion: string
    p_litros: number
    p_km_actual: number | null
    p_notas: string | null
  }>({
    rpcName: 'rpc_registrar_repostaje_adblue',
    invalidates: [['repostajes', matricula]],
  })

  const form = useForm<Schema>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any, // z.coerce.number() → resolver input mismatch
    defaultValues: {},
    mode: 'onBlur',
  })

  // Gate
  if (!idActivacion || !matricula) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid size-12 place-items-center rounded-md bg-muted text-muted-foreground/70">
          <Droplet aria-hidden="true" className="size-6" />
        </div>
        <h2 className="font-display text-lg font-bold leading-tight">Repostaje AdBlue</h2>
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
        aria-label="Repostaje AdBlue registrado"
        className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center"
      >
        <CheckCircle2 className="size-10 text-green-600" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Repostaje AdBlue registrado</h2>
        <p className="font-body text-sm text-muted-foreground">
          {resultado.online
            ? 'El repostaje se ha guardado correctamente.'
            : 'El repostaje se guardará cuando recuperes la conexión.'}
        </p>
        <Button
          onClick={() => {
            setResultado(null)
            form.reset()
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
      p_km_actual: values.km_actual ?? null,
      p_notas: values.notas?.trim() || null,
    })
    setResultado({ online: !res.queued })
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Droplet aria-hidden="true" className="size-5 text-blue-500" />
            Repostaje AdBlue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline">{matricula}</Badge>
            <Badge variant="info">AdBlue</Badge>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label="Formulario repostaje AdBlue"
            noValidate
          >
            <Controller
              control={form.control}
              name="litros"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="ab-litros">Litros AdBlue repostados</FieldLabel>
                  <Input
                    {...field}
                    id="ab-litros"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ej. 5.0"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="km_actual"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="ab-km">
                    Km actual <span className="font-light text-muted-foreground">— opcional</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="ab-km"
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

            <Controller
              control={form.control}
              name="notas"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="ab-notas">
                    Notas <span className="font-light text-muted-foreground">— opcional</span>
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="ab-notas"
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
              <Droplet aria-hidden="true" className="size-4" />
              {mut.isPending ? 'Guardando…' : 'Registrar repostaje AdBlue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
