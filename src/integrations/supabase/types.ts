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
      agendamento_responsaveis: {
        Row: {
          agendamento_id: string
          created_at: string
          funcionario_id: string
          id: string
        }
        Insert: {
          agendamento_id: string
          created_at?: string
          funcionario_id: string
          id?: string
        }
        Update: {
          agendamento_id?: string
          created_at?: string
          funcionario_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_responsaveis_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamento_responsaveis_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          cliente_id: string
          created_at: string
          data_concretagem: string
          filial_id: string
          id: string
          notificado: boolean
          obra_id: string
          observacoes: string | null
          referencia: string | null
          status: string
          updated_at: string
          user_id: string | null
          volume: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_concretagem: string
          filial_id: string
          id?: string
          notificado?: boolean
          obra_id: string
          observacoes?: string | null
          referencia?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          volume: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_concretagem?: string
          filial_id?: string
          id?: string
          notificado?: boolean
          obra_id?: string
          observacoes?: string | null
          referencia?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          volume?: number
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      alugueis: {
        Row: {
          created_at: string
          data_previsao_retorno: string | null
          data_retorno: string | null
          data_saida: string
          filial_id: string
          id: string
          material_id: string
          obra_id: string | null
          observacao: string | null
          quantidade: number
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_previsao_retorno?: string | null
          data_retorno?: string | null
          data_saida: string
          filial_id: string
          id?: string
          material_id: string
          obra_id?: string | null
          observacao?: string | null
          quantidade?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_previsao_retorno?: string | null
          data_retorno?: string | null
          data_saida?: string
          filial_id?: string
          id?: string
          material_id?: string
          obra_id?: string | null
          observacao?: string | null
          quantidade?: number
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alugueis_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueis_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueis_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      alugueis_obra: {
        Row: {
          created_at: string
          data_previsao_retorno: string | null
          data_saida: string
          id: string
          material_id: string
          obra_id: string
          observacao: string | null
          quantidade: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_previsao_retorno?: string | null
          data_saida?: string
          id?: string
          material_id: string
          obra_id: string
          observacao?: string | null
          quantidade?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_previsao_retorno?: string | null
          data_saida?: string
          id?: string
          material_id?: string
          obra_id?: string
          observacao?: string | null
          quantidade?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alugueis_obra_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueis_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_funcionarios: {
        Row: {
          created_at: string
          data_avaliacao: string
          descricao: string
          filial_id: string
          funcionario_id: string
          id: string
          obra_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_avaliacao?: string
          descricao: string
          filial_id: string
          funcionario_id: string
          id?: string
          obra_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_avaliacao?: string
          descricao?: string
          filial_id?: string
          funcionario_id?: string
          id?: string
          obra_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_funcionarios_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_funcionarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_material: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          created_at: string
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      estoque: {
        Row: {
          filial_id: string
          id: string
          material_id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          filial_id: string
          id?: string
          material_id: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          filial_id?: string
          id?: string
          material_id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      filiais: {
        Row: {
          ativa: boolean
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          documento: string | null
          email: string | null
          filial_id: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          documento?: string | null
          email?: string | null
          filial_id?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          documento?: string | null
          email?: string | null
          filial_id?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      horas_extras: {
        Row: {
          aprovado: boolean | null
          aprovado_por: string | null
          created_at: string
          data: string
          filial_id: string
          funcionario_id: string
          horas: number
          id: string
          obra_id: string | null
          observacao: string | null
          tipo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          aprovado?: boolean | null
          aprovado_por?: string | null
          created_at?: string
          data: string
          filial_id: string
          funcionario_id: string
          horas: number
          id?: string
          obra_id?: string | null
          observacao?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          aprovado?: boolean | null
          aprovado_por?: string | null
          created_at?: string
          data?: string
          filial_id?: string
          funcionario_id?: string
          horas?: number
          id?: string
          obra_id?: string | null
          observacao?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "horas_extras_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_extras_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horas_extras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          categoria_id: string | null
          codigo: string | null
          created_at: string
          descricao: string | null
          estoque_minimo: number | null
          id: string
          nome: string
          unidade: string
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          id?: string
          nome: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          id?: string
          nome?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_material"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais_obra: {
        Row: {
          created_at: string
          id: string
          material_id: string
          obra_id: string
          observacao: string | null
          quantidade: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          obra_id: string
          observacao?: string | null
          quantidade?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          obra_id?: string
          observacao?: string | null
          quantidade?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materiais_obra_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string
          filial_id: string
          id: string
          material_id: string
          obra_id: string | null
          observacao: string | null
          quantidade: number
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filial_id: string
          id?: string
          material_id: string
          obra_id?: string | null
          observacao?: string | null
          quantidade: number
          tipo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filial_id?: string
          id?: string
          material_id?: string
          obra_id?: string | null
          observacao?: string | null
          quantidade?: number
          tipo?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      nao_conformidades: {
        Row: {
          acao_corretiva: string | null
          cliente_id: string | null
          created_at: string
          data_ocorrencia: string
          data_resolucao: string | null
          descricao: string
          filial_id: string
          funcionario_id: string | null
          gravidade: Database["public"]["Enums"]["nc_gravidade"]
          id: string
          obra_id: string | null
          resolvido_por: string | null
          status: Database["public"]["Enums"]["nc_status"]
          tipo: Database["public"]["Enums"]["nc_tipo"]
          tipo_nc_id: string | null
          titulo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          acao_corretiva?: string | null
          cliente_id?: string | null
          created_at?: string
          data_ocorrencia: string
          data_resolucao?: string | null
          descricao: string
          filial_id: string
          funcionario_id?: string | null
          gravidade?: Database["public"]["Enums"]["nc_gravidade"]
          id?: string
          obra_id?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["nc_status"]
          tipo: Database["public"]["Enums"]["nc_tipo"]
          tipo_nc_id?: string | null
          titulo: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          acao_corretiva?: string | null
          cliente_id?: string | null
          created_at?: string
          data_ocorrencia?: string
          data_resolucao?: string | null
          descricao?: string
          filial_id?: string
          funcionario_id?: string | null
          gravidade?: Database["public"]["Enums"]["nc_gravidade"]
          id?: string
          obra_id?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["nc_status"]
          tipo?: Database["public"]["Enums"]["nc_tipo"]
          tipo_nc_id?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nao_conformidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nao_conformidades_tipo_nc_id_fkey"
            columns: ["tipo_nc_id"]
            isOneToOne: false
            referencedRelation: "tipos_nc"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cliente_id: string
          created_at: string
          data_inicio: string | null
          data_previsao_fim: string | null
          endereco: string | null
          filial_id: string
          id: string
          nome: string
          referencia: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_inicio?: string | null
          data_previsao_fim?: string | null
          endereco?: string | null
          filial_id: string
          id?: string
          nome: string
          referencia?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_inicio?: string | null
          data_previsao_fim?: string | null
          endereco?: string | null
          filial_id?: string
          id?: string
          nome?: string
          referencia?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ranking_funcionario_mes: {
        Row: {
          ano: number
          created_at: string
          filial_id: string
          funcionario_id: string
          id: string
          mes: number
          pontuacao: number
          posicao: number
          total_avaliacoes: number
          total_ncs: number
        }
        Insert: {
          ano: number
          created_at?: string
          filial_id: string
          funcionario_id: string
          id?: string
          mes: number
          pontuacao?: number
          posicao?: number
          total_avaliacoes?: number
          total_ncs?: number
        }
        Update: {
          ano?: number
          created_at?: string
          filial_id?: string
          funcionario_id?: string
          id?: string
          mes?: number
          pontuacao?: number
          posicao?: number
          total_avaliacoes?: number
          total_ncs?: number
        }
        Relationships: [
          {
            foreignKeyName: "ranking_funcionario_mes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_funcionario_mes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_extras: {
        Row: {
          cliente_id: string
          created_at: string
          data_recebimento: string
          descricao_servico: string
          filial_id: string
          id: string
          material_recebido: string
          obra_id: string
          status_pagamento: string
          status_servico: string
          updated_at: string
          user_id: string | null
          usuario_nome: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_recebimento: string
          descricao_servico: string
          filial_id: string
          id?: string
          material_recebido: string
          obra_id: string
          status_pagamento?: string
          status_servico?: string
          updated_at?: string
          user_id?: string | null
          usuario_nome: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_recebimento?: string
          descricao_servico?: string
          filial_id?: string
          id?: string
          material_recebido?: string
          obra_id?: string
          status_pagamento?: string
          status_servico?: string
          updated_at?: string
          user_id?: string | null
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "servicos_extras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_extras_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_extras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_nc: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_filiais: {
        Row: {
          created_at: string
          filial_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filial_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filial_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_filiais_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_filial_access: {
        Args: { _filial_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gerente" | "operador"
      nc_gravidade: "leve" | "media" | "grave" | "gravissima"
      nc_status: "aberta" | "em_andamento" | "resolvida" | "cancelada"
      nc_tipo: "funcionario" | "cliente"
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
      app_role: ["admin", "gerente", "operador"],
      nc_gravidade: ["leve", "media", "grave", "gravissima"],
      nc_status: ["aberta", "em_andamento", "resolvida", "cancelada"],
      nc_tipo: ["funcionario", "cliente"],
    },
  },
} as const
