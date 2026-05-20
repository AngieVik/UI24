### Desglose Sprint 2

*Objetivo: Blindar el acceso a los datos y garantizar la inmutabilidad de la auditoría.*

* [ ] **2.0 Helpers de Seguridad (Crítico):** Crear funciones `SECURITY DEFINER` (ej. `get_my_rol()`) para leer el rol del usuario en `fichas_empleados` sin causar bucles infinitos de recursión en las políticas RLS.
* [ ] **2.1 Activación Global:** Ejecutar `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` en TODAS las tablas del esquema `public`.
* [ ] **2.2 RLS Inmutables (Append-Only):** Aplicar `UPDATE/DELETE USING (FALSE)` a `auditoria_rbac`, `auditoria_inventario`, `doc1_asistencias`, `filiacion_eventos` y `sesiones_emergencia`.
* [ ] **2.3 RLS Core (RBAC):** - `system_config`: Solo modificable por `gerencia`.
  * `fichas_empleados`: Lectura global, modificación `rrhh`/`gerencia`.
  * `inventario_vehiculo`/`base`: Modificables solo vía RPC (bloquear UPDATE directo).
* [ ] **2.4 RLS Clínicas (Propiedad):** Políticas para `doc2`, `doc3`, `doc4`, `doc5` permitiendo UPDATE solo si `auth_uid_redactor = auth.uid()`.
* [ ] **2.5 Constraints de Idempotencia:** Añadir restricción `UNIQUE (mutation_uuid)` en `descuadres_inventario` y asegurar que los UUIDs generados en cliente soporten el patrón `ON CONFLICT DO NOTHING`.

Vamos a desarrollar el Sprint 2: **Seguridad de Datos (Supabase RLS)**
  Objetivo: Escribir la migración 20260519000002_rls_y_constraints.sql asegurando el principio de mínimo privilegio y evitando recursividad en PostgreSQL.
  **Instrucciones paso a paso:**
    1. Habilitar RLS en TODO:
      Escribe sentencias ALTER TABLE <nombre> ENABLE ROW LEVEL SECURITY; para absolutamente todas las tablas creadas en el Sprint 1.
    2. Helper de Roles (El gran Gotcha):
      No cruces fichas_empleados directamente dentro de las políticas RLS porque causarás un infinite recursion bug. Crea una función auxiliar:
        SQL
        CREATE OR REPLACE FUNCTION auth.user_role() RETURNS text AS $$
          SELECT rol::text FROM public.fichas_empleados WHERE auth_user_id = auth.uid() LIMIT 1;
        $$ LANGUAGE sql STABLE SECURITY DEFINER;
        (Nota: usa esta función o extrae el claim del JWT si optas por Custom Claims).
    3. Tablas Inmutables (Defensa RGPD):
      Para las tablas de auditoría (auditoria_rbac, auditoria_inventario, doc1_asistencias, filiacion_eventos, solicitudes_rgpd):
      Crea políticas FOR UPDATE y FOR DELETE con USING (FALSE). Ningún usuario ni administrador debe poder alterar el historial.
    4. Configuración del Sistema (system_config):
      SELECT: TO authenticated USING (true).
      INSERT / UPDATE: USING (auth.user_role() = 'gerencia').
    5. Documentos Clínicos (Autoría):
      Para doc2_informes_svb, doc3_informes_sva, doc4 y doc5:
      UPDATE: USING (auth_uid_redactor = auth.uid()). Nadie puede editar un informe clínico que no haya redactado él mismo.
    6. Constraints de Idempotencia (Cola Offline):
      Asegúrate de incluir el constraint único para los descuadres:
      ALTER TABLE descuadres_inventario ADD CONSTRAINT uq_descuadre_mutation_uuid UNIQUE (mutation_uuid);.
      Validación: Tras escribir el SQL, ejecuta supabase db reset. Luego intenta hacer un UPDATE manual en la tabla auditoria_rbac con un usuario autenticado; la base de datos debe rechazarlo."
