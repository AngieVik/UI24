# U24 Design System

> Sistema de diseño para **U24 Servicios Sanitarios** — una aplicación
> operativa de misión crítica para servicios de emergencias médicas
> (ambulancias, dispositivos de riesgo previsible / DRP, logística de
> material sanitario, gestión de flota y RRHH).

Esta carpeta es la fuente de verdad visual: tokens, tipografía, iconografía,
componentes y un mini UI kit replicando los flujos clave de la app.

---

## Producto en una frase

U24 es un **terminal sanitario PWA offline-first** instalado en tablets
fijadas a ambulancias y en monitores de coordinación. Permite a TES,
DUE, médicos, coordinación, logística, flota, RRHH y gerencia gestionar
turnos (check-in / check-out), partes de trabajo (Doc-8), asistencias
clínicas (Doc-1, Doc-2…), dispositivos de riesgo previsible (DRP),
inventario, mantenimiento de flota, RBAC y comunicación interna —
todo dentro de la misma interfaz monolítica de un solo terminal.

> El tono de la aplicación es **médico, profesional y de misión crítica**.
> Se prohíben las jerarquías visuales desordenadas o tamaños arbitrarios.

## Fuentes y referencias

- **GitHub** — [`AngieVik/UI24`](https://github.com/AngieVik/UI24) ·
  arquitectura, reglas, núcleos de negocio, mapeo visual UI, componentes,
  hooks y manejo de errores. Lectura obligatoria para construir nada
  ambicioso encima de este sistema.
- **Logos y maskable icons** — recibidos directamente del usuario, copiados
  bajo `assets/`.
- **Ilustración corporativa** — `assets/u24-illustration.png` (vertical
  con caduceos + estrella de la vida).

Si vas a construir algo nuevo: clona o navega el repo de GitHub para tener
los `.md` completos de `01_arquitectura_y_reglas/`, `03_nucleos_de_negocio/`
y `05_interfaz_y_desarrollo/` — ahí están las reglas semánticas que esta
carpeta no repite.

---

## Índice del sistema

| Archivo / carpeta        | Qué contiene                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `README.md`              | Este documento.                                                                       |
| `SKILL.md`               | Agent Skill cross-compatible — invocable como skill de Claude Code.                  |
| `colors_and_type.css`    | Variables CSS de color, tipografía, espaciado, radios y elevación.                  |
| `assets/`                | Logotipo, marca, maskable icons en todas las resoluciones, ilustración.              |
| `preview/`               | Tarjetas HTML (≈700×height) que pueblan la pestaña Design System.                   |
| `ui_kits/terminal/`      | UI kit principal — recreación del terminal (estado_0 y estado_1).                   |
| `slides/`                | (no incluido — no se entregaron plantillas de slides).                              |

---

## Productos representados

U24 tiene **un único surface principal**: el `terminal_index` —
la pantalla maestra montada en cada base y en cada ambulancia.
Dentro conviven varios **núcleos de negocio** que comparten layout
(black_column + header + home_area amarilla):

- **Operativa rutinaria** — Doc-2, Doc-6, Doc-8, Doc-10, Doc-11,
  repostajes, Checklist360, vehículos.
- **DRP (Dispositivos de Riesgo Previsible)** — visor, resumen,
  creación, logística DRP, módulos PSA y filiación.
- **Logística y almacén** — inventario maestro, catálogo de 245 ítems,
  Doc-9, descuadres, bandeja logística.
- **Flota y taller** — incidencias, Doc-7, metadata vehículo,
  mantenimiento, historial eventos físicos.
- **Coordinación y seguridad** — token de emergencia, RBAC roles,
  bandeja coordinación.
- **Gestión y RRHH** — fichas empleados, turnos, tablón, marquesina,
  Doc-12 vacaciones, bajas, bandeja RRHH.
- **Tablón central** + **Buzón interno** (Doc-13).

Por eso el UI kit del proyecto es **uno solo** (`ui_kits/terminal/`).
No hay marketing site ni docs — esto no es Stripe; es un panel
operativo cerrado para personal autenticado.

---

## CONTENT FUNDAMENTALS

### Idioma
Español de España. Sin localización a otros idiomas. La interfaz asume
personal sanitario español, normativa autonómica y vocabulario propio
del sector (ITV, SVAE, DRP, PSA, filiación, dotación, pilot, carry,
backpack, base, ruta, alerta, en espera, estacionado).

### Tono
**Médico, profesional, de misión crítica.** No hay marketing voice ni
copy entusiasta. Cada palabra tiene función operativa.

- Imperativos cortos: `Confirmar recepción`, `Marcar solucionada`,
  `Salir del DRP`, `Cancelar DRP`.
- Estados literales: `En espera`, `En preparación`, `En curso`,
  `Finalizado`, `Archivado`.
- Etiquetas de campo terminadas en dos puntos: `Pilot:`, `Carry:`,
  `Estado:`, `km_fin:`.
- Avisos en lenguaje plano, no eufemístico: `"El vehículo ya se
  encuentra desplegado en otro dispositivo activo."`,
  `"No hay vehículos disponibles (todos están en DRP en curso o
  inoperativos)."`.

### Casing — sentence case estricto
> "Primera letra mayúscula, resto minúscula" (ej. *Operativa rutinaria*,
> *En ruta*, *Control operativo U24*).

Excepciones permitidas únicamente:

1. **Acrónimos** — DRP, PSA, ITV, UTC, RBAC, RRHH, SVAE, TES, DUE,
   AdBlue, JWT, RLS.
2. **Botones destructivos críticos** — `ELIMINAR REGISTRO`,
   `BORRAR DRP`.
3. **Códigos de documento** — Doc-1, Doc-2, Doc-8, Doc-Checklist360
   (guion y mayúscula tras él se conservan).

### Persona
Trato neutro, **no tutea ni vosea**. La interfaz no dice "tu vehículo"
ni "tus turnos"; dice "Vehículo asignado", "Turno activo", "Tu Doc-8" →
"Doc-8 del turno". No hay primera persona ("tu", "mi") ni segunda
persona explícita. El sujeto suele omitirse al estilo notarial.

### Emoji
**Prohibido.** En toda la app no se usa ni un emoji. Los emojis indican
ausencia de iconografía formal — U24 usa Tabler Icons exclusivamente.

### Vibe
Ambulancia + sala de control. La interfaz se siente más cerca de un
panel de FlightAware o un terminal de Bloomberg que de una app SaaS
moderna. Densa, tabular, sin animaciones decorativas, alto contraste,
ergonómica para tablet montada en cabina con guantes.

### Ejemplos canónicos de copy

| Contexto | Texto |
|---|---|
| Banner offline | "Sin conexión · Última sincronización: hace 12 min. Los partes de trabajo y registros clínicos siguen disponibles." |
| Modal confirmación DRP | "Este vehículo ya está asignado al DRP [nombre_drp] en preparación. ¿Confirmar asignación a este nuevo DRP también?" |
| Estado paciente | "Paciente en revaluación — timestamp de admisión original preservado" |
| Vacío de lista | "No hay DRP activos en este momento." |
| Aviso al destinatario | "Aviso: el DRP no ha sido activado. Contactar con coordinación." |

---

## VISUAL FOUNDATIONS

### Colores
- **Amarillo vivo** `#FFD60A` — **único** amarillo del sistema; sin
  tonos cálidos ni mostazas. Borde activo del `black_column`, fondo del
  `home_area`, indicador de mensajes sin leer, fondo del botón "Activar
  DRP". Siempre comunica acción o estado activo, nunca decoración.
- **Negro único** `#111111` para el header **y** la `black_column` —
  mismo tono, sin contraste artificial entre las dos zonas. Sin
  gradientes, sin texturas.
- **Rojo de hover** `#DC2626` — el rojo crítico se reutiliza como
  estado `:hover` de cualquier superficie amarilla (botones de acento,
  toggles activos, iconos `ti-mail` con dot amarillo). Refuerza el
  vocabulario emergencias.
- **Blanco detalle** `#FFFFFF` — texto sobre negro, separadores 1 px,
  knob del toggle, contornos finos. Nunca usado como fondo de
  superficie (eso es `bg-app` / `bg-panel`).
- **Escala neutra** Zinc/Gray de Tailwind (gray-50 → gray-900). Las
  superficies de contenido viven sobre blanco o gris muy claro.
- **Semántica estricta**: rojo (crítico/destructivo), ámbar
  (advertencia), verde (éxito/OK), azul **solo para enlaces y focus
  rings** — prohibido azul decorativo.
- Light mode por defecto + dark mode soportado vía variables CSS.

### Tipografía
- Familia **Barlow** únicamente, en dos cortes:
  - `Barlow Condensed` — UI de mando: navegación, etiquetas, IDs,
    matrículas, badges, ticker, alertas.
  - `Barlow` (regular) — formularios largos, descripciones, bloques
    de texto >2 líneas.
- Pesos permitidos: `300 / 500 / 700 / 900`. El 900 es **exclusivo**
  para alertas Doc-11 y rotura de stock.

> **Substitución detectada:** las hojas tipográficas usan los webfonts
> oficiales de Google Fonts vía `@import url(...)`. **No se han copiado
> archivos `.ttf` locales** porque el sistema referencia Google Fonts
> directamente en producción y en el repo. Si necesitas funcionar
> totalmente offline sin Google Fonts, descarga Barlow + Barlow
> Condensed desde Google Fonts y colócalos en `fonts/`. **(Acción
> sugerida al usuario.)**

### Espaciado
Regla minimalista. `gap-1`/`p-2` por defecto en tarjetas de seguimiento;
en formularios `p-3`/`gap-3`. Espaciado escalado en pasos de 4px
(`--sp-1`=4, `--sp-2`=8, …). Nunca paddings desproporcionados — una fila
compacta con `text-xs p-1` es preferible a una columna con botones
gigantes. La granularidad de breakpoints es Tailwind estándar (base, sm,
md, lg, xl, 2xl).

### Layout fijo
- `black_column` — **52px de ancho fijo**, fondo `#111111`. Logo arriba,
  iconos Tabler outline, sin etiquetas, tooltip al hover. Indicador
  activo = barra vertical amarilla 3px en el borde izquierdo.
- `header` — 52px de alto, fondo negro, marquesina/ticker en el centro,
  bandejas + botón de atrás a la derecha.
- `home_area` — fondo amarillo `#FFD60A`. Reemplazado por contenido
  blanco al entrar a un módulo (los formularios viven en `bg-white`/
  `bg-gray-50` dentro del home_area).

### Backgrounds
**Sin patrones, sin texturas, sin imágenes de fondo, sin gradientes.**
La densidad informativa es el principal medio expresivo. La única zona
con color de marca es la `home_area` (amarillo plano).

### Animación
Mínima. Solo:
- `ti-loader` con `animate-spin` para fetches activos.
- Pulso/highlight breve (2s, verde) al recibir coordenadas nuevas.
- Acordeón vertical de la `black_column` — expansión/contracción
  simple, sin overshoot ni bounce.
- Banner offline cambia texto entre "Sin conexión" y "Sincronizando
  datos…" cuando aplica.

**No hay fades, slides, parallax, ni transiciones decorativas.**
Cualquier cambio de estado es inmediato.

### Hover / Press
- Hover: oscurecer fondo (gray-800 sobre botón negro; bg-muted sobre
  fila), nunca cambiar de color de marca.
- Press: sin transform/scale. La retroalimentación es por cambio de
  fondo y `:focus-visible` ring azul.
- Botones primarios: `bg-black text-white` → `bg-gray-800 text-white`
  en hover.
- Botones destructivos: `bg-red-600 text-white` → `bg-red-700` en
  hover, **uppercase**.
- Items de `black_column`: hover = `#1a1a1a`; active (con contenido en
  home_area) = `#222222` con barra amarilla 3px izquierda.

### Bordes y radios
Conservadores. `--r-md = 6px` por defecto (estilo shadcn base). Los
formularios y tarjetas tienen 1px borde `gray-200`. **Sin bordes
gruesos decorativos.** Los badges usan radios `r-sm` (4px), no pills
redondeados — son etiquetas de estado, no chips de marketing.

> **Anti-patrón prohibido** (visto en otros sistemas): tarjetas con
> borde izquierdo coloreado de 4px tipo "color accent". U24 jamás usa
> ese patrón. Las tarjetas tienen borde uniforme 1px en todos los lados.

### Shadows
Mínimas. `--shadow-1` para tarjetas hover, `--shadow-2` para dropdowns,
`--shadow-modal` para modales superpuestos. **Sin neumorfismo, sin
glow, sin shadows coloreadas.**

### Transparencia y blur
Solo en el overlay de modales (`rgba(0,0,0,.40)` sin backdrop-blur).
**No se usa `backdrop-filter: blur(...)` en ningún componente** — es
costoso en tablets de gama media y el sistema prioriza FPS estable
sobre estética.

### Iconografía de imágenes
La única "imagen" del sistema es el logotipo. **Cero fotografía,
cero ilustración decorativa.** La ilustración corporativa
(`assets/u24-illustration.png`) existe pero se reserva a contextos
externos (splash de instalación PWA, store listings, materiales
impresos) — **no aparece dentro de la app**.

### Corner radii — resumen rápido
| Elemento | Radius |
|---|---|
| Tarjeta | 6px |
| Input / button | 6px |
| Badge | 4px |
| Avatar / icono mail con iniciales | redondeado (50%) |
| Modal | 8px |
| Indicador activo (barra lateral) | 0px (cuadrado) |

### Tarjetas — anatomía
- `border: 1px solid var(--border-1)`
- `border-radius: 6px`
- `padding: 12px` (compactas) ó `16px` (formularios)
- `background: white` (light) / `zinc-900` (dark)
- `shadow: ninguna` por defecto; `--shadow-1` al hover si es
  interactiva.
- Cabecera de tarjeta: `Barlow Condensed 700 text-sm`.

---

## ICONOGRAPHY

### Sistema único — Tabler Icons (outline)
La app usa **Tabler Icons** vía clases CSS (`ti-home`, `ti-ambulance`,
`ti-clipboard-list`, …). Variant outline, peso uniforme. No se mezcla
con ningún otro set.

- En la web/app: se carga vía la fuente de iconos de Tabler
  (`@tabler/icons-webfont` o el CDN equivalente).
- En estas previews y UI kits: usamos el CDN de Tabler Icons Webfont
  para fidelidad visual sin descargar el set entero al repo:
  ```html
  <link rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.34.0/dist/tabler-icons.min.css">
  ```
  Sustitución **no requerida** — Tabler Icons es la librería real
  declarada en `black_column.md`.

### Inventario de iconos canónicos (black_column → submenús)
`ti-home`, `ti-login`, `ti-ambulance`, `ti-file-text`, `ti-package`,
`ti-clipboard-list`, `ti-heart-rate-monitor`, `ti-alert-triangle`,
`ti-gas-station`, `ti-droplet`, `ti-checkbox`, `ti-steering-wheel`,
`ti-map-pin`, `ti-activity`, `ti-selector`, `ti-chart-bar`,
`ti-circle-plus`, `ti-toggle-left`, `ti-puzzle`, `ti-first-aid-kit`,
`ti-forms`, `ti-building-warehouse`, `ti-list-details`,
`ti-truck-delivery`, `ti-transfer`, `ti-truck`, `ti-alert-circle`,
`ti-tags`, `ti-inbox`, `ti-car`, `ti-tool`, `ti-engine`, `ti-id`,
`ti-tool-2`, `ti-history`, `ti-shield-lock`, `ti-cookie`, `ti-users`,
`ti-id-badge`, `ti-user-circle`, `ti-calendar-event`, `ti-news`,
`ti-antenna`, `ti-beach`, `ti-folder-open`, `ti-calendar-x`,
`ti-speakerphone`, `ti-message-report`, `ti-arrow-left`, `ti-x`,
`ti-mail`, `ti-door-enter`, `ti-loader`, `ti-copy`, `ti-check`,
`ti-wifi-off`, `ti-refresh`, `ti-download`, `ti-chevron-down`.

### Tamaños
| Contexto | Tamaño |
|---|---|
| Iconos `black_column` | 22–24px |
| Iconos inline en texto | 1em |
| Iconos en badges | 14px |
| Iconos de acción primaria (botón) | 16px |
| Iconos de feedback de coordenadas (success/copy) | 14px |

### Logos y marca
- `assets/u24-logo-mark.svg` — la marca limpia (1 color, escalable).
  Aparece arriba del `black_column` en `#FFD60A`.
- `assets/u24-logotype-vertical.svg` — el logotipo institucional
  completo (U + "Servicios Sanitarios" + estrella de la vida +
  caduceos). Para portadas, splash, materiales impresos.
- `assets/u24-app-icon.png` — icono PWA maskable (full resolution).
- `assets/icon-{48,96,192,512}.png` — maskable icons exportados,
  vinculados desde `manifest.webmanifest`.
- `assets/u24-illustration.png` — ilustración corporativa decorativa
  (no aparece dentro de la app, ver Visual Foundations).

### Emoji y unicode como iconos
**No usados.** Cualquier emoji en copy debe considerarse un bug.
Los caracteres especiales (·, →, —) sí se usan como puntuación
tipográfica, pero nunca como sustitutos de iconos.

---

## Caveats y siguientes pasos

- **Fuentes locales:** este sistema referencia Google Fonts vía
  `@import`. Si quieres servir Barlow/Barlow Condensed desde tu propio
  servidor (modo air-gapped o evitar tracking), descárgalas y enlázalas
  desde `fonts/`.
- **Componentes shadcn/ui no replicados al 100%:** las recreaciones
  del UI kit son cosméticas (HTML/CSS estático) — no incluyen
  accesibilidad completa (focus-trap en modales, ARIA dinámico) ni
  toda la API de shadcn. Sirven como referencia visual fiel.
- **Datos:** todos los datos mostrados (matrículas, nombres, DRPs)
  son ficticios pero realistas — no copiar a producción.
- **Slides:** no se entregó plantilla de slides; `slides/` no existe.

Lectura recomendada para profundizar:

- [`AngieVik/UI24`](https://github.com/AngieVik/UI24) — repo completo.
- `01_arquitectura_y_reglas/rules.md` — la sección tipográfica y
  cromática es la canónica.
- `05_interfaz_y_desarrollo/mapeo_visual_ui.md` — qué renderiza dónde
  cuando el usuario navega.
- `05_interfaz_y_desarrollo/componentes.md` — paleta WCAG verificada y
  componentes compartidos (banner offline, skeletons, flujos_transicion).
- `05_interfaz_y_desarrollo/black_column.md` — anatomía de la barra
  lateral.
