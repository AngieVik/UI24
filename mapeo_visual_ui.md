# mapeo_visual_ui

> Fuente de verdad del comportamiento visual de la interfaz U24.
> Documenta qué renderiza en `home_area` para cada acción de `black_column`,
> el tipo de renderizado (in-place vs modal), las reglas de coexistencia,
> las zonas con actualización en tiempo real, el comportamiento del botón
> de atrás por estado de navegación, y la compatibilidad con pantallas base (<640 px).

---

## 1. Zonas del layout

### estado_0 — Terminal bloqueado

```text
┌──────────────────────────────────────────────────────┐
│                                                      │
│              formulario terminal_check               │
│                   (centrado)                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

* Sin `black_column`, sin `header`, sin `ticker`.
* Fondo neutro. Única acción posible: autenticarse.

---

### estado_1 — Terminal desbloqueado

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER  [Logo] ←──── marquesina/ticker ────→  [bandejas] [← atrás]│
├────┬───────────────────────────────────────────────────────────────┤
│ B  │                                                               │
│ L  │                    HOME_AREA                                  │
│ A  │                  (zona amarilla)                              │
│ C  │                                                               │
│ K  │   visual_info_home  — contenido variable según navegación     │
│    │                                                               │
│ C  │   ╔════════════════════════╗  ← modal superpuesto (opcional)  │
│ O  │   ║       MODAL            ║                                  │
│ L  │   ╚════════════════════════╝                                  │
│ U  │                                                               │
│ M  │                                                               │
│ N  │                                                               │
└────┴───────────────────────────────────────────────────────────────┘
```

| Zona | Ancho | Descripción |
| ---- | ----- | ----------- |
| `black_column` | 52 px fijo | Barra lateral permanente. Fondo `#111111`. |
| `header` | 100% − 52 px | Fijo en la parte superior. Logo + marquesina + acciones globales + botón atrás. |
| `home_area` | 100% − 52 px | Zona de contenido principal. Fondo amarillo. Contenido variable. |
| `modal` | Variable (centrado o drawer) | Superpuesto sobre `home_area`. El contenido subyacente permanece visible y bloqueado. |

---

## 2. visual_info_home — estado raíz (home_area por defecto)

Contenido del `home_area` cuando no hay ninguna navegación activa.
Se restaura al pulsar `Home` (`ti-home`) o el botón de atrás desde cualquier vista.

```
visual_info_home
├── selector_vehiculos          (siempre visible)
├── panel_personal              (visible si hay ID_nombre con checkin_on)
│   └── por cada ID_nombre: nombre + estado + icono + telefono
├── panel_vehiculo              (visible si hay ID_vehiculo activo/seleccionado)
│   ├── Matrícula + ID_vehiculo
│   ├── Pilot + Carry (con iconos swap/quitar)
│   └── Estado operativo actual
├── visual_info_drp             (visible si el terminal tiene DRP activo asignado)
│   ├── nombre_drp + fecha + hora + ubicación + badge estado
│   ├── Desplegable operativa_drp → docs DRP (cada doc abre MODAL sobre home_area)
│   ├── Icono + (ti-circle-plus) → modal ligero "Añadir asistencia Doc-1"
│   ├── Icono puerta (ti-door-enter) → entra a modulo_filiacion (solo si módulo creado)
│   └── Icono ambulancia (ti-ambulance) → gris=desactivado / amarillo=activo en DRP
├── bandeja_entrada_vehiculo    (visible si hay ID_vehiculo seleccionado)
│   └── Icono ti-mail → abre MODAL de bandeja (solo lectura)
└── bandeja_entrada_personal    (icono ti-mail con iniciales por cada checkin_on)
    └── Pulsar icono → abre MODAL de bandeja (solo lectura)
```

---

## 3. Tabla completa — black_column → home_area

Tipo de renderizado:

* **in-place** — reemplaza el contenido actual del `home_area`. El botón atrás aparece.
* **modal** — se superpone sobre el `home_area`. El contenido subyacente permanece.
* **modal-ligero** — variante compacta del modal, sin bloquear toda la pantalla.
* **sin-render** — el ítem solo expande/contrae el acordeón; no renderiza nada en `home_area`.
* **retorno** — restaura `visual_info_home`.

