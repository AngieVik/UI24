# Mapeo visual UI

> Fuente de verdad del comportamiento visual y arquitectónico de la interfaz U24.
> Documenta qué renderiza en `home_area` para cada acción de `black_column`, el tipo de renderizado (in-place vs modal), las reglas de coexistencia, las zonas con actualización en tiempo real, el comportamiento del botón de atrás por estado de navegación, y los estados visuales offline-first.

---

## 1. Zonas del layout

### estado_0 — Terminal bloqueado

` ` `text
┌──────────────────────────────────────────────────────┐
│                                                      │
│              formulario terminal_check               │
│                   (centrado)                         │
│                                                      │
└──────────────────────────────────────────────────────┘
` ` `

- Sin `black_column`, sin `header`, sin `ticker`.
- Fondo neutro. Única acción posible: autenticarse.
- **Resolución Multi-terminal:** Si el login detecta sesión en otro terminal, muestra modal de advertencia (color `amber-700`) para forzar check-out remoto sin re-pedir credenciales.

---

### estado_1 — Terminal desbloqueado

` ` `text
┌────────────────────────────────────────────────────────────────────┐
│ HEADER  [Logo] ←──── marquesina/ticker ────→  [bandejas] [← atrás] │
├────┬───────────────────────────────────────────────────────────────┤
│ B  │                                                               │
│ L  │                  HOME_AREA                                    │
│ A  │                (zona amarilla)                                │
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
` ` `

| Zona           | Ancho                        | Descripción                                                                           |
| -------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| `black_column` | 52 px fijo                   | Barra lateral permanente. Fondo `#111111`.                                            |
| `header`       | 100% − 52 px                 | Fijo en la parte superior. Logo + marquesina + acciones globales + botón atrás.       |
| `home_area`    | 100% − 52 px                 | Zona de contenido principal. Fondo claro/oscuro (Surface). Contenido variable.        |
| `modal`        | Variable (centrado o drawer) | Superpuesto sobre `home_area`. El contenido subyacente permanece visible y bloqueado. |

---

## 2. visual_info_home — estado raíz (home_area por defecto)

Contenido del `home_area` cuando no hay ninguna navegación activa. Se restaura al pulsar `Home` (`ti-home`) o el botón de atrás desde cualquier vista.

` ` `text
visual_info_home
├── panel_personal              (visible si hay ID_nombre con checkin_on)
│   └── por cada ID_nombre: nombre + estado + icono + telefono
├── panel_vehiculo              (visible si hay ID_vehiculo activo/seleccionado)
│   ├── Matrícula + ID_vehiculo
│   ├── Pilot + Carry (con iconos swap/quitar)
│   └── Estado operativo actual
├── visual_info_drp             (visible si el terminal tiene DRP activo asignado)
│   ├── nombre_drp + fecha + hora + ubicación + badge estado
│   ├── Desplegable operativa_drp → docs DRP (cada doc abre MODAL sobre home_area)
│   ├── Icono + (ti-circle-plus) → modal ligero "Añadir asistencia Doc-1" (Append-only)
│   ├── Icono puerta (ti-door-enter) → entra a modulo_filiacion (solo si módulo creado)
│   └── Icono ambulancia (ti-ambulance) → gris=desactivado / amarillo=activo en DRP
├── bandeja_entrada_vehiculo    (visible si hay ID_vehiculo seleccionado)
│   └── Icono ti-mail → abre MODAL de bandeja (solo lectura)
└── bandeja_entrada_personal    (icono ti-mail con iniciales por cada checkin_on)
    └── Pulsar icono → abre MODAL de bandeja (solo lectura)
` ` `

---

## 3. Tabla completa — black_column → home_area

Tipo de renderizado:

- **in-place** — reemplaza el contenido actual del `home_area`. El botón atrás aparece.
- **modal** — se superpone sobre el `home_area`. El contenido subyacente permanece.
- **modal-ligero** — variante compacta del modal, sin bloquear toda la pantalla.
- **sin-render** — el ítem solo expande/contrae el acordeón; no renderiza nada en `home_area`.
- **retorno** — restaura `visual_info_home`.

