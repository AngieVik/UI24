## ¿Qué hace este PR?

<!-- Describe los cambios en 1-3 frases. Por qué es necesario. -->

## Tipo de cambio

- [ ] Migración de base de datos
- [ ] RPC / función PostgreSQL
- [ ] Trigger / constraint / índice
- [ ] Edge Function
- [ ] Store Zustand / lógica cliente
- [ ] Componente UI
- [ ] CI/CD / infraestructura
- [ ] Documentación / ADR

## Definition of Done

### Obligatorio para todos los PRs
- [ ] CI verde (workflows de GitHub Actions sin errores)
- [ ] Sin secretos ni claves en el diff (`grep -r "eyJ" --include="*.ts"` limpio)
- [ ] Documentación actualizada si el cambio afecta a arquitectura, ADRs o runbooks

### Backend (migraciones / RPCs / triggers)
- [ ] Migración nombrada `YYYYMMDDHHMMSS_descripcion.sql` (ver convención)
- [ ] `supabase db reset` reproducible tras esta migración
- [ ] Tipos TS regenerados y sincronizados (`supabase gen types typescript --local > src/types/supabase.ts`)
- [ ] RLS: ningún rol puede leer/escribir fuera de su política
- [ ] Toda mutación de dominio va por RPC o Edge Function (`SECURITY DEFINER` + `search_path` fijado)
- [ ] Tests pgTAP añadidos/actualizados para la lógica nueva

### Frontend (stores / UI)
- [ ] Sin `INSERT/UPDATE/DELETE` directo sobre tablas de dominio desde el cliente
- [ ] Sin Base64 para imágenes (Blobs → Storage, ADR-002)
- [ ] Sin `localStorage` para estados de sesión (IndexedDB, ADR-001)
- [ ] Contraste WCAG AA verificado para nuevos colores/componentes (ADR-003)
- [ ] Tests Vitest / Playwright añadidos para la lógica nueva

## Tests realizados

<!-- Describe qué has probado manualmente (entorno, pasos, resultado). -->

## Notas para la revisión

<!-- Contexto adicional, decisiones tomadas, alternativas descartadas, deuda técnica conocida. -->
