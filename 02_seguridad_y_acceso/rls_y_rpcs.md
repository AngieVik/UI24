# RLS, RPCs y Edge Functions — Proyecto U24

> Documento de Fase 1 (2026-05-18). Fuente de verdad para todas las policies RLS, funciones RPC PostgreSQL y Edge Functions de seguridad.
> La migración definitiva vive en `supabase/migrations/0001_init.sql`.
> Las Edge Functions viven en `supabase/functions/`.

---

## 1. Convenciones

### Helper de claims (PostgreSQL)

Para mantener las policies legibles se define una función auxiliar:

```sql
CREATE OR REPLACE FUNCTION claim(key text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY INVOKER
  AS $$ SELECT (auth.jwt() -> 'app_claims' ->> key)::boolean = true $$;
```

Las policies usan `claim('can_X')` en lugar del literal completo.

### Tipos de implementación

| Tipo | Cuándo | Cómo |
|---|---|---|
| **Policy RLS** | Control de acceso a filas | `CREATE POLICY` — se evalúa en cada query |
| **PostgreSQL RPC** | Operaciones atómicas en DB (inventario, revocaciones) | `CREATE FUNCTION ... SECURITY DEFINER LANGUAGE plpgsql` |
| **Edge Function** | Crypto (PBKDF2), Supabase Admin API, lógica multi-paso | Deno/TypeScript en `supabase/functions/` |
| **Trigger SQL** | Auditoría automática en eventos DB | `CREATE TRIGGER ... AFTER INSERT/UPDATE` |

### RLS habilitado en todas las tablas

```sql
ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <tabla> FORCE ROW LEVEL SECURITY;
```

Tablas sin ninguna policy directa para usuarios JWT (solo modificadas por SECURITY DEFINER): el motor deniega cualquier acceso directo. Las Edge Functions y RPCs con SECURITY DEFINER bypasean RLS.

---

## 2. Policies RLS por tabla

### 2.1 Dominio: Identidad y acceso

#### `fichas_empleados`

```sql
-- SELECT: solo rrhh y gerencia (can_manage_rrhh los cubre a ambos)
CREATE POLICY "fichas_select" ON fichas_empleados
  FOR SELECT USING (claim('can_manage_rrhh'));

-- INSERT: rrhh y gerencia pueden crear fichas
CREATE POLICY "fichas_insert" ON fichas_empleados
  FOR INSERT WITH CHECK (claim('can_manage_rrhh'));

-- UPDATE: rrhh y gerencia (cambio de rol dispara trigger auditoria_rbac)
CREATE POLICY "fichas_update" ON fichas_empleados
  FOR UPDATE USING (claim('can_manage_rrhh'));

-- DELETE: prohibido (soft delete via activo = false)
-- Sin policy → nadie puede DELETE directo
```

#### `galletas_terminales`

```sql
-- SELECT: coordinacion y gerencia pueden listar terminales registrados
CREATE POLICY "galletas_select" ON galletas_terminales
  FOR SELECT USING (claim('can_manage_rbac'));

-- INSERT/UPDATE: solo via ef_consumir_pin / rpc_revocar_y_reemitir_galleta (SECURITY DEFINER)
-- Sin policies directas para JWT users

-- DELETE: prohibido incondicional (soft delete via revocado_at)
CREATE POLICY "galletas_no_delete" ON galletas_terminales
  FOR DELETE USING (FALSE);
```

#### `sesiones_emergencia`

```sql
-- SELECT: quienes pueden generar tokens (coordinacion y gerencia)
CREATE POLICY "sesiones_em_select" ON sesiones_emergencia
  FOR SELECT USING (claim('can_create_emergency_token'));

-- INSERT/UPDATE: solo via ef_generar_token_emergencia / ef_consumir_pin (SECURITY DEFINER)

-- UPDATE y DELETE: prohibidos incondicionales
CREATE POLICY "sesiones_em_no_update" ON sesiones_emergencia
  FOR UPDATE USING (FALSE);
CREATE POLICY "sesiones_em_no_delete" ON sesiones_emergencia
  FOR DELETE USING (FALSE);
```

#### `solicitudes_desbloqueo`

```sql
-- SELECT: coordinacion y gerencia revisan solicitudes pendientes
CREATE POLICY "solicitudes_select" ON solicitudes_desbloqueo
  FOR SELECT USING (claim('can_manage_rbac'));

-- INSERT: via rpc_solicitar_desbloqueo (SECURITY DEFINER, callable por anon)
-- El terminal en estado_0 no tiene JWT → no puede INSERT directo

-- UPDATE: bloqueado para JWT directos — toda transición de estado debe pasar por
--          rpc_aprobar_desbloqueo o rpc_rechazar_desbloqueo (SECURITY DEFINER, §26)
CREATE POLICY "solicitudes_update" ON solicitudes_desbloqueo
  FOR UPDATE USING (FALSE);

-- DELETE: prohibido (el cron cambia estado a 'expirada', nunca elimina)
```

#### `auditoria_rbac`

```sql
-- SELECT: coordinacion y gerencia pueden auditar
CREATE POLICY "audit_rbac_select" ON auditoria_rbac
  FOR SELECT USING (claim('can_manage_rbac'));

-- INSERT: solo triggers SQL y Edge Functions SECURITY DEFINER

-- UPDATE y DELETE: prohibidos incondicionales
CREATE POLICY "audit_rbac_no_update" ON auditoria_rbac
  FOR UPDATE USING (FALSE);
CREATE POLICY "audit_rbac_no_delete" ON auditoria_rbac
  FOR DELETE USING (FALSE);
```

---

### 2.2 Dominio: Vehículos y turnos

#### `vehiculos`

```sql
-- SELECT: todos los autenticados (parque visible para cualquier rol operativo)
CREATE POLICY "vehiculos_select" ON vehiculos
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: solo can_manage_fleet (incorporar vehículo nuevo)
CREATE POLICY "vehiculos_insert" ON vehiculos
  FOR INSERT WITH CHECK (claim('can_manage_fleet'));

-- UPDATE: cualquier autenticado (GPS updates frecuentes desde terminal)
-- Los cambios a condicion_tecnica y tipo van siempre via RPC SECURITY DEFINER
CREATE POLICY "vehiculos_update" ON vehiculos
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- DELETE: can_manage_fleet (baja de vehículo)
CREATE POLICY "vehiculos_delete" ON vehiculos
  FOR DELETE USING (claim('can_manage_fleet'));
```

#### `activaciones_vehiculo`

```sql
-- SELECT/INSERT/UPDATE: cualquier autenticado (apertura/cierre de turno)
CREATE POLICY "activaciones_select" ON activaciones_vehiculo
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "activaciones_insert" ON activaciones_vehiculo
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "activaciones_update" ON activaciones_vehiculo
  FOR UPDATE USING (auth.uid() IS NOT NULL);
-- DELETE: prohibido (los turnos se cierran, no se eliminan)
```

#### `eventos_fisicos_vehiculo`

```sql
-- SELECT: can_manage_fleet
CREATE POLICY "eventos_fis_select" ON eventos_fisicos_vehiculo
  FOR SELECT USING (claim('can_manage_fleet'));
-- INSERT: cualquier autenticado (cualquier rol puede reportar un evento)
CREATE POLICY "eventos_fis_insert" ON eventos_fisicos_vehiculo
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- UPDATE/DELETE: prohibidos (append-only)
CREATE POLICY "eventos_fis_no_update" ON eventos_fisicos_vehiculo
  FOR UPDATE USING (FALSE);
CREATE POLICY "eventos_fis_no_delete" ON eventos_fisicos_vehiculo
  FOR DELETE USING (FALSE);
```

---

### 2.3 Dominio: Inventario

```sql
-- catalogo_items
CREATE POLICY "cat_select" ON catalogo_items FOR SELECT USING (claim('can_view_inventory'));
CREATE POLICY "cat_insert" ON catalogo_items FOR INSERT WITH CHECK (claim('can_manage_catalog'));
CREATE POLICY "cat_update" ON catalogo_items FOR UPDATE USING (claim('can_manage_catalog'));
CREATE POLICY "cat_delete" ON catalogo_items FOR DELETE USING (claim('can_manage_catalog'));

-- plantillas_stock / plantilla_lineas (mismo patrón)
CREATE POLICY "plantillas_select" ON plantillas_stock FOR SELECT USING (claim('can_view_inventory'));
CREATE POLICY "plantillas_insert" ON plantillas_stock FOR INSERT WITH CHECK (claim('can_manage_templates'));
CREATE POLICY "plantillas_update" ON plantillas_stock FOR UPDATE USING (claim('can_manage_templates'));
CREATE POLICY "plantillas_delete" ON plantillas_stock FOR DELETE USING (claim('can_manage_templates'));
-- Aplicar el mismo patrón a plantilla_lineas

-- inventario_vehiculo / inventario_base: solo lectura directa; escritura via RPC atómica
CREATE POLICY "invv_select" ON inventario_vehiculo FOR SELECT USING (claim('can_view_inventory'));
CREATE POLICY "invb_select" ON inventario_base FOR SELECT USING (claim('can_view_inventory'));
-- Sin INSERT/UPDATE/DELETE policies → solo SECURITY DEFINER RPCs pueden modificar

-- inventario_en_transito
CREATE POLICY "invt_select" ON inventario_en_transito FOR SELECT USING (claim('can_view_inventory'));
CREATE POLICY "invt_insert" ON inventario_en_transito FOR INSERT WITH CHECK (claim('can_edit_inventory'));
CREATE POLICY "invt_update" ON inventario_en_transito FOR UPDATE USING (claim('can_edit_inventory'));

-- locations
CREATE POLICY "loc_select" ON locations FOR SELECT USING (claim('can_view_inventory'));
CREATE POLICY "loc_insert" ON locations FOR INSERT WITH CHECK (claim('can_edit_inventory'));
CREATE POLICY "loc_update" ON locations FOR UPDATE USING (claim('can_edit_inventory'));
CREATE POLICY "loc_delete" ON locations FOR DELETE USING (claim('can_edit_inventory'));

-- auditoria_inventario
CREATE POLICY "auditinv_select" ON auditoria_inventario FOR SELECT USING (claim('can_view_inventory'));
CREATE POLICY "auditinv_no_update" ON auditoria_inventario FOR UPDATE USING (FALSE);
CREATE POLICY "auditinv_no_delete" ON auditoria_inventario FOR DELETE USING (FALSE);
-- INSERT: solo RPCs SECURITY DEFINER
```

