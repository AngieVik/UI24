# Runbooks Operativos Nivel 1 — Proyecto U24

> Runbooks de respuesta a incidentes críticos del sistema U24. Cada runbook define cuatro fases: **detección**, **mitigación inmediata / fallback**, **triage de afectación** y **protocolo de escalado**. El objetivo es que cualquier miembro técnico o coordinador pueda ejecutar el runbook sin ambigüedad.
>
> Actualizado: 2026-05-19.

---

## RB-01 — Supabase project caído (outage total)

**Severidad:** P0 — Crítico  
**Tiempo objetivo de respuesta inicial:** < 5 min desde detección

### 1. Detección

| Señal | Fuente |
|---|---|
| HTTP 5xx o timeout en `supabase.auth.*` / `supabase.from(*)` | Consola del navegador / logs de Edge Functions |
| `useVehiculoStore.networkStatus === 'offline'` persistente > 60s | Cliente React — banner `⚠ Modo sin conexión` visible en todos los terminales |
| `status.supabase.com` reporta incidente activo | Monitoreo externo (check manual o alerta configurada) |
| Edge Functions devuelven 503 en llamadas de health | CI/CD o monitoring externo |

### 2. Mitigación inmediata / Fallback

1. **Confirmar en `status.supabase.com`** que el incidente es de Supabase y no de red local o del proyecto específico.
2. **Activar comunicación a coordinación**: el coordinator o gerencia notifica verbalmente/radio TETRA que el sistema opera en modo offline estricto hasta nuevo aviso.
3. **Modo de operación offline** (automático por diseño del sistema):
   - Los terminales continúan en `estado_1` con verificación PBKDF2 local.
   - Doc-2, 3, 4, 5, 6, 7, 8 siguen funcionando — se encolan en `useOfflineQueue`.
   - Bandejas y marquesina muestran último estado cacheado en IndexedDB.
   - GPS y Realtime dejan de funcionar — coordinar vehículos por radio.
4. **No reiniciar los terminales** durante el outage — se perdería la sesión activa (`sessionStorage`).
5. Si el outage supera **30 minutos**: evaluar si hay DRPs en curso que requieran acción manual fuera del sistema.

### 3. Triage de afectación

| Módulo / función | Afectado | Nota |
|---|---|---|
| Login (nuevas sesiones) | ✅ Si hay `u24_offline_session` válida | TTL 7 días; si expiró, no hay acceso |
| Doc-2/3/4/5/6/7/8 (escritura) | ✅ Cola offline | Se sincronizan al recuperar conexión |
| GPS en tiempo real | ❌ Sin datos | Último ping cacheado, no actualizado |
| Realtime bandejas / marquesina | ❌ Sin actualizaciones | Caché IndexedDB visible |
| DRP (creación / transición) | ❌ Bloqueado | Requiere confirmación del servidor |
| Módulos PSA / filiación | ❌ Bloqueados | Requieren confirmación del servidor |
| Inventario (escritura) | ❌ Bloqueado | Sin cola offline para inventario |
| RRHH / cuadrantes / system_config | ❌ Bloqueados | Solo online |

### 4. Protocolo de escalado

```
0-5 min  → Técnico de guardia confirma outage en status.supabase.com
           Notifica a coordinación: "Sistema en modo offline por incidente en infraestructura"

5-30 min → Monitorear status.supabase.com cada 5 min
           Coordinar operaciones activas por radio
           NO realizar cambios en el proyecto Supabase durante el incidente

> 30 min → Notificar a gerencia
           Evaluar DRPs activos — decisión de coordinación sobre continuidad operativa
           Abrir incidente en el issue tracker con timeline

Post-recuperación:
  1. Verificar que la cola offline se sincronizó correctamente (revisar useBandejasStore y consola)
  2. Comprobar que GPS reanudó pings (visor_seguimiento_operativo)
  3. Registrar postmortem en issue tracker: duración, afectación, timeline, mejoras
```

---

## RB-02 — Realtime WebSocket caído (parcial o total)

