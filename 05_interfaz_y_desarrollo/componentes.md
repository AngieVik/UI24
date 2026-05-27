# 05_interfaz_y_desarrollo/componentes.md

# COMPONENTES DE NEGOCIO Y LÓGICA COMPLEJA

> Este archivo define exclusivamente la lógica algorítmica y de BBDD de los componentes de dominio.

---

## 1. flujos_transicion (Socket de Bandejas)

Socket paramétrico para bandejas de entrada. Flujo: `Emitida_Pendiente` → `En_Proceso_Lectura` → `Solucionada_Archivada`.

* **Acuse de Recibo:** Registra timestamp al abrir (incluso en solo-lectura).
* **Modo `isReadOnly={true}`:** Deshabilita botones de mutación. Al cerrar, aplica mutación optimista local (`purgeMensaje`) y background save a Supabase (`leido_auto_dismiss`).
* **Excepción Crítica Doc-11:** Si el payload es un Doc-11 (Aviso Urgente), el componente *desactiva el bloqueo de lectura* forzosamente, exigiendo que el usuario pulse "Marcar Solucionada" y registre acuse de resolución.
* **Bandeja Logística DRP (Doc-10):** El receptor audita cantidades recibidas. Discrepancias generan automáticamente un `Descuadre_Pendiente_Revision` en background.

---

## 2. flujo_checkout_automatico

Algoritmo ejecutado al finalizar turno de un `pilot` activo en un vehículo.

1. Bloqueo de UI solicitando `km_fin`.
2. Estampa `timestamp_fin` en el vehículo y cierra el Doc-8 activo.
3. Si el vehículo estaba en DRP, registra abandono (`timestamp_salida_drp`).
4. Libera `carry` (copiloto). Carry puede elegir quedarse emparejado al vehículo en estado latente (`en_espera`).

---

## 3. visor_seguimiento_operativo (Coordinación)

Panel Realtime/Polling para seguimiento de flota.

* **Pong Error / Degradación:** Si el terminal móvil no logra obtener GPS (timeout 5s o denegación de permisos), emite evento `pong_error`.
* La UI entra en estado `fallback`, disparando RPC `get_ultima_ubicacion_vehiculo` (fusión del historial GPS y últimos partes de trabajo).
* El componente expone visualmente un badge gris de `Ubicación Offline` atenuando las coordenadas, evitando errores catastróficos en el dashboard principal.

---

## 4. selector_vehiculo_drp

Combobox reactivo de asignación de flota a dispositivos de emergencia.

* Llama RPC `get_vehiculos_disponibles_para_drp()`.
* **Hard-Constraints:** Filtra sin renderizar vehículos `critico` o ya atados a un DRP `En_curso`.
* **Soft-Constraints:** Vehículos en un DRP `En_preparacion` aparecen con badge de alerta ámbar. Si se seleccionan, despliegan Modal de doble confirmación alertando del conflicto táctico.

---

## 5. tarjeta_paciente_filiacion

Gestión de entidad Paciente en emergencias (UI optimista de Drag & Drop).

* **Lógica de Revaluación (`revaluacion = true`):** Si el paciente regresa de Box a Sala de Espera, el componente retiene el `timestamp_admision` original y añade un badge ámbar intenso de "Revaluación".
* **Finalidad Médica:** Evita que el Triaje vuelva a procesar la incidencia como paciente de primera visita, manteniendo el hilo continuo del historial del `Doc-3` actual.
