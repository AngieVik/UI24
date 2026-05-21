# Definición de Crons — U24

Sprint 4, Tarea 4.4 · 4.5

## Entorno de producción (Supabase Edge Cron)

Los crons se configuran en el dashboard de Supabase o vía CLI con la extensión `pg_cron`.
Todos los endpoints validan `Authorization: Bearer $CRON_SECRET`.

| Función | Schedule (cron) | Frecuencia | Descripción |
|---|---|---|---|
| `ef-cron-cleanup-orphans` | `0 * * * *` | Cada hora | Purga idempotency_keys, PINs expirados, desbloqueos caducados |
| `ef-cron-revoke-stale-terminals` | `0 2 * * *` | Diario 02:00 | Revoca galletas temporales caducadas y permanentes inactivas (30 días) |
| `ef-cron-transito-ttl` | `30 * * * *` | Cada hora | Cancela tránsitos de inventario con TTL > 48 horas |
| `ef-cron-rgpd` | `0 3 * * *` | Diario 03:00 | Procesa solicitudes RGPD pendientes (clínico automático, empleado notifica) |

## Entorno local (desarrollo)

Para disparar un cron manualmente en local:

```bash
# Con supabase CLI
supabase functions invoke ef-cron-cleanup-orphans \
  --header "Authorization: Bearer $CRON_SECRET"

supabase functions invoke ef-cron-revoke-stale-terminals \
  --header "Authorization: Bearer $CRON_SECRET"

supabase functions invoke ef-cron-transito-ttl \
  --header "Authorization: Bearer $CRON_SECRET"

supabase functions invoke ef-cron-rgpd \
  --header "Authorization: Bearer $CRON_SECRET"
```

## Variable de entorno requerida

```
CRON_SECRET=<valor-aleatorio-alto-entropia>
```

Añadir a `.env.example` (sin valor real) y configurar en:
- Local: `.env.local` (no commitear)
- CI/CD: GitHub Secret `CRON_SECRET`
- Producción: Supabase Secrets via CLI (`supabase secrets set CRON_SECRET=...`)

## Registro de ejecuciones

Cada cron devuelve un JSON con el número de registros afectados y `ran_at`.
Pendiente (Sprint 13): enviar estos resultados a Sentry/Grafana para alertas
si el número de purgas supera umbrales esperados.

## Idempotencia de crons

Todos los crons son idempotentes: ejecutar dos veces en el mismo período
produce el mismo resultado que ejecutar una vez.
El `ON CONFLICT DO UPDATE` y las cláusulas `WHERE` garantizan esto.
