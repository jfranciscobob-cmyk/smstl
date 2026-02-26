export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      coordenacoes: {
        Row: {
          created_at: string
          id: string
          nome: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          unidade_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordenacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      diretorias: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      servidores: {
        Row: {
          cargo: string
          cobertura_prevista: string
          coordenacao_id: string | null
          created_at: string
          diretoria_id: string | null
          escala_fim1: string | null
          escala_fim2: string | null
          escala_inicio1: string | null
          escala_inicio2: string | null
          escala_total_horas: number | null
          ferias_ano_referencia: number | null
          ferias_periodo1_fim: string | null
          ferias_periodo1_inicio: string | null
          ferias_periodo2_fim: string | null
          ferias_periodo2_inicio: string | null
          ferias_status_gerencial: string | null
          ferias_total_dias: number | null
          ferias_vencidas: number | null
          funcao_critica: boolean
          id: string
          is_coordenador: boolean
          is_diretor: boolean
          is_diretor_geral: boolean
          is_secretario: boolean
          local_trabalho: string
          matricula: string
          nome: string
          observacao: string | null
          setor: string
          setor_id: string | null
          status_presenca: string
          unidade_id: string | null
          updated_at: string
          vinculo: string
        }
        Insert: {
          cargo: string
          cobertura_prevista?: string
          coordenacao_id?: string | null
          created_at?: string
          diretoria_id?: string | null
          escala_fim1?: string | null
          escala_fim2?: string | null
          escala_inicio1?: string | null
          escala_inicio2?: string | null
          escala_total_horas?: number | null
          ferias_ano_referencia?: number | null
          ferias_periodo1_fim?: string | null
          ferias_periodo1_inicio?: string | null
          ferias_periodo2_fim?: string | null
          ferias_periodo2_inicio?: string | null
          ferias_status_gerencial?: string | null
          ferias_total_dias?: number | null
          ferias_vencidas?: number | null
          funcao_critica?: boolean
          id?: string
          is_coordenador?: boolean
          is_diretor?: boolean
          is_diretor_geral?: boolean
          is_secretario?: boolean
          local_trabalho?: string
          matricula: string
          nome: string
          observacao?: string | null
          setor?: string
          setor_id?: string | null
          status_presenca?: string
          unidade_id?: string | null
          updated_at?: string
          vinculo?: string
        }
        Update: {
          cargo?: string
          cobertura_prevista?: string
          coordenacao_id?: string | null
          created_at?: string
          diretoria_id?: string | null
          escala_fim1?: string | null
          escala_fim2?: string | null
          escala_inicio1?: string | null
          escala_inicio2?: string | null
          escala_total_horas?: number | null
          ferias_ano_referencia?: number | null
          ferias_periodo1_fim?: string | null
          ferias_periodo1_inicio?: string | null
          ferias_periodo2_fim?: string | null
          ferias_periodo2_inicio?: string | null
          ferias_status_gerencial?: string | null
          ferias_total_dias?: number | null
          ferias_vencidas?: number | null
          funcao_critica?: boolean
          id?: string
          is_coordenador?: boolean
          is_diretor?: boolean
          is_diretor_geral?: boolean
          is_secretario?: boolean
          local_trabalho?: string
          matricula?: string
          nome?: string
          observacao?: string | null
          setor?: string
          setor_id?: string | null
          status_presenca?: string
          unidade_id?: string | null
          updated_at?: string
          vinculo?: string
        }
        Relationships: [
          {
            foreignKeyName: "servidores_coordenacao_id_fkey"
            columns: ["coordenacao_id"]
            isOneToOne: false
            referencedRelation: "coordenacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_diretoria_id_fkey"
            columns: ["diretoria_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          cargo_gestao: string | null
          created_at: string
          diretoria_id: string | null
          id: string
          nome: string
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          cargo_gestao?: string | null
          created_at?: string
          diretoria_id?: string | null
          id?: string
          nome: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          cargo_gestao?: string | null
          created_at?: string
          diretoria_id?: string | null
          id?: string
          nome?: string
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "setores_diretoria_id_fkey"
            columns: ["diretoria_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setores_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          created_at: string
          diretoria_id: string
          id: string
          nome: string
          sigla: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diretoria_id: string
          id?: string
          nome: string
          sigla: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diretoria_id?: string
          id?: string
          nome?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_diretoria_id_fkey"
            columns: ["diretoria_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
