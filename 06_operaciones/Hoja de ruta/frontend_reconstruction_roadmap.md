# Hoja de ruta — Reconstrucción del frontend U24

> **Documento operativo de la reconstrucción del frontend** iniciada el
> 2026-05-22 tras la auditoría post-checklist de despliegue. Trabaja en
> paralelo a `hoja_de_ruta.md` (sprints macro del proyecto) pero **se
> ejecuta primero**: ningún despliegue ni test E2E vuelve a correr hasta
> que esté cerrada.
>
> **Fuente de verdad técnica:** `01_arquitectura_y_reglas/rules.md` v2.1.
> **Fuente de verdad visual:**   `05_interfaz_y_desarrollo/diseño_chupiwachi.md`.
> **Mapa de navegación:**        `05_interfaz_y_desarrollo/mapeo_visual_ui.md`.

---

## Política de trabajo (lectura obligatoria al cambiar de agente)

1. **Una fase a la vez.** No se inicia una nueva fase hasta que la anterior
   cierre todos los criterios de aceptación. Las fases pueden tener
   sub-tareas en paralelo, pero el cierre es atómico.
2. **Claude pregunta antes de empezar cada fase** aunque la usuaria no lo
   solicite explícitamente. La pregunta incluye: alcance, decisiones
   pendientes y orden de implementación propuesto. Solo tras un "adelante"
   explícito Claude comienza.
3. **Cada cambio se documenta en `diseño_chupiwachi.md` §15 (changelog)**
   en la misma sesión en la que se hace. Si la sesión cierra sin documentar,
   la siguiente sesión arranca sincronizando memoria.
4. **No se hacen `npm run build` ni `git push` ni despliegues a Vercel**
   hasta cerrar la Fase E.
5. **No se borra el bypass de desarrollo** (`Acceso dev (saltar Supabase)`
   en `LoginScreen.tsx`) hasta cerrar la Fase D.
6. **Cualquier desviación de las reglas se levanta como deuda** en este
   documento (sección §"Deuda registrada") antes de cerrar la fase.
7. **Sentence case estricto** en toda copy de UI. Sin emojis salvo si el
   producto lo pide explícitamente.

---

## Estado actual (snapshot)

- ✅ Fase A — Chasis correcto (cerrada 2026-05-22)
- 🟡 Fase B — Reescritura del black_column (en curso, decisiones pendientes)
- ⬜ Fase C — Cableado de datos de `visual_info_home`
- ⬜ Fase D — Reconstrucción de Screens feature (modular)
- ⬜ Fase E — Validación y reapertura del checklist de despliegue
- ⬜ Fase F — Modo oscuro y refinamientos

---

## Convenciones del documento

Cada fase usa esta estructura:

```
🎯 Objetivo único
📥 Entrada (prerequisitos)
📤 Salida (artefactos)
🧩 Sub-tareas
✅ Definition of Done (criterios verificables)
⚠️ Riesgos y mitigaciones
❓ Decisiones a tomar antes de empezar (Claude pregunta)
```

> Las **DoD** son binarias. No hay "casi hecho" — o se cumple o se reabre la fase.

---

## Fase A — Chasis correcto ✅ (cerrada 2026-05-22)

### 🎯 Objetivo
Poner el terminal en el estado_1 correcto según `mapeo_visual_ui.md` §1:
sin gates inventados, con `BlackColumn` + `Header` + `home_area` desde el
primer momento tras login.

### 📤 Entregado
- `diseño_chupiwachi.md` (15 secciones) — fuente de verdad visual.
- shadcn/ui inicializado (CLI, preset Nova, base Radix) + 22 primitives.
- `lucide-react` operativo, Tabler eliminado, Geist eliminado.
- Barlow + Barlow Condensed servidas desde Google Fonts.
- `index.css` con tokens U24 mapeados a `@theme inline`, light + dark.
- `ThemeProvider` + `TooltipProvider` + `Sonner` cableados en `main.tsx`.
- `LoginScreen` con RHF + Zod, login online obligatorio, banner offline.
- `useLoginFlow` endurecido (sin login offline).
- `AppShell` + `BlackColumn` (árbol completo, 60 px, indicador activo
  amarillo 3 px, tooltips) + `Header` (60 px, ticker, bandejas, atrás).
