import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MedicaoItem {
  id?: string;
  medicao_id?: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  checado: boolean;
  ordem: number;
}

export interface Medicao {
  id: string;
  obra_id: string;
  cliente_id: string;
  filial_id: string;
  numero_medicao: number;
  periodo_inicio: string;
  periodo_fim: string;
  valor_total: number;
  status: string;
  observacoes: string | null;
  aprovado_por: string | null;
  data_aprovacao: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  obra?: { nome: string };
  cliente?: { nome: string };
  filial?: { nome: string };
  medicao_itens?: MedicaoItem[];
}

export function useMedicoes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: medicoes, isLoading } = useQuery({
    queryKey: ['medicoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicoes')
        .select(`
          *,
          obra:obras(nome),
          cliente:clientes(nome),
          filial:filiais(nome),
          medicao_itens(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Medicao[];
    },
  });

  const createMedicao = useMutation({
    mutationFn: async (payload: {
      medicao: {
        obra_id: string;
        cliente_id: string;
        filial_id: string;
        numero_medicao: number;
        periodo_inicio: string;
        periodo_fim: string;
        valor_total: number;
        status?: string;
        observacoes?: string;
        user_id?: string | null;
      };
      itens: Omit<MedicaoItem, 'id' | 'medicao_id'>[];
      horasExtrasIds: string[];
      servicosExtrasIds: string[];
    }) => {
      // Create medicao
      const { data: med, error: medError } = await supabase
        .from('medicoes')
        .insert([payload.medicao])
        .select()
        .single();
      if (medError) throw medError;

      // Create itens
      if (payload.itens.length > 0) {
        const { error: itensError } = await supabase
          .from('medicao_itens')
          .insert(payload.itens.map((i) => ({ ...i, medicao_id: med.id })));
        if (itensError) throw itensError;
      }

      // Mark horas extras as medido
      if (payload.horasExtrasIds.length > 0) {
        const { error } = await supabase
          .from('horas_extras')
          .update({ medido: true })
          .in('id', payload.horasExtrasIds);
        if (error) throw error;
      }

      // Mark servicos extras as medido
      if (payload.servicosExtrasIds.length > 0) {
        const { error } = await supabase
          .from('servicos_extras')
          .update({ medido: true })
          .in('id', payload.servicosExtrasIds);
        if (error) throw error;
      }

      return med;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes'] });
      queryClient.invalidateQueries({ queryKey: ['horas_extras'] });
      queryClient.invalidateQueries({ queryKey: ['servicos_extras'] });
      toast({ title: 'Medição criada', description: 'Medição gerada e registros marcados como medidos.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar medição', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMedicao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('medicoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicoes'] });
      toast({ title: 'Medição excluída' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  return { medicoes, isLoading, createMedicao, deleteMedicao };
}
