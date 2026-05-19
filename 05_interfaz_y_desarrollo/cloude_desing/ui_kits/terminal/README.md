# Terminal UI kit · U24

Recreación de alta fidelidad del **terminal_index** de U24 — la pantalla
maestra montada en bases y ambulancias. Estructurada como una app React
pequeña (sin build) que carga JSX vía Babel en el navegador.

## Estructura

```
terminal/
├── index.html         # Bootstraps React + Babel, monta <App />
├── kit.css            # Estilos del kit (importa colors_and_type.css)
├── App.jsx            # Layout principal + estado + navegación
├── BlackColumn.jsx    # Sidebar 52 px con NAV + acordeón
├── Header.jsx         # Cabecera negra con ticker + bandejas + back
├── VisualInfoHome.jsx # Contenido por defecto del home_area
├── Screens.jsx        # TerminalCheck, VistaVehiculos, VisorDRP
├── Modal.jsx          # Modal base + Doc2Modal + AddDoc1Modal
└── Atoms.jsx          # Btn / Badge / Field / Toggle / KV / Avatar
```

## Cómo navegarlo

1. Abre `index.html` directamente — sin dependencias.
2. El estado por defecto es **estado_1** (terminal desbloqueado, home).
3. Sidebar: pulsa `ti-ambulance` para abrir el acordeón Operativa
   rutinaria; entra a **Vehículos** (`ti-steering-wheel`) para ver la
   `vista_vehiculos` recreada.
4. Pulsa `ti-map-pin` → **Visor DRP** para la lista de DRP activos.
5. Desde el Home, pulsa el botón `ti-circle-plus` dentro del bloque
   DRP para abrir el modal **Añadir asistencia Doc-1** (modal ligero).
6. Pulsa el documento Doc-2 dentro de la operativa DRP para abrir el
   formulario Doc-2 como modal pesado.
7. Botón candado abajo-derecha → simula salir del terminal (estado_0,
   formulario `terminal_check`). Usa `wifi-off` para alternar el
   banner offline.

## Cobertura vs original

| Vista | Recreada | Notas |
|---|---|---|
| `estado_0` · terminal_check | ✓ | Formulario centrado en `bg-panel` |
| `estado_1` · visual_info_home | ✓ | Panel personal, panel vehículo, visual_info_drp, bandeja personal |
| `terminal_check` (check-in dentro del flujo) | ✓ | Mismo formulario, reutilizado in-place |
| `vista_vehiculos` (item 3.10) | ✓ | Lista de flota + selector_estados_ID_vehiculo expandido |
| `visor_drp` | ✓ | Tarjetas DRP expandibles + sección finalizados últimos 48h |
| `doc-2 modal` | ✓ | Como overlay sobre home_area |
| `Añadir asistencia Doc-1` modal-ligero | ✓ | Formulario compacto |
| Banner offline | ✓ | Toggle dev en esquina inferior |
| Marcador para resto del NAV | ✓ | `Placeholder` muestra qué falta |

## Lo que NO está recreado

- Pantallas placeholder para todo el resto del NAV (Doc-6, Doc-7,
  Doc-8, Doc-9, Doc-10, Doc-12, módulo PSA, módulo filiación,
  Mantenimiento de flota, Catálogo, Inventario maestro, RBAC roles,
  Token emergencia, Cuadrante de turnos, Fichas empleados, Tablón,
  Buzón interno, Bajas, Repositorio documentos…). Ver
  `mapeo_visual_ui.md` en el repo upstream para el contrato visual de
  cada una.
- Comportamiento real offline-first (cola en IndexedDB, replay, etc.).
- RLS, RBAC dinámico, JWT claims.
- Tooltips al hover sobre iconos `black_column` (omitidos para mantener
  el kit ligero — el `aria-label` sí está).

## Reutilizar componentes

Cada `.jsx` está pensado para copiar/pegar:

- `<BlackColumn active openGroup onSelect onToggleGroup />` — pasa una
  lista propia vía `window.NAV` si necesitas variantes RBAC.
- `<Header showBack onBack ticker unreadFleet unreadCoord />`.
- `<Modal open title onClose footer light>{children}</Modal>` — base
  para tus propios modales (Doc-2 / Doc-7 / Doc-10).
- `<Badge tone="ok|warn|crit|info|neutral" bold>...</Badge>`.
- `<Btn tone="primary|ghost|yellow|destructive">...</Btn>`.
- `<Field label error>...</Field>` — envoltorio estándar de formulario.

Todos los componentes son visualmente fieles pero **no incluyen** la
lógica de stores, persistencia ni RLS del original.
