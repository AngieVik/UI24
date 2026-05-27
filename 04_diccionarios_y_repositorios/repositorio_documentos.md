# repositorio_documentos

## Doc-1

* Nombre: Informe D.R.P.
* Version 1.0
* Ruta_Componente_Frontend
* Componentes_auto:
  * fecha, hora_inicio, nombre_drp
  * ID_vehiculo (si existe)
  * ID_nombre dotación (todos los que entraron al DRP)
* Registro_asistencias (tabla dinámica, append-only):
  * id (UUID v4, generado en cliente con crypto.randomUUID() — PRIMARY KEY en Supabase)
  * timestamp_registro
  * ID_nombre_registrador
  * p_filiacion (Nombre y apellidos, Edad, DNI/NIE/Pasaporte, Ciudad de residencia, Sexo, Teléfono)
  * Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)
  * Motivo_asistencia (texto libre)
  * Resolucion (texto libre)
* Idempotencia de inserción:
  * El UUID se genera en el cliente antes de encolar la mutación offline.
  * Al reconectar, si el RPC recibe un UUID ya existente (reenvío de la cola),
        PostgreSQL rechaza el INSERT con error de clave duplicada (PK violation).
        El handler de cola interpreta este error como éxito idempotente y elimina
        la mutación de IndexedDB sin reintentar. La asistencia no se duplica.
* Funcion:
      1. Al crear un DRP, se genera automáticamente un Doc-1 vinculado. Estado inicial: Planificado_Pendiente.
      2. Al activarse el DRP (estado En_Curso), el Doc-1 pasa a Activo_En_Curso. Los terminales activos en el DRP pueden añadir asistencias desde visual_info_drp.
      3. Cada asistencia añadida se registra con timestamp e ID_nombre del registrador. No se pueden editar ni eliminar entradas ya guardadas (trazabilidad completa).
      4. Si hay varios terminales en el mismo DRP, todos escriben en el mismo Doc-1.
      5. Se guarda con copia de seguridad en IndexedDB (store doc1_asistencias — ver hooks.md §9) y Supabase mientras está activo.
      6. Al finalizar el DRP manualmente, el Doc-1 pasa a Finalizado_Cerrado. Solo Gerencia, Coordinación y RRHH pueden consultarlo.
      7. Exportable a PDF.
* Estados_Transaccion:
  * Planificado_Pendiente
  * Activo_En_Curso
  * Finalizado_Cerrado

---

## Doc-2

* Nombre: Informe Asistencial Básico y Triaje
* Version 2.0
* Ruta_Componente_Frontend
* Componentes:

* Datos_Asistencia (autocomplete):
  * Fecha, Hora
  * ID_nombre dotación actuante
  * ID_vehiculo

* Filiacion_paciente (p_filiacion):
  * Nombre y apellidos, Edad, DNI/NIE/Pasaporte
  * Ciudad de residencia, Sexo, Teléfono
  * Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

* Cinematica_Trauma_Naturaleza_Enfermedad:
  * Tipo: [Trauma, Enfermedad médica, Intoxicación, Obstétrico, Psiquiátrico, Otro]
  * Descripcion_mecanismo (texto breve)

* Evaluacion_Primaria_XABCDE:
  * X — Control hemorragia exanguinante:
  * [Sin hemorragia exanguinante, Hemorragia controlada, Hemorragia no controlada]
  * Notas (texto libre)
  * A — Vía aérea:
  * [Permeable, Obstruida parcial, Obstruida total, Manejada con dispositivo]
  * Notas (texto libre)
  * B — Ventilación:
  * [Adecuada, Inadecuada, Apnea]
  * FR (rpm): valor numérico
  * Patron: [Normal, Taquipnea, Bradipnea]
  * SpO2 (%): valor numérico
  * Notas (texto libre)
  * C — Circulación:
  * FC (lpm): valor numérico
  * TA (mmHg): sistólica / diastólica
  * Tiempo_relleno_capilar: [< 2s (Normal), 2–4s (Retardado), > 4s (Ausente)]
  * Piel: [Normal, Pálida, Sudorosa, Cianótica, Marmórea]
  * Notas (texto libre)
  * D — Déficit neurológico:
  * Glasgow_Coma_Scale:
    * Ocular: [1, 2, 3, 4]
    * Verbal: [1, 2, 3, 4, 5]
    * Motora: [1, 2, 3, 4, 5, 6]
    * Total: cálculo automático (editable)
  * Pupilas:
    * Simetria: [Isocóricas, Anisocóricas]
    * Tamaño: [Normales, Mióticas, Midriáticas]
    * Reactividad_Izquierda: [Reactiva, Arreactiva, Perezosa]
    * Reactividad_Derecha: [Reactiva, Arreactiva, Perezosa]
  * Notas (texto libre)
  * E — Exposición y control térmico:
  * [Sin hallazgos relevantes, Lesiones visibles, Hipotermia, Hipertermia]
  * Temperatura_corporal (ºC): valor numérico
  * Notas (texto libre)

* Anamnesis_SAMPLE:
  * Signos_y_sintomas (texto libre)
  * Alergias (texto libre)
  * Medicacion_habitual (texto libre)
  * Patologias_previas (texto libre)
  * Ultima_ingesta (texto libre)
  * Eventos_previos (texto libre)

