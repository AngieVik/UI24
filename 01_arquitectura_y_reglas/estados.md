# estados

> Fuente de verdad de todas las máquinas de estado del sistema U24.
> Base para el diseño del store Zustand y las políticas RLS de Supabase.
> Cualquier estado nuevo debe registrarse aquí antes de implementarse.

---

## 1. terminal

Controla el bloqueo/desbloqueo físico del terminal.

| Estado | Descripción |
|---|---|
| `estado_0` | Bloqueado. Sin cookie válida. Solo muestra formulario de login centrado. |
| `estado_1` | Desbloqueado. Cookie válida. Layout completo: black_column + header + home_area. |

**Transiciones:**

```
estado_0 → estado_1   (login correcto con credenciales / PIN de emergencia válido)
estado_1 → estado_0   (checkout del último ID_nombre activo / cookie destruida)
```

**Zustand:** `useTerminalStore → estado`

---

## 2. sesion_terminal (tipo de cookie)

Tipo de sesión activa en el terminal. Determina la persistencia y el comportamiento al hacer checkout.

| Estado | Descripción | Se destruye |
|---|---|---|
| `sin_sesion` | Sin cookie. Terminal bloqueado. | — |
| `estandar` | Cookie generada por login normal. | Al cerrar sesión explícita |
| `galleta_pequeña` | Cookie temporal de emergencia. | Al checkout del último ID_nombre |
| `galleta` | Cookie permanente de emergencia. | Solo eliminación manual en Supabase |

**Transiciones:**

```
sin_sesion → estandar          (login correcto con ID_nombre + password)
sin_sesion → galleta_pequeña   (PIN de emergencia temporal válido)
sin_sesion → galleta           (PIN de emergencia permanente válido)
galleta_pequeña → sin_sesion   (checkout del último ID_nombre)
```

**Zustand:** `useTerminalStore → tipoSesion`

---

## 3. persona (ID_nombre)

Estados de presencia y rol de cada persona en un terminal. `pilot` y `carry` son acumulativos sobre `checkin_on`.

| Estado | Descripción |
|---|---|
| `sin_sesion` | Sin check-in activo en ningún terminal. |
| `checkin_on` | Autenticado y presente en este terminal. Registra `timestamp_checkin`. |
| `pilot` | Emparejado como piloto de un `ID_vehiculo` activo. Requiere `checkin_on`. |
| `carry` | Emparejado como carry de un `ID_vehiculo`. Requiere `checkin_on`. |

**Combinaciones válidas:**

| Combinación | Situación |
|---|---|
| `checkin_on` | Presente en terminal, sin vehículo asignado |
| `checkin_on` + `pilot` | Pilotando vehículo activo |
| `checkin_on` + `carry` | Carry de vehículo activo |
| `carry` (vehículo sin pilot) | Permitido. Vehículo queda en `en_espera`. Puede promoverse a pilot desde `visual_info_home`. |

**Transiciones:**

```
sin_sesion   → checkin_on              (check_in exitoso)
checkin_on   → sin_sesion              (check_out — último ID_nombre del terminal)
checkin_on   → checkin_on + pilot      (asignación manual de rol desde selector_vehiculos)
checkin_on   → checkin_on + carry      (asignación manual de rol desde selector_vehiculos)
pilot        → checkin_on              (check_out pilot → flujo_checkout_automatico)
carry        → checkin_on              (desemparejamiento manual o check_out carry)
carry        → pilot                   (promoción manual desde visual_info_home)
```

**Zustand:** `usePersonaStore → estados` (mapa `{ [ID_nombre]: EstadoPersona }`)

---

## 4. vehiculo — dos dimensiones ortogonales

El estado del vehículo se modela con **dos variables independientes** en la BD y en Zustand.
Pueden combinarse libremente (ej. `ruta` + `averiado_leve` es válido y habitual).

---

### 4a. estado_operativo — disponibilidad y movimiento

| Estado | Descripción | Captura GPS |
|---|---|---|
| `desactivado` | Sin pilot. Sin Doc-8 activo. Fuera de turno. | No |
| `en_espera` | Vehículo operativo y disponible. Sin servicio activo ni movimiento. **Con pilot asignado:** Doc-8 activo. **Sin pilot:** sin Doc-8. No requiere pilot para mantener el estado. | No |
| `activado` | Servicio activo despachado (`tipo_servicio` asignado). | No |
| `ruta` | En tránsito hacia servicio o vuelta a base. | Al activar y al desactivar |
| `estacionado` | Parado fuera de base, sin actividad de servicio. | Al activar |
| `alerta` | Respuesta a emergencia activa (luces/sirenas en marcha). | Al activar y al desactivar |

