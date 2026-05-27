# SISTEMA DE DISEÑO Y COMPONENTES VISUALES - U24 (SSOT)

> **Documento maestro del sistema de diseño implementado en `src/`.**
> Única fuente de verdad para la estética, paletas, tipografía, primitivas visuales, estados vacíos y accesibilidad de U24 Servicios Sanitarios.

## 1. Directiva Estética y Sistema de Componentes (shadcn/ui)

Toda primitiva interactiva debe provenir de **shadcn/ui**, apoyada en Radix UI y Tailwind v4. El tono es clínico, profesional y de misión crítica. La consistencia es inquebrantable.

* **Densidad sobre adorno:** Filas compactas (32–36 px), padding mínimo. Prohibidos los espacios arbitrarios.
* **Monocromo + Acento:** Interfaz basada en grises (escala Zinc) con el amarillo (`#FFD60A`) reservado exclusivamente para: Logo, Focus rings, Barra indicadora activa en navegación, Badge Pilot y el `home_area` raíz.
* **Uso del Rojo:** Exclusivo para estados destructivos y alarmas críticas (Doc-11, Roturas de stock 0).
* **Ausencia de Azul:** El azul está prohibido como decorador. Solo se admite temporalmente en focus rings de accesibilidad extrema.

## 2. Sistema de Espaciado y Diseño Adaptativo (Layout)

El espacio es un recurso crítico en pantallas móviles de ambulancias.

* **Regla minimalista:** Minimizar `gap`, márgenes y paddings. Preferible una fila compacta (`text-xs p-1`) a columnas desproporcionadas.
* **Granularidad de breakpoints:** Base (`<640px`), `sm` (`640px+`), `md` (`768px+`), `lg` (`1024px+`), `xl` (`1280px+`), `2xl` (`1536px+`).
* **Adaptabilidad algorítmica (Fluid design):** Uso de `clamp()` en Tailwind para anchos y tipografías. Estilo base uniforme desde móvil a monitor.
* **Cambio estructural justificado:** Prohibidos rediseños puramente estéticos. El layout solo muta por limitación física (ej. colapsar una tabla masiva en tarjetas en base).

## 3.1 Tokens Tipográficos, Casing y Escala de tamaños

* **Casing (Sentence Case estricto):** "Primera letra mayúscula, resto minúscula". Las MAYÚSCULAS sostenidas son exclusivas para acrónimos (DRP, PSA) o botones destructivos ("ELIMINAR"). Identificadores internos (`id_nombre`) van en minúscula. Nomenclatura de docs es `Doc-N`.
* **Familia Única (Barlow):**
  * `Barlow Condensed` (UI de mando): Navegación, `black_column`, etiquetas de campo, badges, ticker, matrículas, nombres.
  * `Barlow` Regular (Cuerpos): Formularios, descripciones > 2 líneas.
* **Pesos Permitidos:** `300` (Metadatos/horas), `500` (Cuerpos), `700` (Etiquetas/Navegación), `900` (EXCLUSIVO alertas críticas y Doc-11).

Una sola escala, con `clamp()` para fluid design.

| Token | clamp() | Uso |
| --- | --- | --- |
| `--text-xs` | `clamp(0.6875rem, 0.66rem + 0.15vw, 0.75rem)` (11–12 px) | Meta, tooltips, microtexto. |
| `--text-sm` | `clamp(0.8125rem, 0.78rem + 0.15vw, 0.875rem)` (13–14 px) | Tablas densas, etiquetas de input, ticker. |
| `--text-base` | `clamp(0.9375rem, 0.9rem + 0.2vw, 1rem)` (15–16 px) | Cuerpo por defecto. |
| `--text-lg` | `clamp(1.0625rem, 1rem + 0.3vw, 1.125rem)` (17–18 px) | Títulos de card. |
| `--text-xl` | `clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem)` (20–24 px) | Títulos de pantalla. |
| `--text-2xl` | `clamp(1.5rem, 1.3rem + 0.8vw, 2rem)` (24–32 px) | Único caso — Doc-11 modal y pantallas de emergencia. |

## 4. Tokens de Color (Light / Dark)

Configuración adaptativa para Tailwind v4 (`@theme`).

