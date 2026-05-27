# 05_interfaz_y_desarrollo/black_column.md

# ANATOMÍA MECÁNICA DEL COMPONENTE: BLACK_COLUMN

> Este documento detalla la estructura física e interacciones del componente de navegación principal `<BlackColumn />`.
> **La jerarquía exacta de módulos (Árbol) reside en `mapeo_visual_ui.md` Sección 4.**

## 1. Dimensiones y Geometría

* **Ancho Colapsado (`--col-w`):** `52px`. (Mostrando exclusivamente el rail de iconos para maximizar espacio).
* **Ancho Expandido (`--col-w-expanded`):** `220px`. (Mostrando iconos, etiquetas truncadas y chevrons).
* **Layout vertical:** La columna cubre todo el alto disponible debajo del `header`. Implementada mediante `flex-col`. Fondo `--u24-black` inmutable (#111111).

## 2. Motor de Navegación: Drill-Down Puro

El sistema rechaza acordeones múltiples. Emplea navegación de sustitución (Max 3 niveles: Raíz -> Grupo -> Ítem).

* **Interacción de Profundización (Hijos reemplazan a padres):** Al hacer clic sobre un *Grupo* (ej. *Logística y almacén*), la lista base desaparece (`duration-200 ease-out`) y es reemplazada visualmente por los sub-ítems de ese grupo.
* **Encabezado de Nivel (Padre Activo):** Dentro de un grupo, el primer ítem anclado arriba actúa como encabezado representativo. Se pinta con fondo `--u24-column-active` y la barra amarilla lateral. Hacer clic en este encabezado retrocede al nivel anterior.
* **Selección de Hoja (Auto-colapso):** Al hacer clic en una ruta terminal (hoja funcional, ej. *Doc-10*), el contenido renderiza en el `home_area`. Si la columna estaba expandida a 220px, se **auto-contrae** a 52px para despejar el área de trabajo táctil.

## 3. Disposición de Botones Periféricos

### 3.1 Hojas Fijas (Top)

* Elementos como `Check-in / Check-out` residen en la zona superior de la columna, anclados y separados por un `separator` visual del resto del menú dinámico.

### 3.2 Botones Inferiores (Anclaje al fondo)

* **Toggle Expand/Collapse:** Botón anclado rígidamente en la base absoluta de la columna. Posición inmutable. Alterna 52px <-> 220px.
* **Botón Atrás (Contextual):** Aparece como el **penúltimo botón** (justo encima del Toggle) y aparece/desaparece dinámicamente si el historial interno del Drill-down permite retroceder. No desplaza al Toggle inferior.

## 4. Anatomía del NavRow

El elemento `<button>` base de la lista:

* **Rail Icono:** Contenedor de `w-[52px]` exacto (alineado al estado colapsado para evitar temblores).
* **Etiqueta Texto:** Visible solo si `expanded === true`. `Barlow Condensed`, `font-bold`, truncado (`truncate`).
* **Chevrons:** Indicador `ChevronRight` si el nodo tiene hijos.
* **Indicador Activo:** Barra vertical amarilla (`--u24-yellow`) de `3px` de grosor, anclada a `left-0`.
* **Tooltip:** Controlado por Radix UI/shadcn. Aparece solo si `expanded === false` mostrando el texto completo.