| #    | black_column ítem                  | Icono                   | Tipo render | Componente en home_area          | Observaciones Técnicas y de Diseño                                                                                                                                                                                                                           |
| ---- | -------------------------------- | ----------------------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | **Home** | `ti-home`               | retorno     | `visual_info_home`               | Contrae todo. Limpia home. Siempre accesible.                                                                                                                                                                                                                                |
| 2    | **Check-in** | `ti-login`              | in-place    | `terminal_check`                 | Reemplaza `visual_info_home`. Formulario check-in/check-out.                                                                                                                                                                                                                 |
| 3    | **Operativa rutinaria** | `ti-ambulance`          | sin-render  | —                                | Expande/colapsa subgrupo.                                                                                                                                                                                                                                    |
| 3.1  | → Doc-10 Envío material          | `ti-file-text`          | in-place    | Formulario Doc-10                | Origen: vehículo o backpack activo.                                                                                                                                                                                                                          |
| 3.2  | → Doc-6 Gasto material           | `ti-package`            | in-place    | Formulario Doc-6                 | Selección de ítem y cantidad. Restricción: Requiere ID_Vehiculo activo.                                                                                                                                                                                      |
| 3.3  | → Doc-8 Parte de trabajo         | `ti-clipboard-list`     | in-place    | Vista Doc-8 en curso             | Muestra el Doc-8 activo del turno. Solo lectura + selector funciones.                                                                                                                                                                                        |
| 3.4  | → `sep`                          | —                       | —           | —                                | Separador visual. No interactivo.                                                                                                                                                                                                                            |
| 3.5  | → Doc-2 Informe asistencial      | `ti-heart-rate-monitor` | in-place    | Formulario Doc-2                 |                                                                                                                                                                                                                                                              |
| 3.6  | → Doc-11 Aviso urgente           | `ti-alert-triangle`     | in-place    | Formulario Doc-11                | Tipografía `Barlow Condensed Black` permitida para alertas críticas.                                                                                                                                                                                         |
| 3.7  | → Repostar combustible           | `ti-gas-station`        | in-place    | Formulario repostaje             | Toggle Gasolinera/Base.                                                                                                                                                                                                                                      |
| 3.8  | → Repostar AdBlue                | `ti-droplet`            | in-place    | Formulario AdBlue                | Toggle activo/no.                                                                                                                                                                                                                                            |
| 3.9  | → Doc-Checklist360 Revisión 360° | `ti-checkbox`           | in-place    | Formulario Checklist360          | RBAC crear: tes, flota, gerencia.                                                                                                                                                                                                                            |
| 3.10 | → Vehículos                      | `ti-steering-wheel`     | in-place    | `vista_vehiculos`                | Vista combinada (Lista flota -> selector estados/servicio). Único punto de acceso al listado de flota — `selector_vehiculos` ya no aparece en raíz.                                                                                                          |
| 4    | **DRP** | `ti-map-pin`            | sin-render  | —                                | Expande/colapsa subgrupo.                                                                                                                                                                                                                                    |
| 4.1  | → Operativa DRP                  | `ti-activity`           | in-place    | Lista docs DRP activos           | Docs abren MODAL. **Mecanismo de Enmienda:** Docs guardados son inmutables. Botón "Enmendar" clona registro editable y oculta el original.                                                                                                                   |
| 4.2  | → Visor DRP                      | `ti-selector`           | in-place    | `visor_drp`                      | DRPs Activos expandibles. **DRPs Finalizados (48h):** UI `opacity-60`, `isReadOnly=true`. Bloqueado incondicionalmente por RLS. **Salida DRP:** Si no hay red, acción se encola (IndexedDB) y muestra Toast de aviso; *no lanza error visual*.             |
| 4.3  | → Resumen DRP                    | `ti-chart-bar`          | modal       | `resumen_drp`                    | RBAC: gerencia, coordinación. Icono atenuado para otros roles (sin acción).                                                                                                                                                                                  |
| 4.4  | → Logística DRP                  | `ti-package`            | in-place    | `logistica_drp`                  | Bandeja mixta: Alertas de stock son *auto-dismiss* (sin botones mutación). Doc-10 es flujo interactivo.                                                                                                                                                      |
| 4.5  | → Crear DRP                      | `ti-circle-plus`        | in-place    | Formulario `crear_drp`           | Combobox avanzado. **Excluye:** `critico` o `En_curso`. **Badge alerta:** Vehículos en `En_preparacion`.                                                                                                                                                     |
| 4.6  | → Estados DRP                    | `ti-toggle-left`        | in-place    | `selector_estados_drp`           | Modificar fase del DRP activo. Si se activa `En curso` tempranamente → Modal: "Cuenta atrás | Marcar hora de inicio".                                                                                                                                        |
| 5    | **Módulos especiales** | `ti-puzzle`             | sin-render  | —                                | RBAC subgrupo: logística, coordinación, gerencia.                                                                                                                                                                                                            |
| 5.1  | → PSA                            | `ti-first-aid-kit`      | in-place    | Vista `modulo_psa`               | Al cerrar, job automático transiciona Subinventario a `En_Transito`.                                                                                                                                                                                         |
| 5.2  | → Filiación                      | `ti-forms`              | in-place    | Menú acción filiación            | **UI Optimista (Drag&Drop):** Reordenamiento de pacientes instantáneo (sin spinners). Si falla, hace rollback visual. **Rescate Box:** Botón rojo destructor `LIBERAR BOX` para devolver a sala de espera.                                                   |
| 6    | **Logística y almacén** | `ti-building-warehouse` | sin-render  | —                                | Optimizado para paginación (Caché parcial) si se abre offline.                                                                                                                                                                                               |
| 6.1  | → Inventario maestro             | `ti-list-details`       | in-place    | Vista inventario maestro         | Tabla de todos los items por location. Prohibido usar `select(*)` para payloads, selectores estrictos requeridos.                                                                                                                                            |
| 6.2  | → Doc-9 Entrada almacén          | `ti-truck-delivery`     | in-place    | Formulario Doc-9                 |                                                                                                                                                                                                                                                              |
| 6.3  | → Doc-10 Envío material          | `ti-transfer`           | in-place    | Formulario Doc-10                | Contexto logística: origen almacén central.                                                                                                                                                                                                                  |
| 6.4  | → Inventario en tránsito         | `ti-truck`              | in-place    | Vista tránsito                   | Lista de Doc-10 en estado En_Transito.                                                                                                                                                                                                                       |
| 6.5  | → Descuadres                     | `ti-alert-circle`       | in-place    | Vista descuadres                 | Lista de Descuadre_Pendiente_Revision con acciones de resolución.                                                                                                                                                                                            |
| 6.6  | → Catálogo de ítems              | `ti-tags`               | in-place    | Vista `catalogo_items`           | Tabla maestro. El archivado activa trigger de purga en plantillas. RBAC: `responsable_logistica`, `gerencia`.                                                                                                                                                |
| 6.7  | → Bandeja logística              | `ti-inbox`              | modal       | `bandeja_entrada_logistica`      | Flujo estándar.                                                                                                                                                                                                                                              |
| 7    | **Flota y taller** | `ti-car`                | sin-render  | —                                |                                                                                                                                                                                                                                                              |
| 7.1  | → Incidencias                    | `ti-tool`               | in-place    | Vista incidencias activas        | Lista de incidencias abiertas con filtros Kanban.                                                                                                                                                                                                            |
| 7.2  | → Doc-7 Informe avería           | `ti-engine`             | in-place    | Formulario Doc-7                 | **Constraint Técnico:** Fotos adjuntas se comprimen vía Canvas API (1200px WebP) antes de subir o encolar offline.                                                                                                                                           |
| 7.3  | → Metadata vehículo              | `ti-id`                 | in-place    | Vista metadata                   | Datos ITV, seguros y documentación por ID_vehiculo.                                                                                                                                                                                                          |
| 7.4  | → Mantenimiento flota            | `ti-tool-2`             | in-place    | `visor_mantenimiento`            | Tabla preventiva (aceite, frenos). Badges: OK/Próximo/Urgente. RBAC edición: `responsable_flota`, `gerencia`.                                                                                                                                                |
| 7.5  | → Historial eventos físicos      | `ti-history`            | in-place    | Vista `eventos_fisicos_vehiculo` | Historial repostajes. Filtros: ID_vehiculo, tipo_evento.                                                                                                                                                                                                     |
| 7.6  | → Bandeja flota                  | `ti-inbox`              | modal       | `bandeja_entrada_flota`          | Recepción de Doc-7 de plantilla.                                                                                                                                                                                                                             |
| 8    | **Coordinación y seguridad** | `ti-shield-lock`        | sin-render  | —                                |                                                                                                                                                                                                                                                              |
| 8.1  | → Token de emergencia            | `ti-cookie`             | in-place    | Generador de token               | Formulario: tipo (temporal/permanente) + PIN 6 dígitos generado.                                                                                                                                                                                             |
| 8.2  | → RBAC roles                     | `ti-users`              | in-place    | Vista gestión de roles           | Asignación de rol por ID_nombre. (Cosmético en UI, Claims estrictos en DB).                                                                                                                                                                                  |
| 8.3  | → Bandeja coordinación           | `ti-inbox`              | modal       | `bandeja_entrada_coordinacion`   | Mensajes escalados.                                                                                                                                                                                                                                          |
| 9    | **Gestión y RRHH** | `ti-id-badge`           | sin-render  | —                                |                                                                                                                                                                                                                                                              |
| 9.1  | → Fichas empleados               | `ti-user-circle`        | in-place    | Vista fichas empleados           | Tabla de personal con datos, rol y estado.                                                                                                                                                                                                                   |
| 9.2  | → Gestión de turnos              | `ti-calendar-event`     | in-place    | Vista cuadrante/turnos           | Incluye sección vacaciones con Doc-12 si periodo activo.                                                                                                                                                                                                     |
| 9.3  | → Gestión tablón                 | `ti-news`               | in-place    | Editor tablón central            | Crear / Editar / Archivar anuncios. RBAC: gerencia, rrhh.                                                                                                                                                                                                    |
| 9.4  | → Marquesina                     | `ti-antenna`            | in-place    | Editor marquesina                | Texto del ticker de header. RBAC: gerencia, rrhh.                                                                                                                                                                                                            |
| 9.5  | → Doc-12 Solicitud vacaciones    | `ti-beach`              | in-place    | Formulario Doc-12 (activación)   | RRHH activa el periodo de vacaciones.                                                                                                                                                                                                                        |
| 9.6  | → Repositorio documentos         | `ti-folder-open`        | in-place    | Vista `repositorio_documentos`   | **Rendimiento:** Librería `pdfMake` de visualización/exportación de PDFs debe tener carga diferida obligatoria (lazy load).                                                                                                                                  |
| 9.7  | → Gestión de bajas y ausencias   | `ti-calendar-x`         | in-place    | Vista `gestion_bajas`            | Separado de cuadrantes. RBAC: `rrhh`, `gerencia`.                                                                                                                                                                                                            |
| 9.8  | → Bandeja RRHH                   | `ti-inbox`              | modal       | `bandeja_entrada_rrhh`           | Flujo Estándar+ (Doc-12 Aprobar/Denegar).                                                                                                                                                                                                                    |
| 10   | **Tablón central** | `ti-speakerphone`       | in-place    | Vista tablón central             | Lectura todos los roles. Doc-12 aparece aquí cuando está activado.                                                                                                                                                                                           |
| 11   | **Buzón interno** (Doc-13)       | `ti-message-report`     | in-place    | Formulario Doc-13                | Propuestas y quejas. Todos los roles autenticados.                                                                                                                                                                                                           |