| # | black_column ítem | Icono | Tipo render | Componente en home_area | Observaciones |
|---|---|---|---|---|---|
| 1 | **Home** | `ti-home` | retorno | `visual_info_home` | Contrae todo. Limpia home. Siempre accesible. |
| 2 | **Check-in** | `ti-login` | in-place | `terminal_check` | Reemplaza `visual_info_home`. Formulario check-in/check-out. |
| 3 | **Operativa rutinaria** | `ti-ambulance` | sin-render | — | Expande/colapsa subgrupo. |
| 3.1 | → Doc-10 Envío material | `ti-file-text` | in-place | Formulario Doc-10 | Origen: vehículo o backpack activo. |
| 3.2 | → Doc-6 Gasto material | `ti-package` | in-place | Formulario Doc-6 | Selección de ítem y cantidad. |
| 3.3 | → Doc-8 Parte de trabajo | `ti-clipboard-list` | in-place | Vista Doc-8 en curso | Muestra el Doc-8 activo del turno. Solo lectura + selector funciones. |
| 3.4 | → `sep` | — | — | — | Separador visual. No interactivo. |
| 3.5 | → Doc-2 Informe asistencial | `ti-heart-rate-monitor` | in-place | Formulario Doc-2 | |
| 3.6 | → Doc-11 Aviso urgente | `ti-alert-triangle` | in-place | Formulario Doc-11 | |
| 3.7 | → Repostar combustible | `ti-gas-station` | in-place | Formulario repostaje | Toggle Gasolinera/Base. |
| 3.8 | → Repostar AdBlue | `ti-droplet` | in-place | Formulario AdBlue | Toggle activo/no. |
| 3.9 | → Doc-Checklist360 Revisión 360° | `ti-checkbox` | in-place | Formulario Checklist360 | RBAC crear: tes, flota, gerencia. |
| 3.10 | → Selector vehículos | `ti-steering-wheel` | retorno (parcial) | `visual_info_home` | Hace scroll/foco al `selector_vehiculos` dentro de `visual_info_home`. |
| 4 | **DRP** | `ti-map-pin` | sin-render | — | Expande/colapsa subgrupo. |
| 4.1 | → Operativa DRP | `ti-activity` | in-place | Lista docs DRP activos | Cada doc abre MODAL sobre `home_area`. RBAC: todos los roles DRP. |
| 4.2 | → Visor DRP | `ti-selector` | in-place | `visor_drp` | Lista de DRP en En_espera / En_preparacion / En_curso con tarjetas expandibles. |
| 4.3 | → Resumen DRP | `ti-chart-bar` | modal | `resumen_drp` | RBAC: gerencia, coordinación. Icono atenuado para otros roles (sin acción). |
| 4.4 | → Logística DRP | `ti-package` | in-place | `logistica_drp` | Stock de locations del DRP activo + bandeja logística interna (modal). |
| 4.5 | → Crear DRP | `ti-circle-plus` | in-place | Formulario `crear_drp` | RBAC: coordinación, gerencia. |
| 4.6 | → Estados DRP | `ti-toggle-left` | in-place | `selector_estados_drp` | RBAC modificar: coordinación, gerencia. Selector de fase del DRP activo. |
| 5 | **Módulos especiales** | `ti-puzzle` | sin-render | — | RBAC subgrupo: logística, coordinación, gerencia. |
| 5.1 | → PSA | `ti-first-aid-kit` | in-place | Vista `modulo_psa` | `selector_drp` integrado. Si ya existe módulo activo, muestra el módulo; si no, muestra formulario de creación. |
| 5.2 | → Filiación | `ti-forms` | in-place | Menú acción filiación | Opciones: Entrar (si módulo existe) / Crear módulo / Eliminar módulo. Entrar carga vista filiación in-place con selección de perfil. RBAC crear/eliminar: coordinación, gerencia. |
| 6 | **Logística y almacén** | `ti-building-warehouse` | sin-render | — | |
| 6.1 | → Inventario maestro | `ti-list-details` | in-place | Vista inventario maestro | Tabla de todos los items por location. |
| 6.2 | → Doc-9 Entrada almacén | `ti-truck-delivery` | in-place | Formulario Doc-9 | |
| 6.3 | → Doc-10 Envío material | `ti-transfer` | in-place | Formulario Doc-10 | Contexto logística: origen almacén central. |
| 6.4 | → Inventario en tránsito | `ti-truck` | in-place | Vista tránsito | Lista de Doc-10 en estado En_Transito. |
| 6.5 | → Descuadres | `ti-alert-circle` | in-place | Vista descuadres | Lista de Descuadre_Pendiente_Revision con acciones de resolución. |
| 6.6 | → Bandeja logística | `ti-inbox` | modal | `bandeja_entrada_logistica` | Flujo estándar. Ver `componentes.md`. |
| 7 | **Flota y taller** | `ti-car` | sin-render | — | |
| 7.1 | → Incidencias | `ti-tool` | in-place | Vista incidencias activas | Lista de incidencias abiertas con filtros. |
| 7.2 | → Doc-7 Informe avería | `ti-engine` | in-place | Formulario Doc-7 | |
| 7.3 | → Metadata vehículo (ITV/docs) | `ti-id` | in-place | Vista metadata | Datos ITV, seguros y documentación por ID_vehiculo. |
| 7.4 | → Bandeja flota | `ti-inbox` | modal | `bandeja_entrada_flota` | Flujo estándar. Ver `componentes.md`. |
| 8 | **Coordinación y seguridad** | `ti-shield-lock` | sin-render | — | |
| 8.1 | → Token de emergencia | `ti-cookie` | in-place | Generador de token | Formulario: tipo (temporal/permanente) + PIN 6 dígitos generado. |
| 8.2 | → RBAC roles | `ti-users` | in-place | Vista gestión de roles | Asignación de rol por ID_nombre. |
| 8.3 | → Bandeja coordinación | `ti-inbox` | modal | `bandeja_entrada_coordinacion` | Flujo estándar. Ver `componentes.md`. |
| 9 | **Gestión y RRHH** | `ti-id-badge` | sin-render | — | |
| 9.1 | → Fichas empleados | `ti-user-circle` | in-place | Vista fichas empleados | Tabla de personal con datos, rol y estado. |
| 9.2 | → Gestión de turnos | `ti-calendar-event` | in-place | Vista cuadrante/turnos | Incluye sección vacaciones con Doc-12 si periodo activo. |
| 9.3 | → Gestión tablón | `ti-news` | in-place | Editor tablón central | Crear / Editar / Archivar anuncios. RBAC: gerencia, rrhh. |
| 9.4 | → Marquesina | `ti-antenna` | in-place | Editor marquesina | Texto del ticker de header. RBAC: gerencia, rrhh. |
| 9.5 | → Doc-12 Solicitud vacaciones | `ti-beach` | in-place | Formulario Doc-12 (activación) | RRHH activa el periodo de vacaciones que hace Doc-12 visible en Tablón central. |
| 9.6 | → Bandeja RRHH | `ti-inbox` | modal | `bandeja_entrada_rrhh` | Flujo Estándar+ (Doc-12 Aprobar/Denegar, Doc-13 Marcar_Leida). Ver `componentes.md`. |
| 10 | **Tablón central** | `ti-speakerphone` | in-place | Vista tablón central | Lectura para todos los roles. gerencia/rrhh ven además controles de gestión. Doc-12 aparece aquí cuando está activado. |
| 11 | **Buzón interno** (Doc-13) | `ti-message-report` | in-place | Formulario Doc-13 | Propuestas y quejas. Todos los roles autenticados. |