**Severidad:** P1 — Alto  
**Tiempo objetivo de respuesta inicial:** < 10 min desde detección

> Diferencia con RB-01: Supabase Auth, REST API y Edge Functions **funcionan**. Solo los WebSockets de Realtime no establecen conexión.

### 1. Detección

| Señal | Fuente |
|---|---|
| `useRealtime.mode === 'degraded'` activo > 30s en todos los terminales | Banner interno de degraded_mode visible para roles con acceso a Realtime |
| Canal `global:alertas_criticas` no recibe mensajes en > 60s (esperados por cron cada 5 min) | Coordinación reporta que bandejas no actualizan |
| Supabase Dashboard → Realtime → Connections = 0 o errores de broker | Acceso a consola Supabase |
| `status.supabase.com` → sección Realtime muestra degradación | Monitoreo externo |

### 2. Mitigación inmediata / Fallback

1. **El sistema entra automáticamente en `degraded_mode`** (ver `hooks.md §8` y `logic.md §useRealtime`):
   - Polling cada 30s sobre `global:alertas_criticas` y `vehiculo:{id}` (canales críticos).
   - El resto de canales (bandejas específicas, módulos PSA/filiación) se suspenden.
2. **Activar `realtime_kill_switch = true` en `system_config`** (desde panel admin de gerencia):
   - Fuerza `degraded_mode` en todos los clientes sin esperar detección local.
   - Previene reconexiones agresivas que podrían saturar el broker en recuperación.
3. **Comunicar a coordinación**: las bandejas no actualizan en tiempo real — deben refrescar manualmente si lo necesitan.
4. Las mutaciones (cola offline) **no se ven afectadas** — van por REST, no WebSocket.

### 3. Triage de afectación

| Función | Afectada | Fallback activo |
|---|---|---|
| Bandejas en tiempo real | ✅ Solo degraded | Polling 30s en canales críticos |
| GPS ping/pong en visor | ✅ Sin actualizaciones push | Último ping cacheado |
| Marquesina live | ✅ Sin actualizaciones | Último texto cacheado |
| Alertas críticas (Doc-11) | ✅ Degraded | Polling 30s |
| Cola offline (mutaciones) | ❌ No afectada | REST sigue funcionando |
| Login / autenticación | ❌ No afectado | JWT vía REST |
| Módulos PSA / filiación (escritura) | ❌ No afectados | REST sigue funcionando |

### 4. Protocolo de escalado

```
0-10 min → Técnico verifica Supabase Dashboard → Realtime
           Activa realtime_kill_switch = true en system_config
           Notifica a coordinación: "Actualizaciones en tiempo real suspendidas, modo polling activo"

10-30 min → Si persiste: abrir ticket en soporte de Supabase (plan Pro/Team)
            Documentar canales afectados y timestamps

> 30 min → Notificar a gerencia
            Evaluar si el polling 30s es suficiente para operativa en curso
            Considerar reducir polling interval via box_timeout_minutos o ajuste manual

Post-recuperación:
  1. Desactivar realtime_kill_switch = false en system_config
  2. Verificar que los clientes reconectan (banner degraded_mode desaparece)
  3. Confirmar que bandejas y GPS recuperan actualizaciones en tiempo real
  4. Registrar en issue tracker: duración, afectación, acción tomada
```

---

## RB-03 — Cola offline átascada / sin sincronizar

**Severidad:** P2 — Medio  
**Tiempo objetivo de respuesta inicial:** < 30 min desde detección

### 1. Detección

| Señal | Fuente |
|---|---|
| `useBandejasStore.conflicts` muestra items en `en_conflicto` | Bandeja de conflictos (`hooks.md §20`) visible para el usuario |
| Un terminal reporta > N mutaciones en cola sin sincronizar tras reconexión | Usuario reporta a coordinación |
| Supabase logs muestran errores repetidos en la misma RPC o table | Consola Supabase → Logs → Edge Functions |
| `procesarCola` lanza error de FK violation o constraint violation repetidamente | Consola del navegador en el terminal afectado |