---

## 4. Reglas de renderizado

### 4.1 in-place

- El contenido anterior del `home_area` es **reemplazado**.
- El botón de atrás (`ti-arrow-left`) aparece en el header.
- `visual_info_home` y `visual_info_drp` quedan en segundo plano (no visibles).
- Pulsar `Home` o el botón de atrás restaura `visual_info_home`.

### 4.2 modal

- Se superpone sobre el contenido actual del `home_area`.
- El contenido subyacente permanece **visible pero bloqueado** (overlay semitransparente).
- Tiene botón de cierre propio (`ti-x`). El botón de atrás del header también lo cierra.
- El `home_area` subyacente puede ser `visual_info_home` u otro in-place activo.
- Los modales **no se apilan**: abrir un segundo modal cierra el primero.

### 4.3 modal-ligero

- Variante compacta del modal. Más pequeño, sin bloquear toda la pantalla.
- Uso: `Añadir asistencia Doc-1` desde `visual_info_drp`, selector de perfil en `modulo_filiacion`.

### 4.4 Docs DRP (desde visual_info_drp o Operativa DRP)

- Doc-2, Doc-3, Doc-4, Doc-5, Doc-11 durante DRP → siempre **modal**.
- Permite rellenar documentos manteniendo `visual_info_drp` visible.
- Varios docs pueden abrirse en secuencia; se abren uno a uno.