**Transiciones:**

```
desactivado → en_espera      (activación: km_inicio + pilot asignado)
en_espera   → activado       (servicio despachado)
en_espera   → ruta           (inicio de movimiento)
en_espera   → alerta         (despacho urgente)
en_espera   → estacionado    (para fuera de base)
activado    → ruta           (sale hacia el servicio)
activado    → alerta         (escalada a emergencia)
activado    → en_espera      (servicio finalizado)
alerta      → ruta           (respuesta en curso, modo normal)
alerta      → en_espera      (emergencia resuelta)
ruta        → alerta         (escalada a emergencia)
ruta        → en_espera      (llega al destino)
ruta        → estacionado    (para fuera de base)
estacionado → en_espera      (reanuda)
estacionado → ruta           (inicia movimiento)
cualquier   → en_espera      (checkout pilot → flujo_checkout_automatico)
en_espera   → desactivado    (acción manual explícita: fin de jornada del vehículo)
```

> ⚠ **`desactivado` es alcanzable SOLO por acción manual explícita** (fin de jornada total
> del vehículo). El checkout del pilot transiciona SIEMPRE a `en_espera`. Ver `logic.md §15`.
>
> ⚠ **Interceptor DRP:** cambiar a `ruta` o `alerta` mientras el vehículo tiene
> `timestamp_entrada_drp` sin `timestamp_salida_drp` genera modal de confirmación
> de salida del dispositivo antes de ejecutar el cambio. Ver `logic.md §28`.

Cada cambio genera entrada en Doc-8 con `timestamp_inicio` y `timestamp_fin`.

**Zustand:** `useVehiculoStore → estadoOperativo`

---

### 4b. condicion_tecnica — estado mecánico

Variable **ortogonal** a `estado_operativo`. Se actualiza de forma independiente.

| Estado | Descripción | Disparado por |
|---|---|---|
| `operativo` | Sin incidencias mecánicas. Estado por defecto. | — |
| `averiado_leve` | Incidencia leve o moderada reportada. Informativo. | Doc-7 Leve/Moderada guardado |
| `critico` | Fallo grave confirmado. Advertencia bloqueante. | Doc-7 Grave guardado |

**Transiciones:**

```
operativo           → averiado_leve       (Doc-7 Leve/Moderada)
operativo           → critico (Doc-7 Grave)
averiado_leve       → operativo           (Doc-7 → Reparada_Operativa)
critico → operativo           (Doc-7 → Reparada_Operativa)
averiado_leve       → critico (Doc-7 escalado a Grave)
```

**Efecto en activación:**

- `operativo` / `averiado_leve` → activación permitida, badge informativo visible.
- `critico` → advertencia bloqueante. Requiere confirmación explícita
  de `gerencia` o `coordinación` para proceder con la activación.

**Zustand:** `useVehiculoStore → condicionTecnica`

---

## 5. vehiculo — tipo_servicio

Servicio asignado por RRHH. Ortogonal a `estado_operativo` y `condicion_tecnica`.
Cada cambio genera entrada en Doc-8 con `timestamp_inicio` y `timestamp_fin`.

| Tipo | Descripción |
|---|---|
| `Programado` | Servicio sanitario programado en cuadrante. |
| `Dispositivo` | En dispositivo preventivo. |
| `Traslado` | Traslado de paciente a centro sanitario. |
| `Guardia_urgencias` | Guardia de urgencias activa. |
| `DRP` | Adscrito a Dispositivo de Riesgo Previsible. |
| `Privado` | Servicio privado. |
| `Simulacro` | Simulacro de intervención. |
| `Formacion` | Actividad de formación. |
| `Sin_asignar` | Turno activo sin tipo de servicio definido aún. |

**Regla GPS fallback:** GPS no disponible → último historial del vehículo
→ último evento con ubicación → coordenadas disponibles más recientes → NULL (sin bloquear).

**Zustand:** `useVehiculoStore → tipoServicio`

---

## 6. DRP — ciclo de vida

