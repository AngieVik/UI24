# repositorio_documentos

    * Doc-1
      * Nombre: Informe D.R.P.
      * Version 1.0
      * Ruta_Componente_Frontend
      * Componentes_auto:
          - fecha, hora_inicio, nombre_drp
          - ID_vehiculo (si existe)
          - ID_nombre dotación (todos los que entraron al DRP)
      * Registro_asistencias (tabla dinámica, append-only):
          - timestamp_registro
          - ID_nombre_registrador
          - p_filiacion (Nombre y apellidos, Edad, DNI/NIE/Pasaporte, Ciudad de residencia, Sexo, Teléfono)
          - Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)
          - Motivo_asistencia (texto libre)
          - Resolucion (texto libre)
      * Funcion:
          1. Al crear un DRP, se genera automáticamente un Doc-1 vinculado. Estado inicial: Planificado_Pendiente.
          2. Al activarse el DRP (estado En_Curso), el Doc-1 pasa a Activo_En_Curso. Los terminales activos en el DRP pueden añadir asistencias desde visual_info_drp.
          3. Cada asistencia añadida se registra con timestamp e ID_nombre del registrador. No se pueden editar ni eliminar entradas ya guardadas (trazabilidad completa).
          4. Si hay varios terminales en el mismo DRP, todos escriben en el mismo Doc-1.
          5. Se guarda con copia de seguridad en IndexedDB y Supabase mientras está activo.
          6. Al finalizar el DRP manualmente, el Doc-1 pasa a Finalizado_Cerrado. Solo Gerencia, Coordinación y RRHH pueden consultarlo.
          7. Exportable a PDF.
      * Estados_Transaccion:
          - Planificado_Pendiente
          - Activo_En_Curso
          - Finalizado_Cerrado
