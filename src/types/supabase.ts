export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activaciones_vehiculo: {
        Row: {
          carry: string | null
          id_activacion: string
          km_fin: number | null
          km_inicio: number | null
          matricula: string
          pilot: string
          timestamp_apertura: string
          timestamp_cierre: string | null
        }
        Insert: {
          carry?: string | null
          id_activacion?: string
          km_fin?: number | null
          km_inicio?: number | null
          matricula: string
          pilot: string
          timestamp_apertura?: string
          timestamp_cierre?: string | null
        }
        Update: {
          carry?: string | null
          id_activacion?: string
          km_fin?: number | null
          km_inicio?: number | null
          matricula?: string
          pilot?: string
          timestamp_apertura?: string
          timestamp_cierre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activaciones_vehiculo_carry_fkey"
            columns: ["carry"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "activaciones_vehiculo_matricula_fkey"
            columns: ["matricula"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["matricula"]
          },
          {
            foreignKeyName: "activaciones_vehiculo_pilot_fkey"
            columns: ["pilot"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      auditoria_inventario: {
        Row: {
          cantidad_delta: number
          created_at: string
          entidad_imputable_id: string | null
          entidad_imputable_tipo:
            | Database["public"]["Enums"]["entidad_imputable"]
            | null
          id_auditoria: string
          id_item: number
          id_nombre_operador: string
          location_destino: string | null
          location_origen: string | null
          motivo: string | null
          rpc_ejecutada: string | null
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_inventario"]
        }
        Insert: {
          cantidad_delta: number
          created_at?: string
          entidad_imputable_id?: string | null
          entidad_imputable_tipo?:
            | Database["public"]["Enums"]["entidad_imputable"]
            | null
          id_auditoria?: string
          id_item: number
          id_nombre_operador: string
          location_destino?: string | null
          location_origen?: string | null
          motivo?: string | null
          rpc_ejecutada?: string | null
          tipo_movimiento: Database["public"]["Enums"]["tipo_movimiento_inventario"]
        }
        Update: {
          cantidad_delta?: number
          created_at?: string
          entidad_imputable_id?: string | null
          entidad_imputable_tipo?:
            | Database["public"]["Enums"]["entidad_imputable"]
            | null
          id_auditoria?: string
          id_item?: number
          id_nombre_operador?: string
          location_destino?: string | null
          location_origen?: string | null
          motivo?: string | null
          rpc_ejecutada?: string | null
          tipo_movimiento?: Database["public"]["Enums"]["tipo_movimiento_inventario"]
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_inventario_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id_item"]
          },
        ]
      }
      auditoria_rbac: {
        Row: {
          created_at: string
          id_evento: string
          id_nombre: string | null
          id_terminal: string | null
          ip: string | null
          metadata: Json | null
          tipo_evento: Database["public"]["Enums"]["tipo_evento_rbac"]
        }
        Insert: {
          created_at?: string
          id_evento?: string
          id_nombre?: string | null
          id_terminal?: string | null
          ip?: string | null
          metadata?: Json | null
          tipo_evento: Database["public"]["Enums"]["tipo_evento_rbac"]
        }
        Update: {
          created_at?: string
          id_evento?: string
          id_nombre?: string | null
          id_terminal?: string | null
          ip?: string | null
          metadata?: Json | null
          tipo_evento?: Database["public"]["Enums"]["tipo_evento_rbac"]
        }
        Relationships: []
      }
      catalogo_items: {
        Row: {
          archivado: boolean
          categoria: string
          especificacion: string | null
          id_item: number
          nombre: string
        }
        Insert: {
          archivado?: boolean
          categoria: string
          especificacion?: string | null
          id_item: number
          nombre: string
        }
        Update: {
          archivado?: boolean
          categoria?: string
          especificacion?: string | null
          id_item?: number
          nombre?: string
        }
        Relationships: []
      }
      cuadrante_grupo_miembros: {
        Row: {
          grupo_id: string
          id_nombre: string
        }
        Insert: {
          grupo_id: string
          id_nombre: string
        }
        Update: {
          grupo_id?: string
          id_nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuadrante_grupo_miembros_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "cuadrante_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuadrante_grupo_miembros_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      cuadrante_grupos: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      cuadrante_patrones: {
        Row: {
          creado_por: string
          created_at: string
          id: string
          nombre: string
          secuencia: string[]
        }
        Insert: {
          creado_por: string
          created_at?: string
          id?: string
          nombre: string
          secuencia: string[]
        }
        Update: {
          creado_por?: string
          created_at?: string
          id?: string
          nombre?: string
          secuencia?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "cuadrante_patrones_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      cuadrante_turnos: {
        Row: {
          doc12_id: string | null
          es_excepcion_absoluta: boolean
          fecha: string
          id: number
          id_nombre: string
          timestamp_inyeccion: string
          tipo_turno: Database["public"]["Enums"]["tipo_turno"]
        }
        Insert: {
          doc12_id?: string | null
          es_excepcion_absoluta?: boolean
          fecha: string
          id?: number
          id_nombre: string
          timestamp_inyeccion?: string
          tipo_turno: Database["public"]["Enums"]["tipo_turno"]
        }
        Update: {
          doc12_id?: string | null
          es_excepcion_absoluta?: boolean
          fecha?: string
          id?: number
          id_nombre?: string
          timestamp_inyeccion?: string
          tipo_turno?: Database["public"]["Enums"]["tipo_turno"]
        }
        Relationships: [
          {
            foreignKeyName: "cuadrante_turnos_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      descuadres_inventario: {
        Row: {
          cantidad_diferencia: number
          entidad_imputable_id: string | null
          entidad_imputable_tipo: Database["public"]["Enums"]["entidad_imputable"]
          estado: Database["public"]["Enums"]["estado_descuadre"]
          id_descuadre: string
          id_doc10: string | null
          id_item: number
          id_nombre_resolutor: string | null
          location_destino: string
          location_origen: string
          mutation_uuid: string | null
          timestamp_generacion: string
          timestamp_resolucion: string | null
        }
        Insert: {
          cantidad_diferencia: number
          entidad_imputable_id?: string | null
          entidad_imputable_tipo?: Database["public"]["Enums"]["entidad_imputable"]
          estado?: Database["public"]["Enums"]["estado_descuadre"]
          id_descuadre?: string
          id_doc10?: string | null
          id_item: number
          id_nombre_resolutor?: string | null
          location_destino: string
          location_origen: string
          mutation_uuid?: string | null
          timestamp_generacion?: string
          timestamp_resolucion?: string | null
        }
        Update: {
          cantidad_diferencia?: number
          entidad_imputable_id?: string | null
          entidad_imputable_tipo?: Database["public"]["Enums"]["entidad_imputable"]
          estado?: Database["public"]["Enums"]["estado_descuadre"]
          id_descuadre?: string
          id_doc10?: string | null
          id_item?: number
          id_nombre_resolutor?: string | null
          location_destino?: string
          location_origen?: string
          mutation_uuid?: string | null
          timestamp_generacion?: string
          timestamp_resolucion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "descuadres_inventario_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id_item"]
          },
          {
            foreignKeyName: "descuadres_inventario_id_nombre_resolutor_fkey"
            columns: ["id_nombre_resolutor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc_checklist360: {
        Row: {
          cerrado: boolean
          id_activacion: string
          id_checklist: string
          id_nombre_redactor: string
          items_revisados: Json
          matricula: string
          timestamp_cierre: string | null
          timestamp_inicio: string
        }
        Insert: {
          cerrado?: boolean
          id_activacion: string
          id_checklist?: string
          id_nombre_redactor: string
          items_revisados?: Json
          matricula: string
          timestamp_cierre?: string | null
          timestamp_inicio?: string
        }
        Update: {
          cerrado?: boolean
          id_activacion?: string
          id_checklist?: string
          id_nombre_redactor?: string
          items_revisados?: Json
          matricula?: string
          timestamp_cierre?: string | null
          timestamp_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_checklist360_id_activacion_fkey"
            columns: ["id_activacion"]
            isOneToOne: false
            referencedRelation: "activaciones_vehiculo"
            referencedColumns: ["id_activacion"]
          },
          {
            foreignKeyName: "doc_checklist360_id_nombre_redactor_fkey"
            columns: ["id_nombre_redactor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "doc_checklist360_matricula_fkey"
            columns: ["matricula"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["matricula"]
          },
        ]
      }
      doc_solicitudes_vacaciones: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_solicitud_vacaciones"]
          fecha_fin: string
          fecha_inicio: string
          id: string
          id_nombre: string
          id_nombre_resolutor: string | null
          observaciones: string | null
          periodo_anual: string
          preferencia_seleccion: Database["public"]["Enums"]["preferencia_vacaciones"]
          resolucion_rrhh: string | null
          timestamp_resolucion: string | null
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_solicitud_vacaciones"]
          fecha_fin: string
          fecha_inicio: string
          id?: string
          id_nombre: string
          id_nombre_resolutor?: string | null
          observaciones?: string | null
          periodo_anual: string
          preferencia_seleccion?: Database["public"]["Enums"]["preferencia_vacaciones"]
          resolucion_rrhh?: string | null
          timestamp_resolucion?: string | null
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_solicitud_vacaciones"]
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          id_nombre?: string
          id_nombre_resolutor?: string | null
          observaciones?: string | null
          periodo_anual?: string
          preferencia_seleccion?: Database["public"]["Enums"]["preferencia_vacaciones"]
          resolucion_rrhh?: string | null
          timestamp_resolucion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doc_solicitudes_vacaciones_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "doc_solicitudes_vacaciones_id_nombre_resolutor_fkey"
            columns: ["id_nombre_resolutor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc1_asistencias: {
        Row: {
          id_entrada: string
          id_nombre: string
          terminal_id: string | null
          timestamp_checkin: string
        }
        Insert: {
          id_entrada?: string
          id_nombre: string
          terminal_id?: string | null
          timestamp_checkin?: string
        }
        Update: {
          id_entrada?: string
          id_nombre?: string
          terminal_id?: string | null
          timestamp_checkin?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc1_asistencias_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc10_transferencias: {
        Row: {
          id_nombre_operador: string
          id_transferencia: string
          location_destino: string
          location_origen: string
          timestamp_confirmacion: string | null
          timestamp_envio: string
        }
        Insert: {
          id_nombre_operador: string
          id_transferencia?: string
          location_destino: string
          location_origen: string
          timestamp_confirmacion?: string | null
          timestamp_envio?: string
        }
        Update: {
          id_nombre_operador?: string
          id_transferencia?: string
          location_destino?: string
          location_origen?: string
          timestamp_confirmacion?: string | null
          timestamp_envio?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc10_transferencias_id_nombre_operador_fkey"
            columns: ["id_nombre_operador"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc11_avisos: {
        Row: {
          id_aviso: string
          id_nombre_emisor: string
          leido_por: Json
          nivel: Database["public"]["Enums"]["nivel_aviso"]
          texto: string
          timestamp_publicacion: string
          tipo_aviso: Database["public"]["Enums"]["tipo_aviso"]
        }
        Insert: {
          id_aviso?: string
          id_nombre_emisor: string
          leido_por?: Json
          nivel: Database["public"]["Enums"]["nivel_aviso"]
          texto: string
          timestamp_publicacion?: string
          tipo_aviso: Database["public"]["Enums"]["tipo_aviso"]
        }
        Update: {
          id_aviso?: string
          id_nombre_emisor?: string
          leido_por?: Json
          nivel?: Database["public"]["Enums"]["nivel_aviso"]
          texto?: string
          timestamp_publicacion?: string
          tipo_aviso?: Database["public"]["Enums"]["tipo_aviso"]
        }
        Relationships: [
          {
            foreignKeyName: "doc11_avisos_id_nombre_emisor_fkey"
            columns: ["id_nombre_emisor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc2_informes_svb: {
        Row: {
          auth_uid_redactor: string
          datos_paciente: Json
          estado: Database["public"]["Enums"]["estado_informe"]
          id_activacion: string
          id_doc: string
          id_nombre_redactor: string
          timestamp_asistencia: string
        }
        Insert: {
          auth_uid_redactor: string
          datos_paciente?: Json
          estado?: Database["public"]["Enums"]["estado_informe"]
          id_activacion: string
          id_doc?: string
          id_nombre_redactor: string
          timestamp_asistencia?: string
        }
        Update: {
          auth_uid_redactor?: string
          datos_paciente?: Json
          estado?: Database["public"]["Enums"]["estado_informe"]
          id_activacion?: string
          id_doc?: string
          id_nombre_redactor?: string
          timestamp_asistencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc2_informes_svb_id_activacion_fkey"
            columns: ["id_activacion"]
            isOneToOne: false
            referencedRelation: "activaciones_vehiculo"
            referencedColumns: ["id_activacion"]
          },
          {
            foreignKeyName: "doc2_informes_svb_id_nombre_redactor_fkey"
            columns: ["id_nombre_redactor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc3_informes_sva: {
        Row: {
          auth_uid_redactor: string
          datos_paciente: Json
          estado: Database["public"]["Enums"]["estado_informe"]
          id_activacion: string
          id_doc: string
          id_nombre_redactor: string
          timestamp_asistencia: string
        }
        Insert: {
          auth_uid_redactor: string
          datos_paciente?: Json
          estado?: Database["public"]["Enums"]["estado_informe"]
          id_activacion: string
          id_doc?: string
          id_nombre_redactor: string
          timestamp_asistencia?: string
        }
        Update: {
          auth_uid_redactor?: string
          datos_paciente?: Json
          estado?: Database["public"]["Enums"]["estado_informe"]
          id_activacion?: string
          id_doc?: string
          id_nombre_redactor?: string
          timestamp_asistencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc3_informes_sva_id_activacion_fkey"
            columns: ["id_activacion"]
            isOneToOne: false
            referencedRelation: "activaciones_vehiculo"
            referencedColumns: ["id_activacion"]
          },
          {
            foreignKeyName: "doc3_informes_sva_id_nombre_redactor_fkey"
            columns: ["id_nombre_redactor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc4_consentimientos: {
        Row: {
          auth_uid_redactor: string
          firmado: boolean
          id_activacion: string
          id_doc: string
          id_nombre_redactor: string
          timestamp_firma: string
          tipo_consentimiento: string
        }
        Insert: {
          auth_uid_redactor: string
          firmado?: boolean
          id_activacion: string
          id_doc?: string
          id_nombre_redactor: string
          timestamp_firma?: string
          tipo_consentimiento: string
        }
        Update: {
          auth_uid_redactor?: string
          firmado?: boolean
          id_activacion?: string
          id_doc?: string
          id_nombre_redactor?: string
          timestamp_firma?: string
          tipo_consentimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc4_consentimientos_id_activacion_fkey"
            columns: ["id_activacion"]
            isOneToOne: false
            referencedRelation: "activaciones_vehiculo"
            referencedColumns: ["id_activacion"]
          },
          {
            foreignKeyName: "doc4_consentimientos_id_nombre_redactor_fkey"
            columns: ["id_nombre_redactor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc5_rechazos_alta: {
        Row: {
          auth_uid_redactor: string
          firmado: boolean
          id_activacion: string
          id_doc: string
          id_nombre_redactor: string
          motivo_rechazo: string
          timestamp_rechazo: string
        }
        Insert: {
          auth_uid_redactor: string
          firmado?: boolean
          id_activacion: string
          id_doc?: string
          id_nombre_redactor: string
          motivo_rechazo: string
          timestamp_rechazo?: string
        }
        Update: {
          auth_uid_redactor?: string
          firmado?: boolean
          id_activacion?: string
          id_doc?: string
          id_nombre_redactor?: string
          motivo_rechazo?: string
          timestamp_rechazo?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc5_rechazos_alta_id_activacion_fkey"
            columns: ["id_activacion"]
            isOneToOne: false
            referencedRelation: "activaciones_vehiculo"
            referencedColumns: ["id_activacion"]
          },
          {
            foreignKeyName: "doc5_rechazos_alta_id_nombre_redactor_fkey"
            columns: ["id_nombre_redactor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      doc6_deducciones: {
        Row: {
          cantidad: number
          created_at: string
          id_activacion: string | null
          id_deduccion: string
          id_item: number
          id_nombre_operador: string
          matricula: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id_activacion?: string | null
          id_deduccion?: string
          id_item: number
          id_nombre_operador: string
          matricula: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id_activacion?: string | null
          id_deduccion?: string
          id_item?: number
          id_nombre_operador?: string
          matricula?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc6_deducciones_id_activacion_fkey"
            columns: ["id_activacion"]
            isOneToOne: false
            referencedRelation: "activaciones_vehiculo"
            referencedColumns: ["id_activacion"]
          },
          {
            foreignKeyName: "doc6_deducciones_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id_item"]
          },
          {
            foreignKeyName: "doc6_deducciones_id_nombre_operador_fkey"
            columns: ["id_nombre_operador"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "doc6_deducciones_matricula_fkey"
            columns: ["matricula"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["matricula"]
          },
        ]
      }
      doc7_averias: {
        Row: {
          descripcion_detallada: string | null
          id_averia: string
          id_nombre_redactor: string
          imagen_url: string | null
          matricula: string
          nivel_criticidad: Database["public"]["Enums"]["nivel_criticidad"]
          sistema_afectado: string
          timestamp_incidencia: string
        }
        Insert: {
          descripcion_detallada?: string | null
          id_averia?: string
          id_nombre_redactor: string
          imagen_url?: string | null
          matricula: string
          nivel_criticidad: Database["public"]["Enums"]["nivel_criticidad"]
          sistema_afectado: string
          timestamp_incidencia?: string
        }
        Update: {
          descripcion_detallada?: string | null
          id_averia?: string
          id_nombre_redactor?: string
          imagen_url?: string | null
          matricula?: string
          nivel_criticidad?: Database["public"]["Enums"]["nivel_criticidad"]
          sistema_afectado?: string
          timestamp_incidencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc7_averias_id_nombre_redactor_fkey"
            columns: ["id_nombre_redactor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "doc7_averias_matricula_fkey"
            columns: ["matricula"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["matricula"]
          },
        ]
      }
      doc8_partes_trabajo: {
        Row: {
          cerrado_por_admin_id: string | null
          estado: Database["public"]["Enums"]["estado_parte"]
          id_activacion: string
          id_parte: string
          km_fin: number | null
          km_inicio: number | null
          timestamp_fin: string | null
          timestamp_inicio: string
        }
        Insert: {
          cerrado_por_admin_id?: string | null
          estado?: Database["public"]["Enums"]["estado_parte"]
          id_activacion: string
          id_parte?: string
          km_fin?: number | null
          km_inicio?: number | null
          timestamp_fin?: string | null
          timestamp_inicio?: string
        }
        Update: {
          cerrado_por_admin_id?: string | null
          estado?: Database["public"]["Enums"]["estado_parte"]
          id_activacion?: string
          id_parte?: string
          km_fin?: number | null
          km_inicio?: number | null
          timestamp_fin?: string | null
          timestamp_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc8_partes_trabajo_cerrado_por_admin_id_fkey"
            columns: ["cerrado_por_admin_id"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_persona"]
          },
          {
            foreignKeyName: "doc8_partes_trabajo_id_activacion_fkey"
            columns: ["id_activacion"]
            isOneToOne: true
            referencedRelation: "activaciones_vehiculo"
            referencedColumns: ["id_activacion"]
          },
        ]
      }
      doc9_entradas_almacen: {
        Row: {
          created_at: string
          fecha_recepcion: string
          id_entrada: string
          id_nombre_operador: string
          location_id: string
        }
        Insert: {
          created_at?: string
          fecha_recepcion: string
          id_entrada?: string
          id_nombre_operador: string
          location_id: string
        }
        Update: {
          created_at?: string
          fecha_recepcion?: string
          id_entrada?: string
          id_nombre_operador?: string
          location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc9_entradas_almacen_id_nombre_operador_fkey"
            columns: ["id_nombre_operador"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "doc9_entradas_almacen_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["location_id"]
          },
        ]
      }
      dotaciones_drp: {
        Row: {
          id_drp: string
          matricula: string
          timestamp_entrada: string
          timestamp_salida: string | null
        }
        Insert: {
          id_drp: string
          matricula: string
          timestamp_entrada?: string
          timestamp_salida?: string | null
        }
        Update: {
          id_drp?: string
          matricula?: string
          timestamp_entrada?: string
          timestamp_salida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dotaciones_drp_id_drp_fkey"
            columns: ["id_drp"]
            isOneToOne: false
            referencedRelation: "drps"
            referencedColumns: ["id_drp"]
          },
          {
            foreignKeyName: "dotaciones_drp_matricula_fkey"
            columns: ["matricula"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["matricula"]
          },
        ]
      }
      drp_personal_a_pie: {
        Row: {
          id_drp: string
          id_nombre: string
          timestamp_entrada: string
          timestamp_salida: string | null
          zona_asignada: string | null
        }
        Insert: {
          id_drp: string
          id_nombre: string
          timestamp_entrada?: string
          timestamp_salida?: string | null
          zona_asignada?: string | null
        }
        Update: {
          id_drp?: string
          id_nombre?: string
          timestamp_entrada?: string
          timestamp_salida?: string | null
          zona_asignada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drp_personal_a_pie_id_drp_fkey"
            columns: ["id_drp"]
            isOneToOne: false
            referencedRelation: "drps"
            referencedColumns: ["id_drp"]
          },
          {
            foreignKeyName: "drp_personal_a_pie_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      drps: {
        Row: {
          cancelado_por_id: string | null
          estado: Database["public"]["Enums"]["estado_drp"]
          id_coordinacion: string
          id_drp: string
          timestamp_archivado: string | null
          timestamp_cancelacion: string | null
          timestamp_fin: string | null
          timestamp_inicio: string | null
          timestamp_preparacion: string | null
        }
        Insert: {
          cancelado_por_id?: string | null
          estado?: Database["public"]["Enums"]["estado_drp"]
          id_coordinacion: string
          id_drp?: string
          timestamp_archivado?: string | null
          timestamp_cancelacion?: string | null
          timestamp_fin?: string | null
          timestamp_inicio?: string | null
          timestamp_preparacion?: string | null
        }
        Update: {
          cancelado_por_id?: string | null
          estado?: Database["public"]["Enums"]["estado_drp"]
          id_coordinacion?: string
          id_drp?: string
          timestamp_archivado?: string | null
          timestamp_cancelacion?: string | null
          timestamp_fin?: string | null
          timestamp_inicio?: string | null
          timestamp_preparacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drps_cancelado_por_id_fkey"
            columns: ["cancelado_por_id"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_persona"]
          },
          {
            foreignKeyName: "drps_id_coordinacion_fkey"
            columns: ["id_coordinacion"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      eventos_fisicos_vehiculo: {
        Row: {
          descripcion: string | null
          id_evento: string
          id_nombre_registrador: string
          matricula: string
          timestamp_evento: string
          tipo_evento: string
        }
        Insert: {
          descripcion?: string | null
          id_evento?: string
          id_nombre_registrador: string
          matricula: string
          timestamp_evento?: string
          tipo_evento: string
        }
        Update: {
          descripcion?: string | null
          id_evento?: string
          id_nombre_registrador?: string
          matricula?: string
          timestamp_evento?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_fisicos_vehiculo_id_nombre_registrador_fkey"
            columns: ["id_nombre_registrador"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "eventos_fisicos_vehiculo_matricula_fkey"
            columns: ["matricula"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["matricula"]
          },
        ]
      }
      fichas_empleados: {
        Row: {
          activo: boolean
          auth_user_id: string
          dni: string | null
          fecha_alta: string
          fecha_baja: string | null
          id_nombre: string
          id_persona: string
          nombre_real: string
          pin_stepup_hash: string | null
          pin_stepup_salt: string | null
          rgpd_suprimido_at: string | null
          rol: Database["public"]["Enums"]["rol_empleado"]
        }
        Insert: {
          activo?: boolean
          auth_user_id: string
          dni?: string | null
          fecha_alta?: string
          fecha_baja?: string | null
          id_nombre: string
          id_persona?: string
          nombre_real: string
          pin_stepup_hash?: string | null
          pin_stepup_salt?: string | null
          rgpd_suprimido_at?: string | null
          rol: Database["public"]["Enums"]["rol_empleado"]
        }
        Update: {
          activo?: boolean
          auth_user_id?: string
          dni?: string | null
          fecha_alta?: string
          fecha_baja?: string | null
          id_nombre?: string
          id_persona?: string
          nombre_real?: string
          pin_stepup_hash?: string | null
          pin_stepup_salt?: string | null
          rgpd_suprimido_at?: string | null
          rol?: Database["public"]["Enums"]["rol_empleado"]
        }
        Relationships: []
      }
      filiacion_eventos: {
        Row: {
          detalle: string | null
          filiacion_id: string
          id_evento: string
          id_nombre_actor: string
          paciente_id: string
          timestamp_evento: string
          tipo_evento: string
        }
        Insert: {
          detalle?: string | null
          filiacion_id: string
          id_evento?: string
          id_nombre_actor: string
          paciente_id: string
          timestamp_evento?: string
          tipo_evento: string
        }
        Update: {
          detalle?: string | null
          filiacion_id?: string
          id_evento?: string
          id_nombre_actor?: string
          paciente_id?: string
          timestamp_evento?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "filiacion_eventos_filiacion_id_fkey"
            columns: ["filiacion_id"]
            isOneToOne: false
            referencedRelation: "filiacion_sesiones"
            referencedColumns: ["id_sesion"]
          },
          {
            foreignKeyName: "filiacion_eventos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "filiacion_pacientes"
            referencedColumns: ["id_paciente"]
          },
        ]
      }
      filiacion_pacientes: {
        Row: {
          estado: Database["public"]["Enums"]["estado_paciente_filiacion"]
          id_paciente: string
          id_sesion: string
          timestamp_admision: string
          timestamp_fin_consulta: string | null
          timestamp_inicio_consulta: string | null
        }
        Insert: {
          estado?: Database["public"]["Enums"]["estado_paciente_filiacion"]
          id_paciente?: string
          id_sesion: string
          timestamp_admision?: string
          timestamp_fin_consulta?: string | null
          timestamp_inicio_consulta?: string | null
        }
        Update: {
          estado?: Database["public"]["Enums"]["estado_paciente_filiacion"]
          id_paciente?: string
          id_sesion?: string
          timestamp_admision?: string
          timestamp_fin_consulta?: string | null
          timestamp_inicio_consulta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filiacion_pacientes_id_sesion_fkey"
            columns: ["id_sesion"]
            isOneToOne: false
            referencedRelation: "filiacion_sesiones"
            referencedColumns: ["id_sesion"]
          },
        ]
      }
      filiacion_sesiones: {
        Row: {
          id_drp: string | null
          id_sesion: string
          timestamp_apertura: string
          timestamp_cierre: string | null
        }
        Insert: {
          id_drp?: string | null
          id_sesion?: string
          timestamp_apertura?: string
          timestamp_cierre?: string | null
        }
        Update: {
          id_drp?: string | null
          id_sesion?: string
          timestamp_apertura?: string
          timestamp_cierre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filiacion_sesiones_id_drp_fkey"
            columns: ["id_drp"]
            isOneToOne: false
            referencedRelation: "drps"
            referencedColumns: ["id_drp"]
          },
        ]
      }
      galletas_terminales: {
        Row: {
          created_at: string
          expires_at: string | null
          id_galleta: string
          id_nombre: string
          id_terminal: string
          revocado_at: string | null
          tipo: Database["public"]["Enums"]["tipo_galleta"]
          ultima_activacion_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id_galleta?: string
          id_nombre: string
          id_terminal: string
          revocado_at?: string | null
          tipo: Database["public"]["Enums"]["tipo_galleta"]
          ultima_activacion_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id_galleta?: string
          id_nombre?: string
          id_terminal?: string
          revocado_at?: string | null
          tipo?: Database["public"]["Enums"]["tipo_galleta"]
          ultima_activacion_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "galletas_terminales_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id_nombre: string
          mutation_uuid: string
          resultado: Json | null
          rpc_name: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id_nombre: string
          mutation_uuid: string
          resultado?: Json | null
          rpc_name: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id_nombre?: string
          mutation_uuid?: string
          resultado?: Json | null
          rpc_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      inventario_base: {
        Row: {
          id_item: number
          location_id: string
          stock_real: number
        }
        Insert: {
          id_item: number
          location_id: string
          stock_real?: number
        }
        Update: {
          id_item?: number
          location_id?: string
          stock_real?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventario_base_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id_item"]
          },
        ]
      }
      inventario_en_transito: {
        Row: {
          cantidad: number
          estado: Database["public"]["Enums"]["estado_transito"]
          id_item: number
          id_transferencia: string
          id_transito: string
          timestamp_confirmacion: string | null
          timestamp_envio: string
        }
        Insert: {
          cantidad: number
          estado?: Database["public"]["Enums"]["estado_transito"]
          id_item: number
          id_transferencia: string
          id_transito?: string
          timestamp_confirmacion?: string | null
          timestamp_envio?: string
        }
        Update: {
          cantidad?: number
          estado?: Database["public"]["Enums"]["estado_transito"]
          id_item?: number
          id_transferencia?: string
          id_transito?: string
          timestamp_confirmacion?: string | null
          timestamp_envio?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_en_transito_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id_item"]
          },
        ]
      }
      inventario_vehiculo: {
        Row: {
          id_item: number
          matricula: string
          stock_real: number
          subgrupo: string
          ultima_actualizacion: string
        }
        Insert: {
          id_item: number
          matricula: string
          stock_real?: number
          subgrupo: string
          ultima_actualizacion?: string
        }
        Update: {
          id_item?: number
          matricula?: string
          stock_real?: number
          subgrupo?: string
          ultima_actualizacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_vehiculo_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id_item"]
          },
          {
            foreignKeyName: "inventario_vehiculo_matricula_fkey"
            columns: ["matricula"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["matricula"]
          },
        ]
      }
      locations: {
        Row: {
          location_id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_location"]
        }
        Insert: {
          location_id: string
          nombre: string
          tipo: Database["public"]["Enums"]["tipo_location"]
        }
        Update: {
          location_id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["tipo_location"]
        }
        Relationships: []
      }
      mensajes_bandeja: {
        Row: {
          contenido: string
          created_at: string
          estado: string
          id_mensaje: string
          id_nombre_destino: string
          timestamp_lectura: string | null
        }
        Insert: {
          contenido: string
          created_at?: string
          estado?: string
          id_mensaje?: string
          id_nombre_destino: string
          timestamp_lectura?: string | null
        }
        Update: {
          contenido?: string
          created_at?: string
          estado?: string
          id_mensaje?: string
          id_nombre_destino?: string
          timestamp_lectura?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_bandeja_id_nombre_destino_fkey"
            columns: ["id_nombre_destino"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      mochilas_backpack: {
        Row: {
          codigo: string
          estado: Database["public"]["Enums"]["estado_mochila"]
          id_drp_activo: string | null
          id_mochila: string
          location_id: string | null
        }
        Insert: {
          codigo: string
          estado?: Database["public"]["Enums"]["estado_mochila"]
          id_drp_activo?: string | null
          id_mochila?: string
          location_id?: string | null
        }
        Update: {
          codigo?: string
          estado?: Database["public"]["Enums"]["estado_mochila"]
          id_drp_activo?: string | null
          id_mochila?: string
          location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mochilas_backpack_id_drp_activo_fkey"
            columns: ["id_drp_activo"]
            isOneToOne: false
            referencedRelation: "drps"
            referencedColumns: ["id_drp"]
          },
          {
            foreignKeyName: "mochilas_backpack_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["location_id"]
          },
        ]
      }
      pin_intentos_fallidos: {
        Row: {
          bloqueado_hasta: string | null
          id_terminal: string
          intentos: number
          ventana_inicio: string
        }
        Insert: {
          bloqueado_hasta?: string | null
          id_terminal: string
          intentos?: number
          ventana_inicio: string
        }
        Update: {
          bloqueado_hasta?: string | null
          id_terminal?: string
          intentos?: number
          ventana_inicio?: string
        }
        Relationships: []
      }
      plantilla_lineas: {
        Row: {
          id_item: number
          plantilla_id: string
          stock_objetivo: number
          subgrupo: string
        }
        Insert: {
          id_item: number
          plantilla_id: string
          stock_objetivo?: number
          subgrupo: string
        }
        Update: {
          id_item?: number
          plantilla_id?: string
          stock_objetivo?: number
          subgrupo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plantilla_lineas_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "catalogo_items"
            referencedColumns: ["id_item"]
          },
          {
            foreignKeyName: "plantilla_lineas_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_stock"
            referencedColumns: ["plantilla_id"]
          },
        ]
      }
      plantillas_stock: {
        Row: {
          perfil: string | null
          plantilla_id: string
          tipo: string
        }
        Insert: {
          perfil?: string | null
          plantilla_id: string
          tipo: string
        }
        Update: {
          perfil?: string | null
          plantilla_id?: string
          tipo?: string
        }
        Relationships: []
      }
      presencias_activas_terminal: {
        Row: {
          checkin_at: string
          id_nombre: string
          id_terminal: string
        }
        Insert: {
          checkin_at?: string
          id_nombre: string
          id_terminal: string
        }
        Update: {
          checkin_at?: string
          id_nombre?: string
          id_terminal?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_presencia_id_nombre"
            columns: ["id_nombre"]
            isOneToOne: true
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      psa_pacientes: {
        Row: {
          created_at: string
          datos_clinicos: Json
          estado: Database["public"]["Enums"]["estado_paciente_psa"]
          id_paciente: string
          id_sesion: string
        }
        Insert: {
          created_at?: string
          datos_clinicos?: Json
          estado?: Database["public"]["Enums"]["estado_paciente_psa"]
          id_paciente?: string
          id_sesion: string
        }
        Update: {
          created_at?: string
          datos_clinicos?: Json
          estado?: Database["public"]["Enums"]["estado_paciente_psa"]
          id_paciente?: string
          id_sesion?: string
        }
        Relationships: [
          {
            foreignKeyName: "psa_pacientes_id_sesion_fkey"
            columns: ["id_sesion"]
            isOneToOne: false
            referencedRelation: "psa_sesiones"
            referencedColumns: ["id_sesion"]
          },
        ]
      }
      psa_sesiones: {
        Row: {
          id_sesion: string
          matricula: string
          timestamp_apertura: string
          timestamp_cierre: string | null
        }
        Insert: {
          id_sesion?: string
          matricula: string
          timestamp_apertura?: string
          timestamp_cierre?: string | null
        }
        Update: {
          id_sesion?: string
          matricula?: string
          timestamp_apertura?: string
          timestamp_cierre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "psa_sesiones_matricula_fkey"
            columns: ["matricula"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["matricula"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          id_nombre: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          id_nombre: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          id_nombre?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      queue_backup_sessions: {
        Row: {
          backup_key: string
          created_at: string
          expires_at: string
          id_nombre: string
          id_terminal: string
        }
        Insert: {
          backup_key: string
          created_at?: string
          expires_at?: string
          id_nombre: string
          id_terminal: string
        }
        Update: {
          backup_key?: string
          created_at?: string
          expires_at?: string
          id_nombre?: string
          id_terminal?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_backup_sessions_id_nombre_fkey"
            columns: ["id_nombre"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      sesiones_emergencia: {
        Row: {
          consumido_at: string | null
          created_at: string
          expires_at: string
          id_nombre_emisor: string
          id_sesion: string
          pin_hash: string
          tipo: Database["public"]["Enums"]["tipo_galleta"]
        }
        Insert: {
          consumido_at?: string | null
          created_at?: string
          expires_at: string
          id_nombre_emisor: string
          id_sesion?: string
          pin_hash: string
          tipo: Database["public"]["Enums"]["tipo_galleta"]
        }
        Update: {
          consumido_at?: string | null
          created_at?: string
          expires_at?: string
          id_nombre_emisor?: string
          id_sesion?: string
          pin_hash?: string
          tipo?: Database["public"]["Enums"]["tipo_galleta"]
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_emergencia_id_nombre_emisor_fkey"
            columns: ["id_nombre_emisor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      solicitudes_desbloqueo: {
        Row: {
          created_at: string
          estado: Database["public"]["Enums"]["estado_desbloqueo"]
          expires_at: string
          id_nombre_revisor: string | null
          id_nombre_solicitante: string
          id_solicitud: string
          id_terminal: string
          motivo: string
        }
        Insert: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_desbloqueo"]
          expires_at: string
          id_nombre_revisor?: string | null
          id_nombre_solicitante: string
          id_solicitud?: string
          id_terminal: string
          motivo: string
        }
        Update: {
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_desbloqueo"]
          expires_at?: string
          id_nombre_revisor?: string | null
          id_nombre_solicitante?: string
          id_solicitud?: string
          id_terminal?: string
          motivo?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_desbloqueo_id_nombre_revisor_fkey"
            columns: ["id_nombre_revisor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "solicitudes_desbloqueo_id_nombre_solicitante_fkey"
            columns: ["id_nombre_solicitante"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      solicitudes_rgpd: {
        Row: {
          estado: Database["public"]["Enums"]["estado_rgpd"]
          id: string
          identificador: string
          motivo: string
          notas_procesamiento: string | null
          procesado_por: string | null
          solicitado_por: string
          timestamp_procesado: string | null
          timestamp_solicitud: string
          tipo_solicitud: string
        }
        Insert: {
          estado?: Database["public"]["Enums"]["estado_rgpd"]
          id?: string
          identificador: string
          motivo: string
          notas_procesamiento?: string | null
          procesado_por?: string | null
          solicitado_por: string
          timestamp_procesado?: string | null
          timestamp_solicitud?: string
          tipo_solicitud: string
        }
        Update: {
          estado?: Database["public"]["Enums"]["estado_rgpd"]
          id?: string
          identificador?: string
          motivo?: string
          notas_procesamiento?: string | null
          procesado_por?: string | null
          solicitado_por?: string
          timestamp_procesado?: string | null
          timestamp_solicitud?: string
          tipo_solicitud?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_rgpd_procesado_por_fkey"
            columns: ["procesado_por"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
          {
            foreignKeyName: "solicitudes_rgpd_solicitado_por_fkey"
            columns: ["solicitado_por"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      system_config: {
        Row: {
          clave: string
          descripcion: string | null
          id_nombre_modificador: string | null
          updated_at: string
          valor: Json
        }
        Insert: {
          clave: string
          descripcion?: string | null
          id_nombre_modificador?: string | null
          updated_at?: string
          valor: Json
        }
        Update: {
          clave?: string
          descripcion?: string | null
          id_nombre_modificador?: string | null
          updated_at?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_config_id_nombre_modificador_fkey"
            columns: ["id_nombre_modificador"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      tablon_anuncios: {
        Row: {
          contenido: string
          estado: Database["public"]["Enums"]["estado_tablon"]
          id_anuncio: string
          id_nombre_autor: string
          seccion: Database["public"]["Enums"]["seccion_tablon"]
          timestamp_publicacion: string
          timestamp_ultima_edicion: string | null
          titulo: string
        }
        Insert: {
          contenido: string
          estado?: Database["public"]["Enums"]["estado_tablon"]
          id_anuncio?: string
          id_nombre_autor: string
          seccion: Database["public"]["Enums"]["seccion_tablon"]
          timestamp_publicacion?: string
          timestamp_ultima_edicion?: string | null
          titulo: string
        }
        Update: {
          contenido?: string
          estado?: Database["public"]["Enums"]["estado_tablon"]
          id_anuncio?: string
          id_nombre_autor?: string
          seccion?: Database["public"]["Enums"]["seccion_tablon"]
          timestamp_publicacion?: string
          timestamp_ultima_edicion?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tablon_anuncios_id_nombre_autor_fkey"
            columns: ["id_nombre_autor"]
            isOneToOne: false
            referencedRelation: "fichas_empleados"
            referencedColumns: ["id_nombre"]
          },
        ]
      }
      vehiculos: {
        Row: {
          condicion_tecnica: Database["public"]["Enums"]["condicion_tecnica"]
          estado_operativo: Database["public"]["Enums"]["estado_operativo"]
          gps_timestamp: string | null
          lat: number | null
          lng: number | null
          matricula: string
          plantilla_id: string | null
          tipo: Database["public"]["Enums"]["tipo_vehiculo"]
        }
        Insert: {
          condicion_tecnica?: Database["public"]["Enums"]["condicion_tecnica"]
          estado_operativo?: Database["public"]["Enums"]["estado_operativo"]
          gps_timestamp?: string | null
          lat?: number | null
          lng?: number | null
          matricula: string
          plantilla_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_vehiculo"]
        }
        Update: {
          condicion_tecnica?: Database["public"]["Enums"]["condicion_tecnica"]
          estado_operativo?: Database["public"]["Enums"]["estado_operativo"]
          gps_timestamp?: string | null
          lat?: number | null
          lng?: number | null
          matricula?: string
          plantilla_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_vehiculo"]
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_plantilla_id_fkey"
            columns: ["plantilla_id"]
            isOneToOne: false
            referencedRelation: "plantillas_stock"
            referencedColumns: ["plantilla_id"]
          },
        ]
      }
      versiones_cliente: {
        Row: {
          activa: boolean
          min_version_permitida: string
          notas: string | null
          publicada_at: string
          version_semver: string
        }
        Insert: {
          activa?: boolean
          min_version_permitida: string
          notas?: string | null
          publicada_at?: string
          version_semver: string
        }
        Update: {
          activa?: boolean
          min_version_permitida?: string
          notas?: string | null
          publicada_at?: string
          version_semver?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _verificar_stepup: {
        Args: {
          p_id_nombre: string
          p_id_terminal?: string
          p_stepup_hash: string
        }
        Returns: undefined
      }
      auth_id_nombre_actual: { Args: never; Returns: string }
      auth_rol_actual: {
        Args: never
        Returns: Database["public"]["Enums"]["rol_empleado"]
      }
      f_funciones_sin_security_definer: {
        Args: never
        Returns: {
          funcion: string
          tipo_seguridad: string
        }[]
      }
      f_tablas_sin_rls: {
        Args: never
        Returns: {
          tabla: string
        }[]
      }
      rpc_abrir_sesion_filiacion: {
        Args: { p_id_drp?: string; p_mutation_uuid: string }
        Returns: Json
      }
      rpc_actualizar_estado_paciente: {
        Args: {
          p_id_paciente: string
          p_mutation_uuid: string
          p_nuevo_estado: Database["public"]["Enums"]["estado_paciente_filiacion"]
        }
        Returns: Json
      }
      rpc_actualizar_gps: {
        Args: { p_lat: number; p_lng: number; p_matricula: string }
        Returns: undefined
      }
      rpc_admitir_paciente: {
        Args: { p_datos?: Json; p_id_sesion: string; p_mutation_uuid: string }
        Returns: Json
      }
      rpc_agregar_dotacion_drp: {
        Args: { p_id_drp: string; p_matricula: string; p_mutation_uuid: string }
        Returns: undefined
      }
      rpc_agregar_personal_pie_drp: {
        Args: {
          p_id_drp: string
          p_id_nombre: string
          p_mutation_uuid: string
          p_zona?: string
        }
        Returns: undefined
      }
      rpc_ajuste_manual_stock: {
        Args: {
          p_cantidad_nueva: number
          p_id_item: number
          p_location_id: string
          p_motivo?: string
          p_mutation_uuid: string
          p_subgrupo?: string
        }
        Returns: Json
      }
      rpc_alta_vehiculo: {
        Args: {
          p_matricula: string
          p_nombre_location?: string
          p_tipo: Database["public"]["Enums"]["tipo_vehiculo"]
        }
        Returns: Json
      }
      rpc_aprobar_desbloqueo: {
        Args: { p_id_solicitud: string }
        Returns: undefined
      }
      rpc_asignar_mochila_a_drp: {
        Args: { p_id_drp: string; p_id_mochila: string }
        Returns: undefined
      }
      rpc_baja_vehiculo: {
        Args: { p_matricula: string; p_motivo?: string }
        Returns: undefined
      }
      rpc_cambiar_rol: {
        Args: {
          p_id_nombre_target: string
          p_rol_nuevo: Database["public"]["Enums"]["rol_empleado"]
        }
        Returns: undefined
      }
      rpc_cancelar_drp: {
        Args: { p_id_drp: string; p_motivo?: string }
        Returns: undefined
      }
      rpc_cancelar_push: { Args: { p_endpoint: string }; Returns: undefined }
      rpc_cerrar_checklist: {
        Args: {
          p_id_checklist: string
          p_items_revisados: Json
          p_mutation_uuid: string
        }
        Returns: Json
      }
      rpc_cerrar_informe_svb: {
        Args: {
          p_datos_paciente?: Json
          p_id_doc: string
          p_mutation_uuid: string
        }
        Returns: Json
      }
      rpc_checkin_vehiculo: {
        Args: {
          p_carry?: string
          p_km_inicio: number
          p_matricula: string
          p_mutation_uuid: string
        }
        Returns: Json
      }
      rpc_crear_drp: { Args: { p_mutation_uuid: string }; Returns: string }
      rpc_crear_informe_svb: {
        Args: {
          p_datos_paciente?: Json
          p_id_activacion: string
          p_mutation_uuid: string
        }
        Returns: Json
      }
      rpc_deducir_material: {
        Args: {
          p_cantidad: number
          p_id_activacion?: string
          p_id_item: number
          p_matricula: string
          p_motivo?: string
          p_mutation_uuid: string
          p_subgrupo: string
        }
        Returns: Json
      }
      rpc_enviar_solicitud_vacaciones: {
        Args: {
          p_fecha_fin: string
          p_fecha_inicio: string
          p_mutation_uuid: string
          p_observaciones?: string
          p_periodo_anual: string
          p_preferencia?: Database["public"]["Enums"]["preferencia_vacaciones"]
        }
        Returns: string
      }
      rpc_marcar_aviso_leido: {
        Args: { p_id_aviso: string }
        Returns: undefined
      }
      rpc_marcar_mensaje_leido: {
        Args: { p_id_mensaje: string; p_mutation_uuid: string }
        Returns: undefined
      }
      rpc_procesar_borrado_rgpd:
        | {
            Args: { p_id_nombre: string; p_issue_ref?: string }
            Returns: undefined
          }
        | {
            Args: { p_id_solicitud: string; p_notas?: string }
            Returns: undefined
          }
      rpc_push_subs_para: {
        Args: { p_id_nombre: string }
        Returns: {
          auth: string
          endpoint: string
          p256dh: string
        }[]
      }
      rpc_rechazar_desbloqueo: {
        Args: { p_id_solicitud: string; p_motivo?: string }
        Returns: undefined
      }
      rpc_registrar_averia: {
        Args: {
          p_descripcion?: string
          p_imagen_url?: string
          p_matricula: string
          p_mutation_uuid: string
          p_nivel_criticidad: Database["public"]["Enums"]["nivel_criticidad"]
          p_sistema_afectado: string
        }
        Returns: Json
      }
      rpc_resolver_descuadre: {
        Args: {
          p_id_descuadre: string
          p_mutation_uuid: string
          p_notas?: string
          p_resolucion: string
        }
        Returns: undefined
      }
      rpc_resolver_solicitud_vacaciones: {
        Args: {
          p_decision: string
          p_id_solicitud: string
          p_mutation_uuid: string
          p_notas?: string
        }
        Returns: undefined
      }
      rpc_revocar_y_reemitir_galleta: {
        Args: {
          p_expires_at?: string
          p_id_nombre_target: string
          p_id_terminal: string
          p_stepup_hash: string
          p_tipo_galleta: Database["public"]["Enums"]["tipo_galleta"]
        }
        Returns: Json
      }
      rpc_set_system_config: {
        Args: { p_clave: string; p_valor: Json }
        Returns: undefined
      }
      rpc_solicitar_borrado_rgpd:
        | { Args: { p_mutation_uuid: string }; Returns: undefined }
        | {
            Args: {
              p_identificador: string
              p_motivo: string
              p_tipo_solicitud: string
            }
            Returns: string
          }
      rpc_solicitar_desbloqueo: {
        Args: { p_id_terminal: string; p_motivo: string }
        Returns: string
      }
      rpc_suscribir_push: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      rpc_transferir_galleta: {
        Args: { p_id_terminal_nuevo: string }
        Returns: Json
      }
      rpc_transicionar_drp: {
        Args: { p_accion: string; p_id_drp: string }
        Returns: string
      }
    }
    Enums: {
      condicion_tecnica:
        | "operativo"
        | "averiado_leve"
        | "averiado_grave"
        | "en_taller"
        | "dado_de_baja"
      entidad_imputable: "sin_imputar" | "vehiculo" | "drp" | "persona"
      estado_desbloqueo: "pendiente" | "aprobada" | "rechazada" | "expirada"
      estado_descuadre: "Pendiente_Revision" | "Resuelto" | "Archivado"
      estado_drp:
        | "En_espera"
        | "En_preparacion"
        | "En_curso"
        | "Finalizado"
        | "Finalizado_Retenido"
        | "Archivado"
        | "Cancelado"
      estado_informe: "borrador" | "cerrado"
      estado_mochila: "disponible" | "desplegada" | "en_revision"
      estado_operativo: "inactivo" | "activo" | "en_drp"
      estado_paciente_filiacion:
        | "en_espera"
        | "en_consulta"
        | "alta"
        | "exitus"
        | "cancelado_por_drp"
      estado_paciente_psa:
        | "en_espera"
        | "en_atencion"
        | "alta"
        | "exitus"
        | "cancelado_por_drp"
      estado_parte: "Abierto_En_Turno" | "Enviado_Cerrado"
      estado_rgpd: "pendiente" | "procesada" | "denegada"
      estado_solicitud_vacaciones:
        | "Borrador"
        | "Pendiente_Aprobacion"
        | "Aprobada"
        | "Denegada"
      estado_tablon: "activo" | "archivado"
      estado_transito: "en_transito" | "confirmado" | "cancelado"
      nivel_aviso: "informativo" | "aviso" | "critico"
      nivel_criticidad: "Leve" | "Moderada" | "Grave"
      preferencia_vacaciones: "opcion_1" | "opcion_2" | "opcion_3"
      rol_empleado:
        | "tes"
        | "flota"
        | "coordinacion"
        | "logistica"
        | "gerencia"
        | "rrhh"
        | "due"
        | "medico"
        | "responsable_flota"
        | "responsable_logistica"
      seccion_tablon: "normativas" | "protocolos" | "avisos_corporativos"
      tipo_aviso:
        | "rotura_stock"
        | "averia_grave"
        | "drp_activado"
        | "drp_cancelado"
        | "transito_vencido"
        | "alerta_seguridad"
        | "aviso_coordinacion"
      tipo_evento_rbac:
        | "login_exitoso"
        | "fallo_autenticacion"
        | "logout"
        | "cambio_rol"
        | "cambio_password"
        | "sesion_emergencia_generada"
        | "sesion_emergencia_consumida"
        | "galleta_emitida"
        | "galleta_revocada"
        | "logout_forzado"
        | "checkout_forzado"
        | "alta_empleado"
        | "baja_empleado"
        | "baja_vehiculo"
        | "desbloqueo_aprobado"
        | "desbloqueo_rechazado"
        | "step_up_exitoso"
        | "step_up_fallido"
        | "alta_vehiculo"
        | "drp_cancelado"
        | "rgpd_solicitud"
        | "rgpd_supresion"
      tipo_galleta: "permanente" | "temporal"
      tipo_location: "base" | "almacen" | "punto_drp" | "vehiculo"
      tipo_movimiento_inventario:
        | "deduccion"
        | "entrada"
        | "transferencia"
        | "redireccion_forzosa"
        | "ajuste"
        | "merma"
        | "recuperacion_descuadre"
        | "merma_definitiva_residual"
      tipo_turno: "T" | "L" | "V" | "B" | "C"
      tipo_vehiculo: "A1" | "A2" | "B" | "C" | "VIR" | "Quad" | "BKP"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      condicion_tecnica: [
        "operativo",
        "averiado_leve",
        "averiado_grave",
        "en_taller",
        "dado_de_baja",
      ],
      entidad_imputable: ["sin_imputar", "vehiculo", "drp", "persona"],
      estado_desbloqueo: ["pendiente", "aprobada", "rechazada", "expirada"],
      estado_descuadre: ["Pendiente_Revision", "Resuelto", "Archivado"],
      estado_drp: [
        "En_espera",
        "En_preparacion",
        "En_curso",
        "Finalizado",
        "Finalizado_Retenido",
        "Archivado",
        "Cancelado",
      ],
      estado_informe: ["borrador", "cerrado"],
      estado_mochila: ["disponible", "desplegada", "en_revision"],
      estado_operativo: ["inactivo", "activo", "en_drp"],
      estado_paciente_filiacion: [
        "en_espera",
        "en_consulta",
        "alta",
        "exitus",
        "cancelado_por_drp",
      ],
      estado_paciente_psa: [
        "en_espera",
        "en_atencion",
        "alta",
        "exitus",
        "cancelado_por_drp",
      ],
      estado_parte: ["Abierto_En_Turno", "Enviado_Cerrado"],
      estado_rgpd: ["pendiente", "procesada", "denegada"],
      estado_solicitud_vacaciones: [
        "Borrador",
        "Pendiente_Aprobacion",
        "Aprobada",
        "Denegada",
      ],
      estado_tablon: ["activo", "archivado"],
      estado_transito: ["en_transito", "confirmado", "cancelado"],
      nivel_aviso: ["informativo", "aviso", "critico"],
      nivel_criticidad: ["Leve", "Moderada", "Grave"],
      preferencia_vacaciones: ["opcion_1", "opcion_2", "opcion_3"],
      rol_empleado: [
        "tes",
        "flota",
        "coordinacion",
        "logistica",
        "gerencia",
        "rrhh",
        "due",
        "medico",
        "responsable_flota",
        "responsable_logistica",
      ],
      seccion_tablon: ["normativas", "protocolos", "avisos_corporativos"],
      tipo_aviso: [
        "rotura_stock",
        "averia_grave",
        "drp_activado",
        "drp_cancelado",
        "transito_vencido",
        "alerta_seguridad",
        "aviso_coordinacion",
      ],
      tipo_evento_rbac: [
        "login_exitoso",
        "fallo_autenticacion",
        "logout",
        "cambio_rol",
        "cambio_password",
        "sesion_emergencia_generada",
        "sesion_emergencia_consumida",
        "galleta_emitida",
        "galleta_revocada",
        "logout_forzado",
        "checkout_forzado",
        "alta_empleado",
        "baja_empleado",
        "baja_vehiculo",
        "desbloqueo_aprobado",
        "desbloqueo_rechazado",
        "step_up_exitoso",
        "step_up_fallido",
        "alta_vehiculo",
        "drp_cancelado",
        "rgpd_solicitud",
        "rgpd_supresion",
      ],
      tipo_galleta: ["permanente", "temporal"],
      tipo_location: ["base", "almacen", "punto_drp", "vehiculo"],
      tipo_movimiento_inventario: [
        "deduccion",
        "entrada",
        "transferencia",
        "redireccion_forzosa",
        "ajuste",
        "merma",
        "recuperacion_descuadre",
        "merma_definitiva_residual",
      ],
      tipo_turno: ["T", "L", "V", "B", "C"],
      tipo_vehiculo: ["A1", "A2", "B", "C", "VIR", "Quad", "BKP"],
    },
  },
} as const

