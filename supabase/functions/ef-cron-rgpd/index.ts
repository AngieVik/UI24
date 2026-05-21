// ef-cron-rgpd — Procesa solicitudes RGPD pendientes automáticamente (Tarea 4.5)
// Las solicitudes de tipo 'borrado_clinico' se procesan automáticamente.
// Las de 'borrado_empleado' se notifican a gerencia/rrhh para procesado manual
// (porque desactivar un empleado tiene consecuencias operativas graves).
// Solo invocable por el scheduler — valida cron secret.
import { okResponse, errorResponse } from '../_shared/errors.ts'
import { adminClient } from '../_shared/auth.ts'

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse('ERR_AUTH_001', 401)
  }

  const admin = adminClient()
  const now = new Date().toISOString()
  let procesadas = 0
  let notificadas = 0

  // Obtener solicitudes pendientes
  const { data: solicitudes } = await admin
    .from('solicitudes_rgpd')
    .select('id, tipo_solicitud, identificador')
    .eq('estado', 'pendiente')
    .order('timestamp_solicitud', { ascending: true })
    .limit(50)

  if (!solicitudes) return okResponse({ procesadas: 0, notificadas: 0, ran_at: now })

  for (const sol of solicitudes) {
    if (sol.tipo_solicitud === 'borrado_clinico') {
      // Anonimizar datos clínicos directamente
      const idActivacion = sol.identificador

      await Promise.all([
        admin.from('doc2_informes_svb').update({ datos_paciente: {} }).eq('id_activacion', idActivacion),
        admin.from('doc3_informes_sva').update({ datos_paciente: {} }).eq('id_activacion', idActivacion),
        admin.from('doc4_consentimientos').update({ tipo_consentimiento: '[ANONIMIZADO]' }).eq('id_activacion', idActivacion),
        admin.from('doc5_rechazos_alta').update({ motivo_rechazo: '[ANONIMIZADO]' }).eq('id_activacion', idActivacion),
      ])

      await admin
        .from('solicitudes_rgpd')
        .update({
          estado: 'procesada',
          procesado_por: 'ef-cron-rgpd',
          timestamp_procesado: now,
          notas_procesamiento: 'Procesado automáticamente por cron RGPD',
        })
        .eq('id', sol.id)

      procesadas++
    } else if (sol.tipo_solicitud === 'borrado_empleado') {
      // Las bajas de empleado requieren acción manual — notificar a gerencia/rrhh
      const { data: gestores } = await admin
        .from('fichas_empleados')
        .select('id_nombre')
        .in('rol', ['gerencia', 'rrhh'])
        .eq('activo', true)

      if (gestores) {
        await admin.from('mensajes_bandeja').insert(
          gestores.map(g => ({
            id_nombre_destino: g.id_nombre,
            contenido: `Solicitud RGPD pendiente de borrado de empleado "${sol.identificador}". Procesado manual requerido desde la gestión de solicitudes RGPD.`,
          }))
        )
        notificadas++
      }
    }
  }

  return okResponse({ procesadas, notificadas, ran_at: now })
})