---
    - Doc-2
     - Nombre: Informe Asistencial Básico y Triaje
     - Version 2.0
     - Ruta_Componente_Frontend
     - Componentes:

      - Datos_Asistencia (autocomplete):
       - Fecha, Hora
       - ID_nombre dotación actuante
       - ID_vehiculo

      - Filiacion_paciente (p_filiacion):
       - Nombre y apellidos, Edad, DNI/NIE/Pasaporte
       - Ciudad de residencia, Sexo, Teléfono
       - Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

      - Cinematica_Trauma_Naturaleza_Enfermedad:
       - Tipo: [Trauma, Enfermedad médica, Intoxicación, Obstétrico, Psiquiátrico, Otro]
       - Descripcion_mecanismo (texto breve)

      - Evaluacion_Primaria_XABCDE:
       - X — Control hemorragia exanguinante:
        - [Sin hemorragia exanguinante, Hemorragia controlada, Hemorragia no controlada]
        - Notas (texto libre)
       - A — Vía aérea:
        - [Permeable, Obstruida parcial, Obstruida total, Manejada con dispositivo]
        - Notas (texto libre)
       - B — Ventilación:
        - [Adecuada, Inadecuada, Apnea]
        - FR (rpm): valor numérico
        - Patron: [Normal, Taquipnea, Bradipnea]
        - SpO2 (%): valor numérico
        - Notas (texto libre)
       - C — Circulación:
        - FC (lpm): valor numérico
        - TA (mmHg): sistólica / diastólica
        - Tiempo_relleno_capilar: [< 2s (Normal), 2–4s (Retardado), > 4s (Ausente)]
        - Piel: [Normal, Pálida, Sudorosa, Cianótica, Marmórea]
        - Notas (texto libre)
       - D — Déficit neurológico:
        - Glasgow_Coma_Scale:
         - Ocular: [1, 2, 3, 4]
         - Verbal: [1, 2, 3, 4, 5]
         - Motora: [1, 2, 3, 4, 5, 6]
         - Total: cálculo automático (editable)
        - Pupilas:
         - Simetria: [Isocóricas, Anisocóricas]
         - Tamaño: [Normales, Mióticas, Midriáticas]
         - Reactividad_Izquierda: [Reactiva, Arreactiva, Perezosa]
         - Reactividad_Derecha: [Reactiva, Arreactiva, Perezosa]
        - Notas (texto libre)
       - E — Exposición y control térmico:
        - [Sin hallazgos relevantes, Lesiones visibles, Hipotermia, Hipertermia]
        - Temperatura_corporal (ºC): valor numérico
        - Notas (texto libre)

      - Anamnesis_SAMPLE:
       - Signos_y_sintomas (texto libre)
       - Alergias (texto libre)
       - Medicacion_habitual (texto libre)
       - Patologias_previas (texto libre)
       - Ultima_ingesta (texto libre)
       - Eventos_previos (texto libre)

      - Constantes_vitales (toma principal — pueden añadirse tomas adicionales con +):
       - Hora_toma
       - TA (mmHg): sistólica / diastólica
       - FC (lpm)
       - FR (rpm): valor numérico + patrón [Normal, Taquipnea, Bradipnea]
       - SpO2 (%)
       - Temperatura (ºC)
       - Glucosa (mg/dl)
       - Escala_Dolor_EVA (0–10): slider numérico

      - Categorizacion_Triaje:
       - [Rojo — Emergencia, Naranja — Muy urgente, Amarillo — Urgente, Verde — Menos urgente, Azul/Negro — No urgente / Éxitus]

      - Medidas_aplicadas (multiselect con checkboxes, competencias TES):
       - Control de hemorragias (X / C):
        - [ ] Compresión directa
        - [ ] Vendaje compresivo
        - [ ] Torniquete (Extremidad)
        - [ ] Torniquete (Unión / Empaquetamiento hemostático)
        - [ ] Faja pélvica / Pelvic binder
       - Manejo vía aérea (A):
        - [ ] Apertura manual (Frente-mentón / Tracción mandibular)
        - [ ] Aspiración de secreciones
        - [ ] Cánula orofaríngea (Guedel)
        - [ ] Cánula nasofaríngea
       - Ventilación y oxigenoterapia (B):
        - [ ] Oxigenoterapia: Gafas nasales
        - [ ] Oxigenoterapia: Mascarilla con reservorio
        - [ ] Ventilación con balón resucitador (BVM)
        - [ ] Sello torácico (Parche oclusivo valvulado)
       - Soporte circulatorio y reanimación (C):
        - [ ] RCP Básica (Compresiones torácicas)
        - [ ] DEA (Desfibrilación Externa Automatizada) aplicada
        - [ ] Posición antishock (Trendelenburg modificado)
       - Traumatología e inmovilización (E):
        - [ ] Restricción movimientos espinales (Collarín cervical)
        - [ ] Inmovilización de cabeza (Dama de Elche)
        - [ ] Extricación (Ferno-KED / Boa)
        - [ ] Tablero espinal / Camilla tipo cuchara
        - [ ] Colchón de vacío
        - [ ] Férula de vacío / Férula rígida
        - [ ] Férula de tracción
       - Otras medidas:
        - [ ] Posición Lateral de Seguridad (PLS)
        - [ ] Control térmico (Manta aluminizada / calor activo)
        - [ ] Lavado ocular / Irrigación de heridas
        - [ ] Acompañamiento / Apoyo psicológico
       - Otras_medidas_notas (texto libre)

      - Resolucion:
       - Tipo: [Alta in situ, Rechaza asistencia / Alta voluntaria, Traslado a Centro Útil, Transferencia a SVA, Éxitus]
       - Nota: si se selecciona "Rechaza asistencia / Alta voluntaria", se muestra aviso informativo:
         "Recuerda abrir el Doc-4 si el paciente firma el alta voluntaria."
       - Notas_resolucion (texto libre)

     - Añadir | Cancelar
     - Funcion:
      1. Registrar la asistencia prehospitalaria de dotaciones SVB (TES).
      2. Evaluar, estabilizar y categorizar la gravedad clínica mediante protocolo XABCDE + SAMPLE + triaje.
      3. No administra ni registra fármacos — esa función corresponde al Doc-3.
     - Estados_Transaccion:
      - Borrador_En_Curso
      - Completado_Firmado
      - Anulado_Por_Error
