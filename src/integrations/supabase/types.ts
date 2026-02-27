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
      afastamentos: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          motivo: string
          observacao: string | null
          servidor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          motivo: string
          observacao?: string | null
          servidor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          motivo?: string
          observacao?: string | null
          servidor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "afastamentos_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
      agrupamentos: {
        Row: {
          coordenador_id: string | null
          created_at: string
          diretoria_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          coordenador_id?: string | null
          created_at?: string
          diretoria_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          coordenador_id?: string | null
          created_at?: string
          diretoria_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agrupamentos_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agrupamentos_diretoria_id_fkey"
            columns: ["diretoria_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
        ]
      }
      atestados: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          dias: number
          id: string
          observacao: string | null
          servidor_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          dias?: number
          id?: string
          observacao?: string | null
          servidor_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          dias?: number
          id?: string
          observacao?: string | null
          servidor_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atestados_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
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
      coordenadores_unidades: {
        Row: {
          created_at: string
          id: string
          servidor_id: string
          unidade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          servidor_id: string
          unidade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          servidor_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordenadores_unidades_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordenadores_unidades_unidade_id_fkey"
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
      escalas_semanais: {
        Row: {
          created_at: string
          dia_semana: number
          entrada1: string | null
          entrada2: string | null
          id: string
          observacao: string | null
          saida1: string | null
          saida2: string | null
          servidor_id: string
          total_horas: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_semana: number
          entrada1?: string | null
          entrada2?: string | null
          id?: string
          observacao?: string | null
          saida1?: string | null
          saida2?: string | null
          servidor_id: string
          total_horas?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_semana?: number
          entrada1?: string | null
          entrada2?: string | null
          id?: string
          observacao?: string | null
          saida1?: string | null
          saida2?: string | null
          servidor_id?: string
          total_horas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_semanais_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
      faltas_abonadas: {
        Row: {
          created_at: string
          data: string
          id: string
          observacao: string | null
          servidor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          observacao?: string | null
          servidor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          servidor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faltas_abonadas_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
      funcoes: {
        Row: {
          created_at: string
          id: string
          nome: string
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acesso_financeiro: boolean
          created_at: string
          diretoria_id: string | null
          email: string
          id: string
          last_seen_at: string | null
          nome: string | null
          servidor_id: string | null
          unidade_id: string | null
          updated_at: string
        }
        Insert: {
          acesso_financeiro?: boolean
          created_at?: string
          diretoria_id?: string | null
          email: string
          id: string
          last_seen_at?: string | null
          nome?: string | null
          servidor_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Update: {
          acesso_financeiro?: boolean
          created_at?: string
          diretoria_id?: string | null
          email?: string
          id?: string
          last_seen_at?: string | null
          nome?: string | null
          servidor_id?: string | null
          unidade_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_diretoria_id_fkey"
            columns: ["diretoria_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_requests: {
        Row: {
          created_at: string
          diretoria_id: string | null
          email: string
          id: string
          motivo_rejeicao: string | null
          nome: string
          respondido_at: string | null
          respondido_por: string | null
          role_requested: string
          senha: string
          status: string
        }
        Insert: {
          created_at?: string
          diretoria_id?: string | null
          email: string
          id?: string
          motivo_rejeicao?: string | null
          nome?: string
          respondido_at?: string | null
          respondido_por?: string | null
          role_requested: string
          senha: string
          status?: string
        }
        Update: {
          created_at?: string
          diretoria_id?: string | null
          email?: string
          id?: string
          motivo_rejeicao?: string | null
          nome?: string
          respondido_at?: string | null
          respondido_por?: string | null
          role_requested?: string
          senha?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_requests_diretoria_id_fkey"
            columns: ["diretoria_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
        ]
      }
      servidores: {
        Row: {
          cargo: string
          cobertura_prevista: string
          coordenacao_id: string | null
          created_at: string
          data_admissao: string | null
          data_encerramento_contrato: string | null
          diretoria_id: string | null
          duplo_vinculo: boolean
          email: string | null
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
          funcao_id: string | null
          id: string
          is_coordenador: boolean
          is_coordenador_medico: boolean
          is_diretor: boolean
          is_diretor_geral: boolean
          is_secretario: boolean
          local_trabalho: string
          matricula: string
          nome: string
          observacao: string | null
          salario: number | null
          setor: string
          setor_id: string | null
          status_presenca: string
          tipo_escala: string
          unidade_id: string | null
          updated_at: string
          vinculo: string
          vinculo2: string | null
        }
        Insert: {
          cargo: string
          cobertura_prevista?: string
          coordenacao_id?: string | null
          created_at?: string
          data_admissao?: string | null
          data_encerramento_contrato?: string | null
          diretoria_id?: string | null
          duplo_vinculo?: boolean
          email?: string | null
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
          funcao_id?: string | null
          id?: string
          is_coordenador?: boolean
          is_coordenador_medico?: boolean
          is_diretor?: boolean
          is_diretor_geral?: boolean
          is_secretario?: boolean
          local_trabalho?: string
          matricula: string
          nome: string
          observacao?: string | null
          salario?: number | null
          setor?: string
          setor_id?: string | null
          status_presenca?: string
          tipo_escala?: string
          unidade_id?: string | null
          updated_at?: string
          vinculo?: string
          vinculo2?: string | null
        }
        Update: {
          cargo?: string
          cobertura_prevista?: string
          coordenacao_id?: string | null
          created_at?: string
          data_admissao?: string | null
          data_encerramento_contrato?: string | null
          diretoria_id?: string | null
          duplo_vinculo?: boolean
          email?: string | null
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
          funcao_id?: string | null
          id?: string
          is_coordenador?: boolean
          is_coordenador_medico?: boolean
          is_diretor?: boolean
          is_diretor_geral?: boolean
          is_secretario?: boolean
          local_trabalho?: string
          matricula?: string
          nome?: string
          observacao?: string | null
          salario?: number | null
          setor?: string
          setor_id?: string | null
          status_presenca?: string
          tipo_escala?: string
          unidade_id?: string | null
          updated_at?: string
          vinculo?: string
          vinculo2?: string | null
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
            foreignKeyName: "servidores_funcao_id_fkey"
            columns: ["funcao_id"]
            isOneToOne: false
            referencedRelation: "funcoes"
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
      servidores_setores: {
        Row: {
          created_at: string
          id: string
          servidor_id: string
          setor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          servidor_id: string
          setor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          servidor_id?: string
          setor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servidores_setores_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      servidores_unidades: {
        Row: {
          created_at: string
          id: string
          servidor_id: string
          unidade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          servidor_id: string
          unidade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          servidor_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "servidores_unidades_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servidores_unidades_unidade_id_fkey"
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
      transferencias: {
        Row: {
          created_at: string
          diretoria_destino_id: string
          diretoria_origem_id: string
          id: string
          observacao: string | null
          respondido_at: string | null
          respondido_por_user_id: string | null
          resposta_observacao: string | null
          servidor_id: string
          solicitante_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diretoria_destino_id: string
          diretoria_origem_id: string
          id?: string
          observacao?: string | null
          respondido_at?: string | null
          respondido_por_user_id?: string | null
          resposta_observacao?: string | null
          servidor_id: string
          solicitante_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diretoria_destino_id?: string
          diretoria_origem_id?: string
          id?: string
          observacao?: string | null
          respondido_at?: string | null
          respondido_por_user_id?: string | null
          resposta_observacao?: string | null
          servidor_id?: string
          solicitante_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_diretoria_destino_id_fkey"
            columns: ["diretoria_destino_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_diretoria_origem_id_fkey"
            columns: ["diretoria_origem_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_servidor_id_fkey"
            columns: ["servidor_id"]
            isOneToOne: false
            referencedRelation: "servidores"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          agrupamento_id: string | null
          created_at: string
          diretoria_id: string
          id: string
          nome: string
          sigla: string
          updated_at: string
        }
        Insert: {
          agrupamento_id?: string | null
          created_at?: string
          diretoria_id: string
          id?: string
          nome: string
          sigla: string
          updated_at?: string
        }
        Update: {
          agrupamento_id?: string | null
          created_at?: string
          diretoria_id?: string
          id?: string
          nome?: string
          sigla?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_agrupamento_id_fkey"
            columns: ["agrupamento_id"]
            isOneToOne: false
            referencedRelation: "agrupamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_diretoria_id_fkey"
            columns: ["diretoria_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_diretorias: {
        Row: {
          created_at: string
          diretoria_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diretoria_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diretoria_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_diretorias_diretoria_id_fkey"
            columns: ["diretoria_id"]
            isOneToOne: false
            referencedRelation: "diretorias"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_unidades: {
        Row: {
          created_at: string
          id: string
          unidade_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unidade_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unidade_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unidades_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_servidor_id: { Args: { _user_id: string }; Returns: string }
      has_full_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "diretor" | "coordenador"
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
    Enums: {
      app_role: ["admin", "diretor", "coordenador"],
    },
  },
} as const
