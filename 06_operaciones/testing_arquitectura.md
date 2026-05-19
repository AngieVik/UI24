# Arquitectura de Pruebas — Proyecto U24

> Define el entorno de pruebas, los umbrales SLA no negociables y los vectores críticos de seguridad que deben validarse antes de producción. Los casos de prueba específicos y el seguimiento de su ejecución viven en el issue tracker (no aquí).
>
> Actualizado: 2026-05-19.

---

## 1. Entorno de staging

### 1.1 Aislamiento de datos

El entorno de staging opera sobre una **Supabase Branch** independiente del proyecto de producción:

```
proyecto_produccion (main branch)
  └── staging_branch  ←  branch separada, datos sintéticos, nunca PII real
```

| Aspecto | Producción | Staging |
|---|---|---|
| Datos | PII real de empleados y pacientes | Seeds sintéticos (6 usuarios demo, 5 vehículos demo, catálogo completo) |
| Supabase project ref | Asignado al deploy final | Branch de la misma organización |
| Edge Functions | Desplegadas en producción | Desplegadas en la branch de staging |
| Realtime | Real | Real (en la branch) |
| RGPD | Aplica | No aplica — datos sintéticos |

### 1.2 Seeds de staging

El entorno de staging debe poder resetearse a estado inicial en < 5 minutos. El script de reset ejecuta:

```bash
# Reset completo de staging branch a seeds base
supabase db reset --linked   # aplica 0001_init.sql + seeds 01-04
```

Seeds requeridos para pruebas de pre-producción:

| Seed | Contenido |
|---|---|
| `01_catalogo.sql` | 244 ítems de catálogo (IDs 1–244) |
| `02_plantillas.sql` | Plantillas de los 5 tipos de vehículo |
| `03_vehiculos.sql` | 5 vehículos demo con matrícula fija (`*-DEMO`) |
| `04_admin_users.sql` | 6 usuarios demo (uno por rol) con contraseña vía `$SEED_TEST_PASSWORD` |
| `05_inventario_inicial.sql` | Inventario inicializado al 70% del stock_objetivo en todos los vehículos (estado realista) |
| `06_drp_activo.sql` | Un DRP en estado `En_curso` con dotaciones activas (para tests de cancelación y carga) |

### 1.3 Variables de entorno de staging

```
SUPABASE_URL=<staging_branch_url>
SUPABASE_ANON_KEY=<staging_anon_key>
SUPABASE_SERVICE_ROLE_KEY=<staging_service_role_key>
SEED_TEST_PASSWORD=<contraseña_demo_no_productiva>
```

Nunca compartir `SUPABASE_SERVICE_ROLE_KEY` fuera del CI/CD.

---

## 2. Umbrales SLA — No negociables

Estos umbrales definen el criterio de aceptación en pre-producción. Superarlos bloquea el paso a producción.

### 2.1 Rendimiento

| Escenario | Umbral máximo | Cómo medir |
|---|---|---|
| Latencia P95 de RPC en condiciones normales | < 300ms | Logs de Supabase + timing de cliente |
| Latencia P95 canal Realtime `global:alertas_criticas` (entrega de mensaje) | < 500ms desde INSERT en DB | Timestamp en payload vs timestamp de recepción en cliente |
| Tiempo de sincronización de cola offline de 100 mutaciones acumuladas | < 60s en red 4G (> 5 Mbps) | Medir desde `online` event hasta `queue.length === 0` |
| Tiempo de sincronización de cola offline de 1000 mutaciones acumuladas | < 10 min en red 4G | Ídem; aceptable dado el escenario excepcional |
| Arranque de la PWA (Time to Interactive) en dispositivo de gama media | < 4s en 4G | Lighthouse en dispositivo de referencia |
| Compresión de imagen (compressImage utility) | < 2s por imagen de 12 MP | Benchmark en dispositivo de referencia |

### 2.2 Consistencia de datos

| Invariante | Criterio |
|---|---|
| Ninguna mutación de la cola offline genera duplicados en DB tras reintento | ON CONFLICT DO NOTHING / mutation_uuid garantiza idempotencia — verificar en `auditoria_inventario` |
| Excepción absoluta de cuadrante no sobrescribible por reaplicación de patrón | Trigger `trg_doc12_aprobada_a_cuadrante` — verificar antes y después de aplicar patrón |
| Un vehículo nunca en dos DRPs activos simultáneamente | `uq_vehiculo_drp_activo` — intentar INSERT duplicado debe fallar con constraint violation |
| Stock nunca negativo tras ajuste | `rpc_ajuste_manual_stock` — intentar cantidad < 0 debe devolver 422 |

### 2.3 Seguridad (ver §3)

| Invariante | Criterio |
|---|---|
| Ningún rol accede a filas de otro rol sin permiso explícito | Toda política RLS probada con token del rol correspondiente |
| JWT tampered rechazado en todas las Edge Functions | Token con claim falso devuelve 403 |
| RPC SECURITY DEFINER no escalable desde rol sin claim | Llamada sin claim devuelve `insufficient_privilege` |

---

## 3. Vectores de pentest — Prioridad crítica

Estos vectores deben ser validados antes de producción. Los casos detallados y su resultado (pass/fail) van en el issue tracker. Aquí se documenta qué probar y cuál es el comportamiento esperado.

### 3.1 Bypass de RLS