---
    - Doc-3
     - Nombre: Informe Clínico
     - Version 2.0
     - RBAC_Crear: médico, due (lectura: todos los roles operativos en v1.0)
     - Ruta_Componente_Frontend
     - Componentes:

      - Datos_Asistencia (autocomplete):
       - Fecha, Hora
       - ID_nombre facultativo actuante
       - ID_vehiculo

      - Filiacion_Paciente:
       - Nombre y apellidos
       - DNI / NIE / Pasaporte
       - Fecha de nacimiento

      - Evaluacion_Clinica:

       - Alergias_Medicamentosas:
        - Desplegable multiselect:
         - Sin alergias conocidas (NAMC)
         - Betalactámicos
         - AINEs
         - Quimioterápicos
         - Antiepilépticos
         - Sulfamidas
         - Quinolonas
         - Macrólidos
         - Medios de contraste
         - Biológicos y Mabs
         - Bloqueantes neuromusculares
         - Anestésicos (generales/locales)
         - Hipouricemiantes (Alopurinol)
         - IECAs
         - Opioides
         - Otras (especificar — texto libre)

       - Antecedentes_Personales (texto libre)

       - Anamnesis (tomas — primera obligatoria, añadir más con +):
        - Hora_toma
        - TA (mmHg)
        - FC (lpm)
        - FR (rpm)
        - SpO2 (%)
        - Temperatura (ºC)
        - Glucosa (mg/dl)

       - Exploracion_Fisica (texto libre)

      - Resolucion_y_Plan:

       - Bloque_Via_Aerea_Ventilacion:
        - Tipo_manejo: [Espontánea, Cánula orofaríngea, Dispositivo supraglótico, Intubación endotraqueal]
        - Parametros_respirador: Vt, FR, PEEP, FiO2
        - Capnografia_EtCO2

       - Bloque_Hemodinamico_Monitorizacion:
        - Ritmo_ECG_inicial
        - Ritmo_ECG_final
        - Vias_venosas_canalizadas: [Periférica, Intraósea, Central]
        - Terapias_electricas_aplicadas (Julios)

       - Bloque_Farmacologico (bucle dinámico — añadir líneas):
        - Farmaco_administrado (texto / vademécum)
        - Dosis_y_unidades: valor + unidad [mg, mcg, UI, ml]
        - Via_administracion: [IV, IM, SC, VO, SL, INH]
        - Hora_exacta_administracion

       - Juicio_Clinico_Diagnostico_Presuntivo (texto libre)

       - Plan_Actuacion:
        - [1 — Alta in situ con recomendaciones,
           2 — Derivación a Atención Primaria,
           3 — Derivación a Urgencias (medios propios),
           4 — Traslado a Urgencias en ambulancia]

       - Hospital_o_Centro_Destino (texto libre, visible si plan 3 o 4)

     - Añadir | Cancelar
     - Funcion:
      1. Documento clínico de uso principal para médico y DUE en unidades SVA/VIR.
      2. Documento independiente del Doc-2. No hereda datos. Cubre la valoración y actuación facultativa completa.
      3. Registra fármacos, monitorización avanzada e intervenciones críticas.
     - Estados_Transaccion:
      - Borrador_En_Curso
      - Completado_Firmado
      - Anulado_Por_Error
---
    - Doc-4
     - Nombre: Alta Voluntaria / Negativa de Asistencia y Traslado
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes:

      - Datos_Asistencia (autocomplete):
       - Fecha, Hora
       - ID_nombre dotación actuante
       - ID_vehiculo

      - Filiacion_paciente (p_filiacion):
       - Nombre y apellidos, Edad, DNI/NIE/Pasaporte
       - Ciudad de residencia, Sexo, Teléfono
       - Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

      - Evaluacion_Capacidad:
       - [ ] Alerta y orientado (tiempo, espacio y persona)
       - [ ] Ausencia de signos de intoxicación o alteración mental

      - Clausulas_Legales:
       - p_alta_voluntaria_informativa
       - p_alta_voluntaria_exencion

      - Firmas_y_Consentimiento:
       - Firma_Paciente_o_Tutor_Legal
       - Firma_Sanitario_Responsable
       - Firma_Testigo (opcional)

     - Añadir | Cancelar
     - Funcion:
      1. Documentar la negativa explícita y consciente del paciente a recibir atención médica o ser evacuado.
      2. Blindar legalmente a los intervinientes y a la empresa ante futuras reclamaciones por omisión de socorro o agravamiento del cuadro clínico.
     - Estados_Transaccion:
      - Borrador_En_Curso
      - Completado_Firmado
      - Anulado_Por_Error
