import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PropostaItem {
  id?: string;
  descricao: string;
  valor_unitario: number;
  unidade: string;
  detalhes?: string;
  ordem: number;
}

export interface Proposta {
  id: string;
  numero: string;
  assunto: string;
  cliente_id: string;
  obra_id: string;
  filial_id: string;
  status: string;
  consideracoes_gerais: string | null;
  consideracoes_pagamento: string | null;
  dados_bancarios: Record<string, string>;
  validade_dias: number;
  observacoes: string | null;
  user_id: string | null;
  elaborado_por: string | null;
  aprovado_por: string | null;
  aprovado_por_nome: string | null;
  data_aprovacao: string | null;
  created_at: string;
  updated_at: string;
  clientes?: { nome: string };
  obras?: { nome: string; referencia: string | null };
  itens?: PropostaItem[];
}

export function usePropostas() {
  const { user } = useAuth();
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPropostas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('propostas')
      .select('*, clientes(nome), obras(nome, referencia)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar propostas');
      console.error(error);
    } else {
      setPropostas((data as any[]) || []);
    }
    setLoading(false);
  };

  const fetchPropostaComItens = async (id: string) => {
    const { data: proposta, error: pErr } = await supabase
      .from('propostas')
      .select('*, clientes(nome), obras(nome, referencia)')
      .eq('id', id)
      .single();

    if (pErr) throw pErr;

    const { data: itens, error: iErr } = await supabase
      .from('proposta_itens')
      .select('*')
      .eq('proposta_id', id)
      .order('ordem');

    if (iErr) throw iErr;

    return { ...proposta, itens: itens || [] } as Proposta;
  };

  const gerarNumero = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('gerar_numero_proposta');
    if (error) throw error;
    return data as string;
  };

  const criarProposta = async (
    proposta: {
      assunto: string;
      cliente_id: string;
      obra_id: string;
      filial_id: string;
      elaborado_por?: string;
      consideracoes_gerais?: string;
      consideracoes_pagamento?: string;
      dados_bancarios?: Record<string, string>;
      validade_dias?: number;
    },
    itens: PropostaItem[]
  ) => {
    try {
      const numero = await gerarNumero();

      const { data: novaProposta, error: pErr } = await supabase
        .from('propostas')
        .insert({
          numero,
          assunto: proposta.assunto,
          cliente_id: proposta.cliente_id,
          obra_id: proposta.obra_id,
          filial_id: proposta.filial_id,
          elaborado_por: proposta.elaborado_por || null,
          consideracoes_gerais: proposta.consideracoes_gerais || null,
          consideracoes_pagamento: proposta.consideracoes_pagamento || null,
          dados_bancarios: proposta.dados_bancarios || {},
          validade_dias: proposta.validade_dias || 30,
          status: 'rascunho',
          user_id: user?.id,
        })
        .select()
        .single();

      if (pErr) throw pErr;

      if (itens.length > 0) {
        const { error: iErr } = await supabase
          .from('proposta_itens')
          .insert(
            itens.map((item, idx) => ({
              proposta_id: novaProposta.id,
              descricao: item.descricao,
              valor_unitario: item.valor_unitario,
              unidade: item.unidade,
              detalhes: item.detalhes || null,
              ordem: idx,
            }))
          );
        if (iErr) throw iErr;
      }

      toast.success('Proposta criada com sucesso!');
      fetchPropostas();
      return novaProposta;
    } catch (err: any) {
      toast.error('Erro ao criar proposta: ' + err.message);
      throw err;
    }
  };

  const aprovarProposta = async (id: string, aprovadorNome: string) => {
    const { error } = await supabase
      .from('propostas')
      .update({
        status: 'aprovada',
        aprovado_por: user?.id,
        aprovado_por_nome: aprovadorNome,
        data_aprovacao: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao aprovar proposta');
    } else {
      toast.success('Proposta aprovada!');
      fetchPropostas();
    }
  };

  const atualizarStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('propostas')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao atualizar status');
    } else {
      toast.success('Status atualizado!');
      fetchPropostas();
    }
  };

  const excluirProposta = async (id: string) => {
    const { error } = await supabase.from('propostas').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir proposta');
    } else {
      toast.success('Proposta excluída');
      fetchPropostas();
    }
  };

  useEffect(() => {
    fetchPropostas();
  }, []);

  return {
    propostas,
    loading,
    fetchPropostas,
    fetchPropostaComItens,
    criarProposta,
    aprovarProposta,
    atualizarStatus,
    excluirProposta,
  };
}
