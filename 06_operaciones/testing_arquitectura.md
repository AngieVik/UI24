# Arquitectura de Pruebas — Proyecto U24

> Define el entorno de pruebas, los umbrales SLA no negociables y los vectores críticos de seguridad que deben validarse antes de producción. Los casos de prueba específicos y el seguimiento de su ejecución viven en el issue tracker (no aquí).
>
> Actualizado: 2026-05-19.

---

## 1. Entorno de staging

### 1.1 Aislamiento de datos

El entorno de staging opera sobre una **Supabase Branch** independiente del proyecto de producción:

```text
proyecto_produccion (main branch)
  └── staging_branch  ←  branch separada, datos sintéticos, nunca PII real
```

| Aspecto              | Producción                        | Staging                                                                 |
| -------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| Datos                | PII real de empleados y pacientes | Seeds sintéticos (6 usuarios demo, 5 vehículos demo, catálogo completo) |
| Supabase project ref | Asignado al deploy final          | Branch de la misma organización                                         |
| Edge Functions       | Desplegadas en producción         | Desplegadas en la branch de staging                                     |
| Realtime             | Real                              | Real (en la branch)                                                     |
| RGPD                 | Aplica                            | No aplica — datos sintéticos                                            |

### 1.2 Seeds de staging

El entorno de staging debe poder resetearse a estado inicial en < 5 minutos. El script de reset ejecuta:

```bash
# Reset completo de staging branch a seeds base
supabase db reset --linked   # aplica 0001_init.sql + seeds 01-04
```

Seeds requeridos para pruebas de pre-producción:

| Seed                        | Contenido                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `01_catalogo.sql`           | 244 ítems de catálogo (IDs 1–244)                                                          |
| `02_plantillas.sql`         | Plantillas de los 5 tipos de vehículo                                                      |
| `03_vehiculos.sql`          | 5 vehículos demo con matrícula fija (`*-DEMO`)                                             |
| `04_admin_users.sql`        | 6 usuarios demo (uno por rol) con contraseña vía `$SEED_TEST_PASSWORD`                     |
| `05_inventario_inicial.sql` | Inventario inicializado al 70% del stock_objetivo en todos los vehículos (estado realista) |
| `06_drp_activo.sql`         | Un DRP en estado `En_curso` con dotaciones activas (para tests de cancelación y carga)     |

### 1.3 Variables de entorno de staging