### 4.5 Vista Vehículos (ítem 3.10)

- Reemplaza el contenido del `home_area` — renderizado **in-place**.
- Parte superior: lista completa de la flota (`selector_vehiculos`) con ID, matrícula, badge de `estado_operativo` y badge de `condicion_tecnica`.
- Al seleccionar un vehículo de la lista: se expande debajo el panel `selector_estados_ID_vehiculo`.

---

## 5. Reglas de coexistencia

### 5.1 visual_info_drp activo + navegación black_column

| Acción                                        | Resultado                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| Pulsar doc desde desplegable `operativa_drp`  | Modal sobre `home_area` — `visual_info_drp` permanece debajo.                  |
| Pulsar `+` (añadir asistencia Doc-1)          | Modal-ligero — `visual_info_drp` permanece debajo.                             |
| Pulsar icono puerta (ti-door-enter)           | In-place: carga `modulo_filiacion` — `visual_info_drp` queda en segundo plano. |
| Pulsar cualquier ítem black_column (in-place) | `visual_info_drp` queda en segundo plano. Se restaura con Home o atrás.        |
| Pulsar cualquier bandeja (modal)              | `visual_info_drp` permanece visible debajo del overlay.                        |
| Pulsar `Home`                                 | `visual_info_home` completa restaurada, incluyendo `visual_info_drp`.          |