| Estado | Origen | Timestamp registrado |
|---|---|---|
| `En_espera` | Creación del DRP por coordinación/gerencia. | `timestamp_creacion` |
| `En_preparacion` | Job Supabase (1h antes) **o** primera dotación unida — lo primero que ocurra. | `timestamp_inicio_preparacion` |
| `En_curso` | Activación manual por coordinación/gerencia. | `timestamp_inicio_curso` |
| `Cancelado` | Cancelación forzada desde `En_curso` por coordinación/gerencia. Nunca se borra del sistema (audit trail garantizado para DRPs que alcanzaron `En_curso`). | `timestamp_cancelacion` |
| `Finalizado` | Cierre manual desde `resumen_drp`. | `timestamp_finalizacion` |
| `Finalizado_Retenido` | El cron job de archivado detectó descuadres contables `Pendiente_Revision` asociados al DRP. El archivado queda bloqueado hasta que logística liquide todos los descuadres. | `timestamp_retencion` |
| `Archivado` | Automático 48h después de `Finalizado` **o** cuando el DRP estaba en `Finalizado_Retenido` y el último descuadre pasa a `Resuelto`/`Archivado`. | `timestamp_archivado` |

**Transiciones:**

```
En_espera            → En_preparacion      (job 1h antes / primera dotación se une)
En_preparacion       → En_curso            (acción manual coordinación/gerencia)
En_curso             → Finalizado          (acción manual coordinación/gerencia)
En_curso             → Cancelado           (RPC cancelar_drp — coordinación/gerencia)
Finalizado           → Archivado           (cron +48h — solo si sin descuadres pendientes)
Finalizado           → Finalizado_Retenido (cron +48h — si descuadres Pendiente_Revision > 0)
Finalizado_Retenido  → Archivado           (trigger: último descuadre del DRP resuelto/archivado)
En_espera            → [eliminado]         (Cancelar — bloqueado si Doc-1 tiene asistencias)
```

**Efectos de la cancelación (`En_curso → Cancelado`):**

- Dotaciones y personal a pie: `timestamp_salida = NOW()` para todos los activos (los vehículos quedan desvinculados del DRP pero sus Doc-8 siguen abiertos — el pilot hace checkout normal al terminar el turno).
- Módulos PSA y Filiación vinculados al DRP: cierre forzado (`timestamp_cierre = NOW()`).
- Subinventarios `Asignado` al DRP: revierten directamente a `Operativo` (bypass limpio).
- Doc-1 del DRP: queda inmutable en su estado actual — ninguna acción adicional.
- Ver `logic.md §48` para el RPC completo `cancelar_drp`.

**Aviso automático:** si la hora de inicio programada llega y el DRP sigue en `En_preparacion`,
se envía aviso a todos los terminales del DRP: "Aviso: el DRP no ha sido activado. Contactar con coordinación."

**Zustand:** `useDRPStore → estado`

---

## 7. subinventario_drp (ID_DRP1–ID_DRP8)

Estado de cada slot de subinventario para DRP o PSA.

| Estado | Descripción |
|---|---|
| `Operativo` | Disponible para asignar a un nuevo DRP o PSA. |
| `Asignado` | Vinculado a un DRP o PSA activo. |
| `En_Transito` | DRP/PSA finalizado. Stock físico pendiente de verificación. Asignación estándar bloqueada. |
| `Operativo_Condicionado` | Reasignado antes de completar la reconciliación del DRP anterior. El snapshot del DRP anterior pasa automáticamente a `resuelto_por_transferencia` (no visible en la cola activa de logística). Se crea un nuevo snapshot con el `stock_real` actual como única referencia activa. La nueva dotación asume ciegamente el stock teórico. Al retornar a base, logística hace un único cuadre que cubre la merma acumulada de todos los DRP anteriores. **Límite:** máx. 2 encadenamientos consecutivos sin reconciliación. Si el slot ya lleva 2 asignaciones previas con snapshot pendiente, la asignación a un nuevo DRP queda bloqueada hasta que logística cierre al menos uno. Bloqueo + Doc-11 a gerencia. Ver `logic.md §7.1.3`. |

**Flujo estándar:**

```
Operativo              → Asignado              (asignación a DRP/PSA)
Asignado               → En_Transito           (Cerrar_módulo_PSA o finalización del DRP)
En_Transito            → Operativo             (logística confirma reconciliación)
```

**Flujo de cancelación de DRP (reversión limpia):**

```
Asignado               → Operativo             (cancelación de DRP — bypass directo,
                                                sin pasar por En_Transito)
                                                Snapshots pendientes eliminados.
                                                Sin tarea de reconciliación.
```

**Flujo condicionado (reasignación urgente antes de reconciliar):**