---
    - Doc-5
     - Nombre: Descargo de Responsabilidad (Asunción Facultativa en Escena)
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes:

      - Datos_Asistencia (autocomplete):
       - Fecha, Hora
       - ID_nombre jefe de dotación
       - ID_vehiculo

      - Filiacion_paciente (p_filiacion):
       - Nombre y apellidos, Edad, DNI/NIE/Pasaporte
       - Ciudad de residencia, Sexo, Teléfono
       - Si menor: Datos Padre/Madre/Tutor (Nombre y apellidos, DNI/NIE/Pasaporte)

      - Filiacion_Facultativo_Externo:
       - Nombre y apellidos
       - DNI / NIE / Pasaporte
       - Número de colegiado (obligatorio)
       - Colegio provincial

      - Clausulas_Legales:
       - p_transferencia_hospitalaria (adaptado a asunción en escena)
       - Texto_Asuncion_Responsabilidad: "El facultativo abajo firmante, identificándose legalmente y acreditando su titulación mediante el número de colegiación reseñado, interviene de forma voluntaria en la escena y asume expresa e irrevocablemente la total responsabilidad médica, civil y penal sobre el triaje, diagnóstico, tratamiento y asistencia del paciente arriba referenciado."
       - Texto_Transferencia_y_Exencion: "El facultativo comprende y acepta que, al asumir el mando y la dirección clínica de esta intervención, releva de sus funciones y exime de toda responsabilidad legal y subsidiaria a la dotación de la ambulancia y a la entidad gestora. Asimismo, asume la obligación de garantizar la continuidad asistencial, comprometiéndose a gestionar por sus propios medios la derivación o traslado a un centro hospitalario si la evolución clínica del paciente lo hiciera necesario."

      - Firmas_y_Consentimiento:
       - Firma_Facultativo_Externo_Asume_Mando
       - Firma_Jefe_Dotacion

     - Añadir | Cancelar
     - Funcion:
      1. Transferir legalmente la responsabilidad del paciente a un médico ajeno al operativo que decide intervenir y hacerse cargo in situ.
      2. Garantizar que la dotación no incurre en un delito de abandono de paciente al dejarlo en manos de un tercero no perteneciente a la empresa.
     - Estados_Transaccion:
      - Borrador_En_Curso
      - Completado_Firmado
      - Anulado_Por_Error
---
    - Doc-6
     - Nombre: Gasto de material
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes
      - Modulo_Origen (Vehículo, PSA o Mochila/Backpack)
      - Selector_Item (Vinculado a ID_Items de Inventory_Locations)
      - Cantidad_Utilizada
      - Lote_y_Caducidad (Si aplica por trazabilidad)
      - Observaciones
      - Timestamp_registro (auto)
      - ID_nombre_registrador (auto)
     - Añadir | Cancelar
     - Funcion:
      1. Ambulancia: Resta automáticamente al stock y genera aviso en "avisos flota" si se alcanza el umbral mínimo.
      2. PSA: Resta automáticamente en el stock global.
      3. Lógica de DB: La resta se ejecuta de forma atómica en el servidor (PostgreSQL) para evitar errores de inventario por concurrencia.
     - Estados_Transaccion
      - Borrador
      - Registrado_y_Descontado
