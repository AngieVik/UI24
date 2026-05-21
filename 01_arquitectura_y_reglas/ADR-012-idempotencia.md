# ADR-012 — Patrón de idempotencia de la cola offline

**Estado:** Aceptado  
**Fecha:** 2026-05-21  
**Sprint:** 2 (Tarea 2.6)  
**Hallazgo origen:** G-02

---

## Contexto

La cola offline (`useOfflineQueue`, Sprint 6) puede enviar la misma mutación más de una vez:
- El dispositivo pierde conexión justo después de enviar pero antes de recibir ACK.
- El usuario cierra la app y la reabre mientras hay mutaciones pendientes.
- El motor de reintentos dispara la misma mutación al reconectar.

El backend debe reconocer mutaciones duplicadas y devolver el mismo resultado sin re-ejecutar la lógica de negocio.

## Opciones evaluadas

### Opción A — `mutation_uuid UUID UNIQUE` por tabla

Añadir la columna a cada tabla encolable (`doc2`, `doc3`, `doc4`, `doc5`, `doc6`, `doc7`, `doc8` y `descuadres_inventario`).

| Ventaja | Inconveniente |
|---|---|
| Simple y autocontenido | 7+ columnas de infraestructura en tablas de negocio |
| La unicidad es visible en la tabla | Sin resultado cacheado (el cliente debe reintentar la lectura) |
| Fácil de auditar por tabla | Limpieza de UUIDs antiguos requiere lógica por tabla |

### Opción B — Ledger central `idempotency_keys` *(elegida)*

Una única tabla que actúa de registro de todas las mutaciones encoladas.

| Ventaja | Inconveniente |
|---|---|
| Un solo punto de TTL/limpieza (un cron) | Punto de contención bajo alta concurrencia |
| Guarda el resultado: el cliente obtiene la respuesta original en el reintento | Dependencia extra en cada RPC |
| Las tablas de negocio no contaminan columnas de infraestructura | |
| Observable: `SELECT * FROM idempotency_keys` muestra todo el backlog | |

> **Nota sobre `descuadres_inventario.mutation_uuid`:** esta columna ya existe en la migración inicial (ADR heredado). Se mantiene por coherencia con el diseño previo; para nuevas tablas, se usará el ledger central exclusivamente.

## Decisión

**Opción B — ledger central.**

## Esquema acordado

```sql
CREATE TABLE idempotency_keys (
  mutation_uuid  UUID        PRIMARY KEY,          -- generado por el cliente
  rpc_name       TEXT        NOT NULL,             -- nombre de la RPC invocada
  id_nombre      TEXT        NOT NULL REFERENCES fichas_empleados(id_nombre) ON DELETE CASCADE,
  resultado      JSONB,                            -- NULL = en progreso
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
);
```

## Contrato de uso en RPCs

Toda RPC encolable debe seguir este patrón (pseudocódigo PL/pgSQL):

```sql
-- 1. Comprobar si la mutación ya fue procesada
SELECT resultado INTO v_resultado
FROM idempotency_keys
WHERE mutation_uuid = p_mutation_uuid;

IF FOUND AND v_resultado IS NOT NULL THEN
  RETURN v_resultado;  -- idempotente: mismo resultado sin re-ejecutar
END IF;

-- 2. Registrar entrada "en progreso"
INSERT INTO idempotency_keys (mutation_uuid, rpc_name, id_nombre)
VALUES (p_mutation_uuid, 'rpc_nombre', p_id_nombre)
ON CONFLICT (mutation_uuid) DO NOTHING;

-- 3. Ejecutar la lógica de negocio
-- ... (trabajo real aquí)

-- 4. Guardar resultado
UPDATE idempotency_keys
SET resultado = to_jsonb(v_resultado)
WHERE mutation_uuid = p_mutation_uuid;

RETURN v_resultado;
```

## RLS

El ledger es opaco para el cliente: todas las operaciones (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) tienen `USING (FALSE)` o `WITH CHECK (FALSE)`. Solo las funciones `SECURITY DEFINER` pueden acceder.

## TTL y limpieza

Las entradas expiran a los 7 días (`expires_at`). El cron `ef-cron-cleanup-orphans` (Sprint 4) purga filas con `expires_at < NOW()`.

## Consecuencias

- Cada RPC encolable necesita un parámetro `p_mutation_uuid UUID`.
- El cliente genera el UUID antes de encolar y lo almacena en IndexedDB junto con la mutación.
- Si la RPC falla antes de insertar en `idempotency_keys`, el reintento volverá a intentar la inserción — esto es correcto y esperado.
