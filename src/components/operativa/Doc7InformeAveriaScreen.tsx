import { useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Cog, ImagePlus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useActivacionStore } from '@/stores/useActivacionStore'
import { useDoc7 } from '@/hooks/useDoc7'
import { useFlotaCompleta } from '@/hooks/useFlotaCompleta'
import type { Database } from '@/types/supabase'

type NivelCriticidad = Database['public']['Enums']['nivel_criticidad']

const SISTEMAS = [
  'Motor',
  'Frenos',
  'Dirección',
  'Transmisión',
  'Eléctrico',
  'Carrocería / Chapa',
  'Neumáticos',
  'Luces / Señalización',
  'Equipamiento sanitario',
  'Climatización',
  'Otro',
]

const NIVELES: {
  value: NivelCriticidad
  label: string
  variant: 'destructive' | 'warn' | 'info'
}[] = [
  { value: 'Grave', label: 'Grave — requiere taller urgente', variant: 'destructive' },
  { value: 'Moderada', label: 'Moderada — revisión próxima', variant: 'warn' },
  { value: 'Leve', label: 'Leve — revisión programada', variant: 'info' },
]

const schema = z.object({
  sistemaAfectado: z.string().min(1, 'Selecciona el sistema afectado'),
  nivelCriticidad: z.enum(['Leve', 'Moderada', 'Grave'] as const, {
    message: 'Selecciona el nivel de criticidad',
  }),
  descripcion: z.string().min(10, 'Descripción mínimo 10 caracteres'),
})
type Schema = z.infer<typeof schema>

export function Doc7InformeAveriaScreen() {
  const matriculaActiva = useActivacionStore((s) => s.matricula)
  const idActivacion = useActivacionStore((s) => s.id_activacion)
  const { data: flota } = useFlotaCompleta()

  // Cuando no hay turno activo (contexto Flota), el usuario puede seleccionar cualquier vehículo
  const [selMatricula, setSelMatricula] = useState<string | null>(null)
  const efectivaMatricula = matriculaActiva ?? selMatricula

  const { registrarAveria, isSubmitting, error, success } = useDoc7(efectivaMatricula)
  const [imagen, setImagen] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { sistemaAfectado: '', nivelCriticidad: 'Leve', descripcion: '' },
    mode: 'onBlur',
  })

  // Sin turno activo y sin vehículo seleccionado → mostrar selector
  if (!idActivacion && !efectivaMatricula) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
        <div className="flex items-center gap-2">
          <Cog aria-hidden="true" className="size-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">Doc-7 — Informe de avería</h2>
        </div>
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Selecciona el vehículo para registrar la avería.
            </p>
            <Select value={selMatricula ?? ''} onValueChange={(v) => setSelMatricula(v || null)}>
              <SelectTrigger aria-label="Seleccionar vehículo">
                <SelectValue placeholder="Seleccionar vehículo…" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Flota</SelectLabel>
                  {flota.map((v) => (
                    <SelectItem key={v.matricula} value={v.matricula}>
                      <span className="font-mono font-semibold">
                        {v.vehiculo_id ?? v.matricula}
                      </span>
                      {v.vehiculo_id && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({v.matricula})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div
        role="status"
        aria-label="Avería registrada"
        className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-16 text-center"
      >
        <CheckCircle2 className="size-10 text-green-600" aria-hidden="true" />
        <h2 className="font-display text-lg font-bold">Avería registrada</h2>
        <p className="font-body text-sm text-muted-foreground">
          El informe de avería se ha enviado al equipo de flota.
        </p>
        <Button
          onClick={() => {
            form.reset()
            setImagen(null)
            setPreview(null)
          }}
          variant="outline"
          size="sm"
        >
          Registrar otra avería
        </Button>
      </div>
    )
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setImagen(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  function removeImage() {
    setImagen(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onSubmit(values: Schema) {
    await registrarAveria({
      sistemaAfectado: values.sistemaAfectado,
      nivelCriticidad: values.nivelCriticidad,
      descripcion: values.descripcion,
      imagen,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 p-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Cog aria-hidden="true" className="size-5" />
            Doc-7 — Informe de avería
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline">{efectivaMatricula}</Badge>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            aria-label="Formulario de informe de avería"
            noValidate
          >
            {/* Sistema afectado */}
            <Controller
              control={form.control}
              name="sistemaAfectado"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="d7-sistema">Sistema afectado</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="d7-sistema" aria-label="Sistema afectado">
                      <SelectValue placeholder="Seleccionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SISTEMAS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Nivel de criticidad */}
            <Controller
              control={form.control}
              name="nivelCriticidad"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="d7-nivel">Nivel de criticidad</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="d7-nivel" aria-label="Nivel de criticidad">
                      <SelectValue placeholder="Seleccionar…">
                        {field.value &&
                          (() => {
                            const n = NIVELES.find((x) => x.value === field.value)
                            return n ? (
                              <Badge variant={n.variant}>{n.label.split(' —')[0]}</Badge>
                            ) : null
                          })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {NIVELES.map((n) => (
                        <SelectItem key={n.value} value={n.value}>
                          <div className="flex flex-col">
                            <Badge variant={n.variant} className="w-fit">
                              {n.label.split(' —')[0]}
                            </Badge>
                            <span className="mt-0.5 text-xs text-muted-foreground">
                              {n.label.split(' — ')[1]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Descripción */}
            <Controller
              control={form.control}
              name="descripcion"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="d7-desc">Descripción de la avería</FieldLabel>
                  <Textarea
                    {...field}
                    id="d7-desc"
                    rows={4}
                    disabled={isSubmitting}
                    placeholder="Describe los síntomas, cuándo empezó, qué ocurre exactamente…"
                    className="resize-y"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.error && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Foto (opcional) */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Foto <span className="font-light">— opcional</span>
              </span>
              {preview ? (
                <div className="relative w-fit">
                  <img
                    src={preview}
                    alt="Vista previa de la avería"
                    className="max-h-40 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    aria-label="Quitar foto"
                    className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 shadow hover:bg-background"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => fileRef.current?.click()}
                  disabled={isSubmitting}
                  aria-label="Añadir foto de la avería"
                >
                  <ImagePlus aria-hidden="true" className="size-4" />
                  Añadir foto
                </Button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleImageChange}
                aria-label="Seleccionar imagen de la avería"
              />
            </div>

            <div role="alert" aria-live="polite" className="min-h-5 text-sm text-destructive">
              {error}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Cog aria-hidden="true" className="size-4" />
              {isSubmitting ? 'Enviando…' : 'Registrar avería'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
