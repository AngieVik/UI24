---
name: u24-design
description: Use this skill to generate well-branded interfaces and assets for U24 Servicios Sanitarios — a Spanish emergency-medical-services PWA terminal — for production code or throwaway prototypes/mocks/decks. Contains tokens (Barlow + black/yellow), iconography (Tabler), UI kit components (black_column + header + home_area) and content rules (Spanish, sentence case, no emoji, mission-critical medical tone).
user-invocable: true
---

# U24 design skill

Read **`README.md`** for the full system. Then explore as needed:

- `colors_and_type.css` — drop-in CSS variables (`--u24-yellow`,
  `--fg-1`, `--font-cmd`, `--font-body`, semantic colors, sizing,
  radii). Use these tokens; do not invent new ones.
- `assets/` — logo SVGs, maskable PWA icons, corporate illustration.
  Copy any asset you need into the output folder; never hot-link
  cross-project.
- `ui_kits/terminal/` — the reference UI kit. Read `index.html` to
  see how components compose. Reuse component JSX files when
  building screens or mocks; copy them, don't refactor the originals.
- `preview/` — example cards (700px wide) showing each token /
  component in isolation — useful for picking the visual you need.

## Hard rules — never break these

1. **Type:** Only `Barlow Condensed` (UI/commands) + `Barlow`
   (long body). Pesos 300/500/700. `900` solo para alertas
   críticas Doc-11 / rotura de stock.
2. **Casing:** Sentence case. UPPERCASE solo para acrónimos
   (DRP, PSA, ITV, …) y botones destructivos críticos.
3. **Color:** Amarillo `#FFD60A` único acento; negro único `#111111`;
   neutros Zinc. Semánticos rojo/ámbar/verde. **Azul solo enlaces
   y focus ring — prohibido azul decorativo.**
4. **Icons:** Tabler Icons (outline) únicamente. No emoji.
5. **No decoración:** sin gradientes, sin texturas, sin
   `backdrop-blur`, sin shadows coloreadas, sin animaciones
   superfluas.
6. **Language:** Spanish (España). El producto no se localiza.
7. **No invented patterns:** no left-border accent cards, no
   pill-shaped status chips, no marketing voice.

## Si trabajas en…

- **Producción:** copia `colors_and_type.css` a tu proyecto,
  importa Tabler Icons webfont, sigue las reglas de RBAC /
  offline-first del repo upstream `AngieVik/UI24`.
- **Mocks / prototipos / decks HTML:** copia los assets que
  necesites a tu carpeta de output, enlaza
  `colors_and_type.css`, carga Tabler vía CDN, usa Barlow
  desde Google Fonts. Construye HTML estático — no introduzcas
  React si no es necesario.

## Si el usuario invoca esta skill sin contexto

Pregúntale qué quiere construir o diseñar (formulario,
flujo, slide, mock, página de marketing, doc clínico), pide
detalles sobre el rol del usuario (TES, coordinación, gerencia…),
si necesita estado_0 o estado_1, mobile (<640px) o monitor de
coordinación, light o dark mode. Después actúa como diseñador
experto de U24 y produce HTML artefactos o código de producción
según corresponda.

## Source repos

- `AngieVik/UI24` — fuente original. Lectura obligatoria para
  cualquier trabajo serio.