* Constantes_vitales (toma principal — pueden añadirse tomas adicionales con +):
  * Hora_toma
  * TA (mmHg): sistólica / diastólica
  * FC (lpm)
  * FR (rpm): valor numérico + patrón [Normal, Taquipnea, Bradipnea]
  * SpO2 (%)
  * Temperatura (ºC)
  * Glucosa (mg/dl)
  * Escala_Dolor_EVA (0–10): slider numérico

* Categorizacion_Triaje:
  * [Rojo — Emergencia, Naranja — Muy urgente, Amarillo — Urgente, Verde — Menos urgente, Azul/Negro — No urgente / Éxitus]

* Medidas_aplicadas (multiselect con checkboxes, competencias TES):
  * Control de hemorragias (X / C):
  * [ ] Compresión directa
  * [ ] Vendaje compresivo
  * [ ] Torniquete (Extremidad)
  * [ ] Torniquete (Unión / Empaquetamiento hemostático)
  * [ ] Faja pélvica / Pelvic binder
  * Manejo vía aérea (A):
  * [ ] Apertura manual (Frente-mentón / Tracción mandibular)
  * [ ] Aspiración de secreciones
  * [ ] Cánula orofaríngea (Guedel)
  * [ ] Cánula nasofaríngea
  * Ventilación y oxigenoterapia (B):
  * [ ] Oxigenoterapia: Gafas nasales
  * [ ] Oxigenoterapia: Mascarilla con reservorio
  * [ ] Ventilación con balón resucitador (BVM)
  * [ ] Sello torácico (Parche oclusivo valvulado)
  * Soporte circulatorio y reanimación (C):
  * [ ] RCP Básica (Compresiones torácicas)
  * [ ] DEA (Desfibrilación Externa Automatizada) aplicada
  * [ ] Posición antishock (Trendelenburg modificado)
  * Traumatología e inmovilización (E):
  * [ ] Restricción movimientos espinales (Collarín cervical)
  * [ ] Inmovilización de cabeza (Dama de Elche)
  * [ ] Extricación (Ferno-KED / Boa)
  * [ ] Tablero espinal / Camilla tipo cuchara
  * [ ] Colchón de vacío
  * [ ] Férula de vacío / Férula rígida
  * [ ] Férula de tracción
  * Otras medidas:
  * [ ] Posición Lateral de Seguridad (PLS)
  * [ ] Control térmico (Manta aluminizada / calor activo)
  * [ ] Lavado ocular / Irrigación de heridas
  * [ ] Acompañamiento / Apoyo psicológico
  * Otras_medidas_notas (texto libre)

* Resolucion:
  * Tipo: [Alta in situ, Rechaza asistencia / Alta voluntaria, Traslado a Centro Útil, Transferencia a SVA, Éxitus]
  * Nota: si se selecciona "Rechaza asistencia / Alta voluntaria", se muestra aviso informativo:
      "Recuerda abrir el Doc-4 si el paciente firma el alta voluntaria."
  * Notas_resolucion (texto libre)

* Añadir | Cancelar
* Funcion:

  1. Registrar la asistencia prehospitalaria de dotaciones SVB (TES).
  2. Evaluar, estabilizar y categorizar la gravedad clínica mediante protocolo XABCDE + SAMPLE + triaje.
  3. No administra ni registra fármacos — esa función corresponde al Doc-3.

* Estados_Transaccion:
* Borrador_En_Curso
* Completado_Firmado
* Anulado_Por_Error

---

## Doc-3

* Nombre: Informe Clínico
* Version 2.0
* RBAC_Crear: médico, due (lectura: todos los roles operativos en v1.0)
* Ruta_Componente_Frontend
* Componentes:

* Datos_Asistencia (autocomplete):
  * Fecha, Hora
  * ID_nombre facultativo actuante
  * ID_vehiculo

* Filiacion_Paciente:
  * Nombre y apellidos
  * DNI / NIE / Pasaporte
  * Fecha de nacimiento

* Evaluacion_Clinica:

  * Alergias_Medicamentosas:
  * Desplegable multiselect:
    * Sin alergias conocidas (NAMC)
    * Betalactámicos
    * AINEs
    * Quimioterápicos
    * Antiepilépticos
    * Sulfamidas
    * Quinolonas
    * Macrólidos
    * Medios de contraste
    * Biológicos y Mabs
    * Bloqueantes neuromusculares
    * Anestésicos (generales/locales)
    * Hipouricemiantes (Alopurinol)
    * IECAs
    * Opioides
    * Otras (especificar — texto libre)

  * Antecedentes_Personales (texto libre)

  * Anamnesis (tomas — primera obligatoria, añadir más con +):
  * Hora_toma
  * TA (mmHg)
  * FC (lpm)
  * FR (rpm)
  * SpO2 (%)
  * Temperatura (ºC)
  * Glucosa (mg/dl)

  * Exploracion_Fisica (texto libre)

