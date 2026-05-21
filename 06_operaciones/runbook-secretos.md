# Runbook — Gestión de Secretos y Entornos

**Proyecto:** U24  
**Sprint:** 0  
**Aplica a:** todo el equipo de desarrollo

---

## Principio fundamental

> Ningún secreto (contraseña, clave de API, JWT, VAPID, DSN de Sentry) vive
> en el repositorio git. **Nunca.** Ni en un commit antiguo, ni en un
> comentario, ni como valor por defecto en código fuente.

---

## Variables de entorno por entorno

| Variable | Local (`supabase start`) | Staging (GitHub Secret) | Producción (hosting) |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54321` | URL del proyecto staging | URL del proyecto prod |
| `VITE_SUPABASE_ANON_KEY` | anon key local (`supabase status`) | Secret: `SUPABASE_ANON_KEY_STAGING` | Variable de entorno del hosting |
| `VITE_SENTRY_DSN` | vacía / comentada | Secret: `SENTRY_DSN` | Variable de entorno del hosting |
| `VITE_VAPID_PUBLIC_KEY` | vacía / comentada | Secret: `VAPID_PUBLIC_KEY` | Variable de entorno del hosting |

La clave `service_role` y `SUPABASE_ACCESS_TOKEN` **nunca van al frontend**. Solo las usan Edge Functions o scripts de CI con permisos restringidos.

---

## Cómo configurar el entorno local

```bash
# 1. Copiar la plantilla
cp .env.example .env.local

# 2. Arrancar Supabase
supabase start
# El output muestra la URL y las claves locales. Copiarlas en .env.local.

# 3. Verificar que .env.local NO está en git
git status   # no debe aparecer .env.local
```

---

## Cómo añadir un secreto en CI (GitHub Actions)

1. Ir a **Settings → Secrets and variables → Actions** del repositorio.
2. Click en **New repository secret**.
3. Nombre: `SUPABASE_ANON_KEY_STAGING` (por ejemplo).
4. En el workflow YAML usar `${{ secrets.SUPABASE_ANON_KEY_STAGING }}`.

Los secretos de CI **nunca se imprimen en logs**. Si necesitas depurar, enmascara el valor antes.

---

## Cómo añadir un secreto en producción

Depende del proveedor de hosting. Para Vercel / Netlify / Supabase hosted:
- Usar el panel de **Environment Variables** del proyecto.
- Separar las variables por entorno (Preview vs Production).
- **No pegar valores en el código fuente** aunque sean temporales.

---

## Separación de entornos

```
local       →  .env.local             (nunca en git)
staging     →  GitHub Secrets         (solo en CI)
producción  →  Variables del hosting  (solo en el proveedor)
```

---

## Qué hacer si un secreto se commitea por accidente

1. **Revocar inmediatamente** la clave desde la consola del proveedor (Supabase, Sentry, etc.).
2. Generar una clave nueva y rotarla en todos los entornos.
3. Limpiar el historial git con `git filter-repo` o `BFG Repo Cleaner`.
4. Hacer force-push y notificar al equipo para que descarten sus copias locales.
5. Registrar el incidente en el canal de seguridad.

> Revocar siempre antes de limpiar el historial. La limpieza no invalida la clave expuesta.

---

## Verificación periódica

El workflow `ci-quality.yml` comprueba en cada PR que:
- No hay archivos `.env` (salvo `.env.example`) en el índice de git.
- No hay cadenas con formato JWT en archivos de código fuente.

Para una auditoría manual más completa:
```bash
git log --all --full-history -- "**/.env*"   # historial de archivos .env
git grep -i "service_role"                   # buscar claves de servicio
```