### 5.2 Acordeón black_column — regla de un subgrupo activo

- Solo un subgrupo puede estar expandido simultáneamente. Expandir uno colapsa el anterior.
- Expandir un subgrupo **no cambia** el contenido del `home_area`.

### 5.3 Contexto de ID_vehiculo requerido

Si no hay vehículo activo, muestran aviso visual en `home_area`:

- Doc-6, Doc-8, Repostajes, Checklist360, Visor DRP.

### 5.4 RBAC — Ítems con acceso restringido

- Icono **oculto**: Roles sin permisos absolutos para la vista.
- Icono **atenuado (sin acción)**: Resumen DRP (Lectura limitada para roles sin permisos de alteración).

---

## 6. Zonas con actualización en tiempo real

La UI refleja mutaciones sin necesidad de refrescar, escuchando canales de Supabase.

| Zona                            | Fuente / Herramienta         | Qué actualiza (Eventos Push)                                                                    |
| ------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------- |
| `vista_vehiculos` (ítem 3.10)   | Supabase Realtime            | Estado operativo, condición técnica y tipo de servicio de cada ID_vehiculo.                     |
| `modulo_filiacion` (Citas/Cola) | Realtime + TanStack Query    | Estado de pacientes en Boxes y Sala de Espera (Sincronizado entre todos los terminales).        |
| `panel_personal`                | Supabase Realtime            | checkin_on, pilot, carry por ID_nombre.                                                         |
| `visual_info_drp`               | Supabase Realtime            | Transiciones de fase del DRP, entrada/salida de dotaciones.                                     |
| `bandeja_entrada_*` (iconos)    | Supabase Realtime            | Iluminación amarilla del icono `ti-mail` si hay mensajes sin leer.                              |
| `Inventario / Logística DRP`    | RPC / DB Triggers + Realtime | Consumos Doc-6 o llegadas Doc-10. **Prohibido el cálculo matemático en cliente**.               |
| `Tablón central / Marquesina`   | Supabase Realtime            | Anuncios nuevos o archivados. Modificación del ticker superior.                                 |

---

## 7. Comportamiento del botón de atrás

El botón `ti-arrow-left` está en el extremo derecho del header. **Solo visible cuando hay historial de navegación**. (Profundidad máxima: 1. Siempre retorna al nivel raíz).

| Estado de navegación actual                  | Acción al pulsar atrás                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `visual_info_home` (raíz)                      | Botón **no visible**.                                                         |
| Submenú accordion expandido, sin doc activo    | Colapsa el submenú. Botón desaparece.                                         |
| Doc/formulario in-place abierto                | Cierra el in-place. Restaura `visual_info_home`. Submenú permanece expandido. |
| Modal abierto (bandeja, resumen DRP, doc DRP)  | Cierra el modal. El fondo queda como estaba.                                  |
| Modal-ligero abierto (añadir asistencia, etc.) | Cierra el modal-ligero.                                                       |
| Doc in-place + modal abierto simultáneamente   | Cierra el modal primero. El doc in-place permanece.                           |

---

## 8. Indicador de ítem activo (black_column)

- Barra vertical amarilla de 3 px en el borde izquierdo del botón activo en `home_area`.
- Si hay un **modal** activo, el indicador permanece en el ítem que lo originó.
- Si el acordeón está expandido pero no hay doc activo, el indicador está en el **núcleo del acordeón**.

---

## 9. Estados Visuales de Red y Persistencia (Offline-First)

Dado que las tablets operan en áreas de baja cobertura, la UI debe reaccionar elegantemente a cortes de conexión sin mostrar pantallas de error abruptas.

| Escenario Operativo                          | Comportamiento Visual de la UI                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Mutación crítica offline (ej. Salida de DRP) | El framework intercepta el fallo de red. La UI muestra un Toast informativo: *"Sin conexión. Operación encolada localmente."* |
| Recuperación de Red                          | Al detectar `window.online`, el procesador vacía la cola en segundo plano. La UI se refresca sola vía TanStack Query.         |
| Formularios Offline                          | Siguen funcionando utilizando UUIDs generados en el frontend para evitar colisiones al recuperar la red.                      |
| Drag & Drop Filiación (Optimistic UI)        | Carga visual inmediata. Si la latencia falla por condición de carrera en BBDD, el componente hace "rollback" visual elástico. |

---

## 10. Compatibilidad con pantalla base (<640 px)