---

### 2.4 Dominio: Documentos operativos

#### `doc1_asistencias` (append-only, inmutable)

```sql
CREATE POLICY "doc1_select" ON doc1_asistencias
  FOR SELECT USING (claim('can_view_clinical_docs'));
CREATE POLICY "doc1_insert" ON doc1_asistencias
  FOR INSERT WITH CHECK (
    claim('can_create_clinical_docs') OR claim('can_view_drp')
  );
CREATE POLICY "doc1_no_update" ON doc1_asistencias FOR UPDATE USING (FALSE);
CREATE POLICY "doc1_no_delete" ON doc1_asistencias FOR DELETE USING (FALSE);
```

#### `doc2_informes_svb` y `doc4_consentimientos` / `doc5_rechazos_alta`

```sql
-- SELECT
CREATE POLICY "doc2_select" ON doc2_informes_svb
  FOR SELECT USING (claim('can_view_clinical_docs'));

-- INSERT: creador registra auth_uid_redactor = auth.uid()
CREATE POLICY "doc2_insert" ON doc2_informes_svb
  FOR INSERT WITH CHECK (claim('can_create_clinical_docs'));

-- UPDATE: solo el creador mientras el documento está en borrador
CREATE POLICY "doc2_update" ON doc2_informes_svb
  FOR UPDATE USING (
    estado = 'borrador' AND auth.uid() = auth_uid_redactor
  );

-- DELETE: can_manage_drp o gerencia (via can_manage_drp que gerencia posee)
CREATE POLICY "doc2_delete" ON doc2_informes_svb
  FOR DELETE USING (claim('can_manage_drp'));

-- Aplicar el mismo patrón a doc4_consentimientos y doc5_rechazos_alta
-- (UPDATE condiciona firmado = false en lugar de estado = 'borrador')
```

#### `doc3_informes_sva`

```sql
-- Igual que doc2 excepto INSERT: can_create_clinical_docs_sva
CREATE POLICY "doc3_insert" ON doc3_informes_sva
  FOR INSERT WITH CHECK (claim('can_create_clinical_docs_sva'));
-- SELECT, UPDATE (por creador en borrador), DELETE (can_manage_drp): igual que doc2
```

#### `doc6_deducciones`

```sql
CREATE POLICY "doc6_select" ON doc6_deducciones FOR SELECT USING (claim('can_view_inventory'));
-- INSERT/UPDATE: solo RPC atómica SECURITY DEFINER
CREATE POLICY "doc6_no_update" ON doc6_deducciones FOR UPDATE USING (FALSE);
```

#### `doc7_averias`

```sql
CREATE POLICY "doc7_select" ON doc7_averias FOR SELECT USING (claim('can_manage_fleet'));
-- INSERT: cualquier autenticado puede reportar una avería
CREATE POLICY "doc7_insert" ON doc7_averias FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "doc7_update" ON doc7_averias FOR UPDATE USING (claim('can_manage_fleet'));
CREATE POLICY "doc7_delete" ON doc7_averias FOR DELETE USING (claim('can_manage_fleet'));
```

#### `doc8_partes_trabajo` / `doc9_entradas_almacen` / `doc10_transferencias`

```sql
-- doc8: visible a flota y rrhh; inserción y actualización por cualquier autenticado
CREATE POLICY "doc8_select" ON doc8_partes_trabajo
  FOR SELECT USING (claim('can_manage_fleet') OR claim('can_manage_rrhh'));
CREATE POLICY "doc8_insert" ON doc8_partes_trabajo FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: cualquier autenticado puede actualizar campos normales (km_fin, estado, etc.)
-- pero NO puede fijar cerrado_por_admin_id directamente — ese campo solo lo escribe
-- forzar_checkout_administrativo (SECURITY DEFINER, que bypasea esta policy).
-- WITH CHECK garantiza que el valor resultante de cerrado_por_admin_id sea NULL tras
-- cualquier UPDATE directo con JWT. La RPC lo sobreescribe sin restricción.
CREATE POLICY "doc8_update" ON doc8_partes_trabajo
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (cerrado_por_admin_id IS NULL);

-- doc9 / doc10: operaciones de logística
CREATE POLICY "doc9_select" ON doc9_entradas_almacen FOR SELECT USING (claim('can_view_inventory'));
CREATE POLICY "doc9_insert" ON doc9_entradas_almacen FOR INSERT WITH CHECK (claim('can_edit_inventory'));
CREATE POLICY "doc9_update" ON doc9_entradas_almacen FOR UPDATE USING (claim('can_edit_inventory'));

CREATE POLICY "doc10_select" ON doc10_transferencias FOR SELECT USING (claim('can_view_inventory'));
CREATE POLICY "doc10_insert" ON doc10_transferencias FOR INSERT WITH CHECK (claim('can_edit_inventory'));
CREATE POLICY "doc10_update" ON doc10_transferencias FOR UPDATE USING (claim('can_edit_inventory'));
```

#### `doc11_avisos`

```sql
-- SELECT: todos los autenticados (avisos críticos visibles para todo el personal)
CREATE POLICY "doc11_select" ON doc11_avisos FOR SELECT USING (auth.uid() IS NOT NULL);
-- INSERT: coordinacion, gerencia, rrhh
CREATE POLICY "doc11_insert" ON doc11_avisos
  FOR INSERT WITH CHECK (claim('can_manage_rbac') OR claim('can_manage_rrhh'));
-- UPDATE de leido_por: via rpc_marcar_aviso_leido (SECURITY DEFINER) — no policy directa
-- UPDATE general (editar texto): can_manage_rbac
CREATE POLICY "doc11_update" ON doc11_avisos FOR UPDATE USING (claim('can_manage_rbac'));
CREATE POLICY "doc11_delete" ON doc11_avisos FOR DELETE USING (claim('can_manage_rbac'));
```

---

### 2.5 Dominio: DRP

```sql
CREATE POLICY "drp_select" ON drps FOR SELECT USING (claim('can_view_drp'));
CREATE POLICY "drp_insert" ON drps FOR INSERT WITH CHECK (claim('can_manage_drp'));
CREATE POLICY "drp_update" ON drps FOR UPDATE USING (claim('can_manage_drp'));

CREATE POLICY "dotaciones_select" ON dotaciones_drp FOR SELECT USING (claim('can_view_drp'));
CREATE POLICY "dotaciones_insert" ON dotaciones_drp FOR INSERT WITH CHECK (claim('can_manage_drp'));
CREATE POLICY "dotaciones_update" ON dotaciones_drp FOR UPDATE USING (claim('can_manage_drp'));
CREATE POLICY "dotaciones_delete" ON dotaciones_drp FOR DELETE USING (claim('can_manage_drp'));

-- drp_personal_a_pie: mismo patrón que dotaciones_drp

CREATE POLICY "mochilas_select" ON mochilas_backpack FOR SELECT USING (claim('can_view_drp'));
CREATE POLICY "mochilas_insert" ON mochilas_backpack FOR INSERT WITH CHECK (claim('can_manage_drp'));
CREATE POLICY "mochilas_update" ON mochilas_backpack FOR UPDATE USING (claim('can_manage_drp'));
```

---

### 2.6 Dominio: Módulos especiales y Comunicación

```sql
-- PSA / Filiación (sesiones y pacientes)
CREATE POLICY "psa_select" ON psa_sesiones FOR SELECT USING (claim('can_use_modules'));
CREATE POLICY "psa_insert" ON psa_sesiones FOR INSERT WITH CHECK (claim('can_use_modules'));
CREATE POLICY "psa_update" ON psa_sesiones FOR UPDATE USING (claim('can_use_modules'));
CREATE POLICY "psa_delete" ON psa_sesiones FOR DELETE USING (claim('can_manage_modules'));
-- Aplicar mismo patrón a psa_pacientes, filiacion_sesiones, filiacion_pacientes

-- filiacion_eventos (append-only, solo service role puede insertar)
-- SELECT: usuarios del módulo (can_use_modules) y gestores (can_manage_modules)
CREATE POLICY "filiacion_ev_select" ON filiacion_eventos
  FOR SELECT USING (claim('can_use_modules') OR claim('can_manage_modules'));
-- INSERT: no hay policy directa para JWT — solo el watchdog cron via service role
-- UPDATE y DELETE: prohibidos incondicionales (registro inmutable)
CREATE POLICY "filiacion_ev_no_update" ON filiacion_eventos FOR UPDATE USING (FALSE);
CREATE POLICY "filiacion_ev_no_delete" ON filiacion_eventos FOR DELETE USING (FALSE);

-- mensajes_bandeja
CREATE POLICY "bandeja_select" ON mensajes_bandeja FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bandeja_insert" ON mensajes_bandeja FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bandeja_update" ON mensajes_bandeja FOR UPDATE USING (auth.uid() IS NOT NULL);

-- tablon_anuncios
CREATE POLICY "tablon_select" ON tablon_anuncios FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tablon_insert" ON tablon_anuncios FOR INSERT WITH CHECK (claim('can_manage_rrhh'));
CREATE POLICY "tablon_update" ON tablon_anuncios FOR UPDATE USING (claim('can_manage_rrhh'));
CREATE POLICY "tablon_delete" ON tablon_anuncios FOR DELETE USING (claim('can_manage_rrhh'));
```