```text
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

| Escenario                                                                  | Umbral máximo              | Cómo medir                                                |
| -------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------- |
| Latencia P95 de RPC en condiciones normales                                | < 300ms                    | Logs de Supabase + timing de cliente                      |
| Latencia P95 canal Realtime `global:alertas_criticas` (entrega de mensaje) | < 500ms desde INSERT en DB | Timestamp en payload vs timestamp de recepción en cliente |
| Tiempo de sincronización de cola offline de 100 mutaciones acumuladas      | < 60s en red 4G (> 5 Mbps) | Medir desde `online` event hasta `queue.length === 0`     |
| Tiempo de sincronización de cola offline de 1000 mutaciones acumuladas     | < 10 min en red 4G         | Ídem; aceptable dado el escenario excepcional             |
| Arranque de la PWA (Time to Interactive) en dispositivo de gama media      | < 4s en 4G                 | Lighthouse en dispositivo de referencia                   |
| Compresión de imagen (compressImage utility)                               | < 2s por imagen de 12 MP   | Benchmark en dispositivo de referencia                    |

### 2.2 Consistencia de datos

| Invariante                                                                   | Criterio                                                                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Ninguna mutación de la cola offline genera duplicados en DB tras reintento   | ON CONFLICT DO NOTHING / mutation_uuid garantiza idempotencia — verificar en `auditoria_inventario` |
| Excepción absoluta de cuadrante no sobrescribible por reaplicación de patrón | Trigger `trg_doc12_aprobada_a_cuadrante` — verificar antes y después de aplicar patrón              |
| Un vehículo nunca en dos DRPs activos simultáneamente                        | `uq_vehiculo_drp_activo` — intentar INSERT duplicado debe fallar con constraint violation           |
| Stock nunca negativo tras ajuste                                             | `rpc_ajuste_manual_stock` — intentar cantidad < 0 debe devolver 422                                 |

### 2.3 Seguridad (ver §3)

| Invariante                                                  | Criterio                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------- |
| Ningún rol accede a filas de otro rol sin permiso explícito | Toda política RLS probada con token del rol correspondiente |
| JWT tampered rechazado en todas las Edge Functions          | Token con claim falso devuelve 403                          |
| RPC SECURITY DEFINER no escalable desde rol sin claim       | Llamada sin claim devuelve `insufficient_privilege`         |

---

## 3. Vectores de pentest — Prioridad crítica

Estos vectores deben ser validados antes de producción. Los casos detallados y su resultado (pass/fail) van en el issue tracker. Aquí se documenta qué probar y cuál es el comportamiento esperado.

### 3.1 Bypass de RLS

| Vector                                | Descripción                                                   | Comportamiento esperado                                    |
| ------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| **Lectura directa sin JWT**           | Petición REST a tabla protegida sin `Authorization: Bearer`   | `[]` o error 401 — nunca datos                             |
| **JWT de otro rol**                   | Token de `tes` intentando leer `fichas_empleados` de otros    | RLS devuelve solo la fila propia (si existe policy) o `[]` |
| **JWT expirado**                      | Petición con token caducado                                   | 401 — Supabase Auth rechaza antes de RLS                   |
| **JWT con claim falso**               | Token modificado con `can_manage_rbac: true` sin firma válida | 401 — JWT signature inválida                               |
| **UPDATE directo en tabla bloqueada** | Intentar `UPDATE inventario_vehiculo` fuera de RPC            | `0 rows affected` por policy `USING (false)`               |
| **DELETE en tabla inmutable**         | Intentar DELETE en `auditoria_rbac` o `doc1_asistencias`      | `0 rows affected` por policy `USING (FALSE)`               |
| **INSERT en doc1 sin RPC**            | Intentar INSERT directo en `doc1_asistencias`                 | Permitido solo con service role; con JWT normal → blocked  |

### 3.2 Fuzz de la cola offline

| Vector                                 | Descripción                                            | Comportamiento esperado                                                                                     |
| -------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Payload malformado en cola**         | Mutación con campos faltantes o tipos incorrectos      | RPC devuelve 422 o constraint violation; mutación queda en conflicto — no se acepta silenciosamente         |
| **mutation_uuid duplicado**            | Reintentar la misma mutación con mismo UUID            | `ON CONFLICT DO NOTHING` — segundo intento no inserta nada; la respuesta sigue siendo exitosa (idempotente) |
| **Replay de mutación antigua**         | Reenviar mutación de hace > 24h tras reconexión        | No hay TTL de rechazo en DB; debe aceptarse si es válida. Documentar si se quiere añadir TTL                |
| **Cola con 1000 mutaciones distintas** | Generar 1000 mutaciones variadas offline y sincronizar | Todas deben sincronizarse en < 10 min sin error; revisar consumo de memoria IndexedDB (cuota)               |
| **Mutación sobre recurso eliminado**   | Mutación que referencia un id que ya no existe en DB   | FK violation → mutación pasa a `en_conflicto` en bandeja de conflictos                                      |

### 3.3 Escalada de privilegios en RPCs SECURITY DEFINER

| Vector                        | Descripción                                                                   | Comportamiento esperado                                                             |
| ----------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Llamar RPC sin claim**      | `rpc_alta_vehiculo` desde rol `tes` (sin `can_manage_fleet`)                  | `RAISE EXCEPTION 'insufficient_privilege'` → HTTP 400                               |
| **Parámetros fuera de rango** | `p_cantidad_nueva = -1` en `rpc_ajuste_manual_stock`                          | `RAISE EXCEPTION 'ajuste_stock_negativo'` → HTTP 400                                |
| **Cancelar DRP ajeno**        | `cancelar_drp` con `p_coordinador_id` que no pertenece al usuario autenticado | La RPC valida el claim del JWT, no el parámetro — la validación correcta es por JWT |
| **Alta de empleado sin RRHH** | `ef_alta_empleado` desde rol `flota`                                          | 403 `insufficient_privilege`                                                        |

### 3.4 Inyección SQL

PostgreSQL con RLS y prepared statements parametrizados mitiga la mayoría de vectores. Verificar:

| Vector                       | Descripción                                        | Comportamiento esperado                                                |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| **SQL en parámetros de RPC** | `p_matricula = "'; DROP TABLE vehiculos; --"`      | No ejecución — los parámetros van como bind variables, no como SQL raw |
| **SQL en campos JSONB**      | Intentar inyección via campos del payload de Doc-2 | Insertado como dato literal en JSONB — no interpretado como SQL        |

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

| Criterio                                                                            | Pass                                                   |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Tiempo desde `realtime_kill_switch = true` hasta `degraded_mode` visible en cliente | < 35s (un ciclo de polling)                            |
| Mutaciones durante degraded_mode sincronizan correctamente                          | 100% de mutaciones encoladas llegan a DB               |
| Reconexión tras desactivar kill switch                                              | < 10s para recuperar canales críticos                  |
| No hay pérdida de mutaciones al transicionar normal → degraded → normal             | Verificar en `auditoria_inventario` y `auditoria_rbac` |

---

## 5. Responsables y cadencia

| Tipo de prueba                      | Responsable                      | Cuándo                                                |
| ----------------------------------- | -------------------------------- | ----------------------------------------------------- |
| Vectores pentest RLS / escalada     | Técnico back / líder de proyecto | Una vez antes de producción + tras cada cambio de RLS |
| Fuzz cola offline (100 mutaciones)  | Técnico front                    | Antes de cada release mayor                           |
| Fuzz cola offline (1000 mutaciones) | Técnico front                    | Una vez antes de producción                           |
| Prueba de degradación Realtime      | Técnico full-stack               | Antes de producción + tras cambios en `useRealtime`   |
| Prueba SLA latencia Realtime        | Técnico back                     | Antes de producción en staging con load realista      |
| Runbooks (simulacro)                | Coordinación + técnico           | Una vez antes de producción; revisión anual           |

---

## 6. Protocolo de ejecución de pentest y plantilla de resultados (U-08)

> Los vectores de prueba están definidos en §3. Esta sección especifica cómo ejecutarlos
> y qué registrar en el issue tracker. Un vector **FAIL** bloquea el paso a producción
> y genera una incidencia de severidad `blocker` en el issue tracker.

### 6.1 Requisitos previos de ejecución

```
Entorno:   Staging branch (NUNCA producción)
Estado DB: Seeds 01-06 aplicados (supabase db reset --linked)
Herramientas:
  - Browser DevTools (consola + Network tab)
  - Postman / curl para peticiones REST directas
  - jwt.io para inspeccionar y manipular tokens JWT (pruebas de claim falso)
  - Un cliente Supabase JS en la consola del navegador del staging
  