| Vista / componente                | Comportamiento en base                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `black_column`                    | Permanece a 52 px. Los tooltips se suprimen (no hay hover en táctil).                      |
| `header`                          | Marquesina se trunca o se oculta. Solo logo + acciones globales.                           |
| `visual_info_home`                | Columna única. `selector_vehiculos`, panel personal y panel vehículo se apilan.            |
| Formularios (in-place)            | Diseño de columna única. Sin columnas laterales. Scroll vertical.                          |
| Modales                           | Ocupan el 100% de la pantalla (full-screen modal). Botón de cierre arriba a la derecha.    |
| Modal-ligero                      | Se convierte en drawer desde la parte inferior (bottom sheet).                             |
| Tablas de inventario/logística    | Scroll horizontal habilitado. Columnas mínimas visibles por defecto.                       |
| `modulo_filiacion` (perfil boxes) | Monitor de espera en columna única. Box selector como tabs.                                |

**Vistas no accesibles en base (< 640 px) (Se simplifican):**

- `Inventario maestro` → buscador + filas expandibles.
- `Fichas empleados` → buscador + tarjeta de detalle al pulsar.
- `Gestión de turnos` → vista de lista por día.

---

## 11. Flujo de navegación — diagramas de referencia rápida

### Navegación básica

` ` `text
[Home]          → visual_info_home
[Check-in]      → terminal_check (in-place) ← [atrás] → visual_info_home
[Cualquier doc] → formulario (in-place) ← [atrás] → visual_info_home
[Bandeja]       → modal ← [X o atrás] → fondo anterior
` ` `

### Navegación con DRP activo

` ` `text
visual_info_home
  └── visual_info_drp (sub-componente)
        ├── desplegable operativa_drp
        │   └── [doc seleccionado] → modal sobre home_area
        ├── [+ Doc-1] → modal-ligero sobre home_area
        └── [ti-door-enter] → modulo_filiacion (in-place)
` ` `

### Navegación black_column con accordion

` ` `text
[DRP accordion]          → expande subgrupo (no cambia home_area)
  [→ Visor DRP]          → visor_drp in-place
  [→ Resumen DRP]        → resumen_drp modal (sobre lo que hubiera)
  [atrás desde in-place] → visual_info_home (accordion DRP sigue expandido)
  [Home]                 → visual_info_home (accordion se colapsa)
` ` `

## 🗺️ ESPECIFICACIÓN ARQUITECTÓNICA Y VISUAL DE LA UI (U24)

**Documento Maestro para Diseño UX/UI y Desarrollo Frontend**
Este documento mapea la topología de navegación estricta de la interfaz. Todo diseño debe adherirse a la librería `shadcn/ui`, utilizando fuentes `Barlow` (textos) y `Barlow Condensed` (elementos de control, matrículas, badges), respetando la paleta de alto contraste sin invenciones estéticas.

---

### 📌 CORE DE NAVEGACIÓN Y LAYOUT BASE

**Ubicación:** Elementos persistentes en el Shell de la aplicación (Header / Black Column).

- **Tablón central:** Renderizado en hoja fija (`Sheet` o `Drawer`). Siempre accesible.
- **Buzón interno:** Renderizado en hoja fija. Mensajería intra-sistema.
- **Atrás — contextual:** Renderizado condicional. Solo visible al profundizar en grupos o subgrupos, permitiendo retroceder un nivel sin usar el historial del navegador.
- **Expand/collapse:** Toggle manual (Icono persistente) para expandir o colapsar las etiquetas de texto en el menú lateral para ahorrar espacio de pantalla en tablets.

---

### 🏠 1. HOME (LOGO)

**Ubicación Visual:** Raíz del sistema (`/`). Layout de Dashboard modular.
**Comportamiento UI:** Actúa como panel de visión rápida (Glanceable UI). No requiere sub-navegación.

- **`visual_info_home`:** Tarjetas informativas generales y accesos a funciones clave.
- **Panel de Personal:** Tarjeta que muestra estado de check-in actual, identificador (`ID_nombre`) y botones de acción rápida para contacto.
- **Panel de Vehículo Activo:** Tarjeta dinámica (solo visible si hay vehículo asignado). Muestra estado clave, dotación emparejada y accesos a gestión de estados.
- **Panel de DRP Activo:** Visualización de la asignación a un dispositivo, con botón para entrar al flujo del DRP.
- **Bandejas de Entrada (Notificaciones):** Widgets separados para Personal y Vehículos con actualización Realtime.

---

### 🔐 2. CHECK-IN | CHECK-OUT