---

## 4. Reglas de renderizado

### 4.1 in-place

* El contenido anterior del `home_area` es **reemplazado**.
* El botón de atrás (`ti-arrow-left`) aparece en el header.
* `visual_info_home` y `visual_info_drp` quedan en segundo plano (no visibles).
* Pulsar `Home` o el botón de atrás restaura `visual_info_home`.

### 4.2 modal

* Se superpone sobre el contenido actual del `home_area`.
* El contenido subyacente permanece **visible pero bloqueado** (overlay semitransparente).
* Tiene botón de cierre propio (`ti-x`). El botón de atrás del header también lo cierra.
* El `home_area` subyacente puede ser `visual_info_home` u otro in-place activo.
* Los modales **no se apilan**: abrir un segundo modal cierra el primero.

### 4.3 modal-ligero

* Variante compacta del modal. Más pequeño, sin bloquear toda la pantalla.
* Uso: `Añadir asistencia Doc-1` desde `visual_info_drp`, selector de perfil en `modulo_filiacion`.

### 4.4 Docs DRP (desde visual_info_drp o Operativa DRP)

* Doc-2, Doc-3, Doc-4, Doc-5, Doc-11 durante DRP → siempre **modal**.
* Permite rellenar documentos manteniendo `visual_info_drp` visible.
* Varios docs pueden abrirse en secuencia; se abren uno a uno.