---
    - Doc-7
     - Nombre: Informe de averías
     - Version 1.1
     - Ruta_Componente_Frontend
     - Componentes:
      - ID_vehiculo_afectado
      - Nivel_Criticidad:
       - Leve (Permite operativa normal)
       - Moderada (Requiere revisión en < 48h)
       - Grave (Alerta inmediata a coordinación y gerencia)
      - Sistema_Afectado:
       - Motor / Mecánica
       - Célula Sanitaria
       - Electromedicina embarcada
       - Señalización Acústico/Luminosa
       - Chapa y Pintura
      - Descripcion_Detallada (texto libre)
      - Adjuntos (fotografías del daño o panel de mandos)
      - Timestamp_reporte (auto)
      - ID_nombre_reportador (auto)
      - Timestamp_cambio_estado (auto — registrado en cada transición)
     - Añadir | Cancelar
     - Funcion:
      1. Reportar fallos en vehículos o equipamiento.
      2. Al guardar, el vehículo afectado pasa automáticamente a estado Averiado (informativo — no bloquea activación). Se notifica a flota y vehículos.
      3. Si el nivel es Grave, se genera además una alerta inmediata dirigida a coordinación y gerencia.
     - Estados_Transaccion:
      - Reportada_Pendiente
      - En_Proceso_Taller
      - Reparada_Operativa
---
    - Doc-8
     - Nombre: Parte de trabajo
     - Version 2.0
     - Ruta_Componente_Frontend: ninguna — no se abre como formulario. Se genera y rellena automáticamente mientras el usuario interactúa con la app.
     - Generacion: uno por check-in de dotación (vehículo + personal emparejado). Si varios ID_nombre comparten vehículo en el mismo turno, comparten el mismo Doc-8.

     - Bloques_auto (todos generados por eventos del sistema):

      - Bloque_Sesion:
       - ID_nombre(s) de la dotación
       - ID_vehiculo
       - Timestamp check-in (inicio turno)
       - Timestamp check-out (cierre turno)

      - Bloque_Estados_Vehiculo (registro cronológico automático):
       - Cada cambio de estado del vehículo genera una entrada:
        - Estado: [Activado, Desactivado, Averiado, Estacionado, En_espera, Ruta]
        - Funcion_operativa: [Programado, Dispositivo, Traslado, Guardia_urgencias, DRP, Privado, Simulacro, Formación]
        - Timestamp_inicio
        - Timestamp_fin (al cambiar al siguiente estado)
        - Km_inicio (al activar)
        - Km_fin (al desactivar)

      - Bloque_Repostaje (generado desde nucleo_operativa_rutinaria → Repostar):
       - Tipo: [Gasolinera, Base]
       - Km_marcador
       - Litros
       - Euros (solo si Gasolinera)
       - Timestamp

      - Bloque_AdBlue (generado desde nucleo_operativa_rutinaria → AdBlue):
       - Km_marcador
       - Timestamp

     - Funcion:
      1. Registrar automáticamente la actividad cronológica del turno para control de RRHH y facturación.
      2. Auditar uso de flota, combustible y kilometraje sin intervención manual del usuario.
      3. El documento permanece abierto (Abierto_En_Turno) hasta el check-out de la dotación.
     - Estados_Transaccion:
      - Abierto_En_Turno
      - Enviado_Cerrado
---
    - Doc-9
     - Nombre: Entrada de Almacen
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes
      - Datos_Proveedor
       - Nombre_Proveedor_o_Laboratorio
       - Numero_Albaran_o_Factura
       - Fecha_Recepcion
       - Timestamp_sistema (auto — momento exacto del registro en la app)
       - ID_nombre_registrador (auto)
      - Items_Recepcionados (Bucle dinámico)
       - Selector_Item_Catalogo
       - Cantidad_Recibida
       - Numero_Lote
       - Fecha_Caducidad
     - Añadir | Cancelar
     - Funcion:
      1. Registrar el ingreso oficial de material sanitario y farmacológico desde proveedores externos al Almacén Maestro.
      2. Actualizar positivamente el inventario general habilitando la trazabilidad por lote y caducidad.
     - Estados_Transaccion
      - Pendiente_Recepcion
      - Completado
      - Descuadre_Pendiente_Revision
