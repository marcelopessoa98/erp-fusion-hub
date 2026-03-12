import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Recibo {
  id: string;
  servico_extra_id: string | null;
  filial_id: string;
  cliente_nome: string;
  cliente_cnpj: string;
  valor: number;
  valor_extenso: string;
  descricao_servico: string;
  data_recibo: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useRecibos(servicoExtraId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recibos, isLoading } = useQuery({
    queryKey: ['recibos', servicoExtraId],
    queryFn: async () => {
      let query = supabase
        .from('recibos')
        .select('*')
        .order('created_at', { ascending: false });

      if (servicoExtraId) {
        query = query.eq('servico_extra_id', servicoExtraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Recibo[];
    },
  });

  const createRecibo = useMutation({
    mutationFn: async (recibo: Omit<Recibo, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('recibos')
        .insert([recibo])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recibos'] });
      toast({
        title: 'Recibo salvo',
        description: 'O recibo foi salvo com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar recibo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteRecibo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recibos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recibos'] });
      toast({
        title: 'Recibo excluído',
        description: 'O recibo foi excluído com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir recibo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { recibos, isLoading, createRecibo, deleteRecibo };
}
