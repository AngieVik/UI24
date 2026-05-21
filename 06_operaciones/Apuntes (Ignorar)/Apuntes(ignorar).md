**Tarea Archivo Estado**
    0.1 CI base de datos .github/workflows/ci-database.yml ✅
    0.2 CI calidad .github/workflows/ci-quality.yml ✅
    0.3 Secretos y entornos .env.example · 06_operaciones/runbook-secretos.md · .gitignore actualizado ✅
    0.4 Convenciones + PR template 06_operaciones/convencion-nomenclatura.md · .github/pull_request_template.md ✅
    0.5 .gitattributes .gitattributes ✅
    0.6 Hooks pre-commit — ⏭️ Diferido a Sprint 5 (requiere package.json)
Decisión tomada en 0.4: Edge Functions → ef- + kebab-case (estándar HTTP/URL). Tabla de funciones a renombrar documentada en la convención.

**Lo que hace el CI ahora mismo**
    ci-database.yml — en cada PR: levanta Supabase local → supabase db reset (aplica migración + seeds) → genera tipos → diff contra src/types/supabase.ts. Bloquea si algo falla.
    ci-quality.yml — tres jobs independientes: (a) detecta .env commiteados + JWTs hardcodeados, (b) valida nomenclatura de migraciones, (c) placeholder para lint/tsc/prettier (se activa en Sprint 5 cuando exista package.json).
    Acción inmediata que te toca a ti (deuda 1.D1)
    El CI de tipos bloqueará hasta que se corrija la codificación de src/types/supabase.ts (actualmente UTF-16LE, Hallazgo S1-01). Con Supabase arrancado localmente:

**supabase gen types typescript --local | Out-File -Encoding utf8 src/types/supabase.ts**

- `Apuntes(ignorar).md` → sí está trackeado (fue commiteado antes de añadirse al `.gitignore`). No es un secreto crítico pero vale la pena desntrackear.
Encoding supabase.ts: era UTF-8 con BOM (no UTF-16LE como decía la auditoría — probablemente ya se había regenerado parcialmente). Ahora es UTF-8 sin BOM, que es lo que produce el CLI de Supabase → el diff del CI funcionará correctamente.

  Deuda 1.D2: sprint_1_complete.md nunca estuvo en git. Limpio.
    *CI activo desde ahora: cada PR disparará:
      Verificación de secretos/JWTs + convención de migraciones (inmediato)
      DB reset + diff de tipos (requiere Docker en el runner de GitHub)
      Frontend: placeholder hasta Sprint 5