---

## 3. Edge Function: `set_claims` (Auth Hook)

**Trigger:** `auth.hook.jwt_claims` — se ejecuta en cada emisión de JWT (login + refresh).
**Ubicación:** `supabase/functions/set-claims/index.ts`

```typescript
// Deno Edge Function — Auth Hook
Deno.serve(async (req) => {
  const body = await req.json() // { user_id, claims, ... }
  const authUserId = body.user_id

  const { data: ficha } = await supabaseAdmin
    .from('fichas_empleados')
    .select('rol, activo')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (!ficha || !ficha.activo) {
    return new Response(JSON.stringify({ app_claims: {} }), { status: 200 })
  }

  return new Response(JSON.stringify({ app_claims: buildClaims(ficha.rol) }), { status: 200 })
})

// Mapa rol → claims. Única fuente de verdad de permisos.
// Para cambiar qué puede un rol: modificar aquí + nuevo ADR.
const ROLE_CLAIMS: Record<string, string[]> = {
  can_view_inventory:           ['logistica', 'responsable_logistica', 'gerencia'],
  can_edit_inventory:           ['logistica', 'responsable_logistica', 'gerencia'],
  can_manage_catalog:           ['responsable_logistica', 'gerencia'],
  can_manage_templates:         ['responsable_logistica', 'gerencia'],
  can_manage_drp:               ['coordinacion', 'gerencia'],
  can_view_drp:                 ['tes', 'due', 'medico', 'coordinacion', 'logistica', 'responsable_logistica', 'gerencia'],
  can_manage_fleet:             ['flota', 'responsable_flota', 'gerencia'],
  can_edit_maintenance:         ['responsable_flota', 'gerencia'],
  can_manage_rrhh:              ['rrhh', 'gerencia'],
  can_manage_rbac:              ['coordinacion', 'gerencia'],
  can_create_emergency_token:   ['coordinacion', 'gerencia'],
  can_view_clinical_docs:       ['tes', 'due', 'medico', 'coordinacion', 'gerencia'],
  can_create_clinical_docs:     ['tes', 'gerencia'],
  can_create_clinical_docs_sva: ['due', 'medico', 'gerencia'],
  can_manage_modules:           ['coordinacion', 'gerencia'],
  can_use_modules:              ['logistica', 'responsable_logistica', 'coordinacion', 'gerencia'],
}

function buildClaims(rol: string): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(ROLE_CLAIMS).map(([claim, roles]) => [claim, roles.includes(rol)])
  )
}
```

---

## 4. Edge Function: `ef_generar_token_emergencia`

**Auth:** JWT con `can_create_emergency_token`.
**Body:** `{ tipo: 'permanente' | 'temporal' }`
**Respuesta exitosa:** `{ pin: string }` — devuelto una sola vez.

```typescript
// 1. Verificar claim
if (!jwtClaims.can_create_emergency_token) return 403

// 2. Generar PIN 6 dígitos (criptográficamente seguro)
const buf = crypto.getRandomValues(new Uint8Array(4))
const pin = String((new DataView(buf.buffer).getUint32(0) % 900_000) + 100_000)

// 3. Derivar PBKDF2-SHA256 del PIN
const salt = crypto.getRandomValues(new Uint8Array(32))
const key = await crypto.subtle.importKey('raw', enc(pin), 'PBKDF2', false, ['deriveBits'])
const hash = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256
)

// 4. Persistir en sesiones_emergencia (service role)
const expires_at = new Date(Date.now() + 10 * 60 * 1000) // +10 min
await supabaseAdmin.from('sesiones_emergencia').insert({
  pin_hash: toHex(hash), pin_salt: toHex(salt),
  tipo: body.tipo, id_nombre_emisor: callerIdNombre,
  expires_at, consumido_at: null,
})

// 5. Auditar
await insertAudit('sesion_emergencia_generada', callerIdNombre, null,
  { tipo: body.tipo, expires_at })

// 6. Devolver PIN (única vez — no se almacena en claro)
return { pin }
```

> `callerIdNombre` se obtiene buscando `fichas_empleados.id_nombre WHERE auth_user_id = auth.uid()`.

---

## 5. Edge Function: `ef_consumir_pin`

**Auth:** anon o auth — no requiere claim.
**Body:** `{ pin: string, id_terminal: string }`
**Respuesta exitosa:** `{ tipo: 'permanente' | 'temporal', authorized: true }`

```typescript
// 1. Obtener sesiones no consumidas y no expiradas
const { data: sesiones } = await supabaseAdmin
  .from('sesiones_emergencia')
  .select('id_sesion, pin_hash, pin_salt, tipo')
  .is('consumido_at', null)
  .gt('expires_at', new Date().toISOString())

if (!sesiones?.length) return { error: 'not_found' } // 401 tras sanitizar

// 2. Verificar PBKDF2 (esperado < 5 sesiones activas en producción)
let match: SesionEmergencia | null = null
for (const s of sesiones) {
  const salt = fromHex(s.pin_salt)
  const key = await crypto.subtle.importKey('raw', enc(body.pin), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256
  )
  if (toHex(hash) === s.pin_hash) { match = s; break }
}

if (!match) {
  await insertAudit('fallo_autenticacion', null, body.id_terminal, { razon: 'pin_invalido' })
  return 401
}

// 3. Marcar consumido (atómico — previene doble uso)
await supabaseAdmin.from('sesiones_emergencia')
  .update({ consumido_at: new Date() })
  .eq('id_sesion', match.id_sesion)
  .is('consumido_at', null) // check de integridad

// 4. Si tipo === 'permanente' → crear galleta permanente
if (match.tipo === 'permanente') {
  await supabaseAdmin.from('galletas_terminales').insert({
    id_terminal: body.id_terminal, tipo: 'permanente',
    id_nombre: null, // terminal sin usuario asignado inicialmente
    created_at: new Date(), expires_at: null, revocado_at: null,
  })
  await insertAudit('galleta_emitida', null, body.id_terminal, { via: 'pin_permanente' })
}
// Si tipo === 'temporal' → no se crea galleta; el terminal entra en estado_1 hasta
// que se cierre la sesión o se expire. No queda rastro permanente en galletas_terminales.

await insertAudit('sesion_emergencia_consumida', null, body.id_terminal, { tipo: match.tipo })
return { tipo: match.tipo, authorized: true }
```

> Rate limiting recomendado: max 5 intentos por `id_terminal` en 10 min (configurar en API Gateway o middleware).

---

## 6. RPC PostgreSQL: `rpc_revocar_y_reemitir_galleta`

**Tipo:** `CREATE FUNCTION ... SECURITY DEFINER LANGUAGE plpgsql`
**Parámetros:** `p_id_terminal text, p_id_nombre_nuevo text, p_tipo 'permanente'|'temporal'`
**Llamada via:** `supabase.rpc('rpc_revocar_y_reemitir_galleta', { ... })`
**Quién la llama:** coordinacion o gerencia (verificar `can_manage_rbac` dentro de la función).

```sql
CREATE OR REPLACE FUNCTION rpc_revocar_y_reemitir_galleta(
  p_id_terminal text,
  p_id_nombre_nuevo text,
  p_tipo text  -- 'permanente' | 'temporal'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_claim boolean;
  v_nueva_galleta uuid;
BEGIN
  -- Verificar claim del caller
  v_caller_claim := claim('can_manage_rbac');
  IF NOT v_caller_claim THEN
    RAISE EXCEPTION 'insufficient_privilege';
  END IF;

  -- Soft delete de la galleta activa para este terminal
  UPDATE galletas_terminales
    SET revocado_at = NOW()
  WHERE id_terminal = p_id_terminal
    AND revocado_at IS NULL;

  -- Insertar nueva galleta (partial unique index lo permite)
  INSERT INTO galletas_terminales (id_terminal, tipo, id_nombre, created_at, expires_at, revocado_at)
    VALUES (p_id_terminal, p_tipo, p_id_nombre_nuevo, NOW(), NULL, NULL)
  RETURNING id_galleta INTO v_nueva_galleta;

  -- Auditar (dos eventos en una sola transacción)
  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata, created_at)
    VALUES
      ('galleta_revocada', p_id_nombre_nuevo, p_id_terminal,
       jsonb_build_object('motivo', 'revocacion_manual'), NOW()),
      ('galleta_emitida', p_id_nombre_nuevo, p_id_terminal,
       jsonb_build_object('tipo', p_tipo), NOW());

  RETURN v_nueva_galleta;
END;
$$;
```