```
En_Transito            → Operativo_Condicionado  (operario acepta reasignación anticipada)
                                                  snapshot anterior → resuelto_por_transferencia
                                                  nuevo snapshot creado con stock_real actual
Operativo_Condicionado → Asignado                (asignación al nuevo DRP/PSA)
Asignado               → En_Transito             (nuevo DRP finaliza)
En_Transito            → Operativo               (logística reconcilia único snapshot activo —
                                                  cubre merma acumulada de todos los DRP)
```

Ver `logic.md §9.1` para el flujo de modal y la mecánica de snapshot de stock.

**Zustand:** `useInventarioStore → subinventarios` (mapa `{ [ID_DRP]: EstadoSubinventario }`)

---

## 8. paciente — módulo filiación

Estado de cada registro de paciente dentro de `modulo_filiacion`.

| Estado | Descripción | Registra |
|---|---|---|
| `en_espera` | Registrado en admisión. Ordenado por `orden` de atención. | `timestamp_admision`, `ID_nombre_admisionista` |
| `en_consulta` | Siendo atendido en un box. | `timestamp_inicio_consulta`, `ID_nombre_box` |
| `archivado` | Atención finalizada. | `timestamp_fin_consulta` |

**Campo adicional:** `revaluacion BOOLEAN DEFAULT FALSE`
Inyectado automáticamente al ejecutar la transición inversa `en_consulta → en_espera`.
Nunca se establece en la admisión inicial. Se conserva aunque el paciente vuelva a
pasar por `en_consulta` (campo inmutable una vez `true`).

**Transiciones:**

```
en_espera   → en_consulta   (perfil_boxes abre el registro)
en_consulta → archivado     (perfil_boxes cierra la atención)
en_consulta → en_espera     (perfil_boxes — Revaluar paciente)
                              → revaluacion = true
                              → id_nombre_box = NULL
                              → timestamp_inicio_consulta = NULL
                              → timestamp_admision preservado (no se sobreescribe)
                              → hilo Doc-3 preservado (no se crea nuevo Doc-3)
```

**Zustand:** `useModulosStore → filiacion.pacientes[id].estado`

---

## 9. módulo PSA

| Estado | Registra |
|---|---|
| `activo` | `timestamp_apertura` |
| `cerrado` | `timestamp_cierre` |

**Cierre:** manual (Cerrar_módulo_PSA) **o** automático al finalizar el DRP vinculado.
Al cerrar: subinventario `ID_DRP` asociado pasa a `En_Transito`.

**Zustand:** `useModulosStore → psa.estado`

---

## 10. módulo filiación

| Estado | Registra |
|---|---|
| `activo` | `timestamp_apertura_modulo` |
| `cerrado` | `timestamp_cierre_modulo` |

**Cierre:** manual (Cerrar_módulo_filiación) **o** automático al finalizar el DRP vinculado.

**Zustand:** `useModulosStore → filiacion.estado`

---

## 11. mensajes — bandejas de entrada

Estado de cada mensaje en cualquier instancia de bandeja.
Ver comportamiento completo en `componentes.md → flujos_transicion`.

| Estado | Descripción |
|---|---|
| `Emitida_Pendiente` | Recibido, sin leer. Activa icono amarillo `ti-mail`. |
| `En_Proceso_Lectura` | Abierto. Registra `timestamp_lectura` e `ID_nombre_lector`. |
| `Solucionada_Archivada` | Gestionado y archivado. |

**Zustand:** `useBandejasStore → [instancia].mensajes[id].estado`

---

## 12. descuadre de inventario

| Estado | Descripción |
|---|---|
| `Pendiente_Revision` | Generado automáticamente por discrepancia en Doc-10 o Doc-9. |
| `Resuelto` | Gestionado manualmente. Registra `ID_nombre_resolutor` y `timestamp_resolucion`. |
| `Archivado` | Cerrado definitivamente. |

**Zustand:** `useInventarioStore → descuadres[id].estado`

---

## 13. token de emergencia

No es estado Zustand — solo existe en la tabla `sesiones_emergencia` de Supabase.

| Estado | Condición en DB |
|---|---|
| `activo` | `consumido_at IS NULL` AND `NOW() < expires_at` |
| `consumido` | `consumido_at IS NOT NULL` |
| `expirado` | `NOW() > expires_at` AND `consumido_at IS NULL` |

**Purga automática:** Edge Function de Supabase elimina tokens `expirados` periódicamente.

---

## 14. periodo de vacaciones (Doc-12 global)

Estado global que habilita o bloquea el formulario Doc-12 para todos los empleados.

