-- ============================================================
--  U24 — Supabase Storage: buckets y RLS
--  Sprint 9, Tarea 9.4
--  Fecha: 2026-05-21
--
--  ADR-002: imágenes como Blob a Storage, nunca Base64
--  Buckets: averias (imágenes Doc-7), firmas (firmas digitales)
-- ============================================================

-- Crear buckets si no existen
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('averias', 'averias', false, 5242880,  ARRAY['image/webp', 'image/jpeg', 'image/png']),
  ('firmas',  'firmas',  false, 1048576,  ARRAY['image/webp', 'image/png'])
ON CONFLICT (id) DO NOTHING;


-- ── Políticas bucket: averias ──────────────────────────────────────────────

-- Cualquier autenticado puede subir imágenes de averías
CREATE POLICY "averias: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'averias');

-- El redactor o roles de supervisión pueden leer
CREATE POLICY "averias: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'averias'
    AND (
      -- El uploader (owner) puede leer su propio objeto
      auth.uid()::TEXT = (storage.foldername(name))[1]
      -- Supervisión también puede leer
      OR auth_rol_actual() IN ('responsable_flota', 'gerencia', 'coordinacion')
    )
  );

-- Solo el redactor puede eliminar (para corrección antes de cierre)
CREATE POLICY "averias: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'averias'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );


-- ── Políticas bucket: firmas ───────────────────────────────────────────────

CREATE POLICY "firmas: authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'firmas');

CREATE POLICY "firmas: authenticated read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'firmas'
    AND (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      OR auth_rol_actual() IN ('responsable_flota', 'gerencia', 'coordinacion', 'rrhh')
    )
  );
