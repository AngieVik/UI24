# diseño_chupiwachi

> **Documento maestro del sistema de diseño implementado en `src/`.**
> Este archivo es la única fuente de verdad de la implementación visual del
> proyecto U24. Vive en paralelo a `rules.md` (reglas) y `mapeo_visual_ui.md`
> (mapa de navegación). Toda modificación de un componente, token o regla
> visual debe registrarse aquí antes de cerrar la sesión.
>
> **Regla de oro:** si algo está en un componente y no aparece en este
> documento, ese componente está fuera del sistema. Hay que devolverlo al
> sistema o documentar la excepción.

---

## Índice

0. [Directiva técnica — shadcn/ui es el sistema de UI completo](#0-directiva-técnica--shadcnui-es-el-sistema-de-ui-completo)
1. [Dirección estética](#1-dirección-estética)
2. [Tokens — paleta de color (light + dark)](#2-tokens--paleta-de-color-light--dark)
3. [Tokens — tipografía](#3-tokens--tipografía)
4. [Tokens — espaciado, radii, sombras, motion](#4-tokens--espaciado-radii-sombras-motion)
5. [Iconografía — mapping ti-\* → lucide-react](#5-iconografía--mapping-ti---lucide-react)
6. [Layout — chasis del terminal](#6-layout--chasis-del-terminal)
7. [Reglas de capitalización (sentence case estricto)](#7-reglas-de-capitalización-sentence-case-estricto)
8. [Inventario de componentes (estado de implementación)](#8-inventario-de-componentes-estado-de-implementación)
9. [Especificación de primitives shadcn](#9-especificación-de-primitives-shadcn)
10. [Especificación de componentes de chasis](#10-especificación-de-componentes-de-chasis)
11. [Patrones recurrentes](#11-patrones-recurrentes)
12. [Accesibilidad (A11y)](#12-accesibilidad-a11y)
13. [Modo oscuro — reglas de inversión](#13-modo-oscuro--reglas-de-inversión)
14. [Patrón obligatorio de formularios — React Hook Form + Zod](#14-patrón-obligatorio-de-formularios--react-hook-form--zod)
15. [Changelog de diseño](#15-changelog-de-diseño)

---

## 0. Directiva técnica — shadcn/ui es el sistema de UI completo

Esta sección clarifica el alcance de shadcn/ui en U24 (directiva del producto,
2026-05-22): **no es una capa tipográfica, es la única librería de componentes
del proyecto**. Toda primitiva interactiva del sistema debe provenir de shadcn,
que a su vez se apoya en Radix UI (lógica + accesibilidad headless) y Tailwind
v4 (estilado).

### 0.1 Justificación arquitectónica

| Pilar del stack | Compatibilidad con shadcn/ui |
| --- | --- |
| **React 19** | Radix está adaptado a React 19 (eliminación de `forwardRef` por `ref` como prop estándar). |
| **Vite + bundle ≤ 800 KB** | Radix es modular. Vite hace tree-shaking real — solo se empaqueta el `@radix-ui/react-select` si lo usamos. |
| **Tailwind v4 CSS-first** | shadcn genera componentes que residen físicamente en `src/components/ui/` y consumen nuestras CSS variables sin colisiones de empaquetado. |
| **TanStack Query** | Forma parte del stack obligatorio (`rules.md §7`) y es compatible con `Data Table` de shadcn. |
| **React Hook Form + Zod** | El `Form` de shadcn está integrado con RHF y Zod por defecto — es el patrón obligatorio para todos los formularios del proyecto. |

### 0.2 Política de adopción

1. **CLI obligatoria**. Los componentes se instalan con
   `npx shadcn@latest add <nombre>`. La copia manual está prohibida. La CLI:
   - Lee `components.json` y respeta el alias `@/`.
   - Instala los `@radix-ui/react-*` necesarios automáticamente.
   - Añade dependencias periféricas (cmdk, date-fns, react-day-picker, recharts)
     solo cuando hacen falta.
   - Genera el código fuente en `src/components/ui/` para que tengamos control
     absoluto y podamos mutarlo a nuestra paleta sin tocar `node_modules`.
2. **No envolver shadcn** salvo cuando sea necesario aplicar variantes
   específicas de U24 (ej. `Badge` con variantes semánticas extra). En ese
   caso, modificamos directamente el archivo fuente generado, no creamos un
   wrapper adicional.
3. **Política de uso por categoría** (referencia `_docs/shadcn/docs/components/`):

   | Categoría | Componentes a usar | Cuándo |
   | --- | --- | --- |
   | Overlays | `Dialog`, `AlertDialog`, `Sheet`, `Popover`, `HoverCard` | Modales (estándar/destructivo), drawers móvil, popovers contextuales. |
   | Navegación | `NavigationMenu`, `Tabs`, `ScrollArea` | Header (eventual), módulos con sub-paneles, scroll independiente de columnas. |
   | Datos | `DataTable` (con `@tanstack/react-table`), `Card`, `Charts` (sobre Recharts) | Listas densas (inventario, cuadrante), métricas, paneles. |
   | Formularios | `Form` + RHF + Zod, `Input`, `Select`, `Combobox` (cmdk), `Checkbox`, `RadioGroup`, `Switch`, `Slider`, `DatePicker` | Toda entrada de datos. |
   | Feedback | `Toast`/`Sonner`, `Skeleton`, `Alert`, `Badge` | Notificaciones, loading, badges semánticos. |
   | Misc | `Separator`, `Tooltip`, `Avatar`, `Button` | Utilidades. |

4. **Excepciones documentadas**: si un componente necesita un comportamiento
   que shadcn no provee de fábrica (ej. la barra vertical amarilla de 3 px del
   ítem activo del `BlackColumn`, o el ticker con animación marquee), se
   añade la capa de personalización directamente en el archivo fuente
   generado y se registra aquí en la sección 14 (changelog).

---

## 1. Dirección estética

**Nombre interno**: *Utilitario clínico de misión crítica.*

Una interfaz de terminal montado en ambulancia debe leerse a la luz del sol,
en una pantalla con dedos enguantados, en zonas con cobertura intermitente,
con tipografía clara desde la cabina y desde el asiento trasero. La estética
sigue cinco principios:

| Principio | Implicación práctica |
| --- | --- |
| **Densidad sobre adorno** | Filas compactas (alto 32–36 px), padding mínimo, cero whitespace decorativo. Una tabla con `text-xs p-1` antes que un grid generoso con tarjetas grandes. |
| **Monocromo + un acento** | Toda la UI es `zinc` (escala neutra). El amarillo `#FFD60A` aparece **solo** en: logo, ítem activo de `black_column` (barra de 3 px), badge `pilot`, estados puntuales de DRP, focus rings. Si se pone amarillo en más sitios pierde su función semántica. |
| **Rojo solo para destruir o alarmar** | `#DC2626` exclusivo para botones destructivos, Doc-11 Aviso urgente, alertas críticas (averías graves, stock 0, condiciones de emergencia). Nunca decorativo. |
| **Cero azul** | Ni en links, ni en focus, ni en info. La info se transmite con `zinc-600` + iconografía clara o con `#B45309` (amber-700) cuando hay urgencia leve. |
| **Tipografía como jerarquía** | No hacemos tamaños arbitrarios. Hay 6 tamaños de tipo y 4 pesos. La jerarquía se gana con peso (`700` para etiquetas, `300` para meta) y *casing*, no con color ni con tamaño exagerado. |

**No-objetivos** (lo que no queremos):

- Gradientes (excepto `linear-gradient` interno técnico para el banner offline).
- Glassmorphism, blur, neumorfismo.
- Iconos rellenos. Todo outline, stroke 2 px (lucide default).
- Emojis. Ni en código, ni en commits, ni en UI.
- "Curvas suaves". Radios pequeños (`4 px` y `8 px`), todo más bordeado.
- Animaciones por animaciones. Solo transición de `colors` 120 ms y de `opacity` 160 ms. Nada más.

**Inspiración de referencia** (para alinear criterios, no para copiar):
Bloomberg Terminal, Linear (densidad), shadcn/ui (estructura tipográfica),
señalética hospitalaria (jerarquía amarilla → roja).

---

## 2. Tokens — paleta de color (light + dark)

### 2.1 Marca U24 (invariantes)

Estos tokens NO cambian entre light y dark.

| Token | Valor | Uso |
| --- | --- | --- |
| `--u24-black` | `#111111` | `black_column`, fondo header, `text-foreground` en light cuando NO se usa zinc-900. |
| `--u24-white` | `#FFFFFF` | Fondo de cards y de `home_area` en light. |
| `--u24-yellow` | `#FFD60A` | Acento único. Indicador activo, focus ring, logo, badge `pilot`. |
| `--u24-yellow-soft` | `#FFF5B8` | Fondo amarillo cuando se necesita superficie (uso muy restringido — banner activo de DRP). |
| `--u24-red` | `#DC2626` | Destructivo, Doc-11, alarmas. |
| `--u24-red-deep` | `#B91C1C` | Hover de destructivo. |

### 2.2 Escala neutra (zinc — Tailwind v4 nativo)

Usar siempre los tokens de zinc. Estos son los valores que materializa Tailwind v4:

```
zinc-50:  #FAFAFA
zinc-100: #F4F4F5
zinc-150: #ECECEE   (custom — entre 100 y 200)
zinc-200: #E4E4E7
zinc-300: #D4D4D8
zinc-400: #A1A1AA
zinc-500: #71717A
zinc-600: #52525B
zinc-700: #3F3F46
zinc-800: #27272A
zinc-900: #18181B
zinc-950: #09090B
```

> Nota: `zinc-150` es una extensión propia para crear el escalón entre
> `zinc-100` (superficies muy claras) y `zinc-200` (bordes claros). Se
> declara explícitamente en `@theme`.

### 2.3 Tokens semánticos (shadcn-compatible)

Estos son los nombres que usaremos en el código y en las clases Tailwind
(`bg-background`, `text-foreground`, etc.). Mapean a zinc/U24 según modo.

| Token | Light | Dark | Uso |
| --- | --- | --- | --- |
| `--background` | `zinc-50` `#FAFAFA` | `zinc-950` `#09090B` | Fondo de `home_area`. |
| `--foreground` | `zinc-900` `#18181B` | `zinc-100` `#F4F4F5` | Texto principal. |
| `--card` | `#FFFFFF` | `zinc-900` `#18181B` | Fondo de cards/paneles. |
| `--card-foreground` | `zinc-900` | `zinc-100` | Texto sobre card. |
| `--popover` | `#FFFFFF` | `zinc-900` | Tooltips, dropdowns, modales pequeños. |
| `--popover-foreground` | `zinc-900` | `zinc-100` | Texto en popover. |
| `--primary` | `#111111` (u24-black) | `zinc-100` | Botón primario (color *contrastante* al fondo). |
| `--primary-foreground` | `zinc-50` | `zinc-900` | Texto del botón primario. |
| `--secondary` | `zinc-100` | `zinc-800` | Botón secundario, badges neutros. |
| `--secondary-foreground` | `zinc-900` | `zinc-100` | Texto secundario. |
| `--muted` | `zinc-100` | `zinc-800` | Superficies muy sutiles. |
| `--muted-foreground` | `zinc-500` | `zinc-400` | Metadatos, fechas, descripciones secundarias (peso `300`). |
| `--accent` | `#FFD60A` (u24-yellow) | `#FFD60A` | Acento de marca. Mismo en ambos modos. |
| `--accent-foreground` | `#111111` | `#111111` | Texto sobre amarillo (siempre negro — 13.4:1 AAA). |
| `--destructive` | `#DC2626` | `#EF4444` (red-500) | Destructivo. Más claro en dark para mantener contraste. |
| `--destructive-foreground` | `zinc-50` | `zinc-50` | Texto sobre destructive. |
| `--border` | `zinc-200` | `zinc-800` | Bordes 1 px. |
| `--input` | `zinc-200` | `zinc-800` | Borde de inputs. |
| `--ring` | `#FFD60A` | `#FFD60A` | Focus ring — siempre amarillo en ambos modos para reforzar marca. |

### 2.4 Tokens de estado (semánticos)

| Token | Light | Dark | Uso |
| --- | --- | --- | --- |
| `--state-ok` | `#15803D` (green-700) | `#22C55E` (green-500) | Operativo, checkin_on, OK. |
| `--state-warn` | `#B45309` (amber-700) | `#F59E0B` (amber-500) | Aviso leve, ITV próxima, stock bajo. |
| `--state-crit` | `#DC2626` (red-600) | `#EF4444` (red-500) | Avería grave, stock 0, Doc-11. |
| `--state-info` | `#52525B` (zinc-600) | `#A1A1AA` (zinc-400) | Información neutra. **Sustituye al azul** que está prohibido. |

### 2.5 Tokens específicos del chasis

| Token | Valor | Uso |
| --- | --- | --- |
| `--col-w` | `60px` | Ancho fijo del `black_column`. (Actualizado 2026-05-22 — antes 52 px.) |
| `--header-h` | `60px` | Alto del header. (Actualizado 2026-05-22 — antes 52 px.) |
| `--col-hover` | `#1F1F1F` | Hover en `black_column`. |
| `--col-active` | `#2A2A2A` | Botón activo en `black_column` (fondo). |
| `--col-indicator` | `var(--u24-yellow)` | Barra vertical 3 px del ítem activo. |

---

## 3. Tokens — tipografía

### 3.1 Familias

```css
--font-display: "Barlow Condensed", system-ui, sans-serif;  /* UI de mando */
--font-body:    "Barlow",            system-ui, sans-serif;  /* cuerpos largos */
```

**Asignación por tipo de contenido** (regla `rules.md §1`):

| Contenido | Familia |
| --- | --- |
| `black_column` tooltips, header, badges, ticker, matrículas, nombres de paciente, etiquetas de datos, navegación, títulos de card | **Barlow Condensed** |
| Cuerpos de formulario, descripciones largas, bloques de texto > 2 líneas, párrafos informativos, modales explicativos | **Barlow** (regular) |

### 3.2 Pesos permitidos

Solo **cuatro** pesos. Cualquier otro está prohibido.

| Peso | Uso |
| --- | --- |
| `300` (Light) | Metadatos, horas, fechas, descripciones secundarias. Aplicar con `text-muted-foreground`. |
| `500` (Medium) | Cuerpos de texto, formularios, datos de entrada. Peso por defecto del `<body>`. |
| `700` (Bold) | Etiquetas de datos, nombres de pacientes, matrículas, navegación, títulos de card. |
| `900` (Black) | **EXCLUSIVAMENTE** alertas críticas: Doc-11, rotura de stock, banner offline en rojo, estado emergencia. |

### 3.3 Escala de tamaños

Una sola escala, con `clamp()` para fluid design.

| Token | clamp() | Uso |
| --- | --- | --- |
| `--text-xs` | `clamp(0.6875rem, 0.66rem + 0.15vw, 0.75rem)` (11–12 px) | Meta, tooltips, microtexto. |
| `--text-sm` | `clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)` (13–14 px) | Tablas densas, etiquetas de input, ticker. |
| `--text-base` | `clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)` (15–16 px) | Cuerpo por defecto. |
| `--text-lg` | `clamp(1.0625rem, 1rem + 0.3vw, 1.125rem)` (17–18 px) | Títulos de card. |
| `--text-xl` | `clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)` (20–24 px) | Títulos de pantalla. |
| `--text-2xl` | `clamp(1.5rem, 1.3rem + 0.8vw, 2rem)` (24–32 px) | Único caso — Doc-11 modal y pantallas de emergencia. |

> Nada de `text-3xl` ni `text-4xl`. Esto es un terminal de trabajo, no una
> landing.

### 3.4 Tracking, leading, casing

```css
--leading-tight: 1.15;    /* títulos */
--leading-normal: 1.45;   /* cuerpos */
--leading-loose: 1.6;     /* bloques largos en formularios */
--tracking-tight: -0.01em; /* Barlow Condensed en tamaños grandes */
--tracking-normal: 0;
--tracking-wide: 0.04em;   /* badges en caps acrónimos (DRP, PSA) */
```

---

## 4. Tokens — espaciado, radii, sombras, motion

### 4.1 Espaciado

Usamos la escala nativa de Tailwind v4 (`0.25rem` step). Bloqueado en:

- `gap-1` (4 px), `gap-2` (8 px), `gap-3` (12 px), `gap-4` (16 px) → 95% de los casos.
- `gap-6` (24 px) y `gap-8` (32 px) → solo para separar secciones de página.
- Padding interno de card: `p-3` (12 px) o `p-4` (16 px). Nada mayor.
- Padding interno de botón: `px-3 py-1.5` (sm), `px-4 py-2` (base).

### 4.2 Radii

```css
--radius-sm:  4px;   /* badges, chips, inputs */
--radius:     6px;   /* botones, cards pequeñas */
--radius-md:  8px;   /* cards grandes, modales */
--radius-lg:  10px;  /* máximo permitido — sheet/drawer */
```

Cualquier radio mayor está prohibido. Esto es industrial, no consumer.

### 4.3 Sombras

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.04);
--shadow:    0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px 0 rgb(0 0 0 / 0.04);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.05); /* solo modales */
```

En modo oscuro las sombras se reducen a la mitad de opacidad porque ya hay
contraste por color.

### 4.4 Motion

```css
--duration-fast:   120ms;  /* hovers, focus */
--duration-normal: 160ms;  /* opacity de modales, banners */
--duration-slow:   220ms;  /* acordeón black_column */
--ease-out:        cubic-bezier(0.2, 0.8, 0.2, 1);
```

Únicas propiedades animables: `color`, `background-color`, `border-color`,
`opacity`, `transform`. Nada de `width`/`height`/`top` animados.

`prefers-reduced-motion: reduce` → todas las duraciones colapsan a `0ms`.

---

## 5. Iconografía — mapping ti-\* → lucide-react

`rules.md §1` impone **`lucide.dev` exclusivamente**. Stroke 2 px. Tamaños tras
ajuste 2026-05-22:

- **24 px (`size-6`)** — iconos principales del `BlackColumn`.
- **20 px (`size-5`)** — iconos secundarios del `BlackColumn` (sub-items),
  iconos de acción en `Header` (`Inbox`, `ArrowLeft`).
- **18 px** — iconos inline dentro de botones medianos.
- **16 px (`size-4`)** — badges, iconos meta inline.
La documentación heredada (`black_column.md`, `mapeo_visual_ui.md`) usa nombres
`ti-*`. Esta tabla es el mapping autoritativo.

| Spec heredado | Lucide | Componente |
| --- | --- | --- |
| `ti-home` | `Home` | Item 1 black_column |
| `ti-login` | `LogIn` | Item 2 — Check-in |
| `ti-ambulance` | `Ambulance` | Item 3 — Operativa rutinaria |
| `ti-file-text` | `FileText` | Doc-10 desde operativa |
| `ti-package` | `Package` | Doc-6, Logística DRP |
| `ti-clipboard-list` | `ClipboardList` | Doc-8 |
| `ti-heart-rate-monitor` | `HeartPulse` | Doc-2 |
| `ti-alert-triangle` | `TriangleAlert` | Doc-11 (warn level) |
| `ti-gas-station` | `Fuel` | Repostar combustible |
| `ti-droplet` | `Droplet` | Repostar AdBlue |
| `ti-checkbox` | `SquareCheck` | Doc-Checklist360 |
| `ti-steering-wheel` | `Disc3` | Vehículos (item 3.10) — **lucide no tiene volante; usar `Disc3` como aproximación icónica circular** |
| `ti-map-pin` | `MapPin` | Item 4 — DRP |
| `ti-activity` | `Activity` | Operativa DRP |
| `ti-selector` | `ListChecks` | Visor DRP |
| `ti-chart-bar` | `ChartBar` | Resumen DRP |
| `ti-circle-plus` | `CirclePlus` | Crear DRP, añadir asistencia Doc-1 |
| `ti-toggle-left` | `ToggleLeft` | Estados DRP |
| `ti-puzzle` | `Puzzle` | Item 5 — Módulos especiales |
| `ti-first-aid-kit` | `BriefcaseMedical` | PSA |
| `ti-forms` | `ClipboardEdit` | Filiación |
| `ti-building-warehouse` | `Warehouse` | Item 6 — Logística y almacén |
| `ti-list-details` | `ListChecks` | Inventario maestro |
| `ti-truck-delivery` | `TruckDelivery` *(en lucide: `Truck` o `PackageCheck`)* | Doc-9 — **decisión: `PackageCheck`** |
| `ti-transfer` | `ArrowLeftRight` | Doc-10 desde logística |
| `ti-truck` | `Truck` | Inventario en tránsito |
| `ti-alert-circle` | `CircleAlert` | Descuadres |
| `ti-tags` | `Tags` | Catálogo de ítems |
| `ti-inbox` | `Inbox` | Todas las bandejas |
| `ti-car` | `Car` | Item 7 — Flota y taller |
| `ti-tool` | `Wrench` | Incidencias |
| `ti-engine` | `Cog` | Doc-7 Informe avería |
| `ti-id` | `IdCard` | Metadata vehículo |
| `ti-tool-2` | `WrenchScrewdriver` *(no existe — usar `Wrench` + `Settings2`)* — **decisión: `Settings2`** | Mantenimiento flota |
| `ti-history` | `History` | Historial eventos físicos |
| `ti-shield-lock` | `ShieldCheck` | Item 8 — Coordinación y seguridad |
| `ti-cookie` | `Cookie` | Token de emergencia |
| `ti-users` | `Users` | RBAC roles |
| `ti-id-badge` | `BadgeCheck` | Item 9 — Gestión y RRHH |
| `ti-user-circle` | `CircleUser` | Fichas empleados |
| `ti-calendar-event` | `CalendarDays` | Gestión de turnos |
| `ti-news` | `Newspaper` | Gestión tablón |
| `ti-antenna` | `RadioTower` | Marquesina |
| `ti-beach` | `Palmtree` | Doc-12 Vacaciones |
| `ti-folder-open` | `FolderOpen` | Repositorio documentos |
| `ti-calendar-x` | `CalendarX` | Bajas y ausencias |
| `ti-speakerphone` | `Megaphone` | Item 10 — Tablón central |
| `ti-message-report` | `MessageSquareWarning` | Item 11 — Buzón Doc-13 |
| `ti-arrow-left` | `ArrowLeft` | Botón atrás del header |
| `ti-x` | `X` | Cierre de modales |
| `ti-wifi` / `ti-wifi-off` | `Wifi` / `WifiOff` | Banner online/offline |
| `ti-mail` | `Mail` | Bandejas en `visual_info_home` |
| `ti-eye` / `ti-eye-off` | `Eye` / `EyeOff` | Toggle ver contraseña en LoginScreen |
| `ti-user-check` | `UserCheck` | Badge personal en turno |
| `ti-user-minus` | `UserMinus` | Quitar carry en PanelVehiculo |
| `ti-arrows-exchange` | `ArrowLeftRight` | Intercambiar pilot |
| `ti-chevron-up` / `ti-chevron-down` | `ChevronUp` / `ChevronDown` | Desplegables |
| `ti-door-enter` | `DoorOpen` | Entrar a filiación |
| `ti-lock` | `Lock` | Toggle dev — bloquear terminal |

**Convenciones de uso:**

```tsx
import { Home, LogIn, Ambulance } from 'lucide-react'

// black_column — 20 px
<Home className="size-5" strokeWidth={2} aria-hidden="true" />

// botón inline — 18 px
<LogIn className="size-[18px]" aria-hidden="true" />

// badge inline — 16 px
<UserCheck className="size-4" aria-hidden="true" />
```

Siempre `aria-hidden="true"` cuando el icono es decorativo (el texto adyacente
ya describe la acción). Cuando es la única información, va con `aria-label`
en el contenedor.

---

## 6. Layout — chasis del terminal

### 6.1 Estado_0 — Terminal bloqueado

```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│              [Logo U24]                          │
│                                                  │
│            ┌──────────────────┐                  │
│            │  Identificador   │                  │
│            │  ┌────────────┐  │                  │
│            │  └────────────┘  │                  │
│            │  Contraseña      │                  │
│            │  ┌────────────┐  │                  │
│            │  └────────────┘  │                  │
│            │  [   Login    ]  │                  │
│            └──────────────────┘                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

- Fondo `--background`.
- Card centrada vertical y horizontalmente, `max-width: 360px`, `p-6`,
  `rounded-md`, `border`, `shadow-sm`.
- Logo arriba de la card, 48 px de alto.
- Sin chrome (sin `black_column`, sin header, sin ticker).
- Login es **online obligatorio**. Si no hay red → bloqueado con mensaje
  "Sin conexión — el acceso al terminal requiere red."

### 6.2 Estado_1 — Terminal autenticado

```
┌─────┬──────────────────────────────────────────────────────────┐
│  B  │ HEADER · Logo · ticker ────────── [inbox] [← back]      │
│  L  ├──────────────────────────────────────────────────────────┤
│  A  │                                                          │
│  C  │                                                          │
│  K  │                       HOME_AREA                          │
│     │                                                          │
│  C  │                                                          │
│  O  │                                                          │
│  L  │                                                          │
│     │                                                          │
└─────┴──────────────────────────────────────────────────────────┘
   52px                       100% − 52px
```

- `--col-w: 52px` (black_column) + flex column con header (52 px) y main.
- El header tiene **dentro** del main (no ocupa los 52 px de la izquierda).
  Es decir: `flex-row` raíz `[BlackColumn | flex-col(Header + Main)]`.
- `BannerOffline` se inserta entre Header y Main cuando aplica, empujando
  el contenido hacia abajo (no es modal).
- Toasts a `bottom-right` con z-index 60.
- `InstallChip` a `bottom-left` con z-index 50.

### 6.3 Reglas de Z-index

```
z-0   layer base (home_area, cards)
z-10  sticky elements dentro de listas
z-20  popovers, dropdowns
z-30  banner offline (sticky bajo header)
z-40  header (sticky top)
z-50  install chip, toast container
z-60  modales (Dialog, Sheet)
z-70  modal-ligero (Doc-1, selector de perfil)
z-80  drawer/sheet base-móvil
z-99  emergency overlay (Doc-11 escalado a pantalla completa)
```

---

## 7. Reglas de capitalización (sentence case estricto)

Regla `rules.md §1`: **primera letra mayúscula, resto minúscula**. Excepciones
exclusivas: acrónimos.

| Acrónimo | Forma correcta |
| --- | --- |
| DRP, PSA, ITV, UTC, RGPD, ID, JWT, RPC, RLS, RBAC, PIN, RRHH, TES | Mayúsculas sostenidas |
| Doc-1 ... Doc-13 | `Doc-N` (D mayúscula, c minúscula, número, sin espacio) |

**Casos prácticos:**

- ✅ "Selecciona tu vehículo"
- ✅ "Doc-8 Parte de trabajo"
- ✅ "Crear DRP"
- ✅ "Aviso urgente"
- ❌ "SELECCIONA TU VEHÍCULO" (mayúsculas sostenidas no permitidas)
- ❌ "selecciona tu vehículo" (sin mayúscula inicial)
- ❌ "Crear Drp" (DRP es acrónimo, va completo)
- ❌ "doc-8" (Doc es nombre propio del documento)

Esto aplica a:
- Textos de botones
- Etiquetas de inputs (`Identificador`, `Contraseña`)
- Títulos de cards y pantallas
- Items de `black_column`
- Mensajes de error
- Toasts

---

## 8. Inventario de componentes (estado de implementación)

Leyenda:
- ✅ Implementado y conforme a este documento
- 🟡 Implementado pero pendiente de refactor a tokens/lucide/shadcn
- ⬜ No implementado
- 🗑️ Implementado pero hay que eliminarlo (deuda)

### 8.1 Primitives shadcn (`src/components/ui/`)

Todos se instalan con `npx shadcn@latest add <nombre>`. Las personalizaciones
U24 (paleta, variantes semánticas extra) se aplican editando el archivo fuente
generado.

| Componente | Comando CLI | Estado | Personalización U24 |
| --- | --- | --- | --- |
| `Button` | `add button` | ⬜ | `destructive` apunta a `--destructive` (rojo `#DC2626`). Focus ring siempre amarillo. |
| `Card` (+ Header/Title/Description/Content/Footer) | `add card` | ⬜ | Padding interno `p-4`. Radius `--radius` (6 px). |
| `Badge` | `add badge` | ⬜ | Variantes extra: `ok`, `warn`, `crit`, `info`, `accent` (ver §9.3). |
| `Input` | `add input` | ⬜ | Sin cambio (default shadcn). |
| `Label` | `add label` | ⬜ | Sin cambio. |
| `Form` (RHF + Zod) | `add form` | ⬜ | Patrón obligatorio para TODOS los formularios. |
| `Dialog` | `add dialog` | ⬜ | Overlay `bg-black/60 backdrop-blur-[2px]`. |
| `AlertDialog` | `add alert-dialog` | ⬜ | Para confirmaciones destructivas (Doc-7 cerrar, eliminar, etc.). |
| `Sheet` | `add sheet` | ⬜ | Drawer móvil (<640 px) y modal-ligero. |
| `Popover` | `add popover` | ⬜ | Tooltips ricos, selectores. |
| `Tooltip` | `add tooltip` | ⬜ | Hover en `BlackColumn` (delay 350 ms). |
| `NavigationMenu` | `add navigation-menu` | ⬜ | Si el header crece, futura nav. |
| `Tabs` | `add tabs` | ⬜ | Sub-paneles dentro de un Screen (e.g. Cuadrante por semana/mes). |
| `ScrollArea` | `add scroll-area` | ⬜ | Scroll independiente del main y de cualquier columna lateral. |
| `Separator` | `add separator` | ⬜ | `sep` del BlackColumn, divisores en cards. |
| `Table` (+ DataTable pattern) | `add table` + `add data-table` | ⬜ | Listas densas. `DataTable` usa `@tanstack/react-table`. |
| `Skeleton` | `add skeleton` | ⬜ | Estados de carga. |
| `Sonner` | `add sonner` | ⬜ | Toaster oficial recomendado por shadcn. |
| `Avatar` | `add avatar` | ⬜ | Iniciales en `PanelPersonal`. |
| `Select` | `add select` | ⬜ | Selectores de estado_operativo, condicion_tecnica, etc. |
| `Checkbox` | `add checkbox` | ⬜ | Doc-Checklist360. |
| `RadioGroup` | `add radio-group` | ⬜ | Toggle Gasolinera/Base en repostaje. |
| `Switch` | `add switch` | ⬜ | Toggles binarios (system_config). |
| `Combobox` | `add combobox` | ⬜ | Buscador de fichas de empleado, vehículos. |
| `DatePicker` | `add date-picker` | ⬜ | Fechas en Doc-2/3, Doc-12 vacaciones. |
| `Calendar` | `add calendar` | ⬜ | Necesario por DatePicker; también para Cuadrante. |
| `ButtonGroup` | `add button-group` | ⬜ | Agrupación de acciones (obligatorio por rules.md §1). |

### 8.2 Chasis (`src/components/layout/`)

| Componente | Estado | Notas |
| --- | --- | --- |
| `AppShell` | 🟡 | Existe; refactor a tokens + grid correcto. |
| `BlackColumn` | 🟡 | Existe; migrar a lucide, árbol completo §3 de `mapeo_visual_ui.md`. |
| `Header` | 🟡 | Existe; ticker, botón atrás contextual, bandejas. |
| `VisualInfoHome` | ⬜ | Crear desde cero (era `EstadoEspera.tsx` improvisado). |
| `InstallChip` | 🟡 | Refactor visual a tokens. |
| `ThemeProvider` (light/dark) | ⬜ | Crear. Estrategia: clase `dark` en `<html>`. |
| `ThemeToggle` (utilidad dev) | ⬜ | Toggle visible en dev para validar dark mode. |

### 8.3 Auth (`src/components/auth/`)

| Componente | Estado | Notas |
| --- | --- | --- |
| `LoginScreen` (terminal_check) | 🟡 | Rediseño completo con tokens + lucide. |
| `StepUpModal` (checkin interno) | 🟡 | Renombrar mentalmente: esto es `checkin_interno`, no login. |
| `EstadoEspera` | 🗑️ | Reemplazar por `VisualInfoHome`. |

### 8.4 Feedback (`src/components/feedback/`)

| Componente | Estado | Notas |
| --- | --- | --- |
| `BannerOffline` | 🟡 | Refactor a tokens + lucide `WifiOff`. |
| `LoadingSkeleton` | 🟡 | Reemplazar por shadcn `Skeleton`. |
| `ModalError` | 🟡 | Reemplazar por `Dialog` con variante destructive. |
| `ToastContainer` | 🟡 | Reemplazar por `sonner` o shadcn `Toaster`. |

### 8.5 Atoms (`src/components/atoms/`)

| Componente | Estado | Notas |
| --- | --- | --- |
| `Btn` | 🗑️ | Reemplazar por `ui/Button`. |
| `Badge` | 🗑️ | Reemplazar por `ui/Badge`. |

### 8.6 Pantallas feature (flota, operativa, drp, rrhh)

Todas marcadas 🟡 — se refactorizarán en fase B una vez el chasis esté limpio.
Documentadas en su propia sección cuando se toquen.

---

## 9. Especificación de primitives shadcn

### 9.1 Button

```
Variantes:
  default     → bg-primary text-primary-foreground · hover:bg-primary/90
  secondary   → bg-secondary text-secondary-foreground · hover:bg-secondary/80
  outline     → border border-input bg-background · hover:bg-accent hover:text-accent-foreground
  ghost       → bg-transparent · hover:bg-secondary
  destructive → bg-destructive text-destructive-foreground · hover:bg-[--u24-red-deep]

Tamaños:
  sm     → h-8  px-3 text-sm
  default→ h-9  px-4 text-sm
  lg     → h-10 px-5 text-base
  icon   → size-9 (cuadrado, solo icono)

Tipografía:
  Barlow Condensed, weight 700, tracking-normal, sentence case.

Focus:
  ring-2 ring-[--u24-yellow] ring-offset-2 ring-offset-background

Disabled:
  opacity-50 cursor-not-allowed
```

### 9.2 Card

```
Card           → bg-card text-card-foreground rounded-md border shadow-sm
CardHeader     → flex flex-col gap-1 p-4 pb-3
CardTitle      → font-display font-bold text-lg leading-tight
CardDescription→ font-body font-light text-sm text-muted-foreground
CardContent    → p-4 pt-0
CardFooter     → flex items-center p-4 pt-0 gap-2
```

### 9.3 Badge

Variantes semánticas tonales — fondo claro + texto del color:

```
default   → bg-secondary text-secondary-foreground
ok        → bg-green-50  text-green-700  border-green-200  dark:bg-green-950/40 dark:text-green-400
warn      → bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-950/40 dark:text-amber-400
crit      → bg-red-50    text-red-700    border-red-200    dark:bg-red-950/40   dark:text-red-400
info      → bg-zinc-100  text-zinc-700   border-zinc-200   dark:bg-zinc-800     dark:text-zinc-300
accent    → bg-[--u24-yellow] text-[--u24-black] border-[--u24-yellow]

Forma: inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-bold tracking-wide
```

### 9.4 Input

```
h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm
shadow-sm transition-colors
file:border-0 file:bg-transparent file:text-sm file:font-medium
placeholder:text-muted-foreground
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--u24-yellow] focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
```

### 9.5 Dialog

```
Overlay → fixed inset-0 z-60 bg-black/60 backdrop-blur-[2px]
         data-[state=open]:animate-in data-[state=closed]:animate-out
         data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0

Content → fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-60
         w-full max-w-lg gap-3 rounded-md border bg-card p-5 shadow-lg
         data-[state=open]:animate-in data-[state=closed]:animate-out
```

---

## 10. Especificación de componentes de chasis

### 10.1 BlackColumn (`src/components/layout/BlackColumn.tsx`)

**Versión final — 2026-05-23**. Reemplaza por completo la especificación
anterior basada en acordeón vertical.

#### 10.1.1 Modelo de navegación: drill-down con anchura fluida

- **Niveles**: máximo 3 (raíz → grupo → grupillo).
- **Anchura**: `var(--col-w)` (60 px) cuando colapsada · `var(--col-w-expanded)`
  (220 px) cuando expandida.
- **Transición**: `transition-[width] duration-200 ease-out`.
- **Estado**: `useBlackColumnState` vía `BlackColumnContext` — compartido con
  Header y `App.tsx`.

#### 10.1.2 Layout vertical

```
┌──────────────────────────────────────┐
│ Check-in | Check-out  (fijo arriba)  │  ← hoja fija (NAV_FIXED_LEAVES)
│ ── separator ──                      │
│                                      │
│ [Padre activo en amarillo]           │  ← encabezado, solo si currentPath ≠ []
│ ── separator ──                      │
│                                      │
│ Hijo 1                               │  ← drill content (visibleChildren)
│ Hijo 2                               │
│ ...                                  │
│                                      │
│ (spacer mt-auto)                     │
│                                      │
│ ── separator ──                      │  ← anclado al fondo
│ Atrás (contextual)                   │  ← penúltimo (aparece/desaparece)
│ Toggle expandir/contraer             │  ← último (siempre presente)
└──────────────────────────────────────┘
```

**Orden de botones inferiores (decisión 2026-05-23)**:
- **Toggle siempre último** (anclado al fondo). Su posición nunca se mueve.
- **Atrás penúltimo y contextual** (`canGoBack === true`). Aparece/desaparece
  encima del Toggle sin desplazarlo.

#### 10.1.3 Encabezado del padre activo

Cuando `currentPath.length > 0`, se renderiza el último nodo del path como
**encabezado** dentro del flujo vertical:
- Visual: `aria-current="page"` + fondo `bg-u24-column-active` + texto
  `text-u24-yellow` + barra vertical amarilla 3 px a la izquierda.
- Comportamiento: pulsar el encabezado = `goBack()` (equivalente al botón
  Atrás del fondo).
- Tooltip: "Cerrar este grupo y volver atrás".

#### 10.1.4 NavRow (item genérico)

Todas las filas del BlackColumn usan el mismo componente interno `NavRow`:

```
<button class="
  group relative flex h-11 w-full items-center rounded-md
  text-zinc-300 transition-colors
  hover:bg-u24-column-hover hover:text-white
  focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-inset
  data-[active]:bg-u24-column-active data-[active]:text-u24-yellow
">
  <span class="grid w-[52px] place-items-center">
    <Icon class="size-6" stroke-width="2" />
  </span>
  {expanded && <span class="flex-1 truncate text-left font-display text-base font-bold leading-none">
    {label}
  </span>}
  {expanded && trailing /* ChevronRight si es grupo/grupillo */}
  {active && <span class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm bg-u24-yellow" />}
</button>
```

**Reglas**:
- Rail del icono: ancho fijo de 52 px (alinea con `--col-w` para que la
  posición horizontal del icono no se mueva al expandir/contraer).
- Label: visible **solo** cuando `expanded === true`. Truncado con `truncate`.
- Trailing chevron (`ChevronRight`): visible **solo** en grupos/grupillos
  cuando `expanded === true`.
- Indicador activo: barra vertical 3 px amarilla a `left-0`, alto desde
  `top-2` a `bottom-2`.

#### 10.1.5 Botones permanentes / contextuales

| Botón | Posición | Condición | onClick |
| --- | --- | --- | --- |
| **Check-in \| Check-out** | Arriba (fijo) | Siempre visible | `goCheckin()` |
| **Encabezado padre activo** | Cabecera de la lista | `currentPath ≠ []` | `goBack()` |
| **Atrás** | Penúltimo abajo (contextual) | `canGoBack === true` | `goBack()` |
| **Toggle expand/collapse** | Último abajo (fijo) | Siempre | `toggleExpanded()` |

> **Sin Home**: el botón Home se eliminó (decisión 2026-05-23). El **logo del
> Header** ocupa su función — pulsarlo invoca `goHome()`.

#### 10.1.6 Tooltips

- Cuando `expanded === false` o cuando el item tiene `hint`: tooltip activo.
- Cuando `expanded === true` y no hay `hint`: tooltip suprimido (la label
  ya es visible).
- Posición: `side="right"`, `sideOffset={6}`.
- Delay: heredado del `TooltipProvider` global (350 ms en producción, 0 en
  tests).

#### 10.1.7 RBAC visual

`useBlackColumnState` aplica `filterByRol(NAV_TREE, rol)` y filtra
`NAV_FIXED_LEAVES`. Los items que el rol no puede ver simplemente no se
renderizan. Sin `aria-disabled` ni atenuado — invisibles.

#### 10.1.8 Foco por teclado

Cada `NavRow` es un `<button>` nativo. `Tab` recorre los botones en orden
visual. `Enter` y `Espacio` activan. El indicador de foco usa
`focus-visible:ring-2 focus-visible:ring-u24-yellow focus-visible:ring-inset`.

#### 10.1.9 Tests asociados

| Archivo | Cobertura |
| --- | --- |
| `src/test/black-column-nav.test.ts` | Helpers del árbol (filterByRol, findNode, getPathTo, getChildrenOf, rolPuedeVer). 28 tests. |
| `src/test/useBlackColumnState.test.ts` | Máquina de estado (navigateInto, goBack, selectLeaf, toggleExpanded, goHome, goCheckin, visibleChildren). 20 tests. |
| `src/test/BlackColumnContext.test.tsx` | Provider/consumer del Context. 2 tests. |
| `src/test/BlackColumn.test.tsx` | Componente — drill, encabezado padre, RBAC, orden de botones, selección de hoja, Toggle. 17 tests. |

Total tras Fase B: **86 tests verde**.

### 10.2 Header (`src/components/layout/Header.tsx`)

**Versión final — 2026-05-23**.

**Dimensiones**: `h-[var(--header-h)]` (60 px) · `border-b border-zinc-900` ·
`bg-u24-black` · full-width arriba del chasis (no comparte fila con
BlackColumn).

**Layout horizontal**:
```
[Logo U24 grande (clickable)]   [ticker (marquee)]   [bandejas]
   44 px mark, fondo transparente   flex-1            size-10
```

**Logo principal**:
- Mark SVG 44×44 px, sin texto al lado.
- `button` envolvente con `bg-transparent`, sin hover de fondo (decisión
  2026-05-23 — el logo debe quedar visualmente "libre" sobre el header).
- Click → `goHome()` vía `useBlackColumn()`.
- Tooltip "Home · Volver a la vista raíz".
- `aria-current="page"` cuando `selectedLeafId === 'home'` (sin estilo
  visual asociado por petición de la usuaria).

**Ticker**:
- `whitespace-nowrap` · animación `marquee 60s linear infinite`.
- Pausa on `hover` y on `prefers-reduced-motion`.
- Texto `font-display text-base font-medium text-zinc-200`.

**Botón bandejas**:
- `Inbox` icon · `size-10` botón · icono `size-5`.
- Si `unreadCount > 0` → dot amarillo absoluto `top-1 right-1` `size-2`.
- Tooltip "Bandejas · N sin leer".

**El botón "Atrás" NO vive en el Header**. Su lugar es el BlackColumn (penúltimo
botón abajo) y la cabecera del padre activo.

### 10.3 LoginScreen (`src/components/auth/LoginScreen.tsx`)

Spec del estado_0.

```
<main>  ← centrado con grid place-items-center · min-h-dvh · bg-background
  <div class="flex flex-col items-center gap-6">
    <Logo size=48 />
    <Card class="w-[360px]">
      <CardContent class="p-6 space-y-4">
        <h1 class="font-display text-xl font-bold leading-tight">Acceso al terminal</h1>
        <form class="space-y-3">
          <Field label="Identificador" input...>
          <Field label="Contraseña" input type=password + EyeToggle>
          <p role=alert class="text-xs text-destructive min-h-4">{error}</p>
          <Button class="w-full" disabled={...}>Login</Button>
        </form>
      </CardContent>
    </Card>
    <p class="text-xs text-muted-foreground font-light">
      U24 Servicios Sanitarios · v{APP_VERSION}
    </p>
  </div>
</main>
```

**Reglas duras**:
- Login **online obligatorio**. Si `!isOnline` → input deshabilitado y
  mensaje "Sin conexión — el acceso al terminal requiere red."
- Sin "olvidé contraseña", sin "registrarse" — esto es un terminal cerrado.
- El identificador especial `PIN` activa el flujo de emergencia (Edge Function
  `ef_consumir_pin`) — ya implementado en `useLoginFlow`.
- No persistir credenciales en localStorage.

### 10.4 VisualInfoHome (`src/components/layout/VisualInfoHome.tsx`)

**Versión actualizada — 2026-05-24 (Fase C.1 + C.2 cerradas).**

Spec según `mapeo_visual_ui.md §2`. Composición:

```
<div class="mx-auto flex w-full max-w-screen-xl flex-col gap-3 p-3">
  <PanelPersonal />        ← Fase C.1 ✅ cableado (usePersonalEnTurno)
  <PanelVehiculo />        ← Fase C.2 ✅ cableado (useVehiculoActivo)
  <VisualInfoDRP />        ← Fase C.4 ⏳ placeholder honesto
  <BandejaEntradaPersonal/>← Fase C.5 ⏳ placeholder honesto
</div>
```

#### 10.4.1 Política de datos (Fase C)

- **TanStack Query es el source of truth** de los datos servidor. Cada
  panel autónomo: hook propio `useXxx` que devuelve `{ data, isLoading,
  isError, error }`.
- **Realtime es invalidator, no cache paralelo**. `useRealtimeInvalidator`
  abre un canal Supabase por (tabla, filtro) e invalida la `queryKey`
  en cualquier cambio. La query refetchea automáticamente.
- **Kill-switch**: `useRealtimeKillSwitch` lee `system_config.realtime_kill_switch`.
  Si está `true`, los hooks no abren canal y el `useQuery` cae en
  `refetchInterval: 30_000` ms.
- **Stores Zustand permanecen** como estado de sesión local persistente
  (`useTerminalStore`, `useActivacionStore`, `useAuthStore`). NO se
  crearon `usePersonaStore` ni `useDrpStore` — esos datos viven en Query.

#### 10.4.2 PanelPersonal (`src/components/layout/panels/PanelPersonal.tsx`)

**Hook**: `usePersonalEnTurno()` — `presencias_activas_terminal` join
`fichas_empleados`, filtro `id_terminal = useTerminalStore.id_terminal`.

**Estructura**:
- Header `Card`: título "Personal en turno" + Badge `secondary` con
  `UserCheck` y count.
- Estados:
  - `isLoading` → 3 filas Skeleton (`role="status"`).
  - `isError` → texto destructivo "No se pudo cargar…".
  - `data.length === 0` → "Nadie ha hecho check-in en este terminal todavía."
  - `data.length > 0` → `Table` shadcn con columnas Nombre · Función · Check-in.
- Fila: `Avatar` (2 iniciales calculadas con `getInitials`) + nombre real
  (bold) + id_nombre (muted) | rol formateado con `formatRol` en `Badge outline`
  | hora `HH:MM` alineada a la derecha (muted).

**Limitaciones conocidas (deuda registrada)**:
- El spec original pedía columnas Estado y Teléfono. Ninguna de las dos
  existe hoy en BD (`fichas_empleados` no tiene teléfono;
  `presencias_activas_terminal` no tiene un campo "estado" semántico).
  Solo se muestran Función + hora de check-in. Ver `frontend_reconstruction_roadmap.md`
  Deuda registrada D-10.

#### 10.4.3 PanelVehiculo (`src/components/layout/panels/PanelVehiculo.tsx`)

**Hook**: `useVehiculoActivo()` — gate `enabled: !!useActivacionStore.matricula`.
Dos queries paralelas combinadas: `vehiculos` (matricula, tipo,
condicion_tecnica, estado_operativo) + `activaciones_vehiculo`
(pilot, carry de la activación con `timestamp_cierre IS NULL`).

**Estructura**:
- Header `Card`: título "Vehículo del terminal" + Badge con
  `condicion_tecnica` (variante `destructive` si avería, `secondary` si
  operativo, `outline` resto).
- Lead: matrícula (`font-display text-xl font-bold`) + tipo (muted).
- Grid 2×2 con `Cell { label, value }`:
  - Pilot · Carry · Tipo · Estado (operativo)
  - Cada celda: label `text-xs uppercase tracking-wide muted` arriba,
    valor `font-bold` debajo. `—` si null.
- Estados loading/error/empty equivalentes a PanelPersonal.

**Limitaciones conocidas**:
- El spec pedía celda "Servicio" basada en `tipo_servicio`. Ese campo no
  existe en el esquema. Sustituido por "Tipo" (tipo de vehículo SVB/SAMU/…)
  como aproximación. Ver Deuda registrada D-11.

#### 10.4.4 Lógica del empty state global

`VisualInfoHome` lee `usePersonalEnTurno` y `useVehiculoActivo` (TanStack
Query deduplica con los hooks de los paneles hijos). El "Terminal sin
turno activo" se muestra **solo** cuando:

- Ningún hook está aún en `isLoading` (evita parpadeo en el primer pintado).
- `data` de ambos resuelve a vacío.

Cuando uno cualquiera tiene datos, se renderizan los paneles correspondientes
y el empty state global desaparece.

#### 10.4.5 Subpaneles aún placeholder (Fase C.4 y C.5)

- `VisualInfoDRPPlaceholder` — pendiente de `useDrpActivo` (Fase C.4).
- `BandejaEntradaPersonalPlaceholder` — pendiente de `useBandejasPersonales`
  (Fase C.5). Visible solo si `hasPersonal === true`.

---

## 11. Patrones recurrentes

### 11.1 Formularios

- Etiqueta arriba, input debajo, error abajo (`text-xs text-destructive min-h-4`).
- Spacing vertical `space-y-3` entre campos.
- Botón principal siempre al final, `w-full` en formularios verticales, `auto` en formularios horizontales.
- Validación on blur + on submit. Nunca on change (ruido).
- Loading state: el botón pasa a `disabled` y muestra el texto activo ("Verificando…", "Iniciando turno…", etc.).

### 11.2 Tablas densas

- `<Table>` shadcn con `text-sm`, `<TableHead>` en `text-xs font-bold uppercase tracking-wide text-muted-foreground`.
- Row hover `bg-muted/50`.
- Row selected `bg-[--u24-yellow-soft] dark:bg-[--u24-yellow]/10`.
- Acciones de fila a la derecha, en un `flex gap-1` con botones `ghost icon` 28×28.

### 11.3 Modales

- Título corto, sentence case, font-display bold.
- Descripción opcional 1 línea, font-body light, muted.
- Footer con `ButtonGroup`: secundario izquierda (Cancelar) / primario derecha (Acción).
- Modal-ligero (`max-w-sm`) para confirmaciones rápidas. Modal estándar (`max-w-lg`) para formularios. Modal full-screen para Doc-11 emergencia.

### 11.4 Estados vacíos

- Icono grande (40 px) `muted-foreground/40`.
- Título `font-display font-bold text-lg`.
- Descripción 1–2 líneas `font-body text-sm muted-foreground`.
- CTA opcional `Button outline`.

---

## 12. Accesibilidad (A11y)

- `prefers-color-scheme` se respeta como default; el usuario puede forzar light/dark.
- `prefers-reduced-motion` colapsa todas las animaciones a 0 ms.
- Contraste mínimo AA en todos los pares (rules.md ratios documentados en index.css).
- Focus visible obligatorio (ring amarillo 2 px).
- Roles ARIA correctos: `main`, `navigation`, `dialog`, `alert`, `status`, `listbox`/`option`.
- Skip-link "Saltar al contenido" oculto hasta foco (visible cuando se navega por teclado).
- Tooltips no son el único medio de etiquetar — siempre acompañar con `aria-label`.

---

## 13. Modo oscuro — reglas de inversión

Estrategia: clase `dark` en `<html>` (compatible con shadcn). El
`ThemeProvider` lee `localStorage` y, en su ausencia, `prefers-color-scheme`.

**Lo que NO cambia entre modos**:
- `--u24-yellow` siempre `#FFD60A`.
- `--u24-black` siempre `#111111`. La `black_column` es negra en ambos modos.
- El ring de focus es siempre amarillo.

**Lo que cambia**:
- `--background`, `--foreground`, `--card`, `--border`, `--muted`, `--secondary` (ver tabla §2.3).
- `--destructive` se aclara en dark (`red-500` en vez de `red-600`).
- Las sombras se debilitan a la mitad de opacidad.
- Los badges semánticos invierten fondo/texto manteniendo el matiz.

**Componentes especiales en dark**:
- `BlackColumn` queda igual (ya era negra).
- `Header` cambia su `bg-card` a `zinc-900`.
- `LoginScreen` mantiene logo y card sobre fondo oscuro.

---

## 14. Patrón obligatorio de formularios — React Hook Form + Zod

Todo formulario del proyecto usa `Form` de shadcn (RHF) con esquema Zod. No
hay excepciones — ni siquiera el login.

### 15.1 Estructura canónica

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const schema = z.object({
  identificador: z.string().min(1, 'Identificador requerido'),
  password:      z.string().min(8, 'Mínimo 8 caracteres'),
})
type Schema = z.infer<typeof schema>

export function LoginForm() {
  const form = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: { identificador: '', password: '' },
  })

  async function onSubmit(values: Schema) {
    // …
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        <FormField
          control={form.control}
          name="identificador"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Identificador</FormLabel>
              <FormControl><Input autoComplete="username" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* …password… */}
        <Button type="submit" className="w-full">Login</Button>
      </form>
    </Form>
  )
}
```

### 15.2 Reglas

- Mensajes de error en español, sentence case, sin punto final.
- `FormMessage` se renderiza siempre (aunque vacío) para no causar saltos de
  layout al aparecer el error.
- Esquemas Zod viven junto al formulario (no en archivos sueltos), salvo
  cuando se reutilizan en varias pantallas — entonces a `src/lib/schemas/`.
- Validación on blur por defecto. Validación on submit obligatoria.
- Sincronía con tipos de Supabase: usar `z.infer<typeof schema>` y verificar
  que coincide con el tipo de la fila/RPC.

---

## 15. Changelog de diseño

Cada vez que se toque un componente o token, se añade una entrada aquí
con fecha, autor (Claude o humano), archivos tocados y resumen del cambio.

### 2026-05-25 (tarde) — Fase C completa cerrada (C.5 + E2E + 4 bugs colaterales)

**Autor**: Claude (con supervisión humana de AngieVik).

**Cierre Fase C — DoD del roadmap cumplida**:
- C.1 PanelPersonal ✅ (con Estado derivado + Teléfono)
- C.2 PanelVehiculo ✅ (con Servicio = tipo_servicio)
- C.4 VisualInfoDRP ✅ (vía vehículo o personal a pie)
- C.5 BandejaEntradaPersonal ✅ (pin por persona, dot rojo con count, sin onClick — modal en Fase D.9)
- E2E mínimo Playwright "home con datos" ✅ (con mocks de Supabase REST)

**Tests**: 128 Vitest verde + 2 Playwright verde (chromium-android + chromium-desktop).

**Bugs arquitectónicos colaterales encontrados y resueltos en sesión**:

1. **`DataCloneError` en zustand+IDB** — `createIdbStorage` no filtraba
   funciones. Stores con `persist`+IDB tiraban excepción al guardar
   porque structured-clone no acepta funciones. Fix global en
   `src/lib/idb.ts` con `stripFunctions()`. Cubre 5 stores sin tocar
   `partialize` por cada uno.

2. **React 19 StrictMode + Supabase channel cache** — `useRealtimeInvalidator`
   usaba nombres estables de canal, y el doble mount llamaba `.on()`
   sobre un canal ya suscrito (Supabase cachea por nombre). Sin
   ErrorBoundary, React 19 colapsaba todo el árbol y dejaba pantalla
   en blanco tras login. Fix: sufijo aleatorio por instancia con
   `useRef` + `Math.random().toString(36).slice(2, 10)`.

3. **D-12 GRANTs revocados** — Sprint 14 hardening había revocado SELECT
   masivamente al rol `authenticated`. Hooks de Fase C devolvían
   `permission denied`. Migración correctiva
   `20260525000001_grant_select_authenticated_fase_c.sql` restauró
   SELECT en 8 tablas + 1 adicional para `mensajes_bandeja`.

4. **D-13 RLS sin policies** — `presencias_activas_terminal` y
   `activaciones_vehiculo` tenían RLS enabled SIN policies (deny by
   default). Migración `20260525000002_rls_policies_presencias_activaciones.sql`
   añadió SELECT permisivo a authenticated. Endurecimiento auditado
   en Fase E.

**E2E spec** (`e2e/fase-c-home.spec.ts`):
- Mocks de `**/rest/v1/**` vía `page.route` con fixtures JSON.
- `addInitScript` inyecta IDB (`u24-terminal`, `u24-activacion`) +
  sessionStorage (`u24-auth`) antes de cargar la app.
- `realtime_kill_switch` mockeado a `true` para evitar WebSockets.
- Verifica los 4 paneles + estado derivado "En DRP" + matrícula
  + servicio "Urgente" + DRP por vehículo.
- Specs antiguos (`01-login`, `02-checklist-doc8`, `03-inventario-offline`,
  `04-drp`, `05-pwa-smoke`) marcados con `test.describe.skip` (deuda
  D-05 — se reescriben en Fase E).

**Archivos creados/modificados (resumen)**:
- `src/hooks/useBandejasPersonales.ts` (nuevo)
- `src/components/layout/panels/BandejaEntradaPersonal.tsx` (nuevo)
- `src/components/layout/VisualInfoHome.tsx` (integra Bandejas, elimina placeholders)
- `src/test/BandejaEntradaPersonal.test.tsx` (nuevo)
- `src/test/useBandejasPersonales.test.tsx` (nuevo)
- `src/lib/idb.ts` (fix DataCloneError)
- `src/hooks/useRealtimeInvalidator.ts` (fix StrictMode channel reuse)
- `e2e/fase-c-home.spec.ts` (nuevo)
- `e2e/01-login..05-pwa-smoke.spec.ts` (test.describe.skip — D-05)
- `playwright.config.ts` (dev server en lugar de preview)
- `supabase/migrations/20260524000001_resolve_d10_d11.sql` (D-10 + D-11)
- `supabase/migrations/20260525000001_grant_select_authenticated_fase_c.sql` (D-12)
- `supabase/migrations/20260525000002_rls_policies_presencias_activaciones.sql` (D-13)
- `supabase/migrations/20260525XXXXXX_grant_select_mensajes_bandeja.sql` (D-12 ampliada)

**Política respetada**: sin `npm run build`, sin `git push`, sin
despliegues. Migraciones aplicadas vía Supabase MCP con permiso
explícito de la usuaria.

---

### 2026-05-25 — Fase C.4 + cierre deudas D-10/D-11

**Autor**: Claude (con supervisión humana de AngieVik).

**Contexto**: sesión continua tras C.1/C.2 — se cierra C.4 (VisualInfoDRP) y
se resuelven en la misma sesión las deudas D-10 (teléfono + estado) y D-11
(tipo_servicio) que habían quedado abiertas.

**C.4 — VisualInfoDRP cableado**:

- `src/hooks/useDrpActivo.ts` (nuevo) — busca el DRP activo del terminal
  vía dotación de vehículo (`dotaciones_drp.matricula` = useActivacionStore.matricula)
  O vía personal a pie (`drp_personal_a_pie.id_nombre` ∈ ids con check-in).
  Filtra por estados activos (En_espera, En_preparacion, En_curso),
  dedupe por id_drp (prioriza vía vehículo), prioridad
  En_curso > En_preparacion > En_espera, desempate por timestamp más reciente.
- Tres canales Realtime (dotaciones_drp, drp_personal_a_pie, drps) invalidan
  la misma queryKey.
- `src/components/layout/panels/VisualInfoDRP.tsx` (nuevo) — header con
  `DRP <id8>` + estado en badge, meta inline (Coord./Inicio/Preparación),
  badge "Por vehículo" / "A pie", acciones `CirclePlus`/`DoorOpen`/`Ambulance`
  deshabilitadas cuando no hay DRP.
- VisualInfoHome integra el panel y elimina el placeholder.

**Migración BD aplicada** (`20260524000001_resolve_d10_d11`, ejecutada
2026-05-25 vía Supabase MCP):

- D-10: `fichas_empleados.telefono TEXT` (nullable).
- D-11: `CREATE TYPE tipo_servicio AS ENUM ('urgente','programado','evento','traslado')`
  + `activaciones_vehiculo.tipo_servicio NOT NULL DEFAULT 'urgente'`.
- Types Supabase regenerados (`src/types/supabase.ts`, 82 KB).

**Frontend post-migración**:

- `usePersonalEnTurno` añade `telefono` al SELECT y al tipo `PersonaEnTurno`.
- `useVehiculoActivo` añade `tipo_servicio` al SELECT de `activaciones_vehiculo`
  y al tipo `VehiculoActivo`.
- `PanelPersonal` añade columnas **Estado** (derivado en componente:
  En DRP si `useDrpActivo().data`, En servicio si `useVehiculoActivo().data`,
  En base resto) + **Teléfono**. TanStack Query dedupe los hooks contextuales.
- `PanelVehiculo` reemplaza celda "Tipo" por **Servicio** (label legible
  de tipo_servicio). El tipo de vehículo sigue visible en el lead.

**Decisión de modelado para "Estado"**: derivado en hook, no columna BD.
Se aplica el mismo estado a todo el personal en turno del terminal (no
diferencia individual entre pilot/carry/personal a pie). Es la versión
operativamente útil con coste cero de mantenimiento. Si en futuro se
necesita granularidad por persona, requiere joins adicionales.

**Tests**: 117 verde (eran 104 al cerrar C.1+C.2).
- `useDrpActivo.test.tsx` (6) — sin matrícula+sin personal, vía vehículo,
  vía personal a pie, dedupe priorizando vehículo, prioridad por estado,
  propagación de error.
- `VisualInfoDRP.test.tsx` (5) — loading, empty, error, render con DRP,
  vía A pie.
- `PanelPersonal.test.tsx` extendido a 6 (+2 nuevos: estados En servicio
  y En DRP derivados).
- `PanelVehiculo.test.tsx`, `useVehiculoActivo.test.tsx`, `usePersonalEnTurno.test.tsx`
  actualizados para incluir los nuevos campos en los mocks.

**Deuda resuelta**: D-10 y D-11 cerradas en el roadmap (tachadas).

**Archivos creados/modificados**:
- `supabase/migrations/20260524000001_resolve_d10_d11.sql` (nuevo)
- `src/types/supabase.ts` (regenerado)
- `src/hooks/useDrpActivo.ts` (nuevo)
- `src/hooks/usePersonalEnTurno.ts` (telefono)
- `src/hooks/useVehiculoActivo.ts` (tipo_servicio)
- `src/components/layout/panels/VisualInfoDRP.tsx` (nuevo)
- `src/components/layout/panels/PanelPersonal.tsx` (Estado + Teléfono)
- `src/components/layout/panels/PanelVehiculo.tsx` (Servicio)
- `src/components/layout/VisualInfoHome.tsx` (integra VisualInfoDRP)
- `src/test/useDrpActivo.test.tsx`, `src/test/VisualInfoDRP.test.tsx` (nuevos)
- Tests de Panel/use Personal y Vehículo actualizados.

**Pendiente para cerrar Fase C completa**:
- C.5 — `useBandejasPersonales` + `BandejaEntradaPersonal`.
- E2E mínimo Playwright "home con datos".

---

### 2026-05-24 — Fase C.1 + C.2 (PanelPersonal y PanelVehiculo cableados)

**Autor**: Claude (con supervisión humana de AngieVik).

**Contexto**: arranque de la Fase C del roadmap — cableado de datos
reales en `VisualInfoHome`. Se cierran los dos sub-objetivos prioritarios
(Personal en turno + Vehículo activo). Quedan abiertos C.4 (DRP) y C.5
(Bandejas) como sub-fases independientes.

**Decisiones aplicadas** (consensuadas antes de codear, ver roadmap
Fase C → "Decisiones a tomar antes de empezar"):

1. **Stores Zustand actuales se mantienen** como estado de sesión local.
   NO se crean `usePersonaStore` ni `useDrpStore` — los datos servidor
   viven en TanStack Query (que es el cache canónico). Cierra parcialmente
   D-04.
2. **TanStack Query + Realtime coexisten**: Query como source of truth,
   Realtime como invalidator. Patrón documentado en `useRealtimeInvalidator`.
3. **PanelVehiculo gated por `useActivacionStore.matricula`**: sin check-in,
   `enabled: false` y el panel no se renderiza.

**Cableado**:

- `@tanstack/react-query@^5` instalado y `QueryClientProvider` montado en
  `main.tsx` entre `ThemeProvider` y `TooltipProvider`.
- `src/lib/queryClient.ts` con defaults para terminal en ambulancia
  (staleTime 30 s, gcTime 5 min, refetchOnWindowFocus off, retry 1).
- `src/hooks/useRealtimeKillSwitch.ts` — lee `system_config.realtime_kill_switch`
  con staleTime 5 min.
- `src/hooks/useRealtimeInvalidator.ts` — abre canal Supabase por
  (tabla, filtro) e invalida una queryKey. Devuelve `realtimeActive: boolean`
  para que el caller configure `refetchInterval` cuando el kill-switch
  está activo.
- `src/hooks/usePersonalEnTurno.ts` — query sobre
  `presencias_activas_terminal join fichas_empleados`, filtro por
  `id_terminal`. Realtime sobre `presencias_activas_terminal`.
- `src/hooks/useVehiculoActivo.ts` — dos queries paralelas (`vehiculos`
  + `activaciones_vehiculo` con `timestamp_cierre IS NULL`). Realtime
  doble (uno por cada tabla).
- `src/components/layout/panels/PanelPersonal.tsx` — refactor completo
  con Table shadcn, Avatar con iniciales, formatRol.
- `src/components/layout/panels/PanelVehiculo.tsx` — refactor completo
  con lead matrícula/tipo + grid 2×2 (Pilot/Carry/Tipo/Estado).
- `src/components/layout/VisualInfoHome.tsx` — `allEmpty` derivado de
  datos reales, no constante. Subpaneles DRP y Bandejas quedan como
  placeholders honestos hasta C.4/C.5.
- `src/lib/formatRol.ts` (nuevo) — `formatRol(rol)` y `getInitials(nombre)`.

**Tests**: 104 tests verde (eran 86 al cerrar Fase B). +11 nuevos en:
- `PanelPersonal.test.tsx` (4) — mock del hook, cubre los 4 estados.
- `usePersonalEnTurno.test.tsx` (3) — mock de supabase + store, mapeo de
  filas, error path.
- `PanelVehiculo.test.tsx` (6) — incluye variante destructive del badge
  para avería grave y null-handling de pilot/carry.
- `useVehiculoActivo.test.tsx` (5) — combinación de dos queries paralelas,
  ausencia de activación, vehículo inexistente, error path.

**Deuda registrada nueva en el roadmap**:
- **D-10**: `fichas_empleados` no tiene `telefono` ni hay campo "estado"
  semántico en `presencias_activas_terminal`. PanelPersonal muestra
  Nombre + Función + Check-in. Si se quieren las columnas originales,
  añadir columnas a BD en sesión futura.
- **D-11**: el esquema no tiene `tipo_servicio`. PanelVehiculo muestra
  `vehiculos.tipo` como aproximación. Si se quiere "Servicio" semántico
  separado del tipo de vehículo, modelarlo en BD.

**Archivos creados/modificados**:
- `package.json` (+ `@tanstack/react-query`)
- `src/main.tsx` (QueryClientProvider)
- `src/lib/queryClient.ts` (nuevo)
- `src/lib/formatRol.ts` (nuevo)
- `src/hooks/useRealtimeKillSwitch.ts` (nuevo)
- `src/hooks/useRealtimeInvalidator.ts` (nuevo)
- `src/hooks/usePersonalEnTurno.ts` (nuevo)
- `src/hooks/useVehiculoActivo.ts` (nuevo)
- `src/components/layout/panels/PanelPersonal.tsx` (nuevo)
- `src/components/layout/panels/PanelVehiculo.tsx` (nuevo)
- `src/components/layout/VisualInfoHome.tsx` (refactor)
- `src/test/PanelPersonal.test.tsx` (nuevo)
- `src/test/usePersonalEnTurno.test.tsx` (nuevo)
- `src/test/PanelVehiculo.test.tsx` (nuevo)
- `src/test/useVehiculoActivo.test.tsx` (nuevo)
- `05_interfaz_y_desarrollo/diseño_chupiwachi.md` (§10.4 reescrita)
- `06_operaciones/Hoja de ruta/frontend_reconstruction_roadmap.md` (deuda)

**Pendiente para cerrar Fase C completa** (DoD del roadmap):
- C.4: `useDrpActivo` + `VisualInfoDRP`.
- C.5: `useBandejasPersonales` + `BandejaEntradaPersonal`.
- E2E mínimo Playwright "home con datos".

---

### 2026-05-23 — Fase B cerrada (BlackColumn drill-down + JWT claims)

**Autor**: Claude (con supervisión humana de AngieVik).

**Contexto**: Cierre completo de la Fase B del roadmap de reconstrucción
del frontend.

**Decisiones tomadas y aplicadas**:

1. **Backend** (Fase B.1):
   - Enum `rol_empleado` extendido con `personal_externo` e `invitado`.
   - Función `public.custom_access_token_hook(jsonb) returns jsonb` que
     inyecta `app_metadata.rol` e `id_nombre` en cada JWT.
   - Hook activado manualmente por la usuaria en Supabase Dashboard.
   - Verificación end-to-end en navegador con JWT decodificado.

2. **Frontend — modelo de nav** (Fases B.2 / B.3 / B.4 / B.5):
   - Árbol drill-down de 3 niveles tipado en `black-column-nav.ts`.
   - Máquina de estado en `useBlackColumnState` + Context
     `BlackColumnContext` para compartirla entre Header, BlackColumn y
     `App.tsx`.
   - Componente `BlackColumn` reescrito con anchura fluida 60 ↔ 220 px,
     drill-down puro, encabezado del padre activo y auto-colapso tras
     seleccionar hoja.
   - `App.tsx` rutea `home_area` según `selectedLeafId` del Context.

3. **Refinamientos visuales del 23-05**:
   - Logo del login: `h-16` → `h-24`.
   - Logo del Header (44 px) sin fondo, clickable → `goHome()`.
   - Botón Home eliminado del BlackColumn (su función va al logo del
     Header).
   - Botones inferiores invertidos: Toggle al fondo (siempre presente),
     Atrás encima (contextual). Razón: Atrás aparece/desaparece sin
     desplazar al Toggle.
   - Estructura del chasis: Header full-width arriba, debajo
     `BlackColumn + main` (antes BlackColumn iba de extremo a extremo).

4. **Decisiones de RBAC**:
   - Rol JWT como única fuente de verdad (no fallback desde
     `fichas_empleados.rol` en el cliente).
   - Tipo `Rol` con 14 valores en `src/lib/auth-roles.ts`.
   - `useAuthStore` decodifica el JWT en `setSession` y expone `rol` como
     selector.

5. **Tests**: 86 tests verde tras Fase B (era 38 antes).
   - `black-column-nav.test.ts` — 28 tests
   - `useBlackColumnState.test.ts` — 20 tests
   - `BlackColumnContext.test.tsx` — 2 tests
   - `BlackColumn.test.tsx` — 17 tests
   - `resolveRpcError.test.ts` — 6 tests
   - `useOfflineQueue.test.ts` — 13 tests

**Archivos creados/modificados** (resumen):
- `supabase/migrations/20260522000001_extend_rol_empleado_enum.sql`
- `supabase/migrations/20260522000002_custom_access_token_hook.sql`
- `src/lib/auth-roles.ts` (nuevo)
- `src/stores/useAuthStore.ts` (decodifica JWT)
- `src/components/layout/black-column-nav.ts` (nuevo)
- `src/components/layout/BlackColumn.tsx` (reescrito)
- `src/components/layout/Header.tsx` (logo grande clickable)
- `src/components/layout/AppShell.tsx` (reestructurado)
- `src/components/auth/LoginScreen.tsx` (logo más grande)
- `src/contexts/BlackColumnContext.tsx` (nuevo)
- `src/hooks/useBlackColumnState.ts` (nuevo)
- `src/App.tsx` (routing por selectedLeafId)
- `src/test/setup.ts` (ResizeObserver mock, etc.)
- `src/test/test-utils.tsx` (nuevo, renderWithShell)
- 4 archivos `.test.{ts,tsx}` nuevos en `src/test/`

**Deuda registrada** (sigue en
`06_operaciones/Hoja de ruta/frontend_reconstruction_roadmap.md`):
- D-01: Bypass dev de LoginScreen — eliminar en Fase E.
- D-09: Clarificar leaves vs intra-Screen content en Visor Mantenimiento,
  Mantenimiento flota, Modulo_emergencias.

---

### 2026-05-22 — Ajuste de geometría y tipografía base

**Autor**: Claude (a petición de AngieVik).

**Decisión**: la primera versión del chasis quedó visualmente apretada en
monitor de cabina. Subimos un escalón controlado de dimensiones sin tocar
la dirección estética (densidad, monocromo + acento amarillo).

**Cambios aplicados**:

| Token / elemento | Antes | Después |
| --- | --- | --- |
| `--col-w` (BlackColumn) | `52px` | `60px` |
| `--header-h` (Header)   | `52px` | `60px` |
| BlackColumn — botón principal | `size-10` (40 px) | `size-11` (44 px) |
| BlackColumn — botón sub-item  | `size-9` (36 px)  | `size-10` (40 px) |
| BlackColumn — icono principal | `size-5` (20 px)  | `size-6` (24 px)  |
| BlackColumn — icono sub-item  | `size-[18px]`     | `size-5` (20 px)  |
| BlackColumn — logo mark       | 26 × 26           | 32 × 32           |
| Header — logo lockup          | `size-6` + `text-sm` | `size-8` + `text-base` |
| Header — botones acción       | `size-9`          | `size-10`         |
| Header — icono acción         | `size-[18px]`     | `size-5` (20 px)  |
| Header — ticker               | `text-sm`         | `text-base`       |
| LoginScreen — logo            | `h-12` (48 px)    | `h-16` (64 px)    |
| Texto secundario (banners, descripciones, cards) | `text-sm` | `text-base` |

**Política de tipografía**: la regla operativa pasa a ser
*"sm → base, dentro de la escala definida en §3.3"*. El uso de `text-sm`
queda reservado a metadatos en tablas densas y microcopy explícitamente
secundario. Los párrafos legibles, etiquetas y descripciones por defecto
van en `text-base`.

---

### 2026-05-22 — Bypass de desarrollo en LoginScreen

**Autor**: Claude (a petición de AngieVik).

**Contexto**: el dev server local en `http://localhost:5173/` no podía
autenticar contra Supabase porque faltaba `.env.local` y `useLoginFlow`
caía en `Error de red`.

**Cambios**:

1. Creado `.env.local` apuntando al proyecto Supabase de producción
   (`ygljtbpfpfdbuxvibbom.supabase.co`) — gitignored, no se versiona.
   Esto habilita login real con `admin/12345678` desde localhost.
2. Añadido en `LoginScreen.tsx` un bloque condicional a
   `import.meta.env.DEV` con:
   - Un botón "Acceso dev (saltar Supabase)" con variante `outline` y
     borde dasheado, icono `FlaskConical`.
   - Una función `buildFakeSession(id_nombre)` que construye una sesión
     mock con `user_metadata.id_nombre = 'admin'` y `rol: 'gerencia'`.
   - Microcopy explicativo bajo el botón.
3. El botón **no se renderiza en build de producción** (Vite reemplaza
   `import.meta.env.DEV` por `false` en `npm run build`).

**Deuda registrada**: borrar el bloque completo de bypass al cerrar la
Fase B. Marca de búsqueda: `Bypass de desarrollo — eliminar al cerrar Fase B`.

---

### 2026-05-22 — Bootstrap del sistema (sesión actual)

**Autor**: Claude (con supervisión humana de AngieVik).

**Contexto**: La fase Production Deployment Checklist falló porque el
frontend en `src/` no implementaba `rules.md` v2.1 ni `mapeo_visual_ui.md`.
Esta sesión cierra Fase A — chasis correcto + sistema de tokens.

**Decisiones tomadas en esta sesión** (confirmadas por la usuaria):

1. `diseño_chupiwachi.md` queda como fuente de verdad de implementación visual.
2. **shadcn/ui es la única librería de componentes** — no solo tipografía.
   Cubre overlays, navegación, datos, formularios y feedback. Radix UI por
   debajo de forma implícita. Justificación arquitectónica en §0.
3. **Instalación vía CLI exclusivamente** (`npx shadcn@latest init` y
   `npx shadcn@latest add <componente>`). La copia manual queda prohibida.
4. **Borrado completo de los Screens feature** existentes (Inventario, DRP,
   Cuadrante, Vacaciones, etc.) — se reescribirán de cero en Fase B con
   primitivas shadcn y tokens U24. Se conserva temporalmente la lógica de
   `useDrp`, `useInventario`, `useCuadrante` mientras se evalúa caso a caso.
5. Formularios obligatoriamente con `Form` shadcn (RHF + Zod). Ver §14.
6. Iconografía exclusivamente lucide-react. Tabler queda fuera.

**Archivos creados/modificados**:
- `05_interfaz_y_desarrollo/diseño_chupiwachi.md` ← este documento.
- `src/index.css` ← reorden de `@import` (fix warning Vite postcss).

**Pendiente en esta sesión** (Fase A):
- Añadir `baseUrl` y `paths` al `tsconfig.json` raíz (requisito shadcn CLI).
- Borrar `src/components/{flota,operativa,drp,rrhh}/`, `src/components/atoms/`,
  `src/components/auth/EstadoEspera.tsx`.
- Quitar `@tabler/icons-webfont` del `package.json`.
- Borrar el import de `@tabler/icons-webfont` de `src/index.css`.
- Ejecutar `npx shadcn@latest init` y `npx shadcn@latest add` para los
  primitives críticos (button, card, badge, input, label, form, dialog,
  sheet, separator, tooltip, sonner, skeleton, avatar, scroll-area).
- Reescribir `src/index.css` con `@theme` extendido para tokens U24.
- Crear `src/lib/utils.ts` con `cn()` (generado por shadcn init).
- Crear `src/components/theme-provider.tsx` (light/dark).
- Reescribir `App.tsx` con dos estados.
- Reescribir `LoginScreen`, `AppShell`, `BlackColumn`, `Header`.
- Crear `VisualInfoHome`.
- Endurecer `useLoginFlow` para login online obligatorio.
- Verificar con `npm run dev` y `admin/12345678`.