- `VisualInfoHome` con empty state honesto.
- `App.tsx` con solo dos estados (login / shell).
- Bypass de desarrollo en LoginScreen (`Acceso dev`) condicionado a
  `import.meta.env.DEV`.
- Geometría ajustada (60 px chasis, `text-base` por defecto, logos
  agrandados).

### ✅ DoD cerrada
- [x] `npx tsc -b` sin errores.
- [x] `npm run dev` arranca sin warnings de Vite.
- [x] Login funciona con `admin/12345678` contra Supabase prod.
- [x] Botón `Acceso dev` permite saltar Supabase para validación UI.
- [x] Tras login se ve `BlackColumn` + `Header` + `VisualInfoHome`.
- [x] Navegar a cualquier ítem del black_column muestra placeholder honesto
      con copy correcta.
- [x] `diseño_chupiwachi.md` actualizado y consistente con la implementación.

---

## Fase B — Reescritura del black_column 🟡 (en curso)

### 🎯 Objetivo
Llegar a un `BlackColumn` con la **estructura de navegación drill-down
definitiva** (3 niveles raíz → grupo → grupillo), anchura fluida
(colapsa a 60 px tras seleccionar hoja, expande al entrar a grupo),
RBAC visual basado en **claims JWT reales**, indicadores y comportamiento
fino. El `BlackColumn` queda **congelado** al cierre de esta fase — no
se vuelve a tocar salvo bug fix.

### 📐 Modelo de navegación aprobado

- **Drill-down puro**: al pulsar un grupo, los items raíz se reemplazan
  por los hijos del grupo. Al pulsar un grupillo, se reemplazan por los
  hijos del grupillo. Máximo 3 niveles.
- **Anchura fluida**: 60 px (mínimo) cuando está colapsada; expande a
  ~180 px cuando está dentro de un grupo o grupillo (etiquetas a la
  derecha del icono).
- **Auto-contracción tras seleccionar hoja**: al pulsar una hoja
  terminal, la columna vuelve a 60 px (sin etiquetas), el icono activo
  queda en amarillo, y el `home_area` muestra el contenido. Se mantiene
  en el mismo nivel del grupo.
- **Botones fijos arriba**: Home (vuelve a raíz), Check-in (atajo),
  Atrás (contextual; solo dentro de grupo/grupillo), Expand/Collapse
  (toggle manual de etiquetas, siempre presente).
- **Botón "atrás" o cualquier navegación a otro nivel**: re-expande
  automáticamente mostrando etiquetas.

### 🌳 Árbol de navegación aprobado (2026-05-22)

Anexo de árbol formal en `mapeo_visual_ui.md` (se añade en B.2). Estructura
acordada:

```
Home (hoja fija)
Check-in (hoja fija)

Operativa rutinaria (grupo)
  ├─ Documentos del turno (grupillo)
  │   ├─ Doc-10 Envío material
  │   ├─ Doc-6 Gasto material
  │   ├─ Doc-8 Parte de trabajo
  │   └─ Doc-Checklist360
  ├─ Documentos clínicos (grupillo)
  │   ├─ Doc-2 Informe asistencial
  │   └─ Doc-11 Aviso urgente
  ├─ Mantenimiento (grupillo)
  │   ├─ Repostar combustible
  │   ├─ Repostar AdBlue
  │   └─ Doc-7 Informe avería
  └─ Vehículos (hoja del grupo)

DRP (grupo)
  ├─ Operativa DRP
  ├─ Visor DRP
  ├─ Resumen DRP
  ├─ Logística DRP
  ├─ Crear DRP
  └─ Estados DRP

Módulos especiales (grupo)
  ├─ PSA
  └─ Filiación

Logística y almacén (grupo)
  ├─ Inventario maestro (grupillo)
  │   ├─ Auditoría de inventario
  │   ├─ Inventarios (Locations)
  │   ├─ Inventarios dinámicos
  │   ├─ Catálogo de ítems
  │   └─ Descuadres y ajuste manual
  ├─ Stock (grupillo)
  │   ├─ Stock actual
  │   ├─ Historial de stock
  │   ├─ Plantillas de stock
  │   ├─ Gestión de plantillas
  │   └─ Alertas de stock
  ├─ Movimientos (grupillo)
  │   ├─ Últimos movimientos
  │   ├─ Inventario en tránsito
  │   ├─ Doc-9 Entrada almacén
  │   └─ Doc-10 Envío material
  ├─ Catálogo de ítems (hoja — acceso doble con grupillo Inventario maestro)
  └─ Bandeja logística (hoja, abre modal)

Flota y taller (grupo)
  ├─ Incidencias (grupillo)
  │   ├─ Incidencias abiertas
  │   ├─ Incidencias ancladas
  │   └─ Últimas incidencias
  ├─ Visor Mantenimiento (grupillo) ✋ ver D-09
  │   ├─ Tabla principal
  │   ├─ Badges de estado
  │   ├─ Filtros y orden
  │   ├─ Vista de detalle por vehículo
  │   ├─ Configuración de umbrales de alerta
  │   ├─ Doc-7 Informe avería
  │   └─ Incidencias
  ├─ Mantenimiento flota (grupillo) ✋ ver D-09
  │   ├─ Aceite
  │   ├─ Frenos
  │   └─ Neumáticos
  ├─ Vehículos metadata (grupillo)
  │   ├─ Documentación y dispositivo
  │   ├─ Kilometraje general
  │   └─ Historial eventos físicos
  └─ Bandeja flota (hoja, abre modal)

Coordinación y seguridad (grupo)
  ├─ Modulo_emergencias (grupillo) ✋ ver D-09
  │   ├─ Galleta pequeña
  │   └─ Galleta
  ├─ Dispositivos validados
  ├─ Visor seguimiento operativo
  ├─ RBAC
  ├─ Forzar checkout
  ├─ Cambio de password
  └─ Bandeja coordinación (abre modal)

Gestión y RRHH (grupo)
  ├─ Personal (grupillo)
  │   ├─ Fichas empleados
  │   └─ Gestión de bajas
  ├─ Planificación laboral (grupillo)
  │   ├─ Servicios
  │   ├─ Mantenimiento
  │   └─ Doc-12 Vacaciones
  ├─ Comunicación (grupillo)
  │   ├─ Gestión tablón
  │   └─ Marquesina
  ├─ Repositorio documentos (hoja del grupo)
  └─ Bandeja RRHH (hoja, abre modal)

Tablón central (hoja raíz)
Buzón interno (Doc-13) (hoja raíz)
```

### 🛤️ Sub-fases de Fase B (cada una se cierra antes de pasar a la siguiente)

#### B.1 — Backend: Custom Access Token Hook
- Migración `supabase/migrations/2026XXXX_custom_access_token_hook.sql`.
- Función `public.custom_access_token_hook(event jsonb) returns jsonb`
  que lee `fichas_empleados.rol` + `id_nombre` por `auth_user_id` y los
  inyecta en `claims.app_metadata`.
- Permisos: `EXECUTE` solo a `supabase_auth_admin`. `SELECT` sobre
  `fichas_empleados` a `supabase_auth_admin`.
- Activar el hook en **Supabase Dashboard → Authentication → Hooks**.
- Verificación: hacer login, decodificar JWT en jwt.io, confirmar
  `app_metadata.rol`.
- DoD B.1:
  - [ ] Migración aplicada en Supabase.
  - [ ] Hook activado.
  - [ ] Login devuelve JWT con `app_metadata.rol` correcto.
  - [ ] `useAuthStore` expone selector `rol` derivado del claim.

#### B.2 — Frontend: `black-column-nav.ts` con tipos + RBAC
- Crear `src/components/layout/black-column-nav.ts`.
- Tipos: `NavLeaf | NavGroup | NavGrupillo` con campo `rolesPermitidos: Rol[]`.
- Importar lucide icons en este archivo, exportar `NAV_TREE` constante.
- Helpers: `getPathTo(id)`, `getParent(id)`, `getChildrenOf(id)`,
  `filterByRol(tree, rol)`.