* **Amarillo U24:** `--u24-yellow` `#FFD60A` (Único amarillo autorizado).
* **Amarillo Suave:** `--u24-yellow-soft` `#FFF5B8` (Fondo warning).
* **Negro Base:** `--u24-black` `#111111` (Para `black_column`, headers, botones primarios).
* **Rojo Destructivo:** `--u24-red` `#DC2626`.
* **Escala Neutra:** Uso estricto de Zinc (`zinc-50` al `zinc-950`). Se incluye token `--zinc-150: #ECECEE` para separaciones de superficies claras..
* **Badges Semánticos (WCAG AA):** Todos los badges operativos incluyen icono obligatoriamente por accesibilidad daltónica (C-04).
    **Operativo / OK:** `bg-green-100 text-green-800` (Icono `Check`).
    **Advertencia / Pendiente:** `bg-amber-50 text-amber-800` (Icono `AlertTriangle` - OJO: usar amber-800 o amber-700, NUNCA amber-600 por fallo de contraste WCAG).
    **Error / Crítico:** `bg-red-50 text-red-800` (Icono `AlertCircle`).
    **Inactivo / Archivado / Info:** `bg-gray-100 text-gray-700` (Icono `CircleOff` o `Info`). Reemplaza cualquier uso previo de azul.
    **Revaluación (Filiación):** `bg-amber-100 text-amber-700` "Revaluación".
    **DRP En Preparación:** `bg-[#FFF5B8] text-amber-800`.

## 5. Layout Base (Chasis)

* **`black_column`:** `w-[60px]` colapsada, `w-[220px]` expandida. Fondo `--u24-black`.
* **Header:** `h-[60px]`. Fondo `--u24-black`. Contiene Logo 44px interactivo (`goHome`), Ticker/Marquesina central y bandeja derecha.
* **Z-Index Mapeo:** `z-0` (base), `z-20` (popovers), `z-30` (Banner offline), `z-40` (Header), `z-60` (Modales shadcn), `z-99` (Alarma Doc-11).

## 6. Iconografía (Lucide.dev exclusivamente)

Stroke de 2px uniforme. Sin rellenos (outline).

* **Tamaño principal** (Nav/Header): `size-7` (28px).
* **Tamaño sub-menús:** `size-6` (24px).
* **Iconos inline/badges:** `size-5` (20px).
Mapeo autorizado: `Home`, `LogIn`, `Ambulance`, `FileText`, `Package`, `ClipboardList`, `MapPin`, `Activity`, `ListChecks` (Inventario), `CirclePlus` (Crear), etc. (Prohibido Tabler o Emojis).

## 7. Componentes de Chasis Estructural

### 7.1 LoadingSkeleton (U-02)

Solo se emplea en: Boot inicial de la app (rehidratación de IndexedDB), pull-to-refresh explícito o cargas sin caché local (TanStack Query isLoading). **Prohibido usarlo en lecturas de Zustand/IDB** para no degradar la percepción de instantaneidad.

```tsx
<LoadingSkeleton variant="page" />
<LoadingSkeleton variant="card" rows={3} />
<LoadingSkeleton variant="row" columns={4} />
```

### 7.2 BannerOffline (U-03)

Estado global persistente, inyectado bajo el header en el Main. No bloquea flujos operables offline.

* **Visual:** bg-amber-50 border-b border-amber-300 text-amber-800. Icono WifiOff.
* **Mensaje:** "⚠️ Sin conexión · Última sincronización: hace X min · Los partes de trabajo siguen disponibles."
* **Comportamiento de Sincronización:** Muestra "Sincronizando datos... (X pendientes)" con spinner durante el vaciado de cola.

## 8. Patrones Universales

* **Formularios:** Uso estricto de <Form> (React Hook Form) + validación Zod. Error abajo (text-xs text-destructive).
* **Tablas Densas:** <Table> shadcn, hover bg-muted/50, selected bg-u24-yellow-soft.
* **Modales:** focus-trap obligatorio. Botones agrupados: Secundario izquierda, Primario derecha.
* **Atajos Teclado Coordinación (C-05):** Habilitados solo para gerencia/coordinacion en Desktop (pointer: fine). Se utiliza Alt + Tecla (ej. Alt+D Visor DRP, Alt+B Bandejas).

## 9. Accesibilidad (A11y)

* **ARIA labels** explícitos en botones iconográficos sin texto.
* **Contraste estricto AA.**
* **Soporte a prefers-reduced-motion** reduciendo animaciones a 0ms.
* **A11y Daltónica (C-04):** Todos los badges semánticos operativos deben incluir el icono Lucide correspondiente (ej. Check, TriangleAlert, CircleOff) junto al texto.