Tokens necesarios (obtener desde staging):
  - JWT de rol tes_demo     → para pruebas de aislamiento RLS
  - JWT de rol coordinacion_demo → para pruebas de escalada de privilegios
  - JWT expirado (dejar expirar o modificar exp manualmente en jwt.io)
  - JWT con claim falsificado (editar payload en jwt.io — la firma será inválida)
```

### 6.2 Plantilla de resultados por vector

Registrar cada fila en el issue tracker con los campos: `Vector`, `Resultado`, `Evidencia`, `Tester`, `Fecha`. Los issues FAIL usan la etiqueta `blocker` y `pentest`.

#### §3.1 — Bypass de RLS

| # | Vector | Resultado | Evidencia | Issue |
|---|---|---|---|---|
| 3.1.A | Lectura directa sin JWT | ⬜ Pass / ⬜ Fail | Respuesta HTTP + body | — |
| 3.1.B | JWT de otro rol (tes leyendo fichas_empleados ajenas) | ⬜ Pass / ⬜ Fail | Array vacío `[]` o error | — |
| 3.1.C | JWT expirado | ⬜ Pass / ⬜ Fail | HTTP 401 recibido | — |
| 3.1.D | JWT con claim falso (firma inválida) | ⬜ Pass / ⬜ Fail | HTTP 401 recibido | — |
| 3.1.E | UPDATE directo en `inventario_vehiculo` | ⬜ Pass / ⬜ Fail | `0 rows affected` | — |
| 3.1.F | DELETE en `auditoria_rbac` | ⬜ Pass / ⬜ Fail | `0 rows affected` | — |
| 3.1.G | INSERT en `doc1_asistencias` sin RPC | ⬜ Pass / ⬜ Fail | Bloqueado con JWT normal | — |

**Comando de referencia para 3.1.A:**
```bash
curl -X GET 'https://<staging_url>/rest/v1/fichas_empleados' \
  -H 'apikey: <anon_key>'
# Esperado: [] o 401 — nunca filas de datos
```

**Comando de referencia para 3.1.E:**
```bash
curl -X PATCH 'https://<staging_url>/rest/v1/inventario_vehiculo?id_vehiculo=eq.1111-DEMO' \
  -H 'Authorization: Bearer <jwt_tes_demo>' \
  -H 'apikey: <anon_key>' \
  -H 'Content-Type: application/json' \
  -d '{"stock_real": 999}'
# Esperado: 0 rows updated
```

#### §3.2 — Fuzz de cola offline

| # | Vector | Resultado | Evidencia | Issue |
|---|---|---|---|---|
| 3.2.A | Payload malformado (campo faltante) | ⬜ Pass / ⬜ Fail | 422 o constraint violation, no aceptación silenciosa | — |
| 3.2.B | mutation_uuid duplicado | ⬜ Pass / ⬜ Fail | Segunda llamada: éxito sin insertar (ON CONFLICT DO NOTHING) | — |
| 3.2.C | Replay de mutación antigua (> 24h) | ⬜ Pass / ⬜ Fail | Aceptada (no hay TTL de rechazo) — documentar si se añade | — |
| 3.2.D | Cola de 1000 mutaciones → SLA | ⬜ Pass / ⬜ Fail | Tiempo total < 10 min (ver §7) | — |
| 3.2.E | Mutación sobre recurso eliminado | ⬜ Pass / ⬜ Fail | FK violation → mutación en `en_conflicto` | — |

#### §3.3 — Escalada de privilegios en RPCs SECURITY DEFINER

| # | Vector | Resultado | Evidencia | Issue |
|---|---|---|---|---|
| 3.3.A | `rpc_alta_vehiculo` desde rol `tes` | ⬜ Pass / ⬜ Fail | HTTP 400 `insufficient_privilege` | — |
| 3.3.B | `rpc_ajuste_manual_stock` con `p_cantidad_nueva = -1` | ⬜ Pass / ⬜ Fail | HTTP 400 / 422 con mensaje de error | — |
| 3.3.C | `cancelar_drp` con coordinador_id ajeno | ⬜ Pass / ⬜ Fail | Validado por claim JWT, no por parámetro | — |
| 3.3.D | `ef_alta_empleado` desde rol `responsable_flota` | ⬜ Pass / ⬜ Fail | HTTP 403 `insufficient_privilege` | — |

#### §3.4 — Inyección SQL

| # | Vector | Resultado | Evidencia | Issue |
|---|---|---|---|---|
| 3.4.A | SQL en `p_matricula` de RPC | ⬜ Pass / ⬜ Fail | No ejecución — parámetro tratado como literal | — |
| 3.4.B | SQL en campo JSONB de Doc-2 | ⬜ Pass / ⬜ Fail | Insertado como dato literal en JSONB | — |

### 6.3 Criterio de cierre

- **Todo Pass** → Se genera un issue cerrado `pentest-ok` con la tabla de resultados adjunta como comentario.
- **Cualquier Fail** → Issue `blocker` abierto, etiqueta `pentest-fail`. El paso a producción queda bloqueado hasta resolución y re-test del vector afectado.
- **Fecha máxima** de ejecución: 5 días hábiles antes de la fecha de go-live programada.

---

## 7. Protocolo de prueba de carga — 1000 mutaciones offline (U-09)

> Valida el SLA de `< 10 min` para sincronizar una cola de 1000 mutaciones acumuladas.
> Corresponde al escenario definido en §2.1. Ejecutar una sola vez en staging antes de
> producción.

### 7.1 Prerequisitos

```
Entorno:  Staging branch con seeds 01-06 aplicados
Doc-8:    El seed 06_drp_activo.sql debe incluir Doc-8 abierto para cada vehículo DEMO
          (verificar con: SELECT * FROM doc8_partes_trabajo WHERE estado = 'Borrador_En_Curso')