* Resolucion_y_Plan:

  * Bloque_Via_Aerea_Ventilacion:
  * Tipo_manejo: [Espontánea, Cánula orofaríngea, Dispositivo supraglótico, Intubación endotraqueal]
  * Parametros_respirador: Vt, FR, PEEP, FiO2
  * Capnografia_EtCO2

  * Bloque_Hemodinamico_Monitorizacion:
  * Ritmo_ECG_inicial
  * Ritmo_ECG_final
  * Vias_venosas_canalizadas: [Periférica, Intraósea, Central]
  * Terapias_electricas_aplicadas (Julios)

  * Bloque_Farmacologico (bucle dinámico — añadir líneas):
  * Farmaco_administrado (texto / vademécum)
  * Dosis_y_unidades: valor + unidad [mg, mcg, UI, ml]
  * Via_administracion: [IV, IM, SC, VO, SL, INH]
  * Hora_exacta_administracion

  * Juicio_Clinico_Diagnostico_Presuntivo (texto libre)

  * Plan_Actuacion:
  * [1 — Alta in situ con recomendaciones,
        2 — Derivación a Atención Primaria,
        3 — Derivación a Urgencias (medios propios),
        4 — Traslado a Urgencias en ambulancia]

  * Hospital_o_Centro_Destino (texto libre, visible si plan 3 o 4)

* Añadir | Cancelar
* Funcion:

  1. Documento clínico de uso principal para médico y DUE en unidades SVA/VIR.
  2. Documento independiente del Doc-2. No hereda datos. Cubre la valoración y actuación facultativa completa.
  3. Registra fármacos, monitorización avanzada e intervenciones críticas.

* Estados_Transaccion:
* Borrador_En_Curso
* Completado_Firmado
* Anulado_Por_Error

---

## Doc-4

* Nombre: Alta Voluntaria / Negativa de Asistencia y Traslado
* Version 1.0
* Ruta_Componente_Frontend
* Componentes:

* Datos_Asistencia (autocomplete):
  * Fecha, Hora
  * ID_nombre dotación actuante
  * ID_vehiculo

* Filiacion_paciente (p_filiacion):
  * Nombre y apellidos, Edad, DNI/NIE/Pasaporte
  * Ciudad de residencia, Sexo, Teléfono
  * Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

* Evaluacion_Capacidad:
  * [ ] Alerta y orientado (tiempo, espacio y persona)
  * [ ] Ausencia de signos de intoxicación o alteración mental

* Clausulas_Legales:
  * p_alta_voluntaria_informativa
  * p_alta_voluntaria_exencion

* Firmas_y_Consentimiento:
  * Firma_Paciente_o_Tutor_Legal
  * Firma_Sanitario_Responsable
  * Firma_Testigo (opcional)

* Añadir | Cancelar
* Funcion:

  1. Documentar la negativa explícita y consciente del paciente a recibir atención médica o ser evacuado.
  2. Blindar legalmente a los intervinientes y a la empresa ante futuras reclamaciones por omisión de socorro o agravamiento del cuadro clínico.

* Estados_Transaccion:
* Borrador_En_Curso
* Completado_Firmado
* Anulado_Por_Error

---

## Doc-5

* Nombre: Descargo de Responsabilidad (Asunción Facultativa en Escena)
* Version 1.0
* Ruta_Componente_Frontend
* Componentes:

* Datos_Asistencia (autocomplete):
  * Fecha, Hora
  * ID_nombre jefe de dotación
  * ID_vehiculo

* Filiacion_paciente (p_filiacion):
  * Nombre y apellidos, Edad, DNI/NIE/Pasaporte
  * Ciudad de residencia, Sexo, Teléfono
  * Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

* Filiacion_Facultativo_Externo:
  * Nombre y apellidos
  * DNI / NIE / Pasaporte
  * Número de colegiado (obligatorio)
  * Colegio provincial

* Clausulas_Legales:
  * p_transferencia_hospitalaria (adaptado a asunción en escena)
  * Texto_Asuncion_Responsabilidad: "El facultativo abajo firmante, identificándose legalmente y acreditando su titulación mediante el número de colegiación reseñado, interviene de forma voluntaria en la escena y asume expresa e irrevocablemente la total responsabilidad médica, civil y penal sobre el triaje, diagnóstico, tratamiento y asistencia del paciente arriba referenciado."
  * Texto_Transferencia_y_Exencion: "El facultativo comprende y acepta que, al asumir el mando y la dirección clínica de esta intervención, releva de sus funciones y exime de toda responsabilidad legal y subsidiaria a la dotación de la ambulancia y a la entidad gestora. Asimismo, asume la obligación de garantizar la continuidad asistencial, comprometiéndose a gestionar por sus propios medios la derivación o traslado a un centro hospitalario si la evolución clínica del paciente lo hiciera necesario."

* Firmas_y_Consentimiento:
  * Firma_Facultativo_Externo_Asume_Mando
  * Firma_Jefe_Dotacion

* Añadir | Cancelar
* Funcion:

  1. Transferir legalmente la responsabilidad del paciente a un médico ajeno al operativo que decide intervenir y hacerse cargo in situ.
  2. Garantizar que la dotación no incurre en un delito de abandono de paciente al dejarlo en manos de un tercero no perteneciente a la empresa.

* Estados_Transaccion:
* Borrador_En_Curso
* Completado_Firmado
* Anulado_Por_Error

---

## Doc-6