### 4.5 Selector vehículos (ítem 3.10)

* No reemplaza `home_area`. Es un **retorno parcial**: lleva a `visual_info_home`
  haciendo foco/scroll en el componente `selector_vehiculos`.
* Equivale a pulsar `Home` pero con scroll automático al selector.

---

## 5. Reglas de coexistencia

### 5.1 visual_info_drp activo + navegación black_column

| Acción | Resultado |
|---|---|
| Pulsar doc desde desplegable `operativa_drp` | Modal sobre `home_area` — `visual_info_drp` permanece debajo. |
| Pulsar `+` (añadir asistencia Doc-1) | Modal-ligero — `visual_info_drp` permanece debajo. |
| Pulsar icono puerta (ti-door-enter) | In-place: carga `modulo_filiacion` — `visual_info_drp` queda en segundo plano. |
| Pulsar cualquier ítem black_column (in-place) | `visual_info_drp` queda en segundo plano. Se restaura con Home o atrás. |
| Pulsar cualquier bandeja (modal) | `visual_info_drp` permanece visible debajo del overlay. |
| Pulsar `Home` | `visual_info_home` completa restaurada, incluyendo `visual_info_drp`. |

### 5.2 Acordeón black_column — regla de un subgrupo activo

* Solo un subgrupo puede estar expandido simultáneamente.
* Pulsar un subgrupo diferente colapsa el anterior.
* Pulsar el mismo subgrupo activo lo colapsa.
* Expandir un subgrupo **no cambia** el contenido del `home_area`.

### 5.3 Doc-8 activo (turno en curso)

* Doc-8 está siempre en estado `Borrador_En_Curso` mientras hay turno activo.
* `→ Doc-8 Parte de trabajo` (ítem 3.3) muestra el Doc-8 activo — no crea uno nuevo.
* Si no hay turno activo (sin pilot), la vista muestra el último Doc-8 cerrado en modo lectura.

### 5.4 Contexto de ID_vehiculo requerido

Los siguientes ítems requieren un `ID_vehiculo` activo para funcionar.
Si no hay vehículo activo, muestran aviso en home_area.

| Ítem | Requiere |
|---|---|
| Doc-6 Gasto material (3.2) | ID_vehiculo activo como pilot |
| Doc-8 Parte de trabajo (3.3) | Turno activo (pilot en checkin_on) |
| Repostar combustible (3.7) | ID_vehiculo activo |
| Repostar AdBlue (3.8) | ID_vehiculo activo |
| Doc-Checklist360 (3.9) | ID_vehiculo seleccionado |
| Operativa DRP — docs Doc-2/3/4/5 (4.1) | ID_vehiculo en DRP activo |
| Logística DRP (4.4) | DRP activo con locations asignadas |
| Estados DRP (4.6) | DRP activo existente |

### 5.5 RBAC — ítems con acceso restringido

Los ítems con RBAC restringido se comportan así para roles sin permiso:

| Comportamiento | Aplica a |
|---|---|
| Icono **oculto** (no visible en black_column) | Resumen DRP para roles sin RBAC |
| Icono **atenuado** + sin acción | Resumen DRP visible para todos pero accionable solo por gerencia/coordinación |
| Subgrupo entero **oculto** | Módulos especiales para roles sin logística/coordinación/gerencia |

