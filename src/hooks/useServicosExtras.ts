import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ServicoExtra {
  id: string;
  filial_id: string;
  cliente_id: string;
  obra_id: string;
  material_recebido: string;
  descricao_servico: string;
  status_pagamento: 'pago' | 'pendente';
  status_servico: 'pendente' | 'finalizado';
  valor: number;
  data_recebimento: string;
  user_id: string | null;
  usuario_nome: string;
  created_at: string;
  updated_at: string;
  filial?: { nome: string };
  cliente?: { nome: string };
  obra?: { nome: string };
}

interface UseServicosExtrasFilters {
  cliente_id?: string;
  status_pagamento?: string;
  status_servico?: string;
  mes?: number;
  ano?: number;
}

export function useServicosExtras(filters?: UseServicosExtrasFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: servicos, isLoading, error } = useQuery({
    queryKey: ['servicos_extras', filters],
    queryFn: async () => {
      let query = supabase
        .from('servicos_extras')
        .select(`
          *,
          filial:filiais(nome),
          cliente:clientes(nome),
          obra:obras(nome)
        `)
        .order('created_at', { ascending: false });

      if (filters?.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }

      if (filters?.status_pagamento) {
        query = query.eq('status_pagamento', filters.status_pagamento);
      }

      if (filters?.status_servico) {
        query = query.eq('status_servico', filters.status_servico);
      }

      if (filters?.mes && filters?.ano) {
        const startDate = new Date(filters.ano, filters.mes - 1, 1);
        const endDate = new Date(filters.ano, filters.mes, 0);
        query = query
          .gte('data_recebimento', startDate.toISOString().split('T')[0])
          .lte('data_recebimento', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ServicoExtra[];
    },
  });

  const createServico = useMutation({
    mutationFn: async (servico: Omit<ServicoExtra, 'id' | 'created_at' | 'updated_at' | 'filial' | 'cliente' | 'obra'>) => {
      const { data, error } = await supabase
        .from('servicos_extras')
        .insert([servico])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos_extras'] });
      toast({
        title: 'Serviço cadastrado',
        description: 'O serviço extra foi cadastrado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateServico = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServicoExtra> & { id: string }) => {
      const { data, error } = await supabase
        .from('servicos_extras')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos_extras'] });
      toast({
        title: 'Serviço atualizado',
        description: 'O serviço foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteServico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('servicos_extras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicos_extras'] });
      toast({
        title: 'Serviço excluído',
        description: 'O serviço foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    servicos,
    isLoading,
    error,
    createServico,
    updateServico,
    deleteServico,
  };
}