* Nombre: Gasto de material
* Version 1.0
* Ruta_Componente_Frontend
* Componentes
* Modulo_Origen (Vehículo, PSA o Mochila/Backpack)
* Selector_Item (Vinculado a ID_Items de Inventory_Locations)
* Cantidad_Utilizada
* Lote_y_Caducidad (Si aplica por trazabilidad)
* Observaciones
* Timestamp_registro (auto)
* ID_nombre_registrador (auto)
* Añadir | Cancelar
* Funcion:

  1. Ambulancia: Resta automáticamente al stock y genera aviso en "avisos flota" si se alcanza el umbral mínimo.
  2. PSA: Resta automáticamente en el stock global.
  3. Lógica de DB: La resta se ejecuta de forma atómica en el servidor (PostgreSQL) para evitar errores de inventario por concurrencia.

* Estados_Transaccion
* Borrador
* Registrado_y_Descontado

---

## Doc-7

* Nombre: Informe de averías
* Version 1.1
* Ruta_Componente_Frontend
* Componentes:
* ID_vehiculo_afectado
* Nivel_Criticidad:
  * Leve (Permite operativa normal)
  * Moderada (Requiere revisión en < 48h)
  * Grave (Alerta inmediata a coordinación y gerencia)
* Sistema_Afectado:
  * Motor / Mecánica
  * Célula Sanitaria
  * Electromedicina embarcada
  * Señalización Acústico/Luminosa
  * Chapa y Pintura
* Descripcion_Detallada (texto libre)
* Adjuntos (fotografías del daño o panel de mandos)
  * Las fotografías se comprimen obligatoriamente en cliente antes de almacenarse.
  * Formato de salida: WebP, calidad 70 %, dimensión máxima 1200 px (lado mayor).
  * Se almacenan en IndexedDB como Blob (nunca como cadena Base64).
  * Ver nucleo_flota_y_taller.md → Compresión de adjuntos Doc-7 para la spec completa.
* Timestamp_reporte (auto)
* ID_nombre_reportador (auto)
* Timestamp_cambio_estado (auto — registrado en cada transición)
* Añadir | Cancelar
* Funcion:

  1. Reportar fallos en vehículos o equipamiento.
  2. Al guardar, el vehículo afectado pasa automáticamente a estado Averiado (informativo — no bloquea activación). Se notifica a flota y vehículos.
  3. Si el nivel es Grave, se genera además una alerta inmediata dirigida a coordinación y gerencia.

* Estados_Transaccion:
* Reportada_Pendiente
* En_Proceso_Taller
* Reparada_Operativa

---

## Doc-8

* Nombre: Parte de trabajo
* Version 2.0
* Ruta_Componente_Frontend: ninguna — no se abre como formulario. Se genera y rellena automáticamente mientras el usuario interactúa con la app.
* Generacion: uno por check-in de dotación (vehículo + personal emparejado). Si varios ID_nombre comparten vehículo en el mismo turno, comparten el mismo Doc-8.

* Bloques_auto (todos generados por eventos del sistema):

* Bloque_Sesion:
  * ID_nombre(s) de la dotación
  * ID_vehiculo
  * Timestamp check-in (inicio turno)
  * Timestamp check-out (cierre turno)

* Bloque_Estados_Vehiculo (registro cronológico automático):
  * Cada cambio de estado del vehículo genera una entrada:
  * Estado: [Activado, Desactivado, Averiado, Estacionado, En_espera, Ruta]
  * Funcion_operativa: [Programado, Dispositivo, Traslado, Guardia_urgencias, DRP, Privado, Simulacro, Formación]
  * Timestamp_inicio
  * Timestamp_fin (al cambiar al siguiente estado)
  * Km_inicio (al activar)
  * Km_fin (al desactivar)

* Bloque_Repostaje (generado desde nucleo_operativa_rutinaria → Repostar):
  * Tipo: [Gasolinera, Base]
  * Km_marcador
  * Litros
  * Euros (solo si Gasolinera)
  * Timestamp

* Bloque_AdBlue (generado desde nucleo_operativa_rutinaria → AdBlue):
  * Km_marcador
  * Timestamp

* Funcion:

  1. Registrar automáticamente la actividad cronológica del turno para control de RRHH y facturación.
  2. Auditar uso de flota, combustible y kilometraje sin intervención manual del usuario.
  3. El documento permanece abierto (Abierto_En_Turno) hasta el check-out de la dotación.

* Estados_Transaccion:
* Abierto_En_Turno
* Enviado_Cerrado

---

## Doc-9

* Nombre: Entrada de Almacen
* Version 1.0
* Ruta_Componente_Frontend
* Componentes
* Datos_Proveedor
  * Nombre_Proveedor_o_Laboratorio
  * Numero_Albaran_o_Factura
  * Fecha_Recepcion
  * Timestamp_sistema (auto — momento exacto del registro en la app)
  * ID_nombre_registrador (auto)
* Items_Recepcionados (Bucle dinámico)
  * Selector_Item_Catalogo
  * Cantidad_Recibida
  * Numero_Lote
  * Fecha_Caducidad
* Añadir | Cancelar
* Funcion:

  1. Registrar el ingreso oficial de material sanitario y farmacológico desde proveedores externos al Almacén Maestro.
  2. Actualizar positivamente el inventario general habilitando la trazabilidad por lote y caducidad.

* Estados_Transaccion
* Pendiente_Recepcion
* Completado
* Descuadre_Pendiente_Revision

---

## Doc-10

* Nombre: Envío de material (Control de Tránsito)
* Version 2.0
* Ruta_Componente_Frontend
* Componentes:

