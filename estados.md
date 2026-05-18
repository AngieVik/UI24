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

## 4. vehiculo — estado operativo

Estado principal de cada `ID_vehiculo`. Independiente del estado funcional.

| Estado | Descripción | Bloquea activación |
|---|---|---|
| `Desactivado` | Fuera de servicio temporal o sin turno. | No |
| `Activado` | Operativo. Con `km_inicio` y al menos un pilot asignado. | — |
| `Averiado` | Fallo reportado vía Doc-7 de criticidad Grave. Solo informativo. | No |

**Transiciones:**

```
Desactivado → Activado     (confirmación + km_inicio + asignación de pilot/carry)
Activado    → Desactivado  (confirmación + km_fin → Doc-8 cierra Enviado_Cerrado)
cualquier   → Averiado     (Doc-7 Grave guardado — automático, no bloquea)
Averiado    → Activado     (Doc-7 pasa a Reparada_Operativa en flota)
```

**Nota:** `Averiado` es una bandera superpuesta, no excluyente.
**Zustand:** `useVehiculoStore → estadoOperativo`

---

## 5. vehiculo — función operativa

Estado funcional mientras el vehículo está `Activado`. Cada cambio genera entrada en Doc-8 con `timestamp_inicio` y `timestamp_fin`.

### Asignadas por RRHH (tipo de servicio del turno)

| Función | Descripción |
|---|---|
| `Programado` | Servicio sanitario programado en cuadrante. |
| `Dispositivo` | En dispositivo preventivo. |
| `Traslado` | Traslado de paciente a centro sanitario. |
| `Guardia_urgencias` | Guardia de urgencias activa. |
| `DRP` | Adscrito a Dispositivo de Riesgo Previsible. |

### Gestionadas por el usuario en ruta

| Función | Descripción | Captura GPS |
|---|---|---|
| `En_espera` | Personal emparejado, pendiente de función. | No |
| `Estacionado` | Estacionado fuera de base sin actividad. | Al activar |
| `Ruta` | En trayecto hacia servicio o de vuelta a base. | Al activar y al desactivar |

**Regla GPS fallback:**
Si GPS no disponible al capturar → última ubicación conocida del vehículo
→ último evento con ubicación registrada → cualquier dato de localización disponible más reciente.

**Zustand:** `useVehiculoStore → funcionOperativa`

---

## 6. DRP — ciclo de vida

| Estado | Origen | Timestamp registrado |
|---|---|---|
| `En_espera` | Creación del DRP por coordinación/gerencia. | `timestamp_creacion` |
| `En_preparacion` | Job Supabase (1h antes) **o** primera dotación unida — lo primero que ocurra. | `timestamp_inicio_preparacion` |
| `En_curso` | Activación manual por coordinación/gerencia. | `timestamp_inicio_curso` |
| `Finalizado` | Cierre manual desde `resumen_drp`. | `timestamp_finalizacion` |
| `Archivado` | Automático 48h después de `Finalizado` (job Supabase). | `timestamp_archivado` |

**Transiciones:**

```
En_espera       → En_preparacion   (job 1h antes / primera dotación se une)
En_preparacion  → En_curso         (acción manual coordinación/gerencia)
En_curso        → Finalizado       (acción manual coordinación/gerencia)
Finalizado      → Archivado        (job automático Supabase, +48h)
En_espera       → [eliminado]      (Cancelar — bloqueado si Doc-1 tiene asistencias)
```

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
| `En_Transito` | DRP/PSA finalizado. Stock físico pendiente de verificación por logística. No asignable. |

**Flujo:**

```
Operativo → Asignado     (creación de DRP/PSA seleccionando este ID_DRP)
Asignado  → En_Transito  (Cerrar_módulo_PSA o finalización del DRP vinculado)
En_Transito → Operativo  (logística confirma reconciliación de stock)
```

**Zustand:** `useInventarioStore → subinventarios` (mapa `{ [ID_DRP]: EstadoSubinventario }`)

---

## 8. paciente — módulo filiación

Estado de cada registro de paciente dentro de `modulo_filiacion`.

| Estado | Descripción | Registra |
|---|---|---|
| `en_espera` | Registrado en admisión. Ordenado por `orden` de atención. | `timestamp_admision`, `ID_nombre_admisionista` |
| `en_consulta` | Siendo atendido en un box. | `timestamp_inicio_consulta`, `ID_nombre_box` |
| `archivado` | Atención finalizada. | `timestamp_fin_consulta` |

**Transiciones:**

```
en_espera   → en_consulta   (perfil_boxes abre el registro)
en_consulta → archivado     (perfil_boxes cierra la atención)
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
| `Abierto_En_Turno` | Al activar el vehículo (asignación de pilot) |
| `Enviado_Cerrado` | Checkout del pilot (`flujo_checkout_automatico`) o desactivación manual |

Se genera uno por vehículo por turno. Varios ID_nombre pueden compartir el mismo Doc-8 si comparten vehículo en el turno.

---

### Doc-9 — Entrada de Almacén

| Estado | Transición disparadora |
|---|---|
| `Pendiente_Recepcion` | Al crear el documento |
| `Completado` | Al confirmar todos los ítems recibidos |
| `Descuadre_Pendiente_Revision` | Discrepancia detectada en algún ítem |

---

### Doc-10 — Envío de Material

| Estado | Transición disparadora |
|---|---|
| `En_Transito` | Al guardar — material restado del origen, no sumado al destino |
| `Pendiente_Validacion` | Notificación enviada al receptor |
| `Completado` | Receptor confirma sin discrepancias — stock sumado al destino |
| `Descuadre_Pendiente_Revision` | Receptor detecta discrepancia — genera descuadre en logística |

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
| `Completado` | Al guardar sin campo `Incidencias_Detectadas` relleno |
| `Completado_Con_Incidencias` | Al guardar con `Incidencias_Detectadas` relleno |

`Timestamp_fin_revision` registrado automáticamente al guardar.

---

## 16. resumen de stores Zustand

| Store | Estados que gestiona | Persistencia |
|---|---|---|
| `useTerminalStore` | `terminal.estado`, `sesion_terminal.tipo` | `localStorage` |
| `useAuthStore` | ID_nombre activo, rol, JWT, permisos | `sessionStorage` |
| `usePersonaStore` | `checkin_on`, `pilot`, `carry` por ID_nombre | `localStorage` |
| `useVehiculoStore` | `estadoOperativo`, `funcionOperativa`, GPS, km activos | `localStorage` |
| `useDRPStore` | `estado` DRP activo, dotaciones, timestamps | `localStorage` |
| `useInventarioStore` | stock por location, `subinventariosEstado`, descuadres | Supabase (no persist local) |
| `useBandejasStore` | mensajes por instancia, contadores sin leer | Supabase Realtime |
| `useModulosStore` | PSA estado, filiación estado, pacientes | `localStorage` |
| `useDocumentosStore` | Documentos en `Borrador_En_Curso` (forms abiertos) | `IndexedDB` |
| `useGlobalStore` | `periodoVacaciones`, texto marquesina, estado tablón | Supabase Realtime |

**Regla de persistencia (ver `rules.md`):** los estados vitales de turno
(`vehiculo_activo`, `turno_iniciado`, `modo_noche`) usan middleware `persist`
apuntando a `localStorage` para sobrevivir recargas accidentales del navegador.