| Vector | Descripción | Comportamiento esperado |
|---|---|---|
| **Lectura directa sin JWT** | Petición REST a tabla protegida sin `Authorization: Bearer` | `[]` o error 401 — nunca datos |
| **JWT de otro rol** | Token de `tes` intentando leer `fichas_empleados` de otros | RLS devuelve solo la fila propia (si existe policy) o `[]` |
| **JWT expirado** | Petición con token caducado | 401 — Supabase Auth rechaza antes de RLS |
| **JWT con claim falso** | Token modificado con `can_manage_rbac: true` sin firma válida | 401 — JWT signature inválida |
| **UPDATE directo en tabla bloqueada** | Intentar `UPDATE inventario_vehiculo` fuera de RPC | `0 rows affected` por policy `USING (false)` |
| **DELETE en tabla inmutable** | Intentar DELETE en `auditoria_rbac` o `doc1_asistencias` | `0 rows affected` por policy `USING (FALSE)` |
| **INSERT en doc1 sin RPC** | Intentar INSERT directo en `doc1_asistencias` | Permitido solo con service role; con JWT normal → blocked |

### 3.2 Fuzz de la cola offline

| Vector | Descripción | Comportamiento esperado |
|---|---|---|
| **Payload malformado en cola** | Mutación con campos faltantes o tipos incorrectos | RPC devuelve 422 o constraint violation; mutación queda en conflicto — no se acepta silenciosamente |
| **mutation_uuid duplicado** | Reintentar la misma mutación con mismo UUID | `ON CONFLICT DO NOTHING` — segundo intento no inserta nada; la respuesta sigue siendo exitosa (idempotente) |
| **Replay de mutación antigua** | Reenviar mutación de hace > 24h tras reconexión | No hay TTL de rechazo en DB; debe aceptarse si es válida. Documentar si se quiere añadir TTL |
| **Cola con 1000 mutaciones distintas** | Generar 1000 mutaciones variadas offline y sincronizar | Todas deben sincronizarse en < 10 min sin error; revisar consumo de memoria IndexedDB (cuota) |
| **Mutación sobre recurso eliminado** | Mutación que referencia un id que ya no existe en DB | FK violation → mutación pasa a `en_conflicto` en bandeja de conflictos |

### 3.3 Escalada de privilegios en RPCs SECURITY DEFINER

| Vector | Descripción | Comportamiento esperado |
|---|---|---|
| **Llamar RPC sin claim** | `rpc_alta_vehiculo` desde rol `tes` (sin `can_manage_fleet`) | `RAISE EXCEPTION 'insufficient_privilege'` → HTTP 400 |
| **Parámetros fuera de rango** | `p_cantidad_nueva = -1` en `rpc_ajuste_manual_stock` | `RAISE EXCEPTION 'ajuste_stock_negativo'` → HTTP 400 |
| **Cancelar DRP ajeno** | `cancelar_drp` con `p_coordinador_id` que no pertenece al usuario autenticado | La RPC valida el claim del JWT, no el parámetro — la validación correcta es por JWT |
| **Alta de empleado sin RRHH** | `ef_alta_empleado` desde rol `flota` | 403 `insufficient_privilege` |

### 3.4 Inyección SQL

PostgreSQL con RLS y prepared statements parametrizados mitiga la mayoría de vectores. Verificar:

| Vector | Descripción | Comportamiento esperado |
|---|---|---|
| **SQL en parámetros de RPC** | `p_matricula = "'; DROP TABLE vehiculos; --"` | No ejecución — los parámetros van como bind variables, no como SQL raw |
| **SQL en campos JSONB** | Intentar inyección via campos del payload de Doc-2 | Insertado como dato literal en JSONB — no interpretado como SQL |

---

## 4. Pruebas de degradación — Realtime kill

### 4.1 Procedimiento de simulación en staging

```typescript
// En staging: simular caída de Realtime sin tocar Supabase
// 1. Activar kill switch via panel admin (gerencia_demo)
//    system_config: realtime_kill_switch = { enabled: true }
// 2. Verificar que todos los clientes abiertos pasan a degraded_mode en < 35s
// 3. Verificar polling cada 30s en global:alertas_criticas
// 4. Realizar una mutación (Doc-8 update) — debe completarse via REST sin error
// 5. Reactivar: system_config: realtime_kill_switch = { enabled: false }
// 6. Verificar que los clientes reconectan y el banner degraded_mode desaparece
```

### 4.2 Criterios de aceptación

| Criterio | Pass |
|---|---|
| Tiempo desde `realtime_kill_switch = true` hasta `degraded_mode` visible en cliente | < 35s (un ciclo de polling) |
| Mutaciones durante degraded_mode sincronizan correctamente | 100% de mutaciones encoladas llegan a DB |
| Reconexión tras desactivar kill switch | < 10s para recuperar canales críticos |
| No hay pérdida de mutaciones al transicionar normal → degraded → normal | Verificar en `auditoria_inventario` y `auditoria_rbac` |

---

## 5. Responsables y cadencia

| Tipo de prueba | Responsable | Cuándo |
|---|---|---|
| Vectores pentest RLS / escalada | Técnico back / líder de proyecto | Una vez antes de producción + tras cada cambio de RLS |
| Fuzz cola offline (100 mutaciones) | Técnico front | Antes de cada release mayor |
| Fuzz cola offline (1000 mutaciones) | Técnico front | Una vez antes de producción |
| Prueba de degradación Realtime | Técnico full-stack | Antes de producción + tras cambios en `useRealtime` |
| Prueba SLA latencia Realtime | Técnico back | Antes de producción en staging con load realista |
| Runbooks (simulacro) | Coordinación + técnico | Una vez antes de producción; revisión anual |