* Origen_Transferencia:
  * Selector de inventory_location de origen.
  * Cualquier ubicación disponible en el sistema
      (vehículo, backpack, subinventario DRP, almacén).
  * Restricción RBAC:
    * Envíos cuyo origen sea `ID_almacen` solo pueden
        ser iniciados por rol `logística` o `gerencia`.
    * El resto de orígenes son accesibles por cualquier
        rol operativo autorizado.

* Destino_Transferencia:
  * Selector de inventory_location de destino.
  * Cualquier ubicación disponible en el sistema
      (vehículo, backpack, subinventario DRP, almacén).
  * El origen y el destino no pueden ser el mismo.

* Items_Enviados (bucle dinámico — añadir líneas):
  * Selector_Item (vinculado al catálogo del origen)
  * Cantidad_Enviada
  * Numero_Lote (requerido para material crítico)
* Timestamp_envio (auto — al guardar)
* ID_nombre_emisor (auto)
* Timestamp_confirmacion (auto — al confirmar recepción)
* ID_nombre_receptor_confirmador (auto)

* Añadir | Cancelar

* Flujo_Confirmacion_Receptor:

  1. Al guardar el Doc-10, el material pasa a estado
      `En_Transito`: restado del origen, no sumado
      al destino.
  2. El destino recibe una notificación en su bandeja
      de entrada con el detalle del envío pendiente.
  3. El receptor accede al Doc-10 desde su bandeja
      y ejecuta la acción explícita `Confirmar recepción`:
      * Revisa ítem a ítem la cantidad recibida.
      * Si todo coincide → estado `Completado`.
        El stock se suma al destino.
      * Si hay discrepancia en algún ítem → el receptor
        marca la cantidad real recibida y el sistema
        genera automáticamente un `Descuadre_Pendiente_Revision`
        dirigido a logística para resolución manual.
  4. Mientras el Doc-10 esté en `En_Transito` o
      `Pendiente_Validacion`, el material no computa
      ni en origen ni en destino — queda aislado
      contablemente.

* Funcion:

  1. Mover stock entre cualquier par de inventory_locations
      del sistema.
  2. Garantizar trazabilidad completa del material en tránsito
      mediante confirmación explícita del receptor.
  3. Envíos desde `ID_almacen` requieren rol `logística`
      o `gerencia`. El resto de movimientos entre locations
      están disponibles para roles operativos autorizados.
  4. Cualquier discrepancia entre lo enviado y lo recibido
      genera un descuadre auditable en la bandeja de logística.

* Estados_Transaccion:
* En_Transito
* Pendiente_Validacion
* Completado
* Descuadre_Pendiente_Revision

---

## Doc-11

* Nombre: Aviso Urgente
* Version 1.1
* Ruta_Componente_Frontend
* Componentes:
  * Origen_Alerta: ID_Vehiculo o ID_DRP (autocomplete)
  * Departamento_Receptor: [Logística, Gestión de Flota, Coordinación]
  * Nivel_Prioridad:
  * Alta (Requiere atención en el turno actual)
  * Crítica (Rotura de stock vital o inmovilización de unidad — peso tipográfico 900 en UI)
    * Evento_Situacional (texto libre — descripción del evento o situación)
    * Solicitud_o_Aviso (texto libre — detalle de la solicitud)
    * Emisor: ID_nombre (autocomplete con el ID_nombre autenticado)
    * Acuse_de_Recibo: registro automático de quién y cuándo lee el aviso
* Añadir | Cancelar
* Funcion:
      1. Canalizar solicitudes operativas importantes que no pueden esperar al cierre del Doc-8.
      2. Los avisos de nivel Crítico generan alertas visuales inmediatas en las bandejas de entrada correspondientes.
* Estados_Transaccion:
  * Emitida_Pendiente
  * En_Proceso_Lectura
  * Solucionada_Archivada

---

## Doc-12

* Nombre: Solicitud de vacaciones
* Version 1.0
* Ruta_Componente_Frontend
* Componentes
* Datos_Solicitante (ID_nombre, Categoria_Profesional)
* Periodo_Anual_Aplicable
* Seleccion_Preferencias_Quincenales
  * Opcion_1 (Prioridad Alta)
  * Opcion_2 (Prioridad Media)
  * Opcion_3 (Prioridad Baja)
* Observaciones_Empleado
* Resolucion_RRHH (Campo exclusivo para Respuesta y Motivo)
* Timestamp_solicitud (auto — al enviar)
* Timestamp_resolucion (auto — al aprobar o denegar)
* ID_nombre_resolutor (auto)
* Añadir | Cancelar
* Funcion:

  1. Estructurar la peticion de periodos vacacionales.
  2. El componente esta inactivo/oculto en el DOM del usuario hasta que el rol `RRHH` habilita el periodo de solicitudes a nivel global en el sistema.

* Estados_Transaccion
* Borrador
* Pendiente_Aprobacion
* Aprobada
* Denegada

---

## Doc-13

* Nombre: Propuestas y quejas (Buzón interno)
* Version 1.1
* Ruta_Componente_Frontend
* Componentes:
* Tipologia_Comunicacion:
  * Queja / Incidencia laboral
  * Propuesta de mejora operativa
  * Otro
* Emisor: ID_nombre / Opción de envío anónimo
  * Si anónimo: el sistema disocia cualquier metadato identificativo del terminal o usuario emisor.
