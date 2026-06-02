-- Migración: fix_rls_recursion_presencias_activas_terminal
-- Fecha: 2026-06-02
-- Motivo: La política presencias_activas_terminal_select_rbac tenía una subconsulta
-- que referenciaba su propia tabla (id_terminal IN (SELECT ... FROM presencias_activas_terminal p2))
-- causando "infinite recursion detected in policy". Se crea una función SECURITY DEFINER
-- que bypasa RLS internamente para romper el ciclo.

CREATE OR REPLACE FUNCTION presencias_terminal_para_usuario()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id_terminal
  FROM presencias_activas_terminal
  WHERE id_nombre = auth_id_nombre_actual()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION presencias_terminal_para_usuario() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION presencias_terminal_para_usuario() TO authenticated;

DROP POLICY IF EXISTS presencias_activas_terminal_select_rbac ON presencias_activas_terminal;

CREATE POLICY presencias_activas_terminal_select_rbac
ON presencias_activas_terminal
FOR SELECT
TO authenticated
USING (
  (auth_rol_actual() = ANY (ARRAY['coordinacion'::rol_empleado, 'gerencia'::rol_empleado]))
  OR (id_nombre = auth_id_nombre_actual())
  OR (id_terminal = presencias_terminal_para_usuario())
  OR (id_nombre IN (
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
    WHERE av2.carry IS NOT NULL AND av2.timestamp_cierre IS NULL AND d.timestamp_salida IS NULL
      AND d.id_drp IN (
        SELECT d2.id_drp FROM dotaciones_drp d2
        JOIN activaciones_vehiculo av3 ON av3.matricula = d2.matricula
        WHERE d2.timestamp_salida IS NULL AND av3.timestamp_cierre IS NULL
        AND (av3.pilot = auth_id_nombre_actual() OR av3.carry = auth_id_nombre_actual())
      )
  ))
);
