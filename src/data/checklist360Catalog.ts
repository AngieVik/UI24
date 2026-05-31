// ── Tipos ─────────────────────────────────────────────────────

export type EstadoEvaluacion = 'OK' | 'OBSERVACION' | 'INOPERATIVO' | 'NO_APLICA'

export interface SubField {
  /** Clave en campos_extra */
  key: string
  label: string
  type: 'select' | 'multiselect' | 'text'
  options?: string[]
  /** Si es requerido cuando el estado es OBS o INO */
  required?: boolean
}

export interface ChecklistItem {
  /** Slug único — clave en el JSONB items_revisados */
  id: string
  label: string
  /** Sub-campos que aparecen cuando estado = OBS o INO */
  subFields: SubField[]
  /** Solo visible para vehículos tipo VIR */
  soloVIR?: boolean
}

export interface ChecklistSection {
  id: string
  label: string
  items: ChecklistItem[]
}

// ── Catálogo ──────────────────────────────────────────────────

export const CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: 'frente',
    label: 'Frente',
    items: [
      {
        id: 'parabrisas_escobillas',
        label: 'Integridad del parabrisas y escobillas limpiaparabrisas',
        subFields: [
          {
            key: 'zona_afectada',
            label: 'Zona afectada',
            type: 'multiselect',
            options: ['Lado Conductor', 'Lado Copiloto', 'Centro'],
            required: true,
          },
          {
            key: 'tipo_dano',
            label: 'Tipo de daño',
            type: 'select',
            options: ['Impacto/Cráter', 'Fisura extendida', 'Escobillas cuarteadas'],
          },
        ],
      },
      {
        id: 'opticas_frontales',
        label: 'Funcionamiento de ópticas principales frontales (cruce, carretera, intermitentes)',
        subFields: [
          {
            key: 'foco_averiado',
            label: 'Foco averiado',
            type: 'multiselect',
            options: [
              'Cruce Izq',
              'Cruce Der',
              'Largas Izq',
              'Largas Der',
              'Int. Izq D',
              'Int. Der D',
              'Antiniebla D',
            ],
            required: true,
          },
          {
            key: 'tipo_averia_optica',
            label: 'Tipo de avería',
            type: 'select',
            options: ['Bombilla/LED fundido', 'Carcasa rota', 'Fallo eléctrico general'],
          },
        ],
      },
      {
        id: 'parrilla_emergencias',
        label: 'Parrilla delantera y luces de emergencia frontales (estroboscópicas/LED)',
        subFields: [
          {
            key: 'tipo_averia_emergencia',
            label: 'Tipo de avería',
            type: 'multiselect',
            options: [
              'Módulo LED fundido',
              'Rotura física/Impacto',
              'Fallo de sincronización/Relé',
              'Humedad interior/Empañamiento',
            ],
            required: true,
          },
          {
            key: 'ubicacion_exacta',
            label: 'Ubicación exacta',
            type: 'select',
            options: [
              'Parrilla Izquierda',
              'Parrilla Derecha',
              'Intersección Izq',
              'Intersección Der',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'lateral_derecho',
    label: 'Lateral derecho',
    items: [
      {
        id: 'neumaticos_presion_der',
        label: 'Neumáticos D — Presión teórica y estado de la banda de rodadura',
        subFields: [
          {
            key: 'neumatico_afectado',
            label: 'Neumático afectado',
            type: 'select',
            options: ['Delantero Derecho', 'Trasero Derecho'],
            required: true,
          },
          {
            key: 'tipo_anomalia',
            label: 'Tipo de anomalía',
            type: 'select',
            options: [
              'Presión baja',
              'Pinchazo activo',
              'Desgaste por debajo del testigo (1.6mm)',
              'Desgaste irregular (paralelo)',
            ],
          },
        ],
      },
      {
        id: 'neumaticos_flancos_der',
        label: 'Neumáticos D — Desgaste irregular y daños estructurales en flancos',
        subFields: [
          {
            key: 'tipo_dano_flanco',
            label: 'Tipo de daño en flanco',
            type: 'select',
            options: [
              'Corte profundo (mallas a la vista)',
              'Deformación/Huevo',
              'Roce severo por bordillo',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'retrovisor_der',
        label: 'Integridad del retrovisor derecho',
        subFields: [
          {
            key: 'panel_afectado',
            label: 'Panel afectado',
            type: 'multiselect',
            options: [
              'Conjunto',
              'Espejo grande (arriba)',
              'Carcasa luz intermitente',
              'Carcasa espejo',
              'Espejo pequeño (abajo)',
            ],
            required: true,
          },
          {
            key: 'tipo_dano_carroceria',
            label: 'Tipo de daño',
            type: 'select',
            options: ['Cuarteado', 'Roto/Rajado', 'Falta pieza', 'Arrancado'],
          },
        ],
      },
      {
        id: 'puerta_lateral',
        label: 'Apertura, cierre y bloqueo de la puerta lateral de acceso a célula sanitaria',
        subFields: [
          {
            key: 'falla_puerta',
            label: 'Fallo en puerta lateral',
            type: 'select',
            options: [
              'Atasco en carril/rodillos',
              'Fallo en cierre centralizado',
              'Tirador exterior roto',
              'Bloqueo de seguridad (90º) inoperativo',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'peldano_lateral',
        label: 'Despliegue del peldaño lateral (mecanismo retráctil automático)',
        subFields: [
          {
            key: 'falla_peldano',
            label: 'Fallo en peldaño lateral',
            type: 'select',
            options: [
              'Motor atascado/quemado',
              'Sensor de apertura fallido',
              'Estructura doblada por impacto',
            ],
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'trasera',
    label: 'Trasera',
    items: [
      {
        id: 'opticas_traseras',
        label:
          'Funcionamiento de ópticas traseras (freno, marcha atrás, antiniebla, intermitencia)',
        subFields: [
          {
            key: 'foco_averiado',
            label: 'Foco averiado',
            type: 'multiselect',
            options: [
              'Freno Izq',
              'Freno Der',
              'Marcha atrás',
              'Antiniebla T',
              'Int. Izq T',
              'Int. Der T',
            ],
            required: true,
          },
          {
            key: 'tipo_averia_optica',
            label: 'Tipo de avería',
            type: 'select',
            options: ['Bombilla/LED fundido', 'Carcasa rota', 'Fallo eléctrico general'],
          },
        ],
      },
      {
        id: 'camara_marcha_atras',
        label: 'Operatividad de la cámara o sensores de marcha atrás',
        subFields: [
          {
            key: 'falla_asistencia',
            label: 'Fallo en asistencia',
            type: 'select',
            options: [
              'Lente de cámara rota/opaca',
              'Sin señal de video/audio en cabina',
              'Sensor acústico dañado/hundido',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'emergencias_traseras',
        label: 'Luces de emergencia posteriores y focos de iluminación de escena perimetral',
        subFields: [
          {
            key: 'foco_afectado',
            label: 'Foco afectado',
            type: 'multiselect',
            options: ['Puente trasero', 'Foco escena Izq', 'Foco escena Der'],
            required: true,
          },
          {
            key: 'tipo_averia',
            label: 'Tipo de avería',
            type: 'select',
            options: ['Módulo fundido', 'Carcasa rota', 'Fallo eléctrico'],
          },
        ],
      },
      {
        id: 'puertas_traseras',
        label: 'Apertura total a 180º/270º de las puertas traseras y bloqueo de bisagras',
        subFields: [
          {
            key: 'falla_puerta_trasera',
            label: 'Fallo en puertas traseras',
            type: 'select',
            options: [
              'Bisagra descolgada',
              'Fallo cierre imantado/inercial a 270º',
              'Gomas de estanqueidad rotas',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'peldano_trasero',
        label: 'Estado del peldaño trasero',
        subFields: [
          {
            key: 'falla_peldano_trasero',
            label: 'Fallo en peldaño trasero',
            type: 'select',
            options: [
              'Superficie antideslizante arrancada',
              'Estructura doblada',
              'Anclajes sueltos',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'rueda_repuesto',
        label: 'Rueda de repuesto',
        subFields: [
          {
            key: 'falla_repuesto',
            label: 'Fallo en rueda de repuesto',
            type: 'select',
            options: [
              'Presión baja',
              'Neumático caducado/dañado',
              'Mecanismo de extracción (torno) bloqueado',
              'Inexistente',
            ],
            required: true,
          },
        ],
      },
    ],
  },
  {
    id: 'lateral_izquierdo',
    label: 'Lateral izquierdo',
    items: [
      {
        id: 'neumaticos_presion_izq',
        label: 'Neumáticos I — Presión teórica y estado de la banda de rodadura',
        subFields: [
          {
            key: 'neumatico_afectado',
            label: 'Neumático afectado',
            type: 'select',
            options: ['Delantero Izquierdo', 'Trasero Izquierdo'],
            required: true,
          },
          {
            key: 'tipo_anomalia',
            label: 'Tipo de anomalía',
            type: 'select',
            options: [
              'Presión baja',
              'Pinchazo activo',
              'Desgaste por debajo del testigo (1.6mm)',
              'Desgaste irregular',
            ],
          },
        ],
      },
      {
        id: 'neumaticos_flancos_izq',
        label: 'Neumáticos I — Desgaste irregular y daños estructurales en flancos',
        subFields: [
          {
            key: 'tipo_dano_flanco',
            label: 'Tipo de daño en flanco',
            type: 'select',
            options: ['Corte profundo', 'Deformación/Huevo', 'Roce severo'],
            required: true,
          },
        ],
      },
      {
        id: 'retrovisor_izq',
        label: 'Integridad del retrovisor izquierdo',
        subFields: [
          {
            key: 'panel_afectado',
            label: 'Panel afectado',
            type: 'multiselect',
            options: [
              'Conjunto',
              'Espejo grande (arriba)',
              'Carcasa luz intermitente',
              'Carcasa espejo',
              'Espejo pequeño (abajo)',
            ],
            required: true,
          },
          {
            key: 'tipo_dano_carroceria',
            label: 'Tipo de daño',
            type: 'select',
            options: ['Cuarteado', 'Roto/Rajado', 'Falta pieza', 'Arrancado'],
          },
        ],
      },
      {
        id: 'fugas_fluidos',
        label: 'Inspección de bajos del vehículo: ausencia de fugas de fluidos',
        subFields: [
          {
            key: 'fluido_identificado',
            label: 'Fluido identificado',
            type: 'select',
            options: [
              'Aceite motor',
              'Líquido de frenos',
              'Refrigerante',
              'Valvulina/Transmisión',
              'Combustible',
            ],
            required: true,
          },
          {
            key: 'severidad_fuga',
            label: 'Severidad de fuga',
            type: 'select',
            options: ['Rezume/Mancha leve', 'Goteo activo', 'Charco en el suelo'],
          },
        ],
      },
      {
        id: 'toma_corriente',
        label: 'Conexión de toma de corriente externa (Power-line) desconectada',
        subFields: [
          {
            key: 'falla_toma',
            label: 'Fallo en toma de corriente',
            type: 'select',
            options: [
              'Eyector automático inoperativo',
              'Pines quemados/sulfatados',
              'Tapa de protección arrancada',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'compartimentos_exteriores',
        label: 'Estado de las puertas y cierres de los compartimentos exteriores de acceso rápido',
        subFields: [
          {
            key: 'compartimento_afectado',
            label: 'Compartimento afectado',
            type: 'select',
            options: ['Arcón botellas O2', 'Arcón tablero espinal', 'Compartimento baterías'],
            required: true,
          },
          {
            key: 'falla_arcon',
            label: 'Tipo de fallo',
            type: 'select',
            options: ['Cerradura rota', 'Bisagra cedida', 'Amortiguador a gas vencido'],
          },
        ],
      },
    ],
  },
  {
    id: 'cabina_sistemas',
    label: 'Cabina y sistemas',
    items: [
      {
        id: 'cuadro_mandos',
        label: 'Comprobación del cuadro de mandos (ausencia de testigos de avería)',
        subFields: [
          {
            key: 'testigo_encendido',
            label: 'Testigo encendido',
            type: 'multiselect',
            options: [
              'MIL (Avería Motor)',
              'ABS/ESP',
              'TPMS (Presión Neumáticos)',
              'Sistema de Frenos',
              'Batería/Alternador',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'niveles',
        label: 'Verificación de niveles: aceite, limpiaparabrisas, combustible, AdBlue',
        subFields: [
          {
            key: 'nivel_deficiente',
            label: 'Nivel deficiente',
            type: 'multiselect',
            options: [
              'Aceite por debajo del mínimo',
              'Sin líquido limpiaparabrisas',
              'Combustible en reserva',
              'AdBlue requiere relleno',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'panel_luces_sirena',
        label: 'Prueba del panel de control: puente de luces y sirena (tonos wail, yelp, phaser)',
        subFields: [
          {
            key: 'falla_acustica',
            label: 'Fallo acústico',
            type: 'select',
            options: [
              'Altavoz frontal roto/mudo',
              'Amplificador quemado',
              'Fallo en botonera/consola de control',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'megafonia',
        label: 'Megafonía exterior operativa',
        subFields: [
          {
            key: 'falla_pa',
            label: 'Fallo en PA',
            type: 'select',
            options: ['Micrófono roto/cable pelado', 'Audio inaudible', 'Distorsión severa'],
            required: true,
          },
        ],
      },
      {
        id: 'chalecos',
        label: 'Chalecos reflectantes presentes',
        subFields: [
          {
            key: 'falla_chalecos',
            label: 'Fallo en chalecos',
            type: 'select',
            options: ['Faltan unidades (dotación incompleta)', 'Estado de degradación alto'],
            required: true,
          },
        ],
      },
      {
        id: 'climatizacion',
        label: 'Sistemas de climatización e iluminación: célula conducción y célula sanitaria',
        subFields: [
          {
            key: 'zona_clima_afectada',
            label: 'Zona afectada',
            type: 'select',
            options: ['Cabina Conducción', 'Célula Sanitaria'],
            required: true,
          },
          {
            key: 'falla_clima',
            label: 'Tipo de fallo',
            type: 'select',
            options: [
              'Compresor A/C no arranca',
              'Fuga de gas/No enfría',
              'Ventilador extractor/intractor roto',
              'Iluminación interior fundida',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'trazabilidad',
    label: 'Trazabilidad de daños y visibilidad',
    items: [
      {
        id: 'danos_previos_chapa',
        label: 'Inspección de daños estructurales previos en chapa y pintura no registrados',
        subFields: [
          {
            key: 'nuevo_dano_detectado',
            label: 'Descripción del daño',
            type: 'text',
            required: true,
          },
        ],
      },
      {
        id: 'rotulacion_visibilidad',
        label:
          'Integridad de la rotulación de alta visibilidad (patrón Battenburg) y catadióptricos',
        subFields: [
          {
            key: 'zona_rotulacion_afectada',
            label: 'Zona afectada',
            type: 'select',
            options: ['Frontal', 'Lateral Derecho', 'Trasera', 'Lateral Izquierdo'],
            required: true,
          },
          {
            key: 'tipo_falla_visibilidad',
            label: 'Tipo de fallo',
            type: 'select',
            options: [
              'Vinilo desprendido/arrancado',
              'Pérdida total de reflectancia',
              'Catadióptrico roto',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'vir',
    label: 'Adaptación VIR 4x4',
    items: [
      {
        id: 'cabrestante',
        label: 'Cabrestante (winch): estado del cable/cuerda, gancho y guía',
        soloVIR: true,
        subFields: [
          {
            key: 'elemento_winch_afectado',
            label: 'Elemento afectado',
            type: 'multiselect',
            options: [
              'Cable/Cuerda sintética',
              'Gancho/Seguro',
              'Guía (rodillos o fija)',
              'Toma de conexión del mando',
            ],
            required: true,
          },
          {
            key: 'tipo_averia_winch',
            label: 'Tipo de avería',
            type: 'select',
            options: [
              'Cable deshilachado/pellizcado',
              'Óxido severo o mecanismo atascado',
              'Embrague no engrana/desengrana',
              'Seguro del gancho roto',
            ],
          },
        ],
      },
      {
        id: 'snorkel',
        label:
          'Toma de aire elevada (snorkel): integridad del conducto y capuchón libre de obstrucciones',
        soloVIR: true,
        subFields: [
          {
            key: 'tipo_anomalia_snorkel',
            label: 'Tipo de anomalía',
            type: 'select',
            options: [
              'Conducto rajado/fisurado (pérdida de estanqueidad)',
              'Capuchón obstruido (hojas/barro)',
              'Anclajes a la carrocería arrancados o sueltos',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'placas_protectoras',
        label: 'Placas protectoras de duraluminio (cárter, caja de cambios y tránsfer)',
        soloVIR: true,
        subFields: [
          {
            key: 'placa_afectada',
            label: 'Placa afectada',
            type: 'multiselect',
            options: [
              'Protector de Cárter/Motor',
              'Protector de Caja de Cambios',
              'Protector de Caja de Transferencia',
              'Protector de Depósito',
            ],
            required: true,
          },
          {
            key: 'tipo_dano_placa',
            label: 'Tipo de daño',
            type: 'select',
            options: [
              'Abolladura crítica (presiona la mecánica)',
              'Tornillería arrancada (placa colgando)',
              'Fisura estructural',
            ],
          },
        ],
      },
      {
        id: 'transmision_diffs',
        label: 'Ausencia de elementos extraños en ejes de transmisión o diferenciales',
        soloVIR: true,
        subFields: [
          {
            key: 'zona_obstruccion',
            label: 'Zona de obstrucción',
            type: 'multiselect',
            options: [
              'Palieres delanteros',
              'Árbol de transmisión central',
              'Diferencial trasero',
              'Línea de escape',
            ],
            required: true,
          },
          {
            key: 'tipo_elemento_atrapado',
            label: 'Tipo de elemento atrapado',
            type: 'select',
            options: [
              'Ramas/Maleza gruesa enrollada',
              'Alambres/Cuerdas',
              'Acumulación crítica de barro solidificado',
            ],
          },
        ],
      },
    ],
  },
]

/** Todos los ítems aplanados (sin filtrar VIR) */
export const ALL_ITEMS: ChecklistItem[] = CHECKLIST_SECTIONS.flatMap((s) => s.items)

/** Items visibles para un vehículo dado */
export function getVisibleItems(esVIR: boolean): ChecklistItem[] {
  return ALL_ITEMS.filter((item) => !item.soloVIR || esVIR)
}