### 2. Mitigación inmediata / Fallback

1. **Identificar el tipo de error** en la consola del terminal:
   - **FK violation / constraint**: el dato referenciado fue eliminado en DB. La mutación no puede sincronizarse — descarte manual.
   - **RLS denied**: el usuario ya no tiene el permiso (baja del empleado mid-turno). Descarte manual.
   - **Timeout / network**: transitorio — la cola se reintentará. Esperar y monitorear.
   - **Conflict (23505)**: el registro ya existe en DB (doble envío). Descarte seguro — el dato está en DB.
2. **Si el error es transitorio**: esperar a que la cola procese al reconectar. No forzar nada.
3. **Si el error es permanente** (FK, RLS, 23505):
   - El usuario abre la **bandeja de conflictos** (`useBandejasStore.conflicts`).
   - Revisa la mutación bloqueada (payload, tipo, timestamp).
   - Usa **"Descartar mutación"** si los datos son irrecuperables.
   - Documenta la pérdida en el issue tracker con el payload para auditoría.
4. **Suspender procesamiento** si hay riesgo de corrupcón: activar `cola_offline_procesamiento = false` en `system_config` — la cola acumula sin procesar hasta que se resuelva el root cause.

### 3. Triage de afectación

| Situación | Impacto | Acción |
|---|---|---|
| 1-3 mutaciones bloqueadas | Bajo | Descarte manual desde bandeja de conflictos |
| > 10 mutaciones bloqueadas en mismo terminal | Medio | Investigar root cause antes de descartar |
| Mutaciones críticas (Doc-8 cierre) bloqueadas | Alto | Coordinación gestiona manualmente el cierre vía admin |
| Error sistémico (mismo error en múltiples terminales) | Crítico | Activar `cola_offline_procesamiento = false`, escalar a técnico |

### 4. Protocolo de escalado

```
0-30 min → Usuario con cola átascada reporta a coordinación
           Coordinación solicita a técnico revisar tipo de error
           Si es transitorio: esperar. Si es permanente: bandeja de conflictos.

30 min - 2h → Si > 10 mutaciones o error sistémico:
              Técnico accede a Supabase Logs para identificar el error raíz
              Evalúa si activar cola_offline_procesamiento = false
              Guarda los payloads para auditoría antes de descartar

> 2h → Notificar a gerencia
        Postmortem obligatorio si se perdieron datos operativos
        Revisar si la causa raíz fue un cambio de esquema o RLS sin coordinación
```

---

## RB-04 — Terminal sin GPS / GPS congelado en vehículo activo

**Severidad:** P2 — Medio (P1 si el vehículo está en DRP activo)  
**Tiempo objetivo de respuesta inicial:** < 15 min desde detección

### 1. Detección

| Señal | Fuente |
|---|---|
| `visor_seguimiento_operativo`: badge GPS con timestamp > 15 min | Coordinación desde su terminal |
| `vehiculos.gps_timestamp < NOW() - INTERVAL '15 min'` para vehículo activo | Query manual o alerta configurada |
| Pilot reporta `navigator.geolocation` denegado o error | Pilot notifica por radio |
| Ambulancia en DRP sin actualización de ubicación | Coordinador DRP detecta en módulo DRP |

### 2. Mitigación inmediata / Fallback

1. **Verificar si es problema de permisos del dispositivo:**
   - El terminal puede tener la geolocalización bloqueada en configuración del navegador.
   - Pilot debe comprobar: `Configuración > Privacidad > Ubicación` en el dispositivo.
   - Si está bloqueado: habilitar y recargar la PWA.
2. **Verificar si es problema de señal GPS:**
   - El vehículo está en zona con mala recepción satelital (túnel, garaje, edificio).
   - Fallback: el sistema mantiene el **último ping cacheado** visible en el visor (badge de timestamp antiguo).
