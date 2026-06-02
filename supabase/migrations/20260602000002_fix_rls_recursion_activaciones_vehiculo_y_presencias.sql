-- Migración: fix_rls_recursion_activaciones_vehiculo_y_presencias
-- Fecha: 2026-06-02
-- Motivo: activaciones_vehiculo_select_rbac referenciaba activaciones_vehiculo
-- en el subquery DRP (JOIN activaciones_vehiculo av ON av.matricula = d2.matricula),
-- causando "infinite recursion detected in policy for relation activaciones_vehiculo".
-- Además, presencias_activas_terminal llamaba a activaciones_vehiculo en su subquery DRP,
-- creando una cadena de recursión cruzada.
-- Solución: dos funciones SECURITY DEFINER que envuelven las subconsultas problemáticas.

-- HELPER 1: Matriculas accesibles al usuario actual por pertenecer a un DRP activo
CREATE OR REPLACE FUNCTION activaciones_matriculas_para_usuario()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DISTINCT d.matricula
  FROM dotaciones_drp d
  WHERE d.timestamp_salida IS NULL
    AND d.id_drp IN (
      SELECT d2.id_drp
      FROM dotaciones_drp d2
      JOIN activaciones_vehiculo av ON av.matricula = d2.matricula
      WHERE d2.timestamp_salida IS NULL
        AND av.timestamp_cierre IS NULL
        AND (av.pilot = auth_id_nombre_actual() OR av.carry = auth_id_nombre_actual())
    );
$$;

REVOKE ALL ON FUNCTION activaciones_matriculas_para_usuario() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activaciones_matriculas_para_usuario() TO authenticated;

-- HELPER 2: id_nombre de compañeros DRP del usuario actual
CREATE OR REPLACE FUNCTION presencias_drp_crew_para_usuario()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT av2.pilot
  FROM activaciones_vehiculo av2
  JOIN dotaciones_drp d ON d.matricula = av2.matricula
  WHERE av2.timestamp_cierre IS NULL
    AND d.timestamp_salida IS NULL
    AND d.id_drp IN (
      SELECT d2.id_drp FROM dotaciones_drp d2
      JOIN activaciones_vehiculo av3 ON av3.matricula = d2.matricula
      WHERE d2.timestamp_salida IS NULL AND av3.timestamp_cierre IS NULL
      AND (av3.pilot = auth_id_nombre_actual() OR av3.carry = auth_id_nombre_actual())
    )
  UNION
  SELECT av2.carry
  FROM activaciones_vehiculo av2
  JOIN dotaciones_drp d ON d.matricula = av2.matricula
  WHERE av2.carry IS NOT NULL
    AND av2.timestamp_cierre IS NULL
    AND d.timestamp_salida IS NULL
    AND d.id_drp IN (
      SELECT d2.id_drp FROM dotaciones_drp d2
      JOIN activaciones_vehiculo av3 ON av3.matricula = d2.matricula
      WHERE d2.timestamp_salida IS NULL AND av3.timestamp_cierre IS NULL
      AND (av3.pilot = auth_id_nombre_actual() OR av3.carry = auth_id_nombre_actual())
    );
$$;

REVOKE ALL ON FUNCTION presencias_drp_crew_para_usuario() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION presencias_drp_crew_para_usuario() TO authenticated;

-- FIX: activaciones_vehiculo — usar helper en lugar de subquery recursiva
DROP POLICY IF EXISTS activaciones_vehiculo_select_rbac ON activaciones_vehiculo;

CREATE POLICY activaciones_vehiculo_select_rbac
ON activaciones_vehiculo
FOR SELECT
TO authenticated
USING (
  (auth_rol_actual() = ANY (ARRAY['coordinacion'::rol_empleado, 'gerencia'::rol_empleado]))
  OR (pilot = auth_id_nombre_actual())
  OR (carry = auth_id_nombre_actual())
  OR (matricula IN (SELECT activaciones_matriculas_para_usuario()))
);

-- FIX: presencias_activas_terminal — usar helper DRP en lugar de subquery cruzada
DROP POLICY IF EXISTS presencias_activas_terminal_select_rbac ON presencias_activas_terminal;

CREATE POLICY presencias_activas_terminal_select_rbac
ON presencias_activas_terminal
FOR SELECT
TO authenticated
USING (
  (auth_rol_actual() = ANY (ARRAY['coordinacion'::rol_empleado, 'gerencia'::rol_empleado]))
  OR (id_nombre = auth_id_nombre_actual())
  OR (id_terminal = presencias_terminal_para_usuario())
  OR (id_nombre IN (SELECT presencias_drp_crew_para_usuario()))
);