**Ubicación Visual:** Modal overlay inicial o Hoja fija accesible desde Home.
**Comportamiento UI:** Gestión estricta de concurrencia y terminales.

- **Flujo Login Normal (Supabase):** Si la sesión existe, el Home se pinta instantáneamente con el `ID_nombre` y permisos. No se pide Check-in manual.
- **Selector de Terminal:** Lista de usuarios activos en el terminal actual.
- **Resolución de Conflictos Multi-Terminal:** Si el sistema detecta que el usuario está activo en un *Terminal A*, muestra Modal de advertencia (color de alerta `amber-700`): *"Estás asignado en otro terminal. ¿Deseas hacer check-in aquí y check-out automático en el anterior?"* Sin re-pedir contraseña.
- **Check-out:** por usuario, acción manual.

---

### 🚑 3. OPERATIVA RUTINARIA

**Estructura:** Grupo principal con 4 secciones.

#### 3.1 Vehículos (`selector_vehiculos`)

Vista combinada *in-place* dividida en 3 zonas (sin saltos de página):

- **Zona Superior (Lista de Flota):** Grid filtrable. Muestra estado (Realtime) y badges semánticos de condición técnica.
- **Zona Media (`selector_estados_ID_vehiculo`):** Al seleccionar vehículo, renderiza panel de control para modificar su estado (`desactivado`, `en espera`, `activado`, `ruta`, `estacionado`, `alerta`). Badge visual de condición (`operativo` [verde], `averiado leve` [ámbar], `crítico` [rojo]).
  - *Metadata de Vehículo:* Expansión de historial de eventos (cambios de estado, check-ins, DRPs) y selectores de Piloto/Copiloto (Validando que no estén en otro vehículo).
- **Zona Inferior (Selector `tipo_servicio`):** Radio Group o Dropdown: `Programado`, `Dispositivo`, `Traslado`, `Guardia urgencias`, `DRP`, `Privado`, `Simulacro`, `Formacion`, `Sin_asignar`.

#### 3.2 Operativas

Renderizado de hojas de registro de uso frecuente:

- **Doc-10:** Envío de material.
- **Doc-6:** Gasto de material.
- **Doc-8:** Parte de trabajo.
- **Doc-Checklist360:** Formulario exhaustivo de revisión de inicio de turno.

#### 3.3 Documentos Clínicos

- **Doc-2:** Informe asistencial.
- **Doc-11:** Aviso urgente.

#### 3.4 Mantenimiento

Acciones rápidas (botones grandes, adaptados a pulsación en tablet):

- **Repostar combustible** / **Repostar AdBlue**.
- **Doc-7:** Informe de avería.

---

### 🚨 4. DRP (Dispositivo de Riesgo Previsible)

**Estructura:** Grupo complejo con 6 secciones.

#### 4.1 Visor DRP (`visor_drp`)

- **Activos:** Tarjetas de DRP (`En espera`, `En preparación`, `En curso`). Muestran `nombre`, `fecha`, `hora`, `ubicación` y badge de estado.
- **Expansión (Accordion):** Al abrir, lista vehículos asignados (con su dotación emparejada) y "Personal a pie" (IDs sueltos).
- **Acciones de Entrada/Salida (Modales Obligatorios):**
  - *Opción A:* Entrar/Salir con Vehículo (Arrastra todo el `ID_nombre` activo).
  - *Opción B:* Entrar/Salir Individual a pie.
  - *Restricción (Exclusividad):* Validar índice único. Intentar asignar un vehículo a dos DRPs activos lanza error Toast rojo.
  - *Transición Intra-DRP:* Si un Carry se desempareja de su vehículo dentro de un DRP, disparar Modal: *"¿Abandonar dispositivo o permanecer como personal a pie?"*.
- **DRPs Finalizados (Últimas 48h):** Sección visualmente inferior, atenuada (`opacity-60`). Renderizada con prop `isReadOnly=true`. Controles de mutación bloqueados por UI y RLS. Solo permite GET del Doc-1 y descarga de PDF.

#### 4.2 Estados DRP (`selector_estados_drp`)

Solo habilitado bajo RBAC (`coordinación`, `gerencia`).

- **Transiciones:** `En espera` -> `En preparación` -> `En curso` -> `Finalizado` -> `Archivado`.
- **Interacción Modal:** Al activar `En curso` tempranamente, presentar opciones: *"Cuenta atrás"* o *"Marcar hora de inicio actual"*.

#### 4.3 Operativa DRP (`operativa_drp`)

Dashboard de actividad asistencial en tiempo real.

