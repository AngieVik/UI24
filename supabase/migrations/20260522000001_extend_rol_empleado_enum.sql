-- 20260522000001_extend_rol_empleado_enum.sql
-- Fase B.1 del roadmap de reconstrucción del frontend (2026-05-22).
-- Añade 'personal_externo' e 'invitado' al enum rol_empleado.
-- Valores 'sin_rol' e 'inactivo' NO se añaden al enum — son fallbacks que
-- el Custom Access Token Hook devuelve como string cuando no hay ficha o
-- activo=false. No deben poder asignarse a fichas_empleados.rol.

ALTER TYPE public.rol_empleado ADD VALUE IF NOT EXISTS 'personal_externo';
ALTER TYPE public.rol_empleado ADD VALUE IF NOT EXISTS 'invitado';