---
    - Doc-10
     - Nombre: Envío de material (Control de Tránsito)
     - Version 2.0
     - Ruta_Componente_Frontend
     - Componentes:

      - Origen_Transferencia:
       - Selector de inventory_location de origen.
       - Cualquier ubicación disponible en el sistema
         (vehículo, backpack, subinventario DRP, almacén).
       - Restricción RBAC:
         * Envíos cuyo origen sea `ID_almacen` solo pueden
           ser iniciados por rol `logística` o `gerencia`.
         * El resto de orígenes son accesibles por cualquier
           rol operativo autorizado.

      - Destino_Transferencia:
       - Selector de inventory_location de destino.
       - Cualquier ubicación disponible en el sistema
         (vehículo, backpack, subinventario DRP, almacén).
       - El origen y el destino no pueden ser el mismo.

      - Items_Enviados (bucle dinámico — añadir líneas):
       - Selector_Item (vinculado al catálogo del origen)
       - Cantidad_Enviada
       - Numero_Lote (requerido para material crítico)
      - Timestamp_envio (auto — al guardar)
      - ID_nombre_emisor (auto)
      - Timestamp_confirmacion (auto — al confirmar recepción)
      - ID_nombre_receptor_confirmador (auto)

     - Añadir | Cancelar

     - Flujo_Confirmacion_Receptor:
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

     - Funcion:
      1. Mover stock entre cualquier par de inventory_locations
         del sistema.
      2. Garantizar trazabilidad completa del material en tránsito
         mediante confirmación explícita del receptor.
      3. Envíos desde `ID_almacen` requieren rol `logística`
         o `gerencia`. El resto de movimientos entre locations
         están disponibles para roles operativos autorizados.
      4. Cualquier discrepancia entre lo enviado y lo recibido
         genera un descuadre auditable en la bandeja de logística.

     - Estados_Transaccion:
      - En_Transito
      - Pendiente_Validacion
      - Completado
      - Descuadre_Pendiente_Revision
---
    * Doc-11
      * Nombre: Aviso Urgente
      * Version 1.1
      * Ruta_Componente_Frontend
      * Componentes:
          - Origen_Alerta: ID_Vehiculo o ID_DRP (autocomplete)
          - Departamento_Receptor: [Logística, Gestión de Flota, Coordinación]
          - Nivel_Prioridad:
        * Alta (Requiere atención en el turno actual)
        * Crítica (Rotura de stock vital o inmovilización de unidad — peso tipográfico 900 en UI)
          - Evento_Situacional (texto libre — descripción del evento o situación)
          - Solicitud_o_Aviso (texto libre — detalle de la solicitud)
          - Emisor: ID_nombre (autocomplete con el ID_nombre autenticado)
          - Acuse_de_Recibo: registro automático de quién y cuándo lee el aviso
      * Añadir | Cancelar
      * Funcion:
          1. Canalizar solicitudes operativas importantes que no pueden esperar al cierre del Doc-8.
          2. Los avisos de nivel Crítico generan alertas visuales inmediatas en las bandejas de entrada correspondientes.
      * Estados_Transaccion:
          - Emitida_Pendiente
          - En_Proceso_Lectura
          - Solucionada_Archivada
---
    - Doc-12
     - Nombre: Solicitud de vacaciones
     - Version 1.0
     - Ruta_Componente_Frontend
     - Componentes
      - Datos_Solicitante (ID_nombre, Categoria_Profesional)
      - Periodo_Anual_Aplicable
      - Seleccion_Preferencias_Quincenales
       - Opcion_1 (Prioridad Alta)
       - Opcion_2 (Prioridad Media)
       - Opcion_3 (Prioridad Baja)
      - Observaciones_Empleado
      - Resolucion_RRHH (Campo exclusivo para Respuesta y Motivo)
      - Timestamp_solicitud (auto — al enviar)
      - Timestamp_resolucion (auto — al aprobar o denegar)
      - ID_nombre_resolutor (auto)
     - Añadir | Cancelar
     - Funcion:
      1. Estructurar la peticion de periodos vacacionales.
      2. El componente esta inactivo/oculto en el DOM del usuario hasta que el rol `RRHH` habilita el periodo de solicitudes a nivel global en el sistema.
     - Estados_Transaccion
      - Borrador
      - Pendiente_Aprobacion
      - Aprobada
      - Denegada