- DoD B.2:
  - [ ] Árbol completo definido tal cual el aprobado.
  - [ ] Tipos exportados y usados desde `BlackColumn` y `App.tsx`.
  - [ ] `filterByRol` testeado con Vitest (al menos los 6 roles).

#### B.3 — Frontend: máquina de estado `useBlackColumnState`
- Hook que maneja:
  - `currentPath: string[]` (ids del breadcrumb actual; `[]` = raíz).
  - `expanded: boolean`.
  - `selectedLeafId: string | null`.
- Acciones:
  - `navigateInto(nodeId)`, `goBack()`, `selectLeaf(leafId)`,
    `toggleExpanded()`, `goHome()`.
- Reglas: seleccionar hoja → `expanded = false`. Navegar a otro nivel →
  `expanded = true`.
- DoD B.3:
  - [ ] Tests de transiciones en Vitest verdes.

#### B.4 — Frontend: componente `BlackColumn` reescrito
- Implementar el drill-down con `transition-[width] duration-200`.
- Render condicional: items raíz vs hijos del nodo activo.
- Botones fijos: Home, Check-in, Atrás (contextual), Expand/Collapse.
- Indicador activo amarillo 3 px.
- Etiquetas a la derecha cuando `expanded === true`.
- RBAC visual: ocultar items donde `rol ∉ rolesPermitidos`.
- DoD B.4:
  - [ ] Drill-down funciona en 3 niveles.
  - [ ] Anchura cambia con animación suave.
  - [ ] Etiquetas aparecen/desaparecen según `expanded`.
  - [ ] RBAC oculta items para roles sin permiso.
  - [ ] Foco por teclado (Tab + Enter + flechas).

#### B.5 — Integración en `App.tsx`
- `App.tsx` recibe `selectedLeafId` y renderiza el Screen correspondiente
  (placeholders honestos para Fase D).
- Click en Home → `selectedLeafId = 'home'` → renderiza `VisualInfoHome`.
- Click en Check-in → `selectedLeafId = 'checkin'` → renderiza Screen
  futuro (placeholder por ahora).
- DoD B.5:
  - [ ] Cada hoja del árbol tiene un placeholder o Screen real
        renderizándose en home_area al pulsarla.

#### B.6 — Tests + documentación
- Vitest: `BlackColumn.test.tsx` con casos de drill, RBAC, toggle.
- `diseño_chupiwachi.md §10.1` reescrita con la versión final.
- Demo visual con la usuaria en localhost.
- DoD B.6:
  - [ ] Suite Vitest verde.
  - [ ] §10.1 cerrada.
  - [ ] Visto bueno de la usuaria en demo.