3. **Si el GPS no se recupera en 5 min tras el movimiento del vehículo:**
   - Pilot reinicia el navegador (no el dispositivo — se mantiene la sesión en IndexedDB, pero se pierde `sessionStorage`). Deberá hacer login de nuevo.
   - Si el reinicio no soluciona: el coordinador acepta operar sin GPS y coordina por radio.
4. **En DRP activo sin GPS**: el coordinador marca manualmente la posición aproximada si el módulo lo permite. Si no, se coordina exclusivamente por radio TETRA.

### 3. Triage de afectación

| Situación | Impacto | Acción |
|---|---|---|
| GPS sin actualizar < 15 min | Bajo | Monitorear, probablemente transitorio |
| GPS sin actualizar 15-60 min | Medio | Verificar dispositivo; coordinar por radio |
| GPS sin actualizar > 1h en vehículo activo | Alto | Escalar a coordinación; emitir aviso en bandeja_flota |
| Vehículo en DRP activo sin GPS | Alto-Crítico | Coordinación DRP toma control manual; radio TETRA obligatoria |

### 4. Protocolo de escalado

```
0-15 min → Pilot verifica permisos GPS en dispositivo
            Si DRP activo: coordinador DRP notificado inmediatamente

15-60 min → Coordinación reporta a técnico
             Técnico verifica logs del terminal (¿geolocation API devuelve error?)
             Si el problema persiste: emitir Doc-11 aviso a bandeja_flota

> 60 min → Si el vehículo sigue activo: flota evalúa sustitución del terminal
            Registrar incidente en issue tracker con matrícula, timestamp y duración
            Si fue durante DRP: incluir en postmortem del DRP
```

---

## RB-05 — Terminal sin galleta activa (inaccessible tras baja de empleado)

**Severidad:** P2 — Medio (P1 si el terminal es el único de una ambulancia en DRP activo)
**Tiempo objetivo de respuesta inicial:** < 30 min desde detección

### 1. Detección

| Señal | Fuente |
|---|---|
| Aviso `terminal_sin_galleta` en `doc11_avisos` dirigido a coordinación | Bandeja de coordinación — aparece automáticamente tras `ef_baja_empleado` |
| Terminal físico muestra pantalla de login y no responde a galleta permanente | Informe presencial o por radio del personal de la ambulancia |
| Query manual: `SELECT id_terminal FROM galletas_terminales WHERE revocado_at IS NULL GROUP BY id_terminal HAVING COUNT(*) = 0` | Técnico — verificación reactiva |

### 2. Mitigación inmediata / Fallback

1. **Identificar el terminal afectado** desde el aviso en `doc11_avisos`:
   - Campo `id_terminal` — fingerprint SHA-256 del dispositivo.
   - Campo `id_nombre_baja` — empleado cuya baja generó el huérfano.

2. **Determinar si hay personal operativo que necesita acceder:**
   - Si hay un turno activo en ese vehículo: el pilot puede usar **acceso de invitado operativo**
     (sesión temporal PIN, si el terminal lo permite) para continuar su turno.
   - Si no hay turno activo: el terminal puede esperar hasta que se asigne una nueva galleta.

3. **Reasignar la galleta:**
   Coordinación o gerencia ejecuta `rpc_revocar_y_reemitir_galleta` para asignar el terminal
   al nuevo empleado responsable del vehículo:

   ```typescript
   await supabase.rpc('rpc_revocar_y_reemitir_galleta', {
     p_id_terminal:      '<SHA-256 del terminal>',
     p_id_nombre_nuevo:  '<id_nombre del nuevo responsable>',
     p_tipo:             'permanente'
   })
   ```

   El nuevo empleado hará su primer login en ese terminal con sus credenciales — la galleta
   permanente quedará vinculada a su cuenta.

4. **Si el terminal está físicamente inaccesible** (en ruta, sin red):
   - El pilot usa credenciales manuales (login con usuario + contraseña) cuando recupere red.
   - Tras el login online, la galleta permanente se vincula automáticamente en el flujo de
     terminal_check si el terminal no tiene galleta activa.

