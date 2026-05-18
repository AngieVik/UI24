# nucleo_operativa_rutinaria

* RBAC: `tes`, `logistica`, `flota`, `coordinación`, `gerencia`.

* **vista_vehiculos** *(acceso: `black_column → Operativa rutinaria → Vehículos`, ítem 3.10)*

  Vista combinada in-place. Dos zonas en pantalla:

  **Zona superior — `selector_vehiculos`:**
  * Lista completa de la flota con `ID_vehiculo`, `Matrícula`,
    badge `estado_operativo` y badge `condicion_tecnica`.
  * Actualización en tiempo real vía Supabase Realtime.
  * Cualquier rol autorizado puede ver el estado de todos los vehículos.
  * Al pulsar una fila → expande la Zona inferior para ese vehículo.
  * `condicion_tecnica` como badge secundario junto a cada fila:
    * `averiado_leve` → badge amarillo; no bloquea la activación.
    * `inoperativo_critico` → badge rojo; la activación requiere confirmación
      explícita de `gerencia` o `coordinación`.

  > **Nota de layout:** `selector_vehiculos` ya no forma parte de
  > `visual_info_home`. El home raíz muestra únicamente `panel_personal`,
  > `panel_vehiculo` (vehículo activo), `visual_info_drp` y bandejas.
  > Ver `mapeo_visual_ui.md §2`.

* **selector_estados_ID_vehiculo** *(Zona inferior de `vista_vehiculos`)*

  El vehículo tiene dos dimensiones de estado independientes
  (ver `estados.md §4`). El selector expone ambas.

  * **Dimensión 1 — `estado_operativo`** (selector principal):
    * `desactivado`: sin turno activo, sin Doc-8. Solo alcanzable por acción
      manual explícita. El checkout del pilot **NO** produce este estado.
    * `en_espera`: vehículo operativo y disponible, sin servicio activo ni movimiento.
      No requiere pilot para mantenerse en este estado.
      Con pilot asignado: Doc-8 activo. Sin pilot (tras checkout): sin Doc-8.
      Carries pueden permanecer emparejados.
    * `activado`: servicio activo despachado (`tipo_servicio` asignado).
    * `ruta`: en tránsito. Captura GPS al iniciar y al finalizar.
    * `estacionado`: parado fuera de base. Captura GPS al activar.
    * `alerta`: respuesta a emergencia activa (luces/sirenas). Captura GPS
      al activar y al desactivar.

  * **Dimensión 2 — `condicion_tecnica`** (badge secundario, no selector manual):
    * `operativo`: sin incidencias.
    * `averiado_leve`: incidencia leve/moderada (Doc-7). Badge informativo amarillo.
    * `inoperativo_critico`: fallo grave (Doc-7). Badge rojo. Activación
      requiere confirmación explícita de `gerencia` o `coordinación`.

  * **Flujo de activación** (`desactivado → en_espera`):
    1. Modal: "¿Activar `ID_vehiculo`?" — Sí | No.
    2. Si `condicion_tecnica = inoperativo_critico`: advertencia
       bloqueante adicional. Requiere confirmación de rol autorizado.
    3. Solicita `km_inicio` (obligatorio).
    4. El sistema muestra los ID_nombre con `checkin_on` en ese terminal.
       Asignación manual de roles:
       * `Pilot` → cualquier ID_nombre.
       * `Carry` → resto de ID_nombre emparejados.
    5. Activación registrada con timestamp en Doc-8.

  * **Selector `tipo_servicio`** (visible mientras `estado_operativo ≠ desactivado`):
    * Valores: `Programado`, `Dispositivo`, `Traslado`, `Guardia urgencias`,
      `DRP`, `Privado`, `Simulacro`, `Formacion`, `Sin_asignar`.
    * Actualizable en cualquier momento del turno.
    * Cada cambio genera entrada inicio/fin en Doc-8.

  * **Cambios manuales de `estado_operativo`** (en ruta):
    * `en_espera` ↔ `ruta` ↔ `estacionado` ↔ `activado` ↔ `alerta`:
      actualizables desde el panel de vehículo en home_area.
    * Todos los cambios generan entrada inicio/fin en Doc-8.
    * `ruta`, `alerta` y `estacionado` capturan coordenadas GPS (con cadena
      de fallback — ver `logic.md §5`).
    * **Interceptor DRP** — al intentar cambiar a `ruta` o `alerta`:
      si el vehículo pertenece a un DRP activo sin timestamp de salida,
      el sistema muestra: *"El vehículo pertenece al DRP [Nombre]. ¿Desea
      registrar su salida del dispositivo?"*
      → Sí: registra salida del DRP y ejecuta el cambio de estado.
      → No: aborta el cambio. Ver `logic.md §28`.

  * **Flujo de desactivación** (`en_espera → desactivado`) — **acción manual explícita únicamente**:

    > Esta acción **no es consecuencia del checkout del pilot**. El checkout
    > del pilot deja el vehículo en `en_espera`. `desactivado` se activa solo
    > por decisión operativa explícita (ej. fin de jornada total sin pilot
    > de relevo disponible, retirada del vehículo del servicio).

    1. Modal de confirmación: *"¿Desactivar [ID_vehiculo]? El vehículo
       quedará fuera de servicio."*
    2. **Si hay pilot activo** (Doc-8 abierto): solicita `km_fin` (obligatorio).
       Timestamp de cierre registrado en Doc-8. Doc-8 → `Enviado_Cerrado`.
    3. **Si no hay pilot activo** (vehículo ya en `en_espera` tras checkout):
       no se solicita `km_fin` (el Doc-8 ya fue cerrado por el pilot anterior).
    4. Desempareja cualquier carry restante del vehículo.
    5. `estado_operativo → desactivado`.

* **Mantenimiento**
  * `Repostar_combustible`
    * Campos: `km_marcador`, `litros`.
    * Toggle ubicación:
      * `Gasolinera` (por defecto): solicita además `euros`.
      * `Base`: sin campo de euros.
    * Guardar | Cancelar.
    * Se registra en Doc-8 automáticamente con timestamp.

  * `Repostar_AdBlue`
    * Toggle: ¿Ha repuesto AdBlue?
      * Si activo: solicita `km_marcador`.
      * No requiere campo de litros (repostaje completo desde bidón fijo).
    * Guardar | Cancelar.
    * Se registra en Doc-8 automáticamente con timestamp.

* **Documentos** *(referencia — se generan o rellenan automáticamente
  con los eventos de la app y timestamps)*
  * Automáticos: Doc-8.
  * Operativos manuales: Doc-6, Doc-10.
  * Asistenciales: Doc-2, Doc-3, Doc-4, Doc-5.
  * Avisos: Doc-11.