| Estado | Descripción |
|---|---|
| `Oculto` | Doc-12 no accesible para el personal. Estado por defecto. |
| `Activado` | Doc-12 visible desde `Tablón central` para todos los roles autenticados. |

**Controlado por:** `rrhh` o `gerencia` desde `gestion_de_turnos → vacaciones`.

**Zustand:** `useGlobalStore → periodoVacaciones`

---

## 15. estados de documentos

### Doc-1 — Informe DRP

| Estado | Transición disparadora |
|---|---|
| `Planificado_Pendiente` | Creación del DRP |
| `Activo_En_Curso` | DRP pasa a `En_curso` |
| `Finalizado_Cerrado` | DRP pasa a `Finalizado` |

---

### Doc-2 — Informe Asistencial Básico

### Doc-3 — Informe Clínico

### Doc-4 — Alta Voluntaria / Negativa de Asistencia

### Doc-5 — Descargo de Responsabilidad

*(comparten la misma máquina de estados)*

| Estado | Transición disparadora |
|---|---|
| `Borrador_En_Curso` | Al abrir el formulario |
| `Completado_Firmado` | Al guardar con datos válidos |
| `Anulado_Por_Error` | Anulación manual por el creador (solo en Borrador) |
| `Anulado_Por_Error_Auto` | Checkout automático detecta el documento en `Borrador_En_Curso` sin firmar — eliminado automáticamente para evitar inyección de documentos incompletos. Ver `hooks.md §2.1`. |

---

### Doc-6 — Gasto de Material

| Estado | Transición disparadora |
|---|---|
| `Borrador` | Al abrir el formulario |
| `Registrado_y_Descontado` | Al guardar — descuento ejecutado atómicamente en DB (RPC/trigger) |

---

### Doc-7 — Informe de Averías

| Estado | Transición disparadora |
|---|---|
| `Reportada_Pendiente` | Al guardar — vehículo pasa a `Averiado` automáticamente si Grave |
| `En_Proceso_Taller` | `flota` toma la incidencia |
| `Reparada_Operativa` | `flota` cierra la incidencia |

`timestamp_cambio_estado` registrado en cada transición.

---

### Doc-8 — Parte de Trabajo

| Estado | Transición disparadora |
|---|---|
| `Abierto_En_Turno` | Al activar el vehículo (asignación de pilot + km_inicio) |
| `Enviado_Cerrado` | Checkout del pilot (`flujo_checkout_automatico`, registra km_fin) **o** desactivación manual explícita con pilot activo |
| `Enviado_Cerrado_Administrativo` | Cierre forzado por coordinación/gerencia via `forzar_checkout_administrativo` — registra `cerrado_por_admin_id`. Distinguible del cierre normal para auditoría. Ver `logic.md §42`. |

Se genera uno por vehículo por turno de pilot. Si el pilot hace checkout y un nuevo pilot activa el mismo vehículo después, se crea un nuevo Doc-8 independiente.

---

### Doc-9 — Entrada de Almacén

| Estado | Transición disparadora |
|---|---|
| `Pendiente_Recepcion` | Al crear el documento |
| `Completado` | Al confirmar todos los ítems recibidos |
| `Descuadre_Pendiente_Revision` | Discrepancia detectada en algún ítem |
| `Rechazado_Devuelto` | Logística determina que el albarán no puede registrarse (material dañado, proveedor erróneo, discrepancia irreconciliable). **NO-OP contable**: ninguna operación sobre `stock_real`. Cierra el documento logísticamente. Ver `logic.md §38`. |

---

### Doc-10 — Envío de Material

| Estado | Transición disparadora |
|---|---|
| `En_Transito` | Al guardar — material restado del origen, no sumado al destino |
| `Pendiente_Validacion` | Notificación enviada al receptor |
| `Completado` | Receptor confirma sin discrepancias — stock sumado al destino |
| `Descuadre_Pendiente_Revision` | Receptor detecta discrepancia — genera descuadre en logística |
| `Redirigido_Por_Cierre_Destino` | El subinventario de destino está en `En_Transito` u `Operativo_Condicionado` en el momento de la confirmación. La suma física al destino original está denegada. Logística redirige el material al almacén central base y cancela el Doc-10 original. Ver `logic.md §7.1.2`. |

---

### Doc-11 — Aviso Urgente

| Estado | Transición disparadora |
|---|---|
| `Emitida_Pendiente` | Al guardar |
| `En_Proceso_Lectura` | Receptor abre el mensaje |
| `Solucionada_Archivada` | Receptor marca como solucionada |

---

### Doc-12 — Solicitud de Vacaciones