### 3. Triage de afectación

| Situación | Impacto | Acción |
|---|---|---|
| Terminal sin turno activo | Bajo — sin impacto operativo inmediato | Reasignar galleta en próximas horas |
| Terminal con turno activo, pilot puede usar PIN temporal | Medio — acceso limitado a sesión temporal | Reasignar galleta antes del fin de turno |
| Terminal en DRP activo sin alternativa de acceso | Alto-Crítico | Reasignar galleta inmediatamente; contactar pilot por radio |

### 4. Protocolo de escalado

```
0-5 min  → Coordinación recibe aviso doc11 de terminal_sin_galleta
            Verificar si el terminal tiene un turno activo

5-15 min → Si turno activo: verificar que el pilot puede operar (PIN temporal o credenciales)
            Identificar nuevo responsable del terminal
            Ejecutar rpc_revocar_y_reemitir_galleta

15-30 min → Si no se puede reasignar remotamente: escalar a técnico para intervención física
             Registrar el incidente con id_terminal, id_nombre_baja y resolución adoptada
```

**Causa raíz habitual:** Un empleado dado de baja era el único con galleta activa en ese
terminal. Revisar el proceso de onboarding: todos los terminales de ambulancia deben tener
al menos dos galletas activas asignadas (pilot titular + backup).

---

## RB-06 — DR drill trimestral: restore PITR a proyecto nuevo (C-02)

**Severidad:** Ejercicio planificado — no incidente  
**Cadencia:** Trimestral (cada 3 meses)  
**Objetivo:** Medir el RTO real de una restauración PITR y validar que los datos del nuevo proyecto son íntegros y operativos.

> Este runbook se ejecuta en un **entorno totalmente aislado** (nuevo proyecto Supabase
> creado ad hoc). Nunca se toca el proyecto de producción durante el drill.

### 1. Preparación (30 min antes del drill)

```
☐ Notificar al equipo técnico: "Drill DR el [fecha] a las [hora] UTC — no se toca producción"
☐ Obtener acceso al Supabase Dashboard con rol Owner o Admin del proyecto de producción
☐ Tener disponible un segundo proyecto Supabase vacío (o crear uno nuevo: "u24-dr-drill-YYYYMM")
☐ Tener a mano SUPABASE_SERVICE_ROLE_KEY del proyecto DR (diferente del de producción)
☐ Preparar las queries de verificación de integridad (ver §4)
☐ Cronómetro listo — medir desde la primera acción hasta la verificación final
```

### 2. Procedimiento de restore

**T+0:00 — Iniciar cronómetro**

```
1. Supabase Dashboard → Proyecto de producción → Database → Backups
2. Seleccionar "Point in Time Recovery"
3. Elegir un timestamp objetivo:
   - Recomendado para el drill: 1 hora antes del inicio del drill
   - En un incidente real: el timestamp anterior al evento destructivo
4. En "Restore to":
   - Seleccionar el proyecto DR vacío ("u24-dr-drill-YYYYMM")
   - O crear un proyecto nuevo si la UI lo permite desde esta pantalla
5. Confirmar la restauración
```

**T+XX — Esperar a que complete la restauración**

Supabase notificará por email cuando el restore haya terminado. Tiempo típico: 5-20 min
según el tamaño de la DB. Registrar el tiempo exacto.

**T+YY — Restauración completada — iniciar verificación**

```
☐ Anotar tiempo de restauración: ____min (T+0 → restauración completa)
```

### 3. Verificación de integridad post-restore

Conectar al proyecto DR con `SUPABASE_SERVICE_ROLE_KEY` del proyecto DR y ejecutar
las siguientes queries en Supabase Studio → SQL Editor:

```sql
-- 1. Conteo básico de tablas críticas
SELECT 'vehiculos'          AS tabla, COUNT(*) FROM vehiculos
UNION ALL
SELECT 'fichas_empleados',           COUNT(*) FROM fichas_empleados
UNION ALL
SELECT 'galletas_terminales',        COUNT(*) FROM galletas_terminales
UNION ALL
SELECT 'drps',                       COUNT(*) FROM drps
UNION ALL
SELECT 'inventario_vehiculo',        COUNT(*) FROM inventario_vehiculo
UNION ALL
SELECT 'doc8_partes_trabajo',        COUNT(*) FROM doc8_partes_trabajo
UNION ALL
SELECT 'auditoria_rbac',             COUNT(*) FROM auditoria_rbac;
-- Comparar con los conteos de producción del momento del backup

-- 2. Verificar que no hay fichas_empleados corruptas
SELECT COUNT(*) FROM fichas_empleados WHERE id_nombre IS NULL OR rol IS NULL;
-- Esperado: 0

-- 3. Verificar integridad referencial básica (galletas sin dueño)
SELECT COUNT(*) FROM galletas_terminales g
  LEFT JOIN fichas_empleados e ON g.id_nombre = e.id_nombre
 WHERE e.id_nombre IS NULL AND g.revocado_at IS NULL;
-- Esperado: 0

-- 4. Verificar que RLS está activo en las tablas críticas
SELECT tablename, rowsecurity
  FROM pg_tables
 WHERE schemaname = 'public'
   AND tablename IN ('fichas_empleados','galletas_terminales','inventario_vehiculo')
   AND rowsecurity = FALSE;
-- Esperado: 0 filas (todas con RLS activo)
```

### 4. Medición del RTO real

```
T+0:00  → Inicio del restore (click en "confirmar")
T+XX:XX → Proyecto DR disponible (restore completo)
T+YY:YY → Queries de integridad ejecutadas y verificadas
T+ZZ:ZZ → Decisión: proyecto DR listo para recibir tráfico (hipotético)

RTO real = T+ZZ:ZZ (tiempo total desde inicio hasta sistema operativo)
SLA objetivo: ≤ 30 min (infraestructura.md §1.1)
```

### 5. Criterios de aceptación del drill

| Criterio | Esperado | Resultado |
|---|---|---|
| Restore completado sin error | Sin errores en Dashboard | ⬜ Pass / ⬜ Fail |
| Conteos de tablas coinciden con backup | Diferencia < 1% (por escrituras en el intervalo) | ⬜ Pass / ⬜ Fail |
| RLS activo en todas las tablas críticas | 0 tablas con rowsecurity=FALSE | ⬜ Pass / ⬜ Fail |
| RTO total ≤ 30 min | Tiempo total desde T+0 hasta verificación | ⬜ Pass / ⬜ Fail |
| FK integrity sin orphans | 0 galletas huérfanas | ⬜ Pass / ⬜ Fail |

### 6. Limpieza post-drill

```
☐ Eliminar el proyecto DR (Supabase Dashboard → Project Settings → Delete project)
   — los datos son una copia de producción: deben destruirse
☐ Revocar cualquier credencial temporal generada para el drill
☐ Registrar el RTO medido en el issue tracker con etiqueta "dr-drill"
☐ Si RTO > 30 min: abrir issue con prioridad P1 — revisar plan o procedimiento
```

### 7. Registro del drill

```
Fecha:                    ________________ UTC
Participantes:            ________________
Proyecto DR creado:       u24-dr-drill-________________
Timestamp objetivo PITR:  ________________ UTC

Tiempos medidos:
  Inicio restore:         ________________
  Restore completado:     ________________  (+____min)
  Verificación OK:        ________________  (+____min)
  RTO total:              ________________  min

SLA ≤ 30 min:  ⬜ PASS  ⬜ FAIL — acción: ________________
Proyecto DR eliminado: ⬜ Sí
```

---

## RB-07 — Solicitud de supresión RGPD (derecho al olvido) (C-08)

**Severidad:** P2 — Operativo (P1 si hay riesgo legal activo)  
**SLA:** 30 días naturales desde la recepción de la solicitud verificada  
**Responsable:** Gerencia + técnico de guardia

