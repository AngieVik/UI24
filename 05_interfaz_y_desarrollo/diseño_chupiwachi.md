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
| `--col-w` | `52px` | Ancho fijo del `black_column`. |
| `--header-h` | `52px` | Alto del header. |
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

`rules.md §1` impone **`lucide.dev` exclusivamente**. Stroke 2 px. Tamaño base
**18 px** dentro de botones, **20 px** en `black_column`, **16 px** en badges/inline.
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

**Dimensiones**: `w-13` (52 px) · alto: `100vh`.
**Fondo**: `bg-[--u24-black]`.
**Logo**: top 12 px, U24 mark, 26×26 px, color `--u24-yellow`.

**Item normal** (`button`):
```
h-13 w-13 (52×52) · flex items-center justify-center
text-zinc-400 · hover:bg-[--col-hover] hover:text-zinc-50
focus-visible:ring-2 ring-[--u24-yellow] ring-inset
transition-colors duration-fast
```

**Item activo**:
```
text-[--u24-yellow]  · bg-[--col-active]
+ pseudo-elemento ::before
  → barra 3 px de ancho · 28 px alto · centrada vertical · bg-[--u24-yellow]
  → posicionada en left: 0
```

**Sub-item (acordeón expandido)**:
```
h-11 w-13 (52×44) · text-zinc-500
indent visual: el icono se renderiza con un leve fade-in (opacity 0→1)
+ separator entre subgrupos: <hr class="mx-3 my-1 border-zinc-800">
```

**Comportamiento**:
- Un solo subgrupo abierto simultáneamente.
- Click en grupo padre → toggle expand.
- Click en hoja → emite `onSelect(id)`.
- Tooltip on hover (delay 350 ms, side="right"), suprimido en touch.

### 10.2 Header (`src/components/layout/Header.tsx`)

**Dimensiones**: `h-13` (52 px) · `border-b border-border` · `bg-card` ·
sticky top.

**Layout (3 columnas con grid)**:
```
[Logo + tipografía U24]  [marquesina/ticker · animación marquee derecha → izquierda]  [inbox-btn] [back-btn]
   min-w-[140px]           flex-1 overflow-hidden                                     auto auto
```

**Logo lockup**:
- Mark SVG (24 px) color `--u24-yellow`.
- Texto "Control operativo U24" `font-display font-bold text-sm tracking-tight`.

**Ticker**:
- `whitespace-nowrap` · animación `marquee 60s linear infinite`.
- Pausa on `hover` y on `prefers-reduced-motion`.
- Texto `font-display text-sm text-muted-foreground`.

**Botón bandejas**:
- `Inbox` icon · 36 px · variante `ghost icon`.
- Si `unreadCount > 0` → dot amarillo absolute `top-1 right-1` 8 px.
- Tooltip "Bandejas".

**Botón atrás**:
- `ArrowLeft` icon · 36 px · variante `ghost icon`.
- Visible **solo** cuando hay historial (`showBack === true`).
- Tooltip "Atrás".

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

Spec según `mapeo_visual_ui.md §2`. Sub-componentes:

**Estructura**:
```
<div class="grid gap-3 p-3">
  <PanelPersonal />        ← visible si hay checkin_on > 0
  <PanelVehiculo />        ← visible si hay ID_vehiculo del terminal
  <VisualInfoDRP />        ← visible si hay DRP activo asignado
  <BandejaEntradaPersonal/>← siempre visible
</div>
```

**PanelPersonal** (`Card`):
- Header: título "Personal en turno" + Badge `ok` con `UserCheck` y nº de personas.
- Tabla densa con columnas: ID_nombre (avatar + nombre), Estado (badge), Función (badge), Teléfono.

**PanelVehiculo** (`Card`):
- Header: título "Vehículo del terminal" + Badge `info` con estado.
- Lead: ID grande (`text-xl font-bold`) + matrícula (`text-sm muted`).
- Grid 2×2: Pilot / Carry / Servicio / Condición técnica.

**VisualInfoDRP** (`Card`):
- Header: título con `MapPin` icon + nombre DRP + Badge de estado.
- Meta inline: Fecha · Hora · Ubicación (`text-xs muted font-light`).
- Acciones: `CirclePlus` (añadir Doc-1), `DoorOpen` (entrar filiación), `Ambulance` (toggle activo, color amarillo si activo).
- Desplegable de docs (Doc-2/3/4/5/11) como grid de tiles 2 columnas.

**BandejaEntradaPersonal** (`Card`):
- Una pin por cada `checkin_on`. Iniciales encima de icono `Mail`.
- Si hay sin leer → dot rojo arriba a la derecha.

Cuando faltan datos: cada panel se oculta o muestra placeholder "—".
Cuando no hay datos en absoluto → mensaje único:
> "No hay personal en turno ni vehículo asignado. Pulsa Check-in para iniciar."

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