* Asunto (texto libre)
* Descripcion_Detallada (texto libre)
* Adjuntos_Evidencias (opcional)
* Añadir | Cancelar
* Funcion:

  1. Establecer un canal oficial y auditable para la comunicación entre la plantilla y gerencia.
  2. Al guardar, el mensaje se envía a través del sistema interno de mensajería al rol gerencia.
      No se genera email externo.

* Estados_Transaccion:
* Enviada
* Leida_Archivada

---

## Doc-Checklist360

* Nombre: Revisión 360º del vehículo
* Version 1.0
* RBAC_Crear: `tes`, `flota`, `gerencia`
* Módulo: nucleo_operativa_rutinaria
* Ruta_Componente_Frontend
* Componentes

* Datos_auto:
  * ID_vehiculo
  * ID_nombre revisores
  * Timestamp_inicio_revision
  * Timestamp_fin_revision

**Nota para el programador**
El mayor desafío técnico en los relevos es la fatiga de reporte. Si un vehículo tiene un arañazo en el lateral derecho desde hace un mes, el técnico no debería tener que describirlo todos los días.
Para resolver esto a nivel de base de datos, se diseña una consulta que recupere el último checklist del vehículo. Si el ítem "Trazabilidad de Daños y Visibilidad" tenía un estado de OBSERVACION en el turno anterior, la UI carga el ítem pre-rellenado con la advertencia: "Incidencia reportada en el turno anterior. ¿El estado ha empeorado?". Si el técnico indica que no, el sistema marca es_incidencia_heredada = true y clona los datos, agilizando la revisión sin perder el rigor perimetral.

Para garantizar la operatividad de los vehículos de emergencia bajo el principio de no-obstrucción: si la petición de la API a Supabase sufre un timeout o devuelve un error por falta de conectividad (ej. base en zona de sombra de cobertura), la lógica de React debe capturar el error silenciosamente, inicializar el store de herencia vacío, y permitir al técnico realizar un checklist estándar desde cero. La aplicación jamás debe quedar bloqueada en estado de loading esperando el historial.

La lógica de herencia tiene que soportar una relación 1:N (un ítem del checklist -> múltiples averías registradas). Esto es crítico para componentes perimetrales genéricos como Trazabilidad de Daños y Visibilidad, donde el vehículo puede presentar simultáneamente una abolladura en la aleta izquierda y un arañazo en la puerta trasera derecha correspondientes a incidentes distintos.

Cuando el técnico llega a un apartado con "es_incidencia_heredada" como puede ser "Trazabilidad de Daños y Visibilidad" en la app, no salen los botones normales (OK, OBS, INO, NA)
Aparece una frase que dice: "Estan reportados estos daños previos".
Debajo, aparece una lista clara:
  🔴 Aleta delantera izquierda: Arañazo profundo (con su foto en pequeño).
  🔴 Puerta trasera derecha: Abolladura por golpe contra pivote (con su foto en pequeño).
Justo debajo de esa lista, la aplicación le hace una sola pregunta directa al técnico: "¿Todo sigue igual o hay daños nuevos?"
Aquí le damos dos botones grandes:
  Botón A: "Todo sigue igual"
  El técnico da una vuelta a la ambulancia, ve que esos dos golpes siguen ahí y que no hay nada nuevo. Pulsa este botón.
  Qué hace la app: Internamente, hace un "copia y pega" de esos dos golpes para el turno de hoy, le pone el tick verde a toda la revisión de la chapa, y el técnico pasa al siguiente punto. Cero papeleo repetitivo.
  Botón B: "Modificar o añadir daños" (El botón de problemas)
  El técnico da la vuelta y ve que, además de los golpes viejos, alguien le ha reventado un piloto trasero por la noche o le ha hecho un arañazo nuevo en el capó. Pulsa este botón.
  Qué hace la app: Le mantiene la lista de los golpes viejos (para que no tenga que volver a escribirlos), pero le abre un botón de "+ Añadir nuevo daño". El técnico pulsa ahí, elige "Capó", le hace la foto al arañazo nuevo, guarda, y listo.

Resumen:
"Necesito que un mismo ítem del checklist (como la chapa exterior) pueda almacenar una lista de varias averías a la vez, no solo una."
"Al iniciar el turno, la app debe buscar si hay una lista de averías previas en ese ítem y mostrarlas todas juntas en pantalla."
"Debe haber un botón general que permita validar de golpe toda esa lista heredada para no obligar al técnico a confirmar los golpes uno por uno."

    * **campos base [ ]** (estado_evaluacion (Enum): OK, OBSERVACION, INOPERATIVO, NO APLICA [OK/OBS/INO/NA], observaciones [Texto], es_incidencia_heredada: Tipo [BOOLEAN]. Valor por defecto [false]).
      Si estado_evaluacion = (INOPERATIVO u OBSERVACIÓN), la interfaz despliega un selector de Tipo de Avería.
      Si estado evaluacion = (NO APLICA) indica que ese campo, parámetro o regla no es relevante, válido o necesario para el registro o caso de uso.
      es_incidencia_heredada: Permite a la coordinación distinguir si una fila de la base de datos representa un daño reportado por primera vez o la simple re-confirmación visual de un daño del turno anterior.