### 1. Recepción y registro de la solicitud

```
Canal de entrada: email a privacidad@u24.internal (o el DPO designado)
Información requerida en la solicitud:
  - Nombre completo
  - ID_nombre en el sistema (si lo conoce)
  - Descripción de los datos que solicita suprimir
  - Email de contacto para la comunicación post-borrado

Acción inmediata:
☐ Registrar la solicitud en el issue tracker con etiqueta "rgpd-supresion"
☐ Anotar fecha de recepción (día 0 del SLA de 30 días)
☐ Asignar a gerencia + técnico responsable
```

### 2. Verificación de identidad (obligatoria antes de cualquier borrado)

La supresión afecta a datos reales de empleados. La identidad debe verificarse antes de actuar.

**Método de verificación:**

```
Opción A (empleado activo en el sistema):
  - El solicitante responde a un email enviado desde privacidad@u24.internal
    a su dirección corporativa registrada en fichas_empleados.email
  - Confirmar que el id_nombre coincide con el email corporativo

Opción B (ex-empleado sin email corporativo activo):
  - Solicitar DNI / pasaporte + documento que acredite la relación laboral anterior
  - Verificación manual por gerencia
  - Plazo adicional: hasta 10 días adicionales para la verificación documental
    (el SLA de 30 días sigue corriendo desde la recepción, no desde la verificación)
```

```
☐ Verificación completada — método: ________________
☐ Identidad confirmada: ⬜ Sí  ⬜ No — solicitud rechazada (comunicar motivo)
☐ Fecha de verificación: ________________
```

### 3. Evaluación de alcance

Antes de borrar, identificar todos los datos del solicitante en el sistema:

```sql
-- Ejecutar en Supabase Studio con service_role
-- Reemplazar 'ID_NOMBRE_SOLICITANTE' con el id_nombre real

-- 1. Datos en fichas_empleados
SELECT id_nombre, nombre_completo, email, rol, activo, created_at
  FROM fichas_empleados WHERE id_nombre = 'ID_NOMBRE_SOLICITANTE';

-- 2. Documentos asistenciales (Doc-1/2/3/4/5) — contienen PII de pacientes, no del empleado
--    El empleado solo aparece como id_nombre_registrador
SELECT 'doc1_asistencias' AS tabla, COUNT(*) FROM doc1_asistencias
  WHERE id_nombre_registrador = 'ID_NOMBRE_SOLICITANTE'
UNION ALL
SELECT 'doc8_partes_trabajo', COUNT(*) FROM doc8_partes_trabajo
  WHERE id_nombre_pilot = 'ID_NOMBRE_SOLICITANTE' OR id_nombre_carry = 'ID_NOMBRE_SOLICITANTE';

-- 3. Registros de auditoría RBAC
SELECT COUNT(*) FROM auditoria_rbac WHERE id_nombre = 'ID_NOMBRE_SOLICITANTE';

-- 4. Sesiones offline almacenadas (u24_offline_session — si tabla existe en DB)
-- Nota: u24_offline_session es IndexedDB en el cliente, no en DB server
--   → requiere revocación de galletas para invalidar acceso futuro
SELECT COUNT(*) FROM galletas_terminales WHERE id_nombre = 'ID_NOMBRE_SOLICITANTE';
```

### 4. Ejecución de la supresión

```
☐ PASO 1 — Revocar todas las galletas activas del empleado
```
```sql
UPDATE galletas_terminales
   SET revocado_at = NOW()
 WHERE id_nombre = 'ID_NOMBRE_SOLICITANTE'
   AND revocado_at IS NULL;
```

