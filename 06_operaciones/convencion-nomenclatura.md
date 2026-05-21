# Convención de Nomenclatura — Proyecto U24

**Sprint:** 0 · **ADR relacionado:** Sprint 0.4  
**Resolución de conflicto:** Anexo A de la hoja de ruta (convención `ef-` vs `ef_`)

---

## 1. Migraciones SQL

**Formato obligatorio:** `YYYYMMDDHHMMSS_descripcion_en_snake_case.sql`

```
supabase/migrations/
  20260519000001_init_schema.sql          ✅
  20260520120000_rls_policies.sql         ✅
  20260521000001_stepup_idempotency.sql   ✅

  2026-05-20_rls.sql                      ❌  guiones en fecha
  rls_policies.sql                        ❌  sin timestamp
  20260520_rls.sql                        ❌  timestamp incompleto (solo 8 dígitos)
```

**Reglas:**
- El timestamp tiene 14 dígitos: `YYYYMMDDHHmmSS` en UTC.
- La descripción es `snake_case` en minúsculas, sin guiones, sin espacios.
- Una migración aplicada **no se edita**. Las correcciones van en una migración nueva.
- Las migraciones de corrección deben referenciar la original en un comentario:
  ```sql
  -- Corrección de 20260519000001_init_schema.sql: añade columna faltante.
  ```

El workflow `ci-quality.yml` bloquea el PR si alguna migración no sigue este formato.

---

## 2. Edge Functions

**Prefijo y formato:** `ef-` + `kebab-case` (guiones)

```
supabase/functions/
  ef-alta-empleado/        ✅
  ef-baja-empleado/        ✅
  ef-consumir-pin/         ✅
  ef-renovar-offline-session/  ✅
  ef-cron-cleanup-orphans/ ✅
  ef-cron-rgpd/            ✅

  ef_alta_empleado/        ❌  guión bajo en EF
  ef_reset_password/       ❌  guión bajo en EF  ← pendiente renombrar
  ef_logout/               ❌  guión bajo en EF  ← pendiente renombrar
```

**Justificación del kebab-case para EF:**
- Las Edge Functions se invocan como endpoints HTTP:
  `https://<ref>.supabase.co/functions/v1/ef-alta-empleado`
- Las URLs convencionales usan guiones, no guiones bajos.
- La mayoría del inventario ya usa kebab (9 de 13 funciones).

**Funciones que deben renombrarse (deuda Sprint 4):**

| Nombre actual | Nombre correcto |
|---|---|
| `ef_reset_password` | `ef-reset-password` |
| `ef_generar_token_emergencia` | `ef-generar-token-emergencia` |
| `ef_logout` | `ef-logout` |
| `ef_revocar_sesion_usuario` | `ef-revocar-sesion-usuario` |
| `ef_cron_purge` | `ef-cron-purge` |

> Al renombrar una Edge Function, actualizar también todas las referencias en el código cliente y en los tests.

---

## 3. RPCs (funciones PostgreSQL)

**Prefijo y formato:** `rpc_` + `snake_case`

```sql
rpc_alta_vehiculo              ✅
rpc_baja_vehiculo              ✅
rpc_revocar_y_reemitir_galleta ✅
cancelar_drp                   ⚠️  renombrar a rpc_cancelar_drp (pendiente Sprint 4)
```

**Reglas:**
- Todas las RPCs deben tener `SECURITY DEFINER` y `SET search_path = public`.
- El nombre documenta la intención del negocio, no la implementación técnica.

---

## 4. Triggers

**Prefijo y formato:** `trg_` + `snake_case`

```sql
trg_validar_km_inicio           ✅
trg_checklist_genera_doc7       ✅
trg_audit_cambio_rol            ✅
```

---

## 5. Stores Zustand (frontend)

**Formato:** `use` + `PascalCase` + `Store`

```ts
useAuthStore         ✅
useTerminalStore     ✅
useInventarioStore   ✅
useOfflineQueue      ✅  (es un hook, no exactamente un store — mantener)
```

---

## 6. Ramas git

| Tipo | Formato | Ejemplo |
|---|---|---|
| Feature | `feat/<descripcion-corta>` | `feat/rls-tablas-core` |
| Fix | `fix/<descripcion-corta>` | `fix/tipos-utf8` |
| Sprint | `sprint/<numero>` | `sprint/2` |
| Hotfix | `hotfix/<descripcion>` | `hotfix/rls-empleados` |

La rama `main` está protegida. Solo se mergea via PR con CI verde.

---

## 7. Archivos de test

| Tipo | Ubicación | Formato |
|---|---|---|
| pgTAP | `supabase/tests/` | `<tabla_o_rpc>.test.sql` |
| Vitest | junto al archivo | `<nombre>.test.ts` |
| Playwright | `e2e/` | `<flujo>.spec.ts` |