---
    - Doc-13
     - Nombre: Propuestas y quejas (Buzón interno)
     - Version 1.1
     - Ruta_Componente_Frontend
     - Componentes:
      - Tipologia_Comunicacion:
       - Queja / Incidencia laboral
       - Propuesta de mejora operativa
       - Otro
      - Emisor: ID_nombre / Opción de envío anónimo
       - Si anónimo: el sistema disocia cualquier metadato identificativo del terminal o usuario emisor.
      - Asunto (texto libre)
      - Descripcion_Detallada (texto libre)
      - Adjuntos_Evidencias (opcional)
     - Añadir | Cancelar
     - Funcion:
      1. Establecer un canal oficial y auditable para la comunicación entre la plantilla y gerencia.
      2. Al guardar, el mensaje se envía a través del sistema interno de mensajería al rol gerencia.
         No se genera email externo.
     - Estados_Transaccion:
      - Enviada
      - Leida_Archivada
---
    * Doc-Checklist360
      * Nombre: Revisión 360º del vehículo
      * Version 1.0
      * RBAC_Crear: `tes`, `flota`, `gerencia`
      * Módulo: nucleo_operativa_rutinaria
      * Ruta_Componente_Frontend
      * Componentes:

          - Datos_auto:
           - ID_vehiculo
           - ID_nombre revisores
           - Timestamp_inicio_revision
           - Timestamp_fin_revision

          - Frente:
           - [ ] Integridad del parabrisas y escobillas limpiaparabrisas
           - [ ] Funcionamiento de ópticas principales frontales (cruce, carretera, intermitentes)
           - [ ] Parrilla delantera y luces de emergencia frontales (estroboscópicas/LED)

          - Lateral_Derecho:
           - [ ] Presión teórica y estado de la banda de rodadura (eje delantero y trasero derechos)
           - [ ] Integridad de la chapa y elementos reflectantes
           - [ ] Apertura, cierre y bloqueo de la puerta lateral de acceso a célula sanitaria
           - [ ] Despliegue del peldaño lateral (si dispone de mecanismo retráctil automático)

          - Trasera:
           - [ ] Funcionamiento de ópticas traseras (freno, marcha atrás, antiniebla, intermitencia)
           - [ ] Luces de emergencia posteriores y focos de iluminación de escena perimetral (búsqueda)
           - [ ] Apertura total a 180º/270º de las puertas traseras y bloqueo de bisagras
           - [ ] Rueda de repuesto

          - Lateral_Izquierdo:
           - [ ] Presión y estado de neumáticos (eje delantero y trasero izquierdos)
           - [ ] Inspección de bajos del vehículo: ausencia de fugas de fluidos (aceite, refrigerante, líquido de frenos)
           - [ ] Conexión de toma de corriente externa (Power-line) desconectada

          - Cabina_y_Sistemas:
           - [ ] Comprobación del cuadro de mandos (ausencia de testigos de avería)
           - [ ] Verificación de niveles: aceite, limpiaparabrisas, combustible
           - [ ] Prueba del panel de control: puente de luces y sirena (tonos wail, yelp, phaser)
           - [ ] Megafonía exterior operativa
           - [ ] Chalecos reflectantes presentes
           - [ ] Sistemas de climatización e iluminación: célula conducción y célula sanitaria

          - Incidencias_Detectadas (texto libre — opcional):
           - Campo abierto para registrar cualquier anomalía no cubierta por los ítems anteriores

      * Guardar | Cancelar
      * Funcion:
          1. Verificar el estado operativo y de seguridad del vehículo antes de iniciar el turno o servicio.
          2. Registrar incidencias detectadas para su trazabilidad en flota.
          3. Tipo de vehículo aplicable: pendiente de definir (la plantilla actual es genérica).
      * Estados_Transaccion:
          - Completado
          - Completado_Con_Incidencias