---

## 7. Edge Function: `ef_revocar_sesion_usuario` (Gap F2)

**Auth:** JWT con `can_manage_rbac`.
**Body:** `{ id_nombre: string }`
**Efecto:** invalida todos los JWT activos del usuario + registra evento.

```typescript
// 1. Verificar claim
if (!jwtClaims.can_manage_rbac) return 403

// 2. Obtener auth_user_id del empleado
const { data: ficha } = await supabaseAdmin
  .from('fichas_empleados')
  .select('auth_user_id')
  .eq('id_nombre', body.id_nombre)
  .single()

if (!ficha) return { error: 'not_found' }

// 3. Invalidar todos los JWT activos del usuario
// signOut 'global' revoca todos los refresh tokens — el access token expira según TTL
await supabaseAdmin.auth.admin.signOut(ficha.auth_user_id, 'global')

// 4. Registrar evento en auditoria_rbac
await insertAudit('logout_forzado', body.id_nombre, null, {
  ejecutado_por: callerIdNombre,
  nota: 'Sesión revocada por administrador. Galletas de terminal no alteradas.'
})

// Nota de diseño: las galletas permanentes del hardware NO se revocan.
// Garantiza que los terminales de las ambulancias sigan operativos
// incluso si el usuario asignado es expulsado del sistema.
return { success: true }
```

---

## 8. Edge Function: `ef_reset_password` (Gap F1)

**Auth:** JWT con `can_manage_rrhh`.
**Body:** `{ id_nombre: string, nueva_password: string }`
**Efecto:** fija la nueva contraseña directamente. El empleado se entera por el admin presencialmente.

```typescript
// 1. Verificar claim
if (!jwtClaims.can_manage_rrhh) return 403

// 2. Obtener auth_user_id
const { data: ficha } = await supabaseAdmin
  .from('fichas_empleados')
  .select('auth_user_id')
  .eq('id_nombre', body.id_nombre)
  .single()

// 3. Cambiar contraseña via Admin API
await supabaseAdmin.auth.admin.updateUserById(ficha.auth_user_id, {
  password: body.nueva_password
})

// 4. Auditar
await insertAudit('cambio_password', body.id_nombre, null, {
  ejecutado_por: callerIdNombre
})

// 5. Broadcast de invalidación de sesión offline a todos los terminales del empleado (B-02)
//    Cualquier terminal con galleta activa de este empleado debe borrar su u24_offline_session.
const { data: terminales } = await supabaseAdmin
  .from('galletas_terminales')
  .select('id_terminal')
  .eq('id_nombre', body.id_nombre)
  .is('revocado_at', null)

for (const { id_terminal } of terminales ?? []) {
  await supabaseAdmin
    .channel(`terminal:${id_terminal}:security`)
    .send({
      type: 'broadcast',
      event: 'offline_session_invalidated',
      payload: { id_nombre: body.id_nombre, reason: 'password_reset' }
    })
}
// Comportamiento esperado en el cliente (hooks.md § useRealtime canal security):
//   → idbDel('u24_offline_session')
//   → useAuthStore.clear()
//   → modal: "Tu contraseña fue cambiada. Inicia sesión de nuevo."
return { success: true }
```

> **Validación de contraseña:** el cliente debe exigir mínimo 8 caracteres. El backend no impone política adicional — la responsabilidad recae en el componente de UI del formulario de reset.

---

## 9. PBKDF2 offline — flujo en cliente

El hash que se cachea en `u24_offline_session` se deriva **en el cliente** inmediatamente tras un login online exitoso, mientras la contraseña aún está en memoria. El servidor nunca almacena ni recibe este hash.

```typescript
// Llamar justo después de supabase.auth.signInWithPassword() exitoso

async function cacheOfflineSession(id_nombre: string, password: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(32))
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  )
  const hashBuf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256
  )
  const now = Date.now()
  await idbSet('u24_offline_session', {
    id_nombre,
    password_hash: toHex(hashBuf),
    password_salt: toHex(salt),
    iterations: 100_000,
    cached_at: now,
    ttl_expires_at: now + 7 * 24 * 60 * 60 * 1000, // 7 días
  })
}

// Verificación offline (en estado_1 modo degradado)
async function verifyOffline(input: string, session: U24OfflineSession): Promise<boolean> {
  if (Date.now() > session.ttl_expires_at) return false // TTL expirado
  const salt = fromHex(session.password_salt)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(input), 'PBKDF2', false, ['deriveBits'])
  const hashBuf = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: session.iterations }, key, 256
  )
  return toHex(hashBuf) === session.password_hash
}

// Helpers
const enc = (s: string) => new TextEncoder().encode(s)
const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) =>
  new Uint8Array(hex.match(/../g)!.map(h => parseInt(h, 16)))
```

**Invariantes:**

- `cacheOfflineSession` se llama **solo** tras login online exitoso — la contraseña nunca se guarda en claro.
- Si el usuario cambia contraseña (ef_reset_password), el hash cacheado queda stale y la verificación offline fallará hasta el próximo login online. Comportamiento deseado.
- El TTL de 7 días se evalúa en el cliente; el servidor no conoce la existencia de `u24_offline_session`.

---

## 10. Edge Cron: `ef_cron_purge`

**Frecuencia:** cada 5 minutos.
**Ubicación:** `supabase/functions/cron-purge/index.ts` + entrada en `supabase/config.toml` (Supabase Cron).

```typescript
Deno.serve(async () => {
  const now = new Date().toISOString()

  // 1. Purgar sesiones_emergencia expiradas no consumidas (DELETE — el cron tiene service role)
  const { count: purgadas } = await supabaseAdmin
    .from('sesiones_emergencia')
    .delete()
    .is('consumido_at', null)
    .lt('expires_at', now)

  // 2. Marcar solicitudes_desbloqueo pendientes expiradas
  const { count: expiradas } = await supabaseAdmin
    .from('solicitudes_desbloqueo')
    .update({ estado: 'expirada' })
    .eq('estado', 'pendiente')
    .lt('expires_at', now)

  console.log(`Cron purge: ${purgadas} sesiones eliminadas, ${expiradas} solicitudes expiradas`)
  return new Response('ok')
})
```

> `sesiones_emergencia` es la única tabla donde el cron hace DELETE físico (filas expiradas sin consumir no tienen valor de auditoría). Las solicitudes_desbloqueo se marcan como 'expirada' para conservar el historial.

---

## 11. Triggers SQL: `auditoria_rbac` (Gap F6)

Los eventos que ocurren en PostgreSQL se capturan via triggers AFTER. Los eventos de Supabase Auth se capturan via Edge Functions.

### Trigger: cambio de rol en `fichas_empleados`

```sql
CREATE OR REPLACE FUNCTION trg_audit_cambio_rol() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.rol IS DISTINCT FROM NEW.rol THEN
    INSERT INTO auditoria_rbac (tipo_evento, id_nombre, metadata, created_at)
    VALUES ('cambio_rol', NEW.id_nombre,
      jsonb_build_object('rol_anterior', OLD.rol, 'rol_nuevo', NEW.rol), NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fichas_rol
  AFTER UPDATE ON fichas_empleados
  FOR EACH ROW EXECUTE FUNCTION trg_audit_cambio_rol();
```

### Trigger: nueva galleta emitida

```sql
CREATE OR REPLACE FUNCTION trg_audit_galleta_emitida() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata, created_at)
  VALUES ('galleta_emitida', NEW.id_nombre, NEW.id_terminal,
    jsonb_build_object('tipo', NEW.tipo), NOW());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_galleta_insert
  AFTER INSERT ON galletas_terminales
  FOR EACH ROW EXECUTE FUNCTION trg_audit_galleta_emitida();
```

### Trigger: galleta revocada

```sql
CREATE OR REPLACE FUNCTION trg_audit_galleta_revocada() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.revocado_at IS NULL AND NEW.revocado_at IS NOT NULL THEN
    INSERT INTO auditoria_rbac (tipo_evento, id_nombre, id_terminal, metadata, created_at)
    VALUES ('galleta_revocada', NEW.id_nombre, NEW.id_terminal,
      jsonb_build_object('revocado_at', NEW.revocado_at), NOW());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_galleta_revocada
  AFTER UPDATE ON galletas_terminales
  FOR EACH ROW EXECUTE FUNCTION trg_audit_galleta_revocada();
```

### Eventos gestionados por Edge Functions (no triggers SQL)

| Evento | Edge Function responsable |
|---|---|
| `login_exitoso` | `set_claims` (al emitir JWT exitoso) |
| `fallo_autenticacion` | `ef_consumir_pin` (PIN inválido) + cliente llama `ef_log_fallo` en error de login |
| `logout` | `ef_logout` (llamada explícita al cerrar sesión) |
| `cambio_password` | `ef_reset_password` |
| `sesion_emergencia_generada` | `ef_generar_token_emergencia` |
| `sesion_emergencia_consumida` | `ef_consumir_pin` |
| `galleta_emitida` (via PIN) | `ef_consumir_pin` (además del trigger para inserciones directas) |
| `logout_forzado` | `ef_revocar_sesion_usuario` |