> **Nota:** el RBAC del frontend es cosmético. Las políticas RLS en Supabase son la capa de seguridad real.

---

## 6. Zonas con actualización en tiempo real

| Zona | Store | Fuente | Qué actualiza |
|---|---|---|---|
| `selector_vehiculos` | `useVehiculoStore` | Supabase Realtime | Estado operativo y función de cada ID_vehiculo |
| `panel_personal` | `usePersonaStore` | Supabase Realtime | checkin_on, pilot, carry por ID_nombre |
| `visual_info_drp` | `useDRPStore` | Supabase Realtime | Estado DRP, dotaciones, módulos activos |
| `bandeja_entrada_*` (iconos) | `useBandejasStore` | Supabase Realtime | Iluminación amarilla del icono `ti-mail` si hay mensajes sin leer |
| `bandeja_entrada_logistica_drp` | `useBandejasStore` | Supabase Realtime | Nuevos Doc-10, alertas stock, Doc-6 en tiempo real |
| `marquesina/ticker` (header) | `useGlobalStore` | Supabase Realtime | Texto de la marquesina activa |
| `Tablón central` | `useGlobalStore` | Supabase Realtime | Anuncios nuevos o archivados |
| `Inventario en tránsito` (6.4) | `useInventarioStore` | Supabase Realtime | Estado de Doc-10 en tránsito |
| `Descuadres` (6.5) | `useInventarioStore` | Supabase Realtime | Descuadres nuevos o resueltos |

**Notas:**

* El stock de inventario (Doc-6, Doc-10) se actualiza mediante RPC/trigger en Supabase — nunca por petición async directa del cliente. La UI refleja el resultado via Realtime.
* `useInventarioStore` no persiste en localStorage — siempre sincronizado desde Supabase.
* Si hay pérdida de conexión, las mutaciones de inventario se encolan en IndexedDB y se replayan al recuperar conexión.

---

## 7. Comportamiento del botón de atrás

El botón `ti-arrow-left` está en el extremo derecho del header.
**Solo visible cuando hay historial de navegación** (doc in-place o submenú expandido).

| Estado de navegación actual | Acción al pulsar atrás |
|---|---|
| `visual_info_home` (raíz) | Botón **no visible**. |
| Submenú accordion expandido, sin doc activo | Colapsa el submenú. Botón desaparece. |
| Doc/formulario in-place abierto | Cierra el in-place. Restaura `visual_info_home`. Submenú permanece expandido. |
| Modal abierto (bandeja, resumen DRP, doc DRP) | Cierra el modal. El fondo queda como estaba. |
| Modal-ligero abierto (añadir asistencia, etc.) | Cierra el modal-ligero. |
| `modulo_filiacion` in-place | Cierra el módulo. Restaura `visual_info_home`. |
| `modulo_psa` in-place | Cierra el módulo. Restaura `visual_info_home`. |
| Doc in-place + modal abierto simultáneamente | Cierra el modal primero. El doc in-place permanece. |

**Regla de profundidad máxima:** el sistema tiene profundidad de navegación 1 (un nivel por encima de `visual_info_home`). No hay sub-vistas anidadas que requieran múltiples pulsaciones de atrás. El atrás siempre lleva al nivel raíz.

---

## 8. Indicador de ítem activo (black_column)

* Barra vertical amarilla de 3 px en el borde izquierdo del botón.
* Se muestra en el ítem cuyo contenido está activo en `home_area`.
* Si hay un **modal** activo, el indicador permanece en el ítem que lo originó.
* El icono `Home` tiene indicador activo cuando `home_area` muestra `visual_info_home`.
* Si el acordeón está expandido pero no hay doc activo, el indicador está en el **núcleo del acordeón**, no en ningún subítem.

---

## 9. Compatibilidad con pantalla base (<640 px)