* **items_checklist**
* Frente:
  * [OK] Integridad del parabrisas y escobillas limpiaparabrisas
  * [OBS, INO] zona_afectada (Multiselect): Lado Conductor, Lado Copiloto, Centro.
               tipo_dano (Select): Impacto/Cráter, Fisura extendida, Escobillas cuarteadas.

  * [OK] Funcionamiento de ópticas principales frontales (cruce, carretera, intermitentes)
  * [OBS, INO] foco_averiado (Multiselect): Cruce Izq, Cruce Der, Largas Izq, Largas Der, Int. Izq D, Int. Der D, Antiniebla D.
               tipo_averia_optica (Select): Bombilla/LED fundido, Carcasa rota, Fallo eléctrico general.

  * [OK] Parrilla delantera y luces de emergencia frontales (estroboscópicas/LED)
  * [OBS, INO] tipo_averia_emergencia (Multiselect): Módulo LED fundido, Rotura física/Impacto, Fallo de sincronización/Relé, Humedad interior/Empañamiento.
               ubicacion_exacta (Select): Parrilla Izquierda, Parrilla Derecha, Intersección Izq, Intersección Der.

* Lateral_Derecho:
  * Neumáticos delantero y trasero derechos
    * [OK] Presión teórica y estado de la banda de rodadura
    * [OBS, INO] neumatico_afectado (Select): Delantero Derecho, Trasero Derecho.
                   tipo_anomalia (Select): Presión baja, Pinchazo activo, Desgaste por debajo del testigo (1.6mm), Desgaste irregular (paralelo).

    * [OK] Inspección de desgaste irregular y daños estructurales en los flancos (bultos o cortes)
    * [OBS, INO] tipo_dano_flanco (Select): Corte profundo (mallas a la vista), Deformación/Huevo, Roce severo por bordillo.

  * [OK] Integridad del retrovisor derecho
  * [OBS, INO] panel_afectado (Multiselect): Conjunto, Espejo grande (arriba), Carcasa luz intermitente, Carcasa espejo, Espejo pequeño (abajo).
               tipo_dano_carroceria (Select): Cuarteado, Roto/Rajado, Falta pieza, Arrancado.

  * [OK] Apertura, cierre y bloqueo de la puerta lateral de acceso a célula sanitaria
  * [OBS, INO] falla_puerta (Select): Atasco en carril/rodillos, Fallo en cierre centralizado, Tirador exterior roto, Bloqueo de seguridad (90º) inoperativo.

  * [OK] Despliegue del peldaño lateral (si dispone de mecanismo retráctil automático)
  * [OBS, INO] falla_peldano (Select): Motor atascado/quemado, Sensor de apertura fallido, Estructura doblada por impacto.

* Trasera:
  * [OK] Funcionamiento de ópticas traseras (freno, marcha atrás, antiniebla, intermitencia)
  * [OBS, INO] foco_averiado (Multiselect): Freno Izq, Freno Der, Marcha atrás, Antiniebla T, Int. Izq T, Int. Der T.
               tipo_averia_optica (Select): Bombilla/LED fundido, Carcasa rota, Fallo eléctrico general.

  * [OK] Operatividad de la cámara o sensores de marcha atrás
  * [OBS, INO] falla_asistencia (Select): Lente de cámara rota/opaca, Sin señal de video/audio en cabina, Sensor acústico dañado/hundido.

  * [OK] Luces de emergencia posteriores y focos de iluminación de escena perimetral (búsqueda)
  * [OBS, INO] foco_afectado (Multiselect): Puente trasero, Foco escena Izq, Foco escena Der.
               tipo_averia (Select): Módulo fundido, Carcasa rota, Fallo eléctrico.

  * [OK] Apertura total a 180º/270º de las puertas traseras y bloqueo de bisagras
  * [OBS, INO] falla_puerta_trasera (Select): Bisagra descolgada, Fallo cierre imantado/inercial a 270º, Gomas de estanqueidad rotas.

  * [OK] Estado del peldaño trasero
  * [OBS, INO] falla_peldano_trasero (Select): Superficie antideslizante arrancada, Estructura doblada, Anclajes sueltos.

  * [OK] Rueda de repuesto
  * [OBS, INO] falla_repuesto (Select): Presión baja, Neumático caducado/dañado, Mecanismo de extracción (torno) bloqueado, Inexistente.

* Lateral_Izquierdo:
  * Neumáticos delantero y trasero izquierdos:
    * [OK] Presión teórica y estado de la banda de rodadura
    * [OBS, INO] neumatico_afectado (Select): Delantero Izquierdo, Trasero Izquierdo.
                   tipo_anomalia (Select): Presión baja, Pinchazo activo, Desgaste por debajo del testigo (1.6mm), Desgaste irregular.

    * [OK] Inspección de desgaste irregular y daños estructurales en los flancos (bultos o cortes)
    * [OBS, INO] tipo_dano_flanco (Select): Corte profundo, Deformación/Huevo, Roce severo.

  * [OK] Integridad del retrovisor izquierdo
  * [OBS, INO] panel_afectado (Multiselect): Conjunto, Espejo grande (arriba), Carcasa luz intermitente, Carcasa espejo, Espejo pequeño (abajo).
               tipo_dano_carroceria (Select): Cuarteado, Roto/Rajado, Falta pieza, Arrancado.

  * [OK] Inspección de bajos del vehículo: ausencia de fugas de fluidos
  * [OBS, INO] fluido_identificado (Select): Aceite motor, Líquido de frenos, Refrigerante, Valvulina/Transmisión, Combustible.
               severidad_fuga (Select): Rezume/Mancha leve, Goteo activo, Charco en el suelo.

  * [OK] Conexión de toma de corriente externa (Power-line) desconectada
  * [OBS, INO] falla_toma (Select): Eyector automático inoperativo, Pines quemados/sulfatados, Tapa de protección arrancada.

  * [OK] Estado de las puertas, bisagras y cierres de los compartimentos exteriores de acceso rápido
  * [OBS, INO] compartimento_afectado (Select): Arcón botellas O2, Arcón tablero espinal, Compartimento baterías.
               falla_arcon (Select): Cerradura rota, Bisagra cedida, Amortiguador a gas vencido.