Red:      Conexión 4G real o simulada (≥ 5 Mbps). Wi-Fi ≠ 4G — probar con datos móviles
          del dispositivo o throttling de DevTools: Network tab → "Fast 4G"
```

### 7.2 Script de inyección (consola del navegador)

Ejecutar con la sesión activa del usuario `coordinacion_demo` en la app de staging:

```javascript
// ─── PASO 1: Inyectar 1000 mutaciones en IndexedDB ───────────────────────────
// Ejecutar en la consola del navegador (pestaña de staging abierta y autenticada)

;(async () => {
  // IDs de Doc-8 demo (asegúrate de que existen en staging)
  const DEMO_DOC8_IDS = [
    '<doc8_id_demo_1>',   // reemplazar con UUID real del seed
    '<doc8_id_demo_2>',
    '<doc8_id_demo_3>',
    '<doc8_id_demo_4>',
    '<doc8_id_demo_5>',
  ]
  const DEMO_VEHICULO_IDS = ['1111-DEMO', '2222-DEMO', '3333-DEMO', '4444-DEMO', '5555-DEMO']
  const DEMO_ITEM_ID      = 1   // ítem de catálogo ID 1 — material genérico de prueba
  const DEMO_LOCATION_ID  = '<location_id_demo>'  // subinventario vehículo 1111-DEMO

  // Generar 1000 mutaciones variadas
  const mutaciones = Array.from({ length: 1000 }, (_, i) => {
    const idx = i % 5
    const mutationUuid = crypto.randomUUID()

    // Alternar entre tipos de mutación para simular tráfico real
    if (i % 4 === 0) {
      // 25% — actualización de km en Doc-8
      return {
        id:        crypto.randomUUID(),
        tipo:      'doc8_update_km',
        estado:    'pendiente',
        intentos:  0,
        payload: {
          mutation_uuid:   mutationUuid,
          doc8_id:         DEMO_DOC8_IDS[idx],
          km_actual:       10000 + i,
          timestamp_evento: new Date(Date.now() - (1000 - i) * 60_000).toISOString(),
        },
        creado_at: Date.now() - (1000 - i) * 1000,
      }
    } else if (i % 4 === 1) {
      // 25% — evento físico del vehículo (GPS snapshot)
      return {
        id:        crypto.randomUUID(),
        tipo:      'evento_fisico_vehiculo',
        estado:    'pendiente',
        intentos:  0,
        payload: {
          mutation_uuid:   mutationUuid,
          id_vehiculo:     DEMO_VEHICULO_IDS[idx],
          tipo_evento:     'gps_snapshot',
          km_odometro:     10000 + i,
          timestamp_evento: new Date(Date.now() - (1000 - i) * 60_000).toISOString(),
        },
        creado_at: Date.now() - (1000 - i) * 1000,
      }
    } else {
      // 50% — gasto de material (Doc-6) — más costoso, test de throughput real
      return {
        id:        crypto.randomUUID(),
        tipo:      'doc6_create',
        estado:    'pendiente',
        intentos:  0,
        payload: {
          mutation_uuid:   mutationUuid,
          location_id:     DEMO_LOCATION_ID,
          item_id:         DEMO_ITEM_ID,
          cantidad:        1,
          id_nombre_registrador: 'coordinacion_demo',
          timestamp_apertura:   new Date(Date.now() - (1000 - i) * 60_000).toISOString(),
        },
        creado_at: Date.now() - (1000 - i) * 1000,
      }
    }
  })

  // Escribir directamente en idb-keyval (DB: keyval-db, Store: keyval)
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('keyval-db', 1)
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('keyval', 'readwrite')
      tx.objectStore('keyval').put(mutaciones, 'offline_queue')
      tx.oncomplete = resolve
      tx.onerror    = () => reject(tx.error)
    }
    req.onerror = () => reject(req.error)
  })

  console.log(`✅ ${mutaciones.length} mutaciones inyectadas en IndexedDB`)
  console.log('▶  Ejecuta ahora el PASO 2 para iniciar la sincronización')
})()
```

### 7.3 Script de medición y disparo (consola del navegador)

```javascript
// ─── PASO 2: Iniciar sincronización y medir tiempo ────────────────────────────
// Ejecutar INMEDIATAMENTE después del PASO 1