> **`fallo_autenticacion` desde el cliente:** el cliente llama a `ef_log_fallo({ id_nombre_intentado, id_terminal })` cuando Supabase Auth devuelve error de credenciales. El `id_nombre` se guarda como null si no existe en fichas_empleados. Esta llamada no requiere JWT (callable por anon). En producción, el log drain de Logflare captura también los errores de auth de Supabase como respaldo.

---

## 12. RPC adicional: `rpc_solicitar_desbloqueo` (callable por anon)

```sql
CREATE OR REPLACE FUNCTION rpc_solicitar_desbloqueo(
  p_id_terminal text,
  p_id_nombre_solicitante text,
  p_motivo text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO solicitudes_desbloqueo
    (id_terminal, id_nombre_solicitante, motivo, estado, created_at, expires_at)
  VALUES
    (p_id_terminal, p_id_nombre_solicitante, p_motivo, 'pendiente',
     NOW(), NOW() + INTERVAL '24 hours')
  RETURNING id_solicitud INTO v_id;

  RETURN v_id;
END;
$$;

-- Conceder ejecución a anon y authenticated
GRANT EXECUTE ON FUNCTION rpc_solicitar_desbloqueo TO anon, authenticated;
```

---

## 13. RPC `cancelar_drp` (Gap R2)

RBAC: `coordinacion`, `gerencia`. `SECURITY DEFINER`.
Ver especificación SQL completa en `logic.md §48`.

**RLS de llamada:**

```sql
-- Policy que protege la RPC a nivel de función
-- (La SECURITY DEFINER ya ejecuta con privilegios elevados;
--  la validación del invocador se hace dentro del cuerpo con auth.jwt())
CREATE POLICY "solo_coordinacion_gerencia_cancelar_drp"
  ON drps FOR UPDATE
  USING (
    claim('can_manage_drp')
  );
-- La RPC hace FOR UPDATE en el SELECT inicial — esta policy aplica.
```

**Guards (C-03):** `FOR UPDATE` sobre `drps` al inicio — previene race condition doble-cancelación.
`'Cancelado'` → error `drp_ya_cancelado` (409). Cualquier otro estado no-`En_curso` → `drp_estado_invalido` (409).

**Resumen de efectos:**

| Tabla | Acción |
|---|---|
| `drps` | `estado = 'Cancelado'`, `timestamp_cancelacion`, `cancelado_por_id` |
| `dotaciones_drp` | `timestamp_salida = NOW()` para filas activas |
| `drp_personal_a_pie` | `timestamp_salida = NOW()` para filas activas |
| `psa_sesiones` | `timestamp_cierre = NOW()` para sesiones abiertas del DRP |
| `psa_pacientes` | `estado = 'cancelado_por_drp'` para pacientes no terminales (C-01) |
| `filiacion_sesiones` | `timestamp_cierre = NOW()` para sesiones abiertas del DRP |
| `filiacion_pacientes` | `estado = 'cancelado_por_drp'`; si `en_consulta`, también `timestamp_fin_consulta = NOW()` (C-01) |
| `descuadres_inventario` | INSERT por ítem residual en mochilas BKP; `entidad_imputable_tipo = 'drp'` (C-02) |
| `mochilas_backpack` | `estado = 'disponible'`, `id_drp_activo = NULL` (después de descuadres) |

---

## 14. Gap B2 — Watchdog de boxes bloqueados (Edge Cron)

Detecta pacientes que llevan más de 45 minutos en estado `en_consulta` dentro
de un módulo de filiación activo, sin cambio de estado. Genera un aviso en
`filiacion_eventos` y notifica a admisión vía `pg_notify` para que Realtime
lo entregue al perfil_admision del módulo afectado.

**La liberación del box sigue siendo manual** — el watchdog solo alerta.
El coordinador o admisión usa `liberar_paciente_de_box` (logic.md §20.2).

**Incorporado al `ef_cron_purge` existente (cada 5 minutos):**

```typescript
// Añadir al body de ef_cron_purge/index.ts — bloque 3

// 3. Watchdog de boxes bloqueados (Gap B2)
const TIMEOUT_BOX_MS = 45 * 60 * 1000   // 45 min en milisegundos
const cutoff = new Date(Date.now() - TIMEOUT_BOX_MS).toISOString()

const { data: atascados } = await supabaseAdmin
  .from('filiacion_pacientes')
  .select('id, filiacion_id, id_nombre_box, timestamp_inicio_consulta')
  .eq('estado', 'en_consulta')
  .lt('timestamp_inicio_consulta', cutoff)

for (const paciente of atascados ?? []) {
  // Insertar evento de aviso en filiacion_eventos (idempotente por filiacion_id + paciente_id + tipo)
  await supabaseAdmin.from('filiacion_eventos').upsert({
    filiacion_id:    paciente.filiacion_id,
    paciente_id:     paciente.id,
    tipo_evento:     'box_timeout_alert',
    id_nombre_actor: 'system_watchdog',
    timestamp_evento: new Date().toISOString(),
    detalle: `Box ${paciente.id_nombre_box} sin actividad >45 min`,
  }, { onConflict: 'filiacion_id,paciente_id,tipo_evento', ignoreDuplicates: true })

  // Notificar al perfil_admision del módulo via Realtime (canal filiacion:{filiacion_id})
  await supabaseAdmin.channel(`filiacion:${paciente.filiacion_id}`)
    .send({ type: 'broadcast', event: 'box_timeout', payload: { paciente_id: paciente.id } })
}

console.log(`Watchdog boxes: ${atascados?.length ?? 0} alertas generadas`)
```

**Handler en el cliente (admisión del módulo filiación):**

```typescript
supabase.channel(`filiacion:${filiacionId}`)
  .on('broadcast', { event: 'box_timeout' }, ({ payload }) => {
    // Mostrar badge de alerta en la fila del paciente afectado en la lista de boxes
    // Tooltip: "Box sin actividad >45 min — considera liberar al paciente"
    useFiliacionStore.getState().marcarBoxTimeout(payload.paciente_id)
  })
  .subscribe()
```

---

## 15. RPC `rpc_ajuste_manual_stock` (Fase 4)

**Tipo:** `CREATE FUNCTION ... SECURITY DEFINER LANGUAGE plpgsql`
**Parámetros:** `p_location_id text, p_item_id int, p_cantidad_nueva int, p_motivo text, p_operador_id text`
**RBAC:** `can_edit_inventory` — roles `logistica`, `responsable_logistica`, `gerencia`.
**Llamada via:** `supabase.rpc('rpc_ajuste_manual_stock', { ... })`

Ver especificación SQL completa en `logic.md §49`.

**Reglas de acceso y validación:**

| Regla | Detalle |
|---|---|
| Claim requerido | `can_edit_inventory` — verificado dentro del cuerpo SECURITY DEFINER |
| Stock negativo | Bloqueado — si `p_cantidad_nueva < 0` → `RAISE EXCEPTION 'stock_negativo_no_permitido'` |
| Motivo obligatorio | `length(trim(p_motivo)) < 10` → `RAISE EXCEPTION 'motivo_insuficiente'` |
| Scope | Cualquier `location_id` válido (base central o subinventario de vehículo) |
| Retorno | `TABLE(stock_anterior INT, stock_nuevo INT)` — para feedback en UI |

**Policy RLS complementaria sobre `inventario_vehiculo` / `inventario_base`:**

```sql
-- Solo can_view_inventory puede hacer SELECT; los UPDATE van siempre via RPC.
CREATE POLICY "lectura_inventario_autenticados"
  ON inventario_vehiculo FOR SELECT
  USING (claim('can_view_inventory'));

CREATE POLICY "no_update_directo_inventario"
  ON inventario_vehiculo FOR UPDATE
  USING (false);  -- todo UPDATE pasa por rpc_ajuste_manual_stock (SECURITY DEFINER)
```

> Lo mismo aplica a `inventario_base`. El bloqueo de UPDATE directo garantiza
> que cada modificación de stock quede registrada en `auditoria_inventario` sin excepción.

---

## 16. Edge Function `ef_alta_empleado` (Gap F3 — Onboarding)

**Auth:** JWT con `can_manage_rrhh` — roles `rrhh`, `gerencia`.
**Body:** `{ id_nombre, nombre_real, dni, rol, horas_contrato, contrasena_temporal }`
**Respuesta exitosa:** `{ auth_user_id, id_nombre }` — HTTP 201.

Ver implementación completa en `logic.md §50`.

**Reglas de acceso y validación:**

| Regla | Detalle |
|---|---|
| Claim requerido | `can_manage_rrhh` |
| Email generado | `id_nombre@u24.internal` — ficticio, sin envío externo |
| `email_confirm` | `true` — se omite el flujo de verificación por email |
| Galleta de terminal | NO se emite — vinculación posterior via flujo PIN |
| Duplicado `id_nombre` | HTTP 409 `id_nombre_duplicado` si la cuenta ya existe en `auth.users` |
| Rol | Validado contra enum de roles del sistema; 422 si inválido |
| Audita | `auditoria_rbac` evento `alta_empleado` |

---

## 17. Edge Function `ef_baja_empleado` (Gap F3 — Offboarding)

**Auth:** JWT con `can_manage_rrhh` — roles `rrhh`, `gerencia`.
**Body:** `{ id_nombre }`
**Respuesta exitosa:** `{ success: true }` — HTTP 200.

Ver implementación completa en `logic.md §51`.

**Efectos (secuenciales, fulminantes):**