- **Documentos (Doc-2, 3, 4, 5, 11):** Formularios que se abren como hojas superpuestas o modales amplios.
- **Mecanismo de Enmienda:** Los registros guardados son texto inmutable. El botón "Enmendar" clona el documento en modo edición y oculta el anterior (trazabilidad legal conservada en BBDD).
- **Doc-1 (Modal de Asistencia):** Formulario rápido (Append-Only). Muestra campos de `p_filiacion` + `Motivo` + `Resolución`.

#### 4.4 Logística DRP (`logistica_drp`)

Solo habilitado bajo RBAC (`logistica`).

- **Vista Stock:** Tabla de consumibles de los `inventory_locations` asignados (vehículo, backpack, subinventario). Muestra barra de progreso `stock_real` vs `stock_objetivo`.
- **Bandeja de Entrada Logística (Mixta):**
  - *Alertas de Stock:* Toast o Card en modo solo lectura (`isReadOnly=true`), auto-dismissible.
  - *Doc-10 Pendientes:* Formulario interactivo para confirmar recepción ítem a ítem.
- **Añadir Gasto (Doc-6):** Selector previo de ubicación afectada (Vehículo, Backpack o Subinventario DRP).

#### 4.5 Opciones DRP (`opciones_drp`)

Panel de administración (RBAC: `gerencia`, `coordinación`).

- **Visión Global:** Listado jerárquico. Vehículos (Icono ambulancia amarilla) -> Dotaciones -> Personal a pie -> Módulos Activos (PSA, Filiación).
- **Acciones Destructivas:**
  - *Editar Recursos / Informe DRP.*
  - *Finalizar DRP:* Asigna `timestamp_salida` automático a quienes no salieron manualmente.
  - *Cancelar DRP:* Bloqueado si hay asistencias en Doc-1. UI debe advertir de **Borrado en Cascada** incondicional de pacientes en espera y submódulos.
  - *Archivar DRP:* Fuerza guardado de Snapshot en PDF.

#### 4.6 Crear DRP (`crear_drp`)

Formulario de alta.

- **Combobox Vehículos:** Filtrar excluyendo `critico` y vehículos en estado `En_curso`. Mostrar vehículos en `En_preparacion` con Badge de Advertencia amarilla ("Ya en DRP").
- **TextPredictive (Autocompletado):** Para campos `ID_nombre`.
- **Campos Rápidos:** Toggle `IDEM` para copiar ubicación. Selector de `ID_backpack`.

---

### 🧩 5. MÓDULOS ESPECIALES

Se adhieren opcionalmente a un DRP activo.

#### 5.1 PSA (`modulo_psa`)

- **UI Monitorización:** Integración de constantes vitales en tiempo real cruzadas con datos demográficos (Filiación).
- **Inventario PSA:** Al abrir requiere seleccionar un Subinventario DRP preparado. Al cerrar, un Job pone el Subinventario automáticamente en estado `En_Transito` para revisión logística.

#### 5.2 Filiación (`modulo_filiacion`)

- **Perfil Admisión (Cola de Espera):**
  - Formulario de Nuevo Paciente (`p_filiacion`). Estado entra en `en_espera`.
  - *Drag & Drop Optimista:* Reordenamiento visual de pacientes que aplica instantáneamente (rollback si falla el RPC).
  - *Rescate de Box:* Área "Pacientes en Box" con Botón Rojo Destructivo: `LIBERAR BOX`. Devuelve paciente a la sala de espera desvinculándolo del box.
- **Perfil Boxes (1-10):**
  - Grid de monitores. Badges de color diferenciado para pacientes marcados con `revaluacion = true`.
  - Al clicar paciente: cambia a `en_consulta`. Abre hilo de Doc-2/Doc-3.
  - *Acción Revaluar:* Botón que envía al paciente de vuelta a la sala de espera preservando el hilo de su Doc-3.

---

### 📦 6. LOGÍSTICA

Gestión profunda de inventario (Optimizado para paginación si se abre offline).

- **Inventario Maestro:**
  - *Auditoría de Inventarios.*
  - *Inventarios y Almacén (Locations).*
  - *Inventarios Dinámicos:* Creación de Subinventarios, Tipos de plantilla libre, subgrupos.
  - *Catálogo de Ítems:* Alta y baja de artículos.
  - *Descuadres y Ajuste Manual.*
- **Stock:**
  - *Historial de stock.*
  - *Plantillas de stock / Gestión de plantillas.*
  - *Alertas de stock* (Visualización de umbrales rotos).
- **Movimientos:**
  - *Últimos movimientos.*
  - *Inventario en Tránsito.*
  - *Doc-9* (Entrada de Almacén).
  - *Doc-10* (Envío de Material).
- **Bandeja Logística:** Centro de notificaciones