;(async () => {
  // Acceder al store de la cola offline via Zustand
  // (la app expone los stores via window.__U24_STORES__ en builds de staging)
  const queueStore = window.__U24_STORES__?.useOfflineQueue?.getState()
  if (!queueStore) {
    console.error('❌ No se encontró useOfflineQueue en window.__U24_STORES__')
    console.log('Alternativa: usa el panel de Zustand DevTools para llamar procesarCola()')
    return
  }

  const inicio = performance.now()
  console.log(`⏱  Iniciando sincronización de ${queueStore.queue?.length ?? '?'} mutaciones...`)
  console.log(`⏱  Timestamp inicio: ${new Date().toISOString()}`)

  // Forzar inicio de procesamiento (el store detecta online y llama esto automáticamente,
  // pero lo llamamos explícitamente para el test)
  await queueStore.procesarCola()

  const fin     = performance.now()
  const durSeg  = ((fin - inicio) / 1000).toFixed(1)
  const durMin  = (durSeg / 60).toFixed(2)

  console.log(`\n📊 RESULTADO:`)
  console.log(`   Tiempo total:   ${durSeg}s (${durMin} min)`)
  console.log(`   SLA < 10 min:   ${parseFloat(durMin) < 10 ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`   Mutaciones OK:  verificar en Supabase Dashboard → Logs`)
  console.log(`   Timestamp fin:  ${new Date().toISOString()}`)
})()
```

### 7.4 Verificación post-test en Supabase

```sql
-- Ejecutar en Supabase Studio → SQL Editor (staging branch)

-- 1. Verificar que los Doc-6 demo se insertaron correctamente
SELECT COUNT(*) as total_gastos_demo
  FROM doc6_gastos_material
 WHERE id_nombre_registrador = 'coordinacion_demo'
   AND timestamp_apertura >= NOW() - INTERVAL '2 hours';
-- Esperado: ~500 filas (el 50% de las mutaciones eran doc6_create)

-- 2. Verificar que no hubo mutaciones descartadas silenciosamente
-- (revisar bandeja de conflictos en la UI — debe estar vacía)

-- 3. Reset del staging tras el test
-- supabase db reset --linked
```

### 7.5 Criterios de aceptación

| Métrica | Umbral | Resultado |
|---|---|---|
| Tiempo total de sincronización (1000 mutaciones) | **< 10 min** | ⬜ Pass / ⬜ Fail |
| Mutaciones en estado `fallido` al terminar | 0 (todas en `completado`) | ⬜ Pass / ⬜ Fail |
| Mutaciones en bandeja de conflictos | 0 | ⬜ Pass / ⬜ Fail |
| Memoria del navegador (heap snapshot) antes/después | < 10 MB de diferencia | ⬜ Pass / ⬜ Fail |
| Ningún error 429 (rate limit) en Network tab | Sin errores 429 | ⬜ Pass / ⬜ Fail |

> Si se reciben errores 429, documentar la tasa de aparición y ajustar `procesarCola()`
> para añadir un delay entre lotes (ej. 100 mutaciones/batch con 500ms de pausa).

---

## 8. Simulacro de runbooks en staging — RB-01 a RB-04 (U-10)

> Cada simulacro debe ejecutarse con el equipo completo (al menos 1 técnico + 1 coordinador).
> La persona que actúa como "observador" cronometra los tiempos y valida los criterios de
> aceptación. Al finalizar cada simulacro: `supabase db reset --linked` para volver al
> estado base.

### 8.1 Simulacro RB-01 — Supabase project caído

**Runbook de referencia:** `runbooks.md RB-01`  
**Duración estimada:** 20-30 min

**Preparación:**
```
1. Abrir la app en 2 terminales (simulan 2 ambulancias)
2. Tener un DRP en estado En_curso (seed 06 lo proporciona)
3. Abrir un Doc-8 activo en el terminal 1
```

**Inyección de fallo:**
```bash
# Opción A (recomendada): revocar temporalmente la anon key en Supabase Dashboard
# Supabase Dashboard → Settings → API → regenerar anon key
# (guardar la original para restaurar)

# Opción B: bloquear la URL de Supabase a nivel de red (hosts file o proxy)
# 127.0.0.1  <staging_project_ref>.supabase.co
```

**Pasos del simulacro (coordinador ejecuta las acciones de usuario):**
```
T+0:00  → Aplicar inyección de fallo
T+0:00  → Observador inicia cronómetro
T+0:XX  → ¿El banner "Sin conexión" aparece en todos los terminales? [Pass/Fail]
T+0:XX  → ¿Los terminales siguen en estado_1 sin forzar re-login? [Pass/Fail]
T+0:XX  → Registrar un Doc-8 update en terminal 1 → ¿se encola sin error? [Pass/Fail]
T+0:XX  → Intentar crear un DRP → ¿se muestra "Sin conexión — esta acción requiere red"? [Pass/Fail]
T+5:00  → Restaurar la anon key original
T+5:XX  → ¿La cola offline sincroniza al reconectar? [Pass/Fail — SLA: < 60s para 5 mutaciones]
T+5:XX  → ¿El GPS reanuda pings en visor_seguimiento_operativo? [Pass/Fail]
```

**Criterios de aceptación:**

| Criterio | SLA / Esperado | Pass/Fail |
|---|---|---|
| Banner offline visible | < 10s desde el fallo | ⬜ |
| Terminales mantienen estado_1 sin re-login | Siempre | ⬜ |
| Mutaciones encoladas durante outage | 100% sincronizadas al recuperar | ⬜ |
| DRP bloqueado durante outage | Toast "requiere red" visible | ⬜ |
| GPS reanuda tras recuperación | < 60s | ⬜ |

---

### 8.2 Simulacro RB-02 — Realtime WebSocket caído

**Runbook de referencia:** `runbooks.md RB-02`  
**Duración estimada:** 15-20 min

**Preparación:**
```
1. Abrir la app en 2 terminales con al menos 1 mensaje de bandeja reciente
2. Verificar que el visor GPS muestra posición actualizada
```

**Inyección de fallo (vía panel admin):**
```
1. Login como gerencia_demo
2. Navegar a: Administración → Configuración → system_config
3. Modificar: realtime_kill_switch = { enabled: true }
```

**Pasos del simulacro:**
```
T+0:00  → Activar realtime_kill_switch = true
T+0:XX  → ¿El banner "Modo degradado" aparece en todos los terminales? [Pass — SLA: < 35s]
T+0:XX  → ¿Las bandejas muestran el último estado cacheado? [Pass/Fail]
T+1:00  → Enviar un mensaje de bandeja desde el panel admin → ¿llega vía polling en < 60s? [Pass/Fail]
T+2:00  → Ejecutar un Doc-8 update (REST sigue funcionando) → ¿se completa sin error? [Pass/Fail]
T+5:00  → Desactivar realtime_kill_switch = false
T+5:XX  → ¿El banner "Modo degradado" desaparece? [Pass — SLA: < 10s]
T+5:XX  → ¿El GPS reanuda actualizaciones push? [Pass/Fail]
```

**Criterios de aceptación:**

| Criterio | SLA / Esperado | Pass/Fail |
|---|---|---|
| Banner degraded_mode visible | < 35s | ⬜ |
| Polling 30s activo en canales críticos | Mensaje de prueba llega en < 60s | ⬜ |
| Mutaciones REST no afectadas | Doc-8 update completo | ⬜ |
| Reconexión tras desactivar kill switch | < 10s | ⬜ |

---

### 8.3 Simulacro RB-03 — Cola offline atascada

**Runbook de referencia:** `runbooks.md RB-03`  
**Duración estimada:** 20-30 min

**Preparación:**
```
1. Resetear staging a seeds base (supabase db reset --linked)
2. Identificar un item_id que exista en el catálogo
3. Eliminar ese ítem del inventario del vehículo 1111-DEMO (para forzar FK violation)
```

**Inyección de fallo:**
```javascript
// En la consola del terminal de prueba (usuario tes_demo autenticado):
// Inyectar una mutación que fallará por FK violation (item eliminado)
;(async () => {
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('keyval-db', 1)
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction('keyval', 'readwrite')
      const store = tx.objectStore('keyval')
      store.get('offline_queue').onsuccess = (e) => {
        const queue = e.target.result ?? []
        queue.push({
          id: crypto.randomUUID(),
          tipo: 'doc6_create',
          estado: 'pendiente',
          intentos: 0,
          payload: {
            mutation_uuid: crypto.randomUUID(),
            location_id:   '<location_id_eliminada>',  // location que ya no existe
            item_id:       9999,                        // ítem inexistente
            cantidad:      1,
            id_nombre_registrador: 'tes_demo',
            timestamp_apertura:   new Date().toISOString(),
          },
          creado_at: Date.now(),
        })
        store.put(queue, 'offline_queue')
        tx.oncomplete = resolve
        tx.onerror    = () => reject(tx.error)
      }
    }
    req.onerror = () => reject(req.error)
  })
  console.log('✅ Mutación fallida inyectada')
})()
```

**Pasos del simulacro:**
```
T+0:00  → Inyectar la mutación fallida vía el script anterior
T+0:XX  → Ir offline y volver online para disparar procesarCola()
T+0:XX  → ¿La mutación pasa a estado 'en_conflicto' tras N intentos? [Pass/Fail]
T+1:00  → ¿Aparece en la bandeja de conflictos del usuario? [Pass/Fail]
T+1:XX  → Usar "Descartar mutación" en la bandeja de conflictos → ¿se elimina? [Pass/Fail]
T+2:00  → ¿La cola queda vacía sin mutaciones bloqueadas? [Pass/Fail]
```

**Criterios de aceptación:**

| Criterio | Esperado | Pass/Fail |
|---|---|---|
| Mutación pasa a `en_conflicto` | Tras 3 intentos fallidos | ⬜ |
| Visible en bandeja de conflictos | Sí, con payload legible | ⬜ |
| Descarte manual funciona | Cola vacía después | ⬜ |
| Otras mutaciones no bloqueadas | La cola continúa procesando las demás | ⬜ |

---

### 8.4 Simulacro RB-04 — Terminal sin GPS / GPS congelado

**Runbook de referencia:** `runbooks.md RB-04`  
**Duración estimada:** 15 min

**Preparación:**
```
1. Abrir la app en terminal 1 como pilot_demo con vehículo 1111-DEMO asignado
2. Verificar que el visor_seguimiento_operativo muestra el badge GPS en verde
```

**Inyección de fallo:**
```
Opción A (recomendada): Denegar permisos de geolocalización en el navegador
  Chrome: icono de candado → Ubicación → Bloquear → Recargar

Opción B: DevTools → Sensors → Location → Seleccionar "Location unavailable"
```

**Pasos del simulacro:**
```
T+0:00  → Bloquear geolocalización en el terminal de prueba
T+0:XX  → ¿El badge GPS en visor_seguimiento muestra timestamp antiguo en < 15 min? [Pass/Fail]
T+5:00  → Coordinador intenta localizar el vehículo → ¿el último ping cacheado sigue visible? [Pass/Fail]
T+5:XX  → Pilot "restablece GPS": habilitar permisos y recargar app
T+5:XX  → ¿El GPS reanuda pings en < 2 ciclos (60s)? [Pass/Fail]
T+10:00 → Simulación de "GPS no se recupera": coordinador toma control manual
           ¿Hay mecanismo para marcar el vehículo como "GPS no disponible" en el visor? [Observación]
```

**Criterios de aceptación:**

| Criterio | SLA / Esperado | Pass/Fail |
|---|---|---|
| Visor muestra badge de timestamp antiguo | Sin crash de la app | ⬜ |
| Último ping cacheado sigue visible | Siempre | ⬜ |
| GPS reanuda tras restablecer permiso | < 60s | ⬜ |
| App no entra en estado de error irrecuperable | Sigue operable sin GPS | ⬜ |

### 8.5 Registro de resultados del simulacro

```
Fecha del simulacro: ________________
Participantes:       ________________
Entorno:             Staging branch — supabase db reset aplicado: ⬜ Sí / ⬜ No

RB-01: ⬜ Todos los criterios PASS  /  ⬜ Fallos: ______________
RB-02: ⬜ Todos los criterios PASS  /  ⬜ Fallos: ______________
RB-03: ⬜ Todos los criterios PASS  /  ⬜ Fallos: ______________
RB-04: ⬜ Todos los criterios PASS  /  ⬜ Fallos: ______________

Incidencias abiertas en issue tracker: ________________
Aprobado para go-live: ⬜ Sí  /  ⬜ No — pendiente resolución de incidencias
```

---

## 9. Smoke test post-go-live (U-11)

> Checklist de 10 operaciones críticas a ejecutar en **producción real** durante los
> primeros 60 minutos tras el go-live. Diseñado para **no generar datos permanentes
> inborrables** — todas las escrituras usan el vehículo `1111-DEMO` (matrícula con
> sufijo `-DEMO`) que está excluido de los KPIs de negocio.
>
> **Convención `-DEMO`:** todos los queries de métricas y dashboards filtran con
> `WHERE matricula NOT LIKE '%-DEMO'`. Los vehículos DEMO existen en producción como
> registros de test de infraestructura, no como flota operativa real.
>
> **Ejecutor:** técnico + coordinador de guardia. Tiempo estimado: 45-60 min.

### Requisitos previos al inicio

```
☐ Supabase project producción activo (status.supabase.com: operational)
☐ Dominio / URL de producción accesible desde dispositivo de referencia
☐ Vehículo 1111-DEMO existe en DB (SELECT * FROM vehiculos WHERE matricula = '1111-DEMO')
☐ Usuarios demo activos (coordinacion_demo, tes_demo) con contraseñas conocidas
☐ Dispositivo Android/tablet con Chrome (para test de push en Android)
☐ Canal de comunicación con técnico (radio o mensajería interna) durante el smoke test
```

### Checklist

---

**✅ PUNTO 1 — Login de cada rol (solo lectura)**  
*Genera: solo sesión en sessionStorage — desaparece al cerrar pestaña*

```
Ejecutar login exitoso con:
  ☐ coordinacion_demo (contraseña de producción)
  ☐ tes_demo
  ☐ logistica_demo (si existe en seeds de producción)

Criterio: Los tres logins generan estado_1 sin error.
Tiempo máximo: 5 min.
Limpiar: cerrar pestañas (sessionStorage se borra automáticamente).
```

---

**✅ PUNTO 2 — Bandejas en tiempo real**  
*Genera: nada — solo lectura de canal Realtime*

```
☐ Abrir bandeja de coordinación desde coordinacion_demo
☐ Enviar un mensaje de prueba desde un segundo terminal (tes_demo → coordinacion)
☐ Verificar que el mensaje aparece en la bandeja en < 5s sin recargar

Criterio: Mensaje visible con badge "no leído" en < 5s.
Cleanup: Marcar el mensaje como leído y archivar.
```

---

**✅ PUNTO 3 — Marquesina y tablón de anuncios**  
*Genera: nada — solo lectura*

```
☐ Verificar que la marquesina carga texto (no en blanco)
☐ Verificar que el tablón de anuncios tiene al menos 1 entrada visible

Criterio: Contenido visible sin spinner infinito.
```

---

**✅ PUNTO 4 — GPS de vehículo 1111-DEMO**  
*Genera: 1 fila en `eventos_fisicos_vehiculo` con matricula='1111-DEMO' — excluida de métricas*

```
☐ Login como tes_demo con rol pilot asignado a 1111-DEMO
☐ Verificar que useGPS empieza a emitir pings (consola del navegador: "[GPS] ping enviado")
☐ En visor_seguimiento_operativo: badge GPS de 1111-DEMO actualizado en < 35s

Criterio: Badge GPS verde con timestamp reciente.
```

---

**✅ PUNTO 5 — Inventario de 1111-DEMO**  
*Genera: nada — solo lectura*

```
☐ Abrir inventario del vehículo 1111-DEMO
☐ Verificar que el catálogo carga correctamente (≥ 1 ítem visible)
☐ Verificar stock_real vs stock_objetivo para al menos 1 ítem

Criterio: Inventario visible sin error, datos coherentes con el seed de producción.
```

---

**✅ PUNTO 6 — Doc-8: apertura de parte de trabajo**  
*Genera: 1 fila en `doc8_partes_trabajo` con estado='Borrador_En_Curso' — limpiable en PUNTO 7*

```
☐ Verificar que 1111-DEMO no tiene Doc-8 activo (condición previa)
   SELECT * FROM doc8_partes_trabajo WHERE id_vehiculo = '1111-DEMO' AND estado = 'Borrador_En_Curso'
☐ Abrir nuevo parte de trabajo para 1111-DEMO (tes_demo como pilot)
☐ Introducir km_inicio = 10000

Criterio: Doc-8 abierto, estado 'Borrador_En_Curso' confirmado en DB.
```

---

**✅ PUNTO 7 — Doc-8: cierre administrativo**  
*Genera: cierre del Doc-8 creado en PUNTO 6 — queda en historial como parte cerrado de test*

```
☐ Desde coordinacion_demo: ejecutar forzar_checkout_administrativo sobre el Doc-8 del PUNTO 6
☐ Parámetros: km_fin = NULL (permitido por C-04 cuando cerrado_por_admin_id IS NOT NULL)

Criterio: Doc-8 pasa a estado 'Cerrado_Admin', cierre exitoso.
Nota: El parte queda en historial pero:
  - matricula = '1111-DEMO' → excluido de KPIs de flota operativa
  - Puede identificarse por cerrado_por_admin_id = 'coordinacion_demo' + timestamp
```

---

**✅ PUNTO 8 — Cola offline: ciclo completo**  
*Genera: 1 mutación sincronizada — de tipo evento ligero, excluible por matricula DEMO*

```
☐ En el dispositivo: activar "Modo avión" (desconectar red)
☐ Intentar registrar un evento en Doc-8 de 1111-DEMO (ej. actualización de km)
☐ Verificar que BannerOffline aparece con "última sincronización hace X"
☐ Verificar que la mutación queda en useOfflineQueue (pendingCount = 1)
☐ Desactivar "Modo avión"
☐ Verificar que la mutación se sincroniza en < 30s (pendingCount = 0)

Criterio: BannerOffline visible → desaparece tras reconexión. Cola vacía.
```

---

**✅ PUNTO 9 — Notificación push (si U-06 está activo)**  
*Genera: 1 fila en `doc11_avisos` — tipo 'smoke_test', legible y archivable*

```
☐ Verificar que coordinacion_demo tiene push_subscriptions activa
   SELECT * FROM push_subscriptions WHERE id_nombre = 'coordinacion_demo'
☐ Insertar un aviso de prueba desde Supabase Studio (SQL directo):
   INSERT INTO doc11_avisos (tipo_aviso, destinatario_rol, contenido, id_nombre_emisor, leido)
   VALUES ('smoke_test', 'coordinacion', '{"mensaje": "Smoke test go-live OK"}', 'system', false)
☐ Verificar que la push notification llega al dispositivo en < 30s

Criterio: Notificación recibida en dispositivo en background.
Si push no activo (U-06 no desplegado aún): ☐ Marcar como N/A
Cleanup: Marcar el aviso como leído y archivado en la bandeja.
```

---

**✅ PUNTO 10 — Logout y re-login con PIN**  
*Genera: nada persistente — sesión en sessionStorage*

```
☐ Desde terminal activo: ejecutar logout de tes_demo
☐ Verificar que la pantalla vuelve a estado_0 (campo PIN visible)
☐ Solicitar PIN de emergencia a coordinacion_demo
☐ Login con PIN → estado_1 restaurado con rol 'invitado'
☐ Logout final

Criterio: Ciclo completo PIN completado sin error.
```

---

### Registro de resultados

```
Fecha / hora de inicio:  ________________  UTC
Fecha / hora de fin:     ________________  UTC
Técnico ejecutor:        ________________
Coordinador observador:  ________________

Resultados:
  PUNTO 1 — Login roles:              ☐ PASS  ☐ FAIL  Notas: _______
  PUNTO 2 — Bandejas Realtime:        ☐ PASS  ☐ FAIL  Notas: _______
  PUNTO 3 — Marquesina / tablón:      ☐ PASS  ☐ FAIL  Notas: _______
  PUNTO 4 — GPS vehículo DEMO:        ☐ PASS  ☐ FAIL  Notas: _______
  PUNTO 5 — Inventario DEMO:          ☐ PASS  ☐ FAIL  Notas: _______
  PUNTO 6 — Doc-8 apertura:           ☐ PASS  ☐ FAIL  Notas: _______
  PUNTO 7 — Doc-8 cierre admin:       ☐ PASS  ☐ FAIL  Notas: _______
  PUNTO 8 — Cola offline ciclo:       ☐ PASS  ☐ FAIL  Notas: _______
  PUNTO 9 — Push notification:        ☐ PASS  ☐ N/A   Notas: _______
  PUNTO 10 — Logout + PIN:            ☐ PASS  ☐ FAIL  Notas: _______

Veredicto: ☐ GO (≥ 9/10 PASS, ningún FAIL en puntos 1-8)
           ☐ NO GO — incidencia abierta: _______________

Rollback activado: ☐ Sí  ☐ No
```

> **Política de rollback:** si ≥ 2 puntos fallan o cualquier punto de 1-8 produce un
> error irrecuperable (datos corruptos, auth caído, Realtime caído en todos los clientes),
> activar rollback según el procedimiento de CI/CD (`infraestructura.md §4`) y abrir
> incidente P0 en el issue tracker.