| Acción | Tabla / API | Reversible |
|---|---|---|
| `activo = false`, `fecha_baja = NOW()` | `fichas_empleados` | Solo por RRHH/gerencia |
| Invalidar todos los JWT activos | `supabase.auth.admin.signOut(..., 'global')` | No — requiere nuevo login |
| Revocar galletas de terminal | `galletas_terminales.revocado_at = NOW()` | Solo reemitiendo nueva galleta |
| Eliminar turnos futuros | `cuadrante_turnos DELETE WHERE fecha > hoy` | No — reasignación manual |
| Datos históricos | Sin tocar — Doc-1, Doc-8, doc2/3, auditoria* | Inmutables por diseño |

**Guards:**
- HTTP 404 si el empleado no existe en `fichas_empleados`.
- HTTP 409 `empleado_ya_inactivo` si `activo` ya es `false` — idempotencia sin efectos secundarios.
- Audita `auditoria_rbac` evento `baja_empleado` siempre que la baja sea efectiva.

---

## 18. RLS tabla `system_config` (Gap F5)

**Tipo:** Table-level RLS policies.
**Modelo:** Clave-valor singleton — una fila por parámetro (`clave` TEXT PK).
Ver claves canónicas en `er_y_seeds.md §3 Dominio: Configuración del sistema`.

```sql
-- Lectura: cualquier usuario autenticado (para que useGlobalStore pueda leer marquesina, etc.)
CREATE POLICY "system_config_lectura"
  ON system_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Escritura: solo gerencia
CREATE POLICY "system_config_escritura"
  ON system_config FOR UPDATE
  USING (claim('can_manage_rbac'));  -- 'can_manage_rbac' es el claim de gerencia

-- INSERT bloqueado via RLS — las claves se crean solo en migrations/seeds
CREATE POLICY "system_config_no_insert_directo"
  ON system_config FOR INSERT
  WITH CHECK (false);

-- DELETE bloqueado siempre
CREATE POLICY "system_config_no_delete"
  ON system_config FOR DELETE
  USING (false);
```

**Invariantes de diseño:**

| Aspecto | Decisión |
|---|---|
| INSERT | Solo en migrations/seeds — el catálogo de claves no crece en runtime |
| UPDATE `valor` (jsonb) | Gerencia via UI admin; cada UPDATE debe registrar `id_nombre_modificador` y `updated_at` (trigger o app-level) |
| `useGlobalStore` | Se suscribe al canal Realtime de `system_config` para propagar cambios en marquesina y toggles sin reload |
| `box_timeout_minutos` | `ef_cron_purge` lee esta clave al iniciar cada ejecución — permite cambiar el umbral sin redeploy |

---

## 19. Edge Cron `ef_cron_rgpd` (Gap F7 — RGPD y retención)

**Frecuencia:** Diaria, 03:00 UTC.
**Service role:** obligatorio — las políticas RLS de `auditoria_rbac` y docs son inmutables para roles normales.
**Sin claim de usuario** — llamada interna del scheduler de Supabase Cron.

Ver implementación completa en `logic.md §52`.

**Tres bloques de purga (idempotentes):**

| Bloque | Tablas | Acción | Umbral |
|---|---|---|---|
| 1 — PII clínica | `doc2_informes_svb`, `doc3_informes_sva`, `doc4_consentimientos`, `doc5_rechazos_alta` | Eliminar claves PII del JSONB con operador `-` nativo de Postgres. Preserva datos estadísticos (tiempos, constantes, patología). | 5 años desde la asistencia (Ley 41/2002) |
| 2 — PII laboral | `fichas_empleados` | `nombre_real = 'EMPLEADO_ANONIMIZADO'`, `dni = NULL`. `id_nombre` intacto (FK en tablas inmutables). | 4 años desde `fecha_baja` |
| 3 — Logs seguridad | `auditoria_rbac` | DELETE físico de filas caducadas. | 1 año desde `created_at` |

**Nota de extensión:** si en el futuro se añade mecanismo de "legal hold" (retención
extendida por incidente abierto), el bloque 3 debe excluir los registros afectados
antes de DELETE. En la implementación actual la purga es incondicional tras 1 año.

---

## 20. RPC `rpc_alta_vehiculo` (Gap F4)

**Tipo:** `CREATE FUNCTION ... SECURITY DEFINER LANGUAGE plpgsql`
**Parámetros:** `p_matricula text, p_tipo text, p_plantilla_id text, p_registrado_por text`
**RBAC:** `can_manage_fleet` — roles `responsable_flota`, `gerencia`.
**Llamada via:** `supabase.rpc('rpc_alta_vehiculo', { ... })`

Ver especificación SQL completa en `logic.md §53`.

**Cuatro efectos automáticos (en transacción):**

| Efecto | Tabla | Detalle |
|---|---|---|
| 1. Registro del vehículo | `vehiculos` | `condicion_tecnica='operativo'`, `estado_operativo='inactivo'`, `plantilla_id` asignada |
| 2. Subinventario propio | `locations` | `location_id = matricula`, `tipo = 'vehiculo'` |
| 3. Inventario inicializado | `inventario_vehiculo` | Una fila por ítem de la plantilla con `stock_real = 0` — nunca igualar a `stock_objetivo` |
| 4. Aviso a logística | `doc11_avisos` | Nivel 'aviso' — primera dotación pendiente desde almacén |

**Guards:**
- `422` si `p_tipo` no es uno de: A1/A2/B/C/VIR/Quad/BKP.
- `409 matricula_duplicada` si la matrícula ya existe en `vehiculos`.
- `404 plantilla_no_encontrada` si `plantilla_id` no existe en `plantillas_stock`.

**Retorno:** `TABLE(matricula TEXT, location_id TEXT, items_inicializados INT)` — para feedback del wizard.

---

## 21. Edge Cron `ef_cron_cleanup_orphans` (B-03)

**Frecuencia:** Diaria, 04:00 UTC (una hora después de `ef_cron_rgpd`).
**Service role:** obligatorio — necesita `listUsers` y `deleteUser` de la Admin API.
**Sin claim de usuario** — llamada interna del scheduler de Supabase Cron.

Ver implementación completa en `logic.md §54`.

**Propósito:** Eliminar entradas en `auth.users` sin fila correspondiente en
`fichas_empleados` (huérfanos que pueden aparecer si `ef_alta_empleado` falla
tras crear el usuario de Auth pero antes de escribir en fichas_empleados, y el
rollback explícito del §50.3 no llega a ejecutarse por corte de red o kill de proceso).

**Invariantes de seguridad:**

| Aspecto | Decisión |
|---|---|
| Filtro de email | Solo elimina usuarios con email `*@u24.internal` — no toca cuentas de servicio externas |
| Paginación | 1000 usuarios por lote (`listUsers` API) |
| Idempotente | Sin huérfanos → sin operaciones destructivas |
| Complementario con §50.3 | El rollback explícito minimiza la tasa de aparición; este cron es la red de seguridad |

---

## 22. RPC `rpc_cambiar_rol` (B-05)

**Tipo:** `CREATE FUNCTION ... SECURITY DEFINER LANGUAGE plpgsql`
**Parámetros:** `p_id_nombre TEXT, p_nuevo_rol TEXT`
**Retorno:** `VOID`
**RBAC:** `can_manage_rrhh` — roles `rrhh`, `gerencia`.
**Llamada via:** `supabase.rpc('rpc_cambiar_rol', { p_id_nombre, p_nuevo_rol })`

Ver implementación SQL completa en `logic.md §55`.

**Flujo:**

| Paso | Acción |
|---|---|
| 1 | Valida `can_manage_rrhh` — 400 `insufficient_privilege` si no tiene claim |
| 2 | Valida `p_nuevo_rol` contra los 10 roles operativos — 400 `rol_invalido` si no es válido |
| 3 | Verifica que el empleado existe y `activo = true` — 400 `empleado_no_encontrado_o_inactivo` |
| 4 | No-op si `rol_actual == p_nuevo_rol` (idempotente) |
| 5 | `UPDATE fichas_empleados SET rol = p_nuevo_rol` |
| 6 | `INSERT auditoria_rbac` evento `cambio_rol` con `rol_anterior`, `rol_nuevo`, `ejecutado_por` |

**Nota sobre efecto inmediato en JWT:**
El cambio de rol en `fichas_empleados` es inmediato en DB. Sin embargo, el JWT activo
del empleado conserva los claims anteriores hasta que expire o haga refresh (TTL típico 1 hora).
Para efecto inmediato, combinar con `ef_revocar_sesion_usuario` (§7): invalida el JWT forzando
un nuevo login que pasará por `set_claims` y recibirá los claims del nuevo rol.

---

## 23. RLS tabla `solicitudes_rgpd` (B-10)

**Tipo:** Table-level RLS policies.
**Propósito:** Registro inmutable de solicitudes de borrado RGPD (Art. 17).

```sql
-- SELECT: coordinacion y gerencia (can_manage_rbac)
CREATE POLICY "rgpd_sol_select" ON solicitudes_rgpd
  FOR SELECT USING (claim('can_manage_rbac'));

-- INSERT: coordinacion y gerencia pueden registrar solicitudes
CREATE POLICY "rgpd_sol_insert" ON solicitudes_rgpd
  FOR INSERT WITH CHECK (claim('can_manage_rbac'));

-- UPDATE: coordinacion y gerencia para marcar procesada/denegada
-- (la RPC rpc_procesar_borrado_rgpd hace UPDATE via SECURITY DEFINER, bypasea esta policy)
CREATE POLICY "rgpd_sol_update" ON solicitudes_rgpd
  FOR UPDATE USING (claim('can_manage_rbac'));

-- DELETE: prohibido incondicional — el registro es trazabilidad legal
CREATE POLICY "rgpd_sol_no_delete" ON solicitudes_rgpd
  FOR DELETE USING (FALSE);
```

