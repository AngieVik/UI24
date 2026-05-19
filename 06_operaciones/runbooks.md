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
