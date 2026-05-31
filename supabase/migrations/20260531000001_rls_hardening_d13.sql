-- Migration: 20260531000001_rls_hardening_d13.sql
-- E.2 D-13 — Endurecer RLS liberal en presencias_activas_terminal y activaciones_vehiculo
-- Autorizado por AngieVik — 2026-05-31
--
-- Reglas acordadas:
--   * coordinacion / gerencia → ven TODO
--   * Resto de trabajadores → solo ven su propia presencia/activación + mismo terminal + mismo DRP activo
--   * locations → catálogo estático (location_id, nombre, tipo), sin datos sensibles, se deja como está

-- ─────────────────────────────────────────────────────────────────
-- 1. activaciones_vehiculo
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "activaciones_vehiculo_select" ON public.activaciones_vehiculo;

CREATE POLICY "activaciones_vehiculo_select_rbac"
ON public.activaciones_vehiculo
FOR SELECT
TO authenticated
USING (
  -- coordinacion / gerencia ven todo
  auth_rol_actual() = ANY (ARRAY[
    'coordinacion'::rol_empleado,
    'gerencia'::rol_empleado
  ])
  OR
  -- trabajador es pilot o carry de esta activación
  pilot = auth_id_nombre_actual()
  OR
  carry = auth_id_nombre_actual()
  OR
  -- activación de otro vehículo en el mismo DRP activo que el del trabajador
  matricula IN (
    SELECT d.matricula
    FROM public.dotaciones_drp d
    WHERE d.timestamp_salida IS NULL
      AND d.id_drp IN (
        -- DRPs activos en los que participa el vehículo del trabajador actual
        SELECT d2.id_drp
        FROM public.dotaciones_drp d2
        JOIN public.activaciones_vehiculo av
          ON av.matricula = d2.matricula
        WHERE d2.timestamp_salida IS NULL
          AND av.timestamp_cierre IS NULL
          AND (
            av.pilot = auth_id_nombre_actual()
            OR av.carry = auth_id_nombre_actual()
          )
      )
  )
);

-- ─────────────────────────────────────────────────────────────────
-- 2. presencias_activas_terminal
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "presencias_activas_terminal_select" ON public.presencias_activas_terminal;

CREATE POLICY "presencias_activas_terminal_select_rbac"
ON public.presencias_activas_terminal
FOR SELECT
TO authenticated
USING (
  -- coordinacion / gerencia ven todo
  auth_rol_actual() = ANY (ARRAY[
    'coordinacion'::rol_empleado,
    'gerencia'::rol_empleado
  ])
  OR
  -- propia presencia
  id_nombre = auth_id_nombre_actual()
  OR
  -- mismo terminal (pilot + carry comparten terminal en el mismo turno)
  id_terminal IN (
    SELECT p2.id_terminal
    FROM public.presencias_activas_terminal p2
    WHERE p2.id_nombre = auth_id_nombre_actual()
  )
  OR
  -- en el mismo DRP activo: presencias de pilot/carry de vehículos
  -- cuya matricula está en el mismo DRP activo que el del trabajador actual
  id_nombre IN (
    SELECT av2.pilot
    FROM public.activaciones_vehiculo av2
    JOIN public.dotaciones_drp d ON d.matricula = av2.matricula
    WHERE av2.timestamp_cierre IS NULL
      AND d.timestamp_salida IS NULL
      AND d.id_drp IN (
        SELECT d2.id_drp
        FROM public.dotaciones_drp d2
        JOIN public.activaciones_vehiculo av3
          ON av3.matricula = d2.matricula
        WHERE d2.timestamp_salida IS NULL
          AND av3.timestamp_cierre IS NULL
          AND (
            av3.pilot = auth_id_nombre_actual()
            OR av3.carry = auth_id_nombre_actual()
          )
      )
    UNION
    SELECT av2.carry
    FROM public.activaciones_vehiculo av2
    JOIN public.dotaciones_drp d ON d.matricula = av2.matricula
    WHERE av2.carry IS NOT NULL
      AND av2.timestamp_cierre IS NULL
      AND d.timestamp_salida IS NULL
      AND d.id_drp IN (
        SELECT d2.id_drp
        FROM public.dotaciones_drp d2
        JOIN public.activaciones_vehiculo av3
          ON av3.matricula = d2.matricula
        WHERE d2.timestamp_salida IS NULL
          AND av3.timestamp_cierre IS NULL
          AND (
            av3.pilot = auth_id_nombre_actual()
            OR av3.carry = auth_id_nombre_actual()
          )
      )
  )
);