**Estados del ciclo de vida:**

| Estado | Significado | Quién puede transicionar |
|---|---|---|
| `pendiente` | Solicitud registrada, pendiente de revisión | Estado inicial |
| `procesada` | Purga ejecutada por `rpc_procesar_borrado_rgpd` | RPC SECURITY DEFINER |
| `denegada` | Revisada y rechazada (con motivación en `notas_procesamiento`) | UPDATE directo por can_manage_rbac |

---

## 24. RPCs RGPD (B-11)

### `rpc_solicitar_borrado_rgpd`

**Auth:** JWT con `can_manage_rbac` — roles `coordinacion`, `gerencia`.
**Parámetros:** `p_tipo_solicitud TEXT, p_identificador TEXT, p_motivo TEXT`
**Retorno:** `UUID` — id de la solicitud creada.

Ver implementación SQL completa en `logic.md §56.2`.

**Tipos de solicitud:**

| `p_tipo_solicitud` | `p_identificador` | Acción de purga |
|---|---|---|
| `'borrado_clinico'` | UUID del documento (doc2/doc3/doc4/doc5) | Sustracción JSONB de claves PII en `datos_paciente`; nullificación de `datos_firma` |
| `'borrado_empleado'` | `id_nombre` del empleado | `nombre_real = 'ANONIMIZADO'`, `dni = SHA-256(dni)` |

### `rpc_procesar_borrado_rgpd`

**Auth:** JWT con `can_manage_rbac` — roles `coordinacion`, `gerencia`.
**Parámetros:** `p_solicitud_id UUID, p_notas TEXT (opcional)`
**Retorno:** `VOID`.

Ver implementación SQL completa en `logic.md §56.3`.

**Invariantes críticos:**

| Invariante | Implementación |
|---|---|
| NUNCA DELETE de filas clínicas | Solo `UPDATE datos_paciente = datos_paciente - CLAVES_PII` |
| NUNCA NULL completo del campo JSONB | El operador `-` elimina solo las claves PII; estadísticas se conservan |
| Idempotencia clínica | Guard `datos_paciente ?| CLAVES_PII` — no-op si ya fue purgado |
| Idempotencia empleado | Guard `nombre_real != 'ANONIMIZADO'` — no re-hashea un hash |
| DNI no nullificado | Se reemplaza por SHA-256 hex — identificable como anónimo, no recuperable |
| Solicitud única ejecución | Guard `estado = 'pendiente'` — lanza excepción si ya procesada |
| Dependencia pgcrypto | `digest(dni::bytea, 'sha256')` requiere `CREATE EXTENSION IF NOT EXISTS pgcrypto` |

---

## 25. RPC `rpc_baja_vehiculo` (C-05)

**Tipo:** `CREATE FUNCTION ... SECURITY DEFINER LANGUAGE plpgsql`
**Parámetros:** `p_matricula TEXT, p_motivo TEXT DEFAULT NULL`
**RBAC:** `can_manage_fleet` (roles: `responsable_flota`, `gerencia`) o `can_manage_rbac` (gerencia).
**Llamada via:** `supabase.rpc('rpc_baja_vehiculo', { p_matricula, p_motivo })`

Ver especificación SQL completa en `logic.md §57`.

**Guards secuenciales (todos con FOR UPDATE sobre `vehiculos`):**

| # | Condición | Error | HTTP hint |
|---|---|---|---|
| 1 | Sin claim `can_manage_fleet` ni `can_manage_rbac` | `insufficient_privilege` | 403 |
| 2 | Matrícula no encontrada | `vehiculo_no_encontrado` | 404 |
| 3 | `condicion_tecnica = 'dado_de_baja'` | `vehiculo_ya_de_baja` | 409 |
| 4 | Fila en `dotaciones_drp` con `timestamp_salida IS NULL` (C-05) | `vehiculo_en_drp_activo` | 409 |
| 5 | `pilot_id IS NOT NULL` en `vehiculos` | `vehiculo_con_pilot_activo` | 409 |

**Efectos (si pasan todos los guards):**

| Tabla | Acción |
|---|---|
| `vehiculos` | `condicion_tecnica = 'dado_de_baja'`, `estado_operativo = 'inactivo'` |
| `auditoria_rbac` | INSERT con `tipo_evento = 'baja_vehiculo'`, matricula y motivo en metadata |

**Flujo de desbloqueo de guards 4 y 5:**
1. Cancelar o finalizar el DRP activo (`cancelar_drp` / flujo normal de finalización)
2. Forzar checkout del pilot (`forzar_checkout_administrativo`)
3. Llamar `rpc_baja_vehiculo`

---

## 26. RPCs `rpc_aprobar_desbloqueo` + `rpc_rechazar_desbloqueo` (C-06)

**Tipo:** `CREATE FUNCTION ... SECURITY DEFINER LANGUAGE plpgsql`
**RBAC:** `can_manage_rbac` (roles: `coordinacion`, `gerencia`) — validado como **primera instrucción** del cuerpo.
**Llamada via:** `supabase.rpc('rpc_aprobar_desbloqueo', { p_solicitud_id })` / `supabase.rpc('rpc_rechazar_desbloqueo', { p_solicitud_id, p_motivo_rechazo })`

Ver especificación SQL completa en `logic.md §58`.

**RLS de `solicitudes_desbloqueo` actualizada:**

```sql
-- UPDATE bloqueado para JWT directos — el único path son las RPCs SECURITY DEFINER
CREATE POLICY "solicitudes_update" ON solicitudes_desbloqueo
  FOR UPDATE USING (FALSE);
```

**Guards de ambas RPCs:**

| # | Condición | Error | HTTP hint |
|---|---|---|---|
| 1 | Sin claim `can_manage_rbac` | `insufficient_privilege` | 403 |
| 2 | Solicitud no encontrada | `solicitud_no_encontrada` | 404 |
| 3 | `estado != 'pendiente'` (ya aprobada, rechazada o expirada) | `solicitud_no_pendiente` | 409 |

**Efectos de `rpc_aprobar_desbloqueo`:**

| Tabla | Acción |
|---|---|
| `solicitudes_desbloqueo` | `estado = 'aprobada'`, `id_nombre_revisor = <revisor>` |
| `pg_notify('desbloqueo_terminal', ...)` | Payload: `{tipo:'desbloqueo_aprobado', id_terminal, revisor, solicitud_id}` |
| `auditoria_rbac` | INSERT con `tipo_evento = 'desbloqueo_aprobado'` |

**Efectos de `rpc_rechazar_desbloqueo`:**

| Tabla | Acción |
|---|---|
| `solicitudes_desbloqueo` | `estado = 'rechazada'`, `id_nombre_revisor = <revisor>` |
| `pg_notify('desbloqueo_terminal', ...)` | Payload: `{tipo:'desbloqueo_rechazado', id_terminal, motivo_rechazo, solicitud_id}` |
| `auditoria_rbac` | INSERT con `tipo_evento = 'desbloqueo_rechazado'` |

**Flujo completo del terminal (cierra F-04):**
```
Terminal bloqueado → rpc_solicitar_desbloqueo → estado:'pendiente'
                          ↓ Realtime a bandeja_entrada_coordinacion
Coordinador revisa → rpc_aprobar_desbloqueo  → estado:'aprobado' + pg_notify
                   → rpc_rechazar_desbloqueo → estado:'rechazado' + pg_notify
                          ↓ Realtime al terminal
Terminal recibe notificación → UI actualiza estado
```

---

## 27. Rate-limit de consumo de PIN de emergencia — `ef_consumir_pin` (B-09)

**Tipo:** Edge Function (modifica `ef_consumir_pin` existente)
**Ubicación:** `supabase/functions/ef-consumir-pin/index.ts`

El flujo de consumo de PIN de emergencia no tenía ningún límite de intentos, lo que permite ataques de fuerza bruta desde un terminal comprometido.

### 27.1 Lógica de rate-limit