* Cabina_y_Sistemas:
  * [OK] Comprobación del cuadro de mandos (ausencia de testigos de avería)
  * [OBS, INO] testigo_encendido (Multiselect): MIL (Avería Motor), ABS/ESP, TPMS (Presión Neumáticos), Sistema de Frenos, Batería/Alternador.

  * [OK] Verificación de niveles: aceite, limpiaparabrisas, combustible, AdBlue
  * [OBS, INO] nivel_deficiente (Multiselect): Aceite por debajo del mínimo, Sin líquido limpiaparabrisas, Combustible en reserva, AdBlue requiere relleno.

  * [OK] Prueba del panel de control: puente de luces y sirena (tonos wail, yelp, phaser)
  * [OBS, INO] falla_acustica (Select): Altavoz frontal roto/mudo, Amplificador quemado, Fallo en botonera/consola de control.

  * [OK] Megafonía exterior operativa
  * [OBS, INO] falla_pa (Select): Micrófono roto/cable pelado, Audio inaudible, Distorsión severa.

  * [OK] Chalecos reflectantes presentes
  * [OBS, INO] falla_chalecos (Select): Faltan unidades (dotación incompleta), Estado de degradación alto.

  * [OK] Sistemas de climatización e iluminación: célula conducción y célula sanitaria
  * [OBS, INO] zona_clima_afectada (Select): Cabina Conducción, Célula Sanitaria.
               falla_clima (Select): Compresor A/C no arranca, Fuga de gas/No enfría, Ventilador extractor/intractor roto, Iluminación interior fundida.

* Trazabilidad de Daños y Visibilidad (Perímetro Integral)
  * [OK] Inspección de daños estructurales previos en chapa y pintura no registrados
  * [OBS, INO] nuevo_dano_detectado (Texto libre): Descripción breve del impacto no presente en el turno anterior.

  * [OK] Integridad de la rotulación de alta visibilidad (patrón Battenburg) y de los catadióptricos/material reflectante
  * [OBS, INO] zona_rotulacion_afectada (Select): Frontal, Lateral Derecho, Trasera, Lateral Izquierdo.
               tipo_falla_visibilidad (Select): Vinilo desprendido/arrancado, Pérdida total de reflectancia, Catadióptrico roto.

* **Adaptación Modular para Vehículos de Intervención Rápida (VIR) 4x4**

* Frontal / Perímetro:
  * [OK, NA] Inspección visual del cabrestante (winch): estado del cable/cuerda, gancho y guía
  * [OBS, INO] elemento_winch_afectado (Multiselect): Cable/Cuerda sintética, Gancho/Seguro, Guía (rodillos o fija), Toma de conexión del mando.
                   tipo_averia_winch (Select): Cable deshilachado/pellizcado, Óxido severo o mecanismo atascado, Embrague no engrana/desengrana, Seguro del gancho roto.

  * [OK, NA] Toma de aire elevada (snorkel): integridad del conducto y capuchón libre de obstrucciones
  * [OBS, INO] tipo_anomalia_snorkel (Select): Conducto rajado/fisurado (pérdida de estanqueidad), Capuchón obstruido (hojas/barro), Anclajes a la carrocería arrancados o sueltos.

* Bajos y Tren de Rodaje:
  * [OK, NA] Integridad de las placas protectoras de duraluminio (cárter, caja de cambios y tránsfer)
  * [OBS, INO] placa_afectada (Multiselect): Protector de Cárter/Motor, Protector de Caja de Cambios, Protector de Caja de Transferencia, Protector de Depósito.
                   tipo_dano_placa (Select): Abolladura crítica (presiona la mecánica), Tornillería arrancada (placa colgando), Fisura estructural.

  * [OK, NA] Ausencia de elementos extraños atrapados en los ejes de transmisión o diferenciales
  * [OBS, INO] zona_obstruccion (Multiselect): Palieres delanteros, Árbol de transmisión central, Diferencial trasero, Línea de escape.
                   tipo_elemento_atrapado (Select): Ramas/Maleza gruesa enrollada, Alambres/Cuerdas, Acumulación crítica de barro solidificado.

    * Guardar | Cancelar
    * Funcion:
          1. Verificar el estado operativo y de seguridad del vehículo.
          2. Registrar incidencias detectadas para su trazabilidad en flota.
          3. Tipo de vehículo aplicable: pendiente de definir (la plantilla actual es genérica).
    * Estados_Transaccion:
      * Completado
      * Completado_Con_Incidencias