| Estado | Transición disparadora |
|---|---|
| `Borrador` | Al abrir el formulario (periodo `Activado` globalmente) |
| `Pendiente_Aprobacion` | Al enviar la solicitud |
| `Aprobada` | `rrhh`/`gerencia` aprueba desde `bandeja_entrada_rrhh` |
| `Denegada` | `rrhh`/`gerencia` deniega desde `bandeja_entrada_rrhh` |

---

### Doc-13 — Buzón Interno

| Estado | Transición disparadora |
|---|---|
| `Enviada` | Al guardar el formulario |
| `Leida_Archivada` | `rrhh`/`gerencia` marca como leída desde `bandeja_entrada_rrhh` |

---

### Doc-Checklist360 — Revisión 360° del vehículo

| Estado | Transición disparadora |
|---|---|
| `Borrador_En_Curso` | Al abrir el formulario (solo en sesión activa — registro temporal) |
| `Completado` | Al guardar sin campo `Incidencias_Detectadas` relleno |
| `Completado_Con_Incidencias` | Al guardar con `Incidencias_Detectadas` relleno |
| `Anulado_Por_Error_Auto` | Checkout automático detecta un Checklist360 en `Borrador_En_Curso` sin firmar — **Hard Delete preferido; `Anulado_Por_Error_Auto` si el registro ya existe en DB**. Jamás llega a `Completado`. Ver `hooks.md §2.1`. |

`Timestamp_fin_revision` registrado automáticamente al guardar.

**Escalado automático:** cuando el estado es `Completado_Con_Incidencias`, un trigger
PostgreSQL (`trg_checklist_genera_doc7`) genera automáticamente un Doc-7 (Informe de
Avería) con gravedad `Leve` y lo inyecta en `bandeja_entrada_flota`. El técnico de
flota puede revisarlo y escalar la gravedad si lo considera necesario.
Ver `logic.md §35` para el SQL completo del trigger.

---

## 16. resumen de stores Zustand

> **ADR-001 (2026-05-18):** Todos los stores persistentes migran a `IndexedDB` vía `idb-keyval`. `localStorage` queda prohibido para estados de sesión. Única excepción documentada: `useAuthStore` permanece en `sessionStorage` — JWT y permisos no deben sobrevivir al cierre de la pestaña del navegador. Clarificación Fase 1: `tipoGalleta` e `id_terminal` residen en `useTerminalStore` (IndexedDB) para sobrevivir al cierre de navegador. Ver `adrs.md`.

| Store | Estados que gestiona | Persistencia |
|---|---|---|
| `useTerminalStore` | `terminal.estado`, `sesion_terminal.tipo`, `tipoGalleta` ('permanente'/'temporal'/null), `id_terminal` (fingerprint SHA-256) | `IndexedDB (idb-keyval)` |
| `useAuthStore` | ID_nombre activo, rol, JWT, permisos (`tipoGalleta` migrado a `useTerminalStore` — ver ADR-001 clarificación) | `sessionStorage` ⚠ excepción documentada — ver ADR-001 |
| `usePersonaStore` | `checkin_on`, `pilot`, `carry` por ID_nombre | `IndexedDB (idb-keyval)` |
| `useVehiculoStore` | `estadoOperativo`, `condicionTecnica`, `tipoServicio`, GPS, km activos | `IndexedDB (idb-keyval)` |
| `useDRPStore` | `estado` DRP activo, dotaciones, timestamps | `IndexedDB (idb-keyval)` |
| `useInventarioStore` | stock por location, `subinventariosEstado`, descuadres | Supabase (sin persist local) |
| `useBandejasStore` | mensajes por instancia, contadores sin leer | Supabase Realtime + `IndexedDB` (caché fallback offline) |
| `useModulosStore` | PSA estado, filiación estado, pacientes | `IndexedDB (idb-keyval)` |
| `useDocumentosStore` | Documentos en `Borrador_En_Curso` (forms abiertos) | `IndexedDB` |
| `useGlobalStore` | `periodoVacaciones`, texto marquesina, estado tablón | Supabase Realtime + `IndexedDB` (caché fallback offline) |

**Regla de persistencia (ver `rules.md §4` y `adrs.md ADR-001`):** todos los stores persistentes usan middleware `persist` con adaptador `idb-keyval` sobre `IndexedDB`. `localStorage` queda estrictamente prohibido para estados de sesión. Excepción documentada: `useAuthStore` en `sessionStorage` para garantizar que las credenciales se borran al cerrar la pestaña.