| Vista / componente | Comportamiento en base |
|---|---|
| `black_column` | Permanece a 52 px. Los tooltips se suprimen (no hay hover en táctil). |
| `header` | Marquesina se trunca o se oculta. Solo logo + acciones globales. |
| `visual_info_home` | Columna única. `selector_vehiculos`, panel personal y panel vehículo se apilan. |
| `visual_info_drp` | Colapsado por defecto, expandible con tap. Desplegable `operativa_drp` en drawer inferior. |
| Formularios (in-place) | Diseño de columna única. Sin columnas laterales. Scroll vertical. |
| Modales | Ocupan el 100% de la pantalla (full-screen modal). Botón de cierre arriba a la derecha. |
| Modal-ligero | Se convierte en drawer desde la parte inferior (bottom sheet). |
| `visor_drp` | Tarjetas DRP en columna única. Dotaciones expandibles. |
| `resumen_drp` | Modal full-screen en base. |
| Tablas de inventario/logística | Scroll horizontal habilitado. Columnas mínimas visibles por defecto. |
| `terminal_check` (estado_0) | Formulario centrado ocupa todo el ancho disponible. |
| `modulo_filiacion` (perfil boxes) | Monitor de espera en columna única. Box selector como tabs. |

**Breakpoints de referencia:**

| Clase | Ancho | Descripción |
|---|---|---|
| `base` | < 640 px | Teléfono / tablet pequeña vertical |
| `sm` | ≥ 640 px | Tablet / tablet apaisada |
| `lg` | ≥ 1024 px | Terminal de escritorio / montaje en vehículo |

**Vistas no accesibles en base (< 640 px):**

* `Inventario maestro` (tabla completa) → se muestra versión simplificada: buscador + filas expandibles.
* `Fichas empleados` → ídem: buscador + tarjeta de detalle al pulsar.
* `Gestión de turnos` → calendario simplificado o vista de lista por día.

---

## 10. Accesos dobles — mismo componente, dos rutas de entrada

Algunos componentes son accesibles desde más de un punto. El componente renderizado es idéntico.

| Componente | Ruta A | Ruta B |
|---|---|---|
| `selector_vehiculos` | `visual_info_home` (siempre visible) | `black_column → Operativa rutinaria → Selector vehículos` |
| `operativa_drp` (lista docs) | `visual_info_drp → desplegable` (abre docs como modal) | `black_column → DRP → Operativa DRP` (in-place + docs como modal) |
| `modulo_filiacion` (entrar) | `visual_info_drp → icono ti-door-enter` | `black_column → Módulos especiales → Filiación → Entrar` |
| Doc-10 Envío material | `black_column → Operativa rutinaria → Doc-10` (contexto vehículo) | `black_column → Logística → Doc-10` (contexto almacén central) |
| Tablón central (gestión) | `black_column → Tablón central` (solo lectura para no-RRHH) | `black_column → Gestión y RRHH → Gestión tablón` (escritura para gerencia/rrhh) |
| `bandeja_entrada_logistica_drp` | `black_column → DRP → Logística DRP` (modal desde vista) | `componentes.md → flujos_transicion` (referencia técnica) |

---

## 11. Flujo de navegación — diagramas de referencia rápida

### Navegación básica

```
[Home]          → visual_info_home
[Check-in]      → terminal_check (in-place) ← [atrás] → visual_info_home
[Cualquier doc] → formulario (in-place) ← [atrás] → visual_info_home
[Bandeja]       → modal ← [X o atrás] → fondo anterior
[Resumen DRP]   → modal ← [X o atrás] → fondo anterior
```

### Navegación con DRP activo

```
visual_info_home
  └── visual_info_drp (sub-componente)
        ├── desplegable operativa_drp
        │     └── [doc seleccionado] → modal sobre home_area
        │           └── [X] → cierra modal, visual_info_drp visible
        ├── [+ Doc-1] → modal-ligero sobre home_area
        │     └── [X o Cancelar] → cierra modal-ligero
        └── [ti-door-enter] → modulo_filiacion (in-place)
              └── [atrás] → visual_info_home (con visual_info_drp)
```

### Navegación black_column con accordion

```
[DRP accordion]          → expande subgrupo (no cambia home_area)
  [→ Visor DRP]          → visor_drp in-place
  [→ Resumen DRP]        → resumen_drp modal (sobre lo que hubiera)
  [→ Crear DRP]          → crear_drp in-place
  [atrás desde in-place] → visual_info_home (accordion DRP sigue expandido)
  [Home]                 → visual_info_home (accordion se colapsa)
```