### 📥 Entrada
- Fase A cerrada.
- Decisión consensuada sobre los puntos abiertos (ver §"Decisiones a
  tomar").

### 📤 Salida
- `src/components/layout/BlackColumn.tsx` definitivo.
- `src/components/layout/black-column-nav.ts` — árbol exportable de items
  con tipo `NavTree`, RBAC, iconos, etiquetas, RPC requeridas para activar.
- Test unitario con Vitest del componente (`BlackColumn.test.tsx`).
- Sección §10.1 de `diseño_chupiwachi.md` actualizada con la versión final.

### 🧩 Sub-tareas
1. Confirmar el árbol final contra `mapeo_visual_ui.md §3` y
   `black_column.md`. Resolver discrepancias (ej. mapping `Disc3` para
   "Vehículos" — ver §"Decisiones").
2. Extraer el árbol a `black-column-nav.ts` para que `App.tsx` también lo
   importe (resolver `label` desde `activeNav` sin duplicar strings).
3. Implementar RBAC visual cosmético: leer el rol del JWT desde
   `useAuthStore` y ocultar/atenuar items según matriz de RBAC del
   `mapeo_visual_ui.md §5.5`.
4. Refinar la animación del acordeón con `data-state=open|closed` y
   `tw-animate-css` (sin animar `height` directo).
5. Tooltips enriquecidos: además del label, mostrar microcopy secundaria
   (ej. "Doc-2 Informe asistencial · Solo durante DRP activo").
6. Foco por teclado: flechas arriba/abajo navegan entre items; flecha
   derecha abre subgrupo; flecha izquierda cierra; `Enter`/`Espacio`
   activa.
7. Validar scrollbar invisible y comportamiento con muchos items
   expandidos (overflow vertical).
8. Tests Vitest: render, navegación por teclado, acordeón, RBAC, click
   en hoja emite `onSelect`.

### ✅ DoD
- [ ] `BlackColumn` renderiza los 11 items raíz con sus subgrupos correctos
      y separators en las posiciones del spec.
- [ ] El indicador amarillo de 3 px aparece a la izquierda del ítem
      activo y en su grupo padre cuando hay un sub-item activo.
- [ ] El acordeón colapsa el anterior al abrir uno nuevo (regla
      `mapeo_visual_ui.md §5.2`).
- [ ] Navegación por teclado pasa AA (jest-axe sobre el componente).
- [ ] RBAC visual: con rol `tes` los items `Resumen DRP`, `Token de
      emergencia`, etc. están ocultos o atenuados.
- [ ] Tooltip aparece a 350 ms en hover y se suprime en touch.
- [ ] `npx tsc -b` y `npm test` verdes.
- [ ] Sección §10.1 de `diseño_chupiwachi.md` actualizada.

### ⚠️ Riesgos
- **R-B1**: RBAC del JWT requiere que el hook de auth de Supabase inyecte
  los claims. Si no están, hay que generarlos como fallback desde
  `fichas_empleados.rol`. Mitigación: empezar con fallback y consolidar
  en Fase C.
- **R-B2**: Algunos iconos lucide aproximan los de Tabler con resultado
  semántico distinto (`Disc3` para "Vehículos", `Settings2` para
  "Mantenimiento"). Riesgo de confusión visual. Mitigación: validación
  visual con la usuaria antes de cerrar.
- **R-B3**: Hay 8 ítems sin homólogo claro entre `mapeo_visual_ui.md` y la
  implementación actual (ítems sin RBAC declarado). Hay que decidir
  defaults.

### ❓ Decisiones a tomar antes de empezar
1. **Iconos sustitutos**: ¿aceptamos `Disc3` para "Vehículos" y
   `Settings2` para "Mantenimiento" o buscamos alternativas?
   (Alternativas: `Car` ya usado en grupo padre, `Wrench` ya usado en
   "Incidencias".)
2. **Fuente del rol del usuario**: ¿`auth.jwt() → app_claims`,
   `fichas_empleados.rol`, o un store cliente derivado? Necesario para el
   RBAC visual.
3. **Comportamiento al pulsar grupo padre con sub-item activo**: ¿se
   colapsa y vuelve a `home`, o solo colapsa el acordeón manteniendo el
   in-place activo? (Spec `mapeo_visual_ui.md §5.2` no es explícito.)
4. **Aviso pendiente de la usuaria** (a comunicar al iniciar Fase B).

---

## Fase C — Cableado de datos de `visual_info_home`

### 🎯 Objetivo
Poblar `VisualInfoHome` con datos reales desde Supabase y los stores
Zustand. Convertir los placeholders honestos en información operativa.

### 📥 Entrada
- Fase B cerrada.
- Esquema Supabase estable (`fichas_empleados`, `vehiculos`, `drps`,
  `bandejas_mensajes`, `personal_en_turno` o vista equivalente).

### 📤 Salida
- `useVisualInfoHome()` hook que orquesta los datos de los 4 sub-paneles.
- Stores actualizados: `usePersonaStore`, `useActivacionStore`,
  `useDrpStore`, `useBandejasStore` sincronizados via Supabase Realtime.
- `PanelPersonal`, `PanelVehiculo`, `VisualInfoDRP`,
  `BandejaEntradaPersonal` con datos reales.
- Test E2E mínimo: tras login + check-in, los paneles muestran al menos
  los datos esperados.

### 🧩 Sub-tareas
1. Verificar y, si hace falta, crear vistas Supabase para denormalizar
   queries del home (evitar N+1).
2. Cablear `usePersonaStore` a `personal_en_turno` con Realtime.
3. Cablear `useActivacionStore` con vehículo activo del terminal +
   condicion_tecnica + tipo_servicio.
4. Cablear `useDrpStore` con DRP activo asignado al terminal.
5. Cablear `useBandejasStore` con `bandejas_mensajes` filtradas por
   `id_nombre` con checkin_on.
6. Reemplazar placeholders en `VisualInfoHome` por componentes con datos
   reales.
7. Realtime kill-switch: respetar `system_config.realtime_kill_switch`.
8. Avatar fallback con iniciales reales (`MA`, `RS`, etc.) en lugar de `—`.

### ✅ DoD
- [ ] Los 4 sub-paneles muestran datos reales o estado vacío justificado.
- [ ] Las suscripciones Realtime se desuscriben al desmontar.
- [ ] Si `realtime_kill_switch === true` se degrada a polling cada 30 s.
- [ ] Test E2E "home con datos" pasa en Playwright.
- [ ] §10.4 de `diseño_chupiwachi.md` actualizada con el cableado.

### ⚠️ Riesgos
- **R-C1**: Saturación de Realtime con muchos terminales. Mitigación:
  filtros precisos por `id_terminal` y `id_nombre`.
- **R-C2**: Datos derivados de varios joins. Mitigación: vistas
  materializadas o RPC `select` específico.

### ❓ Decisiones a tomar antes de empezar
1. ¿Mantenemos los stores Zustand existentes (`usePersonaStore`,
   `useActivacionStore`, etc.) o los rehacemos?
2. ¿TanStack Query (obligatorio por `rules.md §6`) reemplaza la
   suscripción directa a Supabase Realtime, o coexisten?
3. ¿Cómo se conoce el `id_vehiculo` del terminal cuando todavía no hay
   check-in? (Spec: el panel no aparece, pero hay que validar.)

---

## Fase D — Reconstrucción de Screens feature (modular)

### 🎯 Objetivo
Reescribir, una a una, las pantallas operativas que se borraron en Fase A,
usando shadcn/ui + tokens U24 + RHF + Zod. Cada Screen es un sub-objetivo
independiente con su propio DoD.

### 📥 Entrada
- Fase C cerrada (stores poblados).
- Para cada Screen: hooks viejos auditados (mantener vs reescribir).

### 📤 Salida
- 1 archivo TSX por Screen en `src/components/<dominio>/`.
- Cada Screen documentado en `diseño_chupiwachi.md §8.6` con
  capturas/descripción.
- Routing en `App.tsx` cableado al `activeNav` correspondiente.

### 🧩 Sub-fases (orden propuesto)

**D.1 — Operativa rutinaria** (item 3 del black_column)
1. `CheckinScreen` (item 3 reemplaza al VehiclePicker borrado).
2. `Doc6GastoMaterialScreen`.
3. `Doc8ParteTrabajoScreen` (vista del Doc-8 activo).
4. `Doc2InformeAsistencialScreen`.
5. `Doc11AvisoUrgenteScreen`.
6. `RepostajeCombustibleScreen` y `RepostajeAdBlueScreen`.
7. `Checklist360Screen` (era `ChecklistScreen` antiguo).
8. `VehiculosScreen` (vista combinada, item 3.10).

**D.2 — DRP** (item 4)
1. `OperativaDrpScreen`.
2. `VisorDrpScreen`.
3. `ResumenDrpScreen` (modal con RBAC).
4. `LogisticaDrpScreen`.
5. `CrearDrpScreen`.
6. `EstadosDrpScreen`.

**D.3 — Módulos especiales** (item 5)
1. `ModuloPsaScreen`.
2. `ModuloFiliacionScreen`.

**D.4 — Logística y almacén** (item 6)
1. `InventarioMaestroScreen` (DataTable).
2. `Doc9EntradaAlmacenScreen`.
3. `Doc10EnvioMaterialScreen` (instancia logística).
4. `InventarioTransitoScreen`.
5. `DescuadresScreen`.
6. `CatalogoItemsScreen`.

**D.5 — Flota y taller** (item 7)
1. `IncidenciasScreen`.
2. `Doc7InformeAveriaScreen`.
3. `MetadataVehiculoScreen`.
4. `MantenimientoFlotaScreen`.
5. `HistorialEventosFisicosScreen`.

**D.6 — Coordinación y seguridad** (item 8)
1. `TokenEmergenciaScreen`.
2. `RbacRolesScreen`.

**D.7 — Gestión y RRHH** (item 9)
1. `FichasEmpleadosScreen`.
2. `GestionTurnosScreen`.
3. `GestionTablonScreen`.
4. `MarquesinaScreen`.
5. `Doc12SolicitudVacacionesScreen`.
6. `RepositorioDocumentosScreen`.
7. `GestionBajasScreen`.

**D.8 — Tablón central + Buzón interno** (items 10–11)
1. `TablonCentralScreen`.
2. `BuzonInternoScreen` (Doc-13).

**D.9 — Bandejas** (overlay desde header + sub-items 6.7, 7.6, 8.3, 9.8)
1. `BandejaModal` (componente `flujos_transicion` parametrizable).

### ✅ DoD de cada Screen
- [ ] Usa exclusivamente primitives de `src/components/ui/`.
- [ ] Sin clases CSS custom: solo Tailwind + tokens.
- [ ] Formularios con `Form` shadcn + RHF + Zod (`diseño_chupiwachi.md §14`).
- [ ] Errores resueltos con `resolveRpcError`.
- [ ] Mutaciones críticas pasan por `useOfflineQueue` cuando es offline.
- [ ] Foco por teclado correcto y `aria-*` consistentes.
- [ ] Vista en modo claro y oscuro validada manualmente.
- [ ] `App.tsx` actualizado con el routing al Screen.
- [ ] §8.6 de `diseño_chupiwachi.md` actualizada.

### ⚠️ Riesgos transversales
- **R-D1**: la deuda offline (cola, idempotencia) puede aparecer al
  reescribir Screens. Mantener tests de `useOfflineQueue` verdes.
- **R-D2**: regresiones en RLS al cambiar la forma de las queries.
  Mitigación: tests pgTAP existentes corren sin tocar.
- **R-D3**: el alcance de D.7 (Gestión y RRHH) es enorme. Si excede una
  sesión, dividir en D.7.1 / D.7.2.

### ❓ Decisiones a tomar antes de empezar
1. ¿Empezamos por **D.1 Operativa rutinaria** (camino crítico del turno)
   o por **D.5 Flota** (donde tenemos más hooks ya escritos)?
2. ¿Reescribimos `useOfflineQueue` o lo damos por bueno?
3. ¿Cada Screen lleva su propio test Vitest o solo E2E Playwright?

---

## Fase E — Validación y reapertura del checklist de despliegue

### 🎯 Objetivo
Devolver el proyecto al estado "listo para despliegue" siguiendo el
`deployment_checklist.md` original. Hasta aquí no se vuelven a hacer
builds de producción ni pushes a Vercel.

### 📥 Entrada
- Fase D completa (todos los Screens implementados).
- `npx tsc -b` y `npm test` verdes.
- E2E Playwright actualizados al nuevo árbol DOM.

### 📤 Salida
- `deployment_checklist.md` con todos los puntos en verde.
- Build de producción local (`npm run build`) sin superar 3 MB / 800 KB.
- Bypass de desarrollo (`Acceso dev`) eliminado del código.
- Tests Vitest + Playwright verdes en CI.

### 🧩 Sub-tareas
1. Borrar el bloque "Bypass de desarrollo" de `LoginScreen.tsx`.
   Marca: `Bypass de desarrollo — eliminar al cerrar Fase B` *(originalmente
   apuntaba a Fase B; queda como Fase E para mantener el flujo)*.
2. Auditar `.env.local` y confirmar que el código no tiene URLs hardcoded.
3. Re-ejecutar el `deployment_checklist.md` punto por punto.
4. Lighthouse + jest-axe pasando.
5. Validación de `force_update` banner.

### ✅ DoD
- [ ] Los 10 puntos del `deployment_checklist.md` están en verde.
- [ ] `npm run build` cumple `bundle ≤ 3 MB` y `entry ≤ 800 KB`.
- [ ] Bypass de desarrollo eliminado y verificado con grep.
- [ ] CI GitHub Actions verde.
- [ ] Se autoriza el primer push a Vercel.

### ❓ Decisiones a tomar antes de empezar
1. ¿Activamos modo oscuro como toggle visible o lo dejamos detrás de
   `prefers-color-scheme` solamente? (depende del feedback de Fase D)
2. ¿Habilitamos Sentry en `dev` para capturar errores tempranos o solo
   en `prod`?

---

## Fase F — Modo oscuro y refinamientos

### 🎯 Objetivo
Auditar la app entera en modo oscuro, ajustar contraste donde falle WCAG
AA, refinar animaciones de transición light↔dark, y dejar un
`ThemeToggle` en una ubicación discreta del Header.

### 📥 Entrada
Fase E cerrada y desplegada.

### 📤 Salida
- `ThemeToggle` cableado en el Header.
- Captura de cada Screen en light + dark + screenshot tests Playwright.
- Sección §13 de `diseño_chupiwachi.md` ampliada con los ajustes finales.

### 🧩 Sub-tareas
1. Recorrido visual de todos los Screens en `.dark`.
2. Corregir contrastes que no pasen AA.
3. Decidir si la `BlackColumn` cambia o se queda igual en dark (decisión
   estética).
4. Añadir `ThemeToggle` en `Header` (icono `Sun`/`Moon` lucide, side="end").
5. Persistencia del theme via `localStorage` ya implementada — validar
   que sobrevive a F5 y a cierre de pestaña.

### ✅ DoD
- [ ] Todas las vistas pasan contraste AA en ambos modos.
- [ ] `ThemeToggle` accesible por teclado (Tab + Enter).
- [ ] Sin destellos al cambiar de modo (sin "flash of unstyled content").
- [ ] §13 de `diseño_chupiwachi.md` cerrada como definitiva.

---

## Deuda registrada

Lista viva. Se cierra cuando la fase responsable la resuelve.

| ID | Tipo | Descripción | Responsable de cerrarla |
| --- | --- | --- | --- |
| D-01 | Bypass | Eliminar bloque `Bypass de desarrollo` de `LoginScreen.tsx` | Fase E |
| D-02 | Iconografía | Confirmar iconos sustitutos: `Disc3` (Vehículos), `Settings2` (Mantenimiento), `PackageCheck` (Doc-9) | Fase B |
| D-03 | RBAC | Cablear claims de Supabase Auth o fallback desde `fichas_empleados.rol` | Fase B (fallback), Fase C (claims) |
| D-04 | Stores | Decidir compatibilidad de stores Zustand actuales con TanStack Query | Fase C |
| D-05 | Pruebas | Re-escribir suites E2E borradas en Fase A | Fase E |
| D-06 | Diseño | El acento amarillo aparece en algunos elementos. Validar disciplina. | Fase F |
| D-07 | A11y | Auditar focus traps en modales y sheets de shadcn | Fase F |
| D-08 | Nav | Eliminar campos `level` antiguo del store de navegación al estabilizar B.4 | Fase B (B.4) |
| D-09 | Nav | Clarificar si los items de "Visor Mantenimiento" (Tabla principal, Badges, Filtros…), "Mantenimiento flota" (Aceite/Frenos/Neumáticos) y "Modulo_emergencias" (Galleta / Galleta pequeña) son leaves de navegación reales o contenido **intra-Screen**. Si son intra-Screen, sacarlos del árbol y resolverlos en la lógica del Screen. | Fase D (al llegar a Flota y Coordinación) |

---

## Cómo cambiar de agente sin perder contexto

Si la usuaria abre una nueva sesión con otro agente, este es el bloque a
copiar y pegar al inicio del prompt:

> Soy AngieVik, trabajo en U24. Lee en este orden:
> 1. `01_arquitectura_y_reglas/rules.md` (v2.1, fuente de verdad técnica).
> 2. `05_interfaz_y_desarrollo/diseño_chupiwachi.md` (fuente de verdad visual).
> 3. `06_operaciones/Hoja de ruta/frontend_reconstruction_roadmap.md` (este documento).
> Estamos en la Fase X. Antes de empezar la fase, hazme la pregunta de la
> sección "❓ Decisiones a tomar antes de empezar". No tocar la BD ni
> hacer despliegues sin permiso explícito.

---

## Historial de cambios del roadmap

- **2026-05-22 — v1.0** (Claude): documento creado tras cierre de Fase A.