```
☐ PASO 2 — Invalidar sesión offline en todos sus terminales
   (broadcast Realtime al canal terminal:{id_terminal}:security para cada galleta — ver rls_y_rpcs.md §8)
   Ejecutar: ef_reset_password con invalidate_offline=true O broadcast manual desde Edge Function

☐ PASO 3 — Seudonimizar fichas_empleados (no se borra — rompe FK históricas)
```
```sql
UPDATE fichas_empleados
   SET nombre_completo = 'ELIMINADO_RGPD',
       email           = NULL,
       telefono        = NULL,
       dni             = NULL,
       -- Mantener: id_nombre (FK), rol (para auditoría histórica), activo = FALSE
       activo          = FALSE,
       fecha_baja      = COALESCE(fecha_baja, NOW()),
       rgpd_suprimido_at = NOW()
 WHERE id_nombre = 'ID_NOMBRE_SOLICITANTE';
-- NOTA: requiere añadir columna rgpd_suprimido_at TIMESTAMPTZ NULL a fichas_empleados
--       en migración 20260519_add_rgpd_suprimido_at.sql
```

```
☐ PASO 4 — Registrar la supresión en auditoria_rbac
```
```sql
INSERT INTO auditoria_rbac (id_evento, tipo_evento, id_nombre, metadata, created_at)
VALUES (
  gen_random_uuid(),
  'rgpd_supresion',
  'ID_NOMBRE_SOLICITANTE',
  jsonb_build_object(
    'solicitado_por',  'ID_NOMBRE_SOLICITANTE',
    'verificacion',    'email_corporativo',
    'responsable',     'gerencia_demo',
    'issue_tracker',   'ISSUE_ID'
  ),
  NOW()
);
```

```
☐ PASO 5 — Verificar que no quedan datos PII directos
```
```sql
SELECT nombre_completo, email, telefono, dni
  FROM fichas_empleados WHERE id_nombre = 'ID_NOMBRE_SOLICITANTE';
-- Esperado: 'ELIMINADO_RGPD', NULL, NULL, NULL
```

### 5. Comunicación post-borrado al solicitante

Enviar email de confirmación desde `privacidad@u24.internal` dentro del SLA de 30 días:

```
Asunto: Confirmación de supresión de datos — U24

Estimado/a [Nombre del solicitante],

En respuesta a su solicitud de supresión de datos personales recibida el [fecha],
le confirmamos que los datos de carácter personal asociados a su cuenta en el
sistema U24 han sido eliminados o seudonimizados con fecha [fecha de ejecución].

Datos eliminados:
  - Nombre completo, correo electrónico, teléfono e identificación personal
  - Accesos al sistema revocados

Datos conservados por obligación legal o interés legítimo:
  - Registros de auditoría de seguridad (auditoria_rbac) — período legal aplicable
  - Referencias en documentos asistenciales históricos (solo el identificador de rol,
    no los datos personales)

Si tiene alguna duda, puede contactarnos en privacidad@u24.internal.

Atentamente,
[Nombre del responsable de privacidad]
U24 — Gestión Operativa
```

### 6. Cierre del issue

```
☐ Fecha de comunicación enviada: ________________
☐ Días transcurridos desde la solicitud: ____  (SLA 30 días: ⬜ Cumplido ⬜ Incumplido)
☐ Cerrar el issue en el tracker con etiqueta "rgpd-supresion-completada"
☐ Si SLA incumplido: notificar al DPO para evaluación de riesgo de multa AEPD
```

---

## Plantilla de postmortem

Para cualquier incidente Nivel 1 resuelto, registrar en el issue tracker con esta estructura:

```markdown
## Postmortem — [Tipo incidente] — [Fecha]

**Duración:** [HH:MM] (DD/MM/YYYY HH:MM → HH:MM)
**Severidad:** P0 / P1 / P2
**Runbook aplicado:** RB-0X

### Línea de tiempo
- HH:MM — Detección inicial
- HH:MM — Notificación a coordinación
- HH:MM — Acción tomada (qué)
- HH:MM — Recuperación confirmada

### Afectación real
- Terminales afectados: [N]
- Mutaciones perdidas: [N o "ninguna"]
- Operativas en curso: [descripción]

### Root cause
[Una o dos frases]

### Acciones de mejora
- [ ] [Acción preventiva 1]
- [ ] [Acción preventiva 2]
```