```typescript
const VENTANA_MS     = 10 * 60 * 1000   // 10 minutos
const MAX_INTENTOS   = 5                // intentos máximos por ventana
const BLOQUEO_BASE_S = 60               // bloqueo inicial tras superar límite (segundos)

async function checkRateLimit(id_terminal: string): Promise<void> {
  // Truncar timestamp a ventana de 10 min
  const ahora = new Date()
  const minutos = Math.floor(ahora.getMinutes() / 10) * 10
  const ventana_inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(),
                                   ahora.getHours(), minutos, 0, 0).toISOString()

  const { data: fila } = await supabaseAdmin
    .from('pin_intentos_fallidos')
    .select('intentos, bloqueado_hasta')
    .eq('id_terminal', id_terminal)
    .eq('ventana_inicio', ventana_inicio)
    .maybeSingle()

  if (fila?.bloqueado_hasta && new Date(fila.bloqueado_hasta) > ahora) {
    const restantes = Math.ceil((new Date(fila.bloqueado_hasta).getTime() - ahora.getTime()) / 1000)
    throw new RateLimitError(`Terminal bloqueado temporalmente. Espera ${restantes} segundos.`)
  }

  if ((fila?.intentos ?? 0) >= MAX_INTENTOS) {
    // Escalar bloqueo: 60s × 2^(veces_superado - 1), máx 30 min
    const veces = Math.floor((fila!.intentos - MAX_INTENTOS) / MAX_INTENTOS) + 1
    const bloqueo_s = Math.min(BLOQUEO_BASE_S * Math.pow(2, veces - 1), 1800)
    const bloqueado_hasta = new Date(ahora.getTime() + bloqueo_s * 1000).toISOString()
    await supabaseAdmin
      .from('pin_intentos_fallidos')
      .upsert({ id_terminal, ventana_inicio, intentos: fila!.intentos + 1, bloqueado_hasta })
    throw new RateLimitError(`Demasiados intentos fallidos. Terminal bloqueado ${bloqueo_s} segundos.`)
  }
}

async function registrarFallo(id_terminal: string): Promise<void> {
  const ahora = new Date()
  const minutos = Math.floor(ahora.getMinutes() / 10) * 10
  const ventana_inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(),
                                   ahora.getHours(), minutos, 0, 0).toISOString()
  await supabaseAdmin
    .from('pin_intentos_fallidos')
    .upsert({ id_terminal, ventana_inicio, intentos: supabase.sql`intentos + 1` },
             { onConflict: 'id_terminal,ventana_inicio', ignoreDuplicates: false })
}
```

**Orden de ejecución en `ef_consumir_pin`:**
1. `checkRateLimit(id_terminal)` — lanza 429 si bloqueado
2. Verificar PIN via hash
3. Si PIN inválido → `registrarFallo(id_terminal)` → 401
4. Si PIN válido → consumir PIN + registrar evento `sesion_emergencia_consumida` (no registrar fallo)

**Guard de auditoría:** todos los bloqueos generan entrada en `auditoria_rbac` con `tipo_evento = 'fallo_autenticacion'` y `metadata.motivo = 'rate_limit_pin'`.

---

## 28. RLS políticas adicionales (B-13)

### `catalogo_items` — gestión de catálogo

```sql
-- Solo can_manage_catalog puede archivar/desarchivar ítems
CREATE POLICY "catalogo_update" ON catalogo_items
  FOR UPDATE USING (claim('can_manage_catalog'));

-- Lectura del catálogo: todos los autenticados (incluyendo ítems archivados para admin)
CREATE POLICY "catalogo_select" ON catalogo_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- INSERT: solo can_manage_catalog (añadir nuevo ítem al catálogo)
CREATE POLICY "catalogo_insert" ON catalogo_items
  FOR INSERT WITH CHECK (claim('can_manage_catalog'));

-- DELETE: prohibido — solo soft-delete via archivado = TRUE
CREATE POLICY "catalogo_delete" ON catalogo_items
  FOR DELETE USING (FALSE);
```

**Claim `can_manage_catalog`:** asignado a roles `responsable_logistica` y `gerencia`. Ver `rbac_y_permisos.md §ROLE_CLAIMS`.

**Trigger de purga en plantillas:** al UPDATE con `archivado = TRUE`:
```sql
CREATE OR REPLACE FUNCTION trg_fn_purge_plantilla_lineas()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.archivado = TRUE AND OLD.archivado = FALSE THEN
    DELETE FROM plantilla_lineas WHERE id_item = NEW.id_item;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purge_plantilla_lineas
  AFTER UPDATE OF archivado ON catalogo_items
  FOR EACH ROW EXECUTE FUNCTION trg_fn_purge_plantilla_lineas();

---

## 29. `rpc_transferir_galleta` — traspaso de terminal en cambio de turno (C-09)

**Tipo:** PostgreSQL RPC `SECURITY DEFINER`  
**Claim requerido:** `can_manage_rbac` (coordinacion, gerencia)  
**Propósito:** permite a coordinación traspasar la galleta permanente de un terminal a un nuevo empleado durante el cambio de turno, sin revocar el acceso antes de que el receptor esté presente.

### 29.1 Firma

```sql
CREATE OR REPLACE FUNCTION rpc_transferir_galleta(
  p_id_terminal       TEXT,    -- fingerprint SHA-256 del terminal físico
  p_id_nombre_cedente TEXT,    -- empleado que entrega el terminal
  p_id_nombre_receptor TEXT,   -- empleado que recibe el terminal
  p_coordinador_id    TEXT     -- coordinador que autoriza (extraído del JWT)
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
```

### 29.2 Validaciones previas

```sql
-- 1. Claim del coordinador
IF NOT claim('can_manage_rbac') THEN
  RAISE EXCEPTION 'insufficient_privilege';
END IF;

-- 2. Cedente tiene galleta permanente activa en ese terminal
IF NOT EXISTS (
  SELECT 1 FROM galletas_terminales
   WHERE id_terminal = p_id_terminal
     AND id_nombre   = p_id_nombre_cedente
     AND tipo        = 'permanente'
     AND revocado_at IS NULL
) THEN
  RAISE EXCEPTION 'galleta_no_encontrada'
    USING DETAIL = 'El cedente no tiene galleta permanente activa en este terminal';
END IF;

-- 3. Receptor existe y está activo
IF NOT EXISTS (
  SELECT 1 FROM fichas_empleados
   WHERE id_nombre = p_id_nombre_receptor AND activo = TRUE
) THEN
  RAISE EXCEPTION 'receptor_no_encontrado'
    USING DETAIL = 'El receptor no existe o está dado de baja';
END IF;

-- 4. Receptor no tiene ya galleta activa en este mismo terminal
IF EXISTS (
  SELECT 1 FROM galletas_terminales
   WHERE id_terminal = p_id_terminal
     AND id_nombre   = p_id_nombre_receptor
     AND revocado_at IS NULL
) THEN
  RAISE EXCEPTION 'receptor_ya_tiene_galleta'
    USING DETAIL = 'El receptor ya tiene galleta activa en este terminal';
END IF;
```

### 29.3 Pasos transaccionales

```sql
BEGIN;

-- 1. Revocar galleta del cedente
UPDATE galletas_terminales
   SET revocado_at = NOW()
 WHERE id_terminal = p_id_terminal
   AND id_nombre   = p_id_nombre_cedente
   AND revocado_at IS NULL;

-- 2. Crear nueva galleta permanente para el receptor
INSERT INTO galletas_terminales
  (id_galleta, id_terminal, id_nombre, tipo, creado_por, ultima_activacion_at)
VALUES
  (gen_random_uuid(), p_id_terminal, p_id_nombre_receptor, 'permanente', p_coordinador_id, NOW());

-- 3. Auditar revocación del cedente
INSERT INTO auditoria_rbac (id_evento, tipo_evento, id_nombre, id_terminal, metadata, created_at)
VALUES (
  gen_random_uuid(), 'galleta_revocada', p_id_nombre_cedente, p_id_terminal,
  jsonb_build_object('motivo', 'traspaso_turno', 'nuevo_titular', p_id_nombre_receptor,
                     'autorizado_por', p_coordinador_id),
  NOW()
);

-- 4. Auditar emisión para el receptor
INSERT INTO auditoria_rbac (id_evento, tipo_evento, id_nombre, id_terminal, metadata, created_at)
VALUES (
  gen_random_uuid(), 'galleta_emitida', p_id_nombre_receptor, p_id_terminal,
  jsonb_build_object('motivo', 'traspaso_turno', 'cedente', p_id_nombre_cedente,
                     'autorizado_por', p_coordinador_id),
  NOW()
);

COMMIT;

-- 5. Broadcast de invalidación al terminal (fuera de la transacción — no debe bloquearla)
PERFORM pg_notify(
  'terminal_security',
  json_build_object(
    'channel',  'terminal:' || p_id_terminal || ':security',
    'event',    'offline_session_invalidated',
    'payload',  json_build_object(
      'id_nombre', p_id_nombre_cedente,
      'reason',    'traspaso_turno'
    )
  )::text
);

RETURN jsonb_build_object('ok', true, 'nuevo_titular', p_id_nombre_receptor);
```

### 29.4 Comportamiento del cliente al recibir `offline_session_invalidated` con `reason: 'traspaso_turno'`

1. Si `useAuthStore.idNombre === payload.id_nombre` (el cedente está logueado en este terminal):
   - `idbDel('u24_offline_session')` — borrar hash PBKDF2 local
   - `useAuthStore.clear()`
   - Modal informativo (no bloqueante de emergencia): *"El terminal fue traspasado a otro empleado. Tu sesión ha finalizado."*
   - Redirigir a `estado_0`
2. El receptor debe hacer check-in en el terminal con sus propias credenciales — la nueva galleta permanente ya está registrada en la DB.

### 29.5 Llamada desde el cliente

```typescript
const { error } = await supabase.rpc('rpc_transferir_galleta', {
  p_id_terminal:        idTerminalFisico,
  p_id_nombre_cedente:  idNombreCedente,
  p_id_nombre_receptor: idNombreReceptor,
  p_coordinador_id:     useAuthStore.getState().idNombre,
})
if (error) handleRpcError(error)
```

**Claim requerido en el JWT del llamante:** `can_manage_rbac: true`.  
Roles que lo tienen: `coordinacion`, `gerencia`. Ver `rbac_y_permisos.md §ROLE_CLAIMS`.
```
