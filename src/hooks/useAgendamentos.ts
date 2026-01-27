import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Agendamento {
  id: string;
  filial_id: string;
  cliente_id: string;
  obra_id: string;
  referencia: string | null;
  data_concretagem: string;
  volume: number;
  observacoes: string | null;
  status: string;
  notificado: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  filial?: { nome: string };
  cliente?: { nome: string };
  obra?: { nome: string };
  responsaveis?: Array<{
    funcionario_id: string;
    funcionario?: { nome: string };
  }>;
}

export interface AgendamentoFormData {
  filial_id: string;
  cliente_id: string;
  obra_id: string;
  referencia: string;
  data_concretagem: string;
  volume: number;
  observacoes: string;
  status: string;
  responsaveis: string[];
}

export function useAgendamentos(filters?: {
  mes?: number;
  ano?: number;
  filial_id?: string;
  funcionario_id?: string;
}) {
  return useQuery({
    queryKey: ['agendamentos', filters],
    queryFn: async () => {
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          filial:filiais(nome),
          cliente:clientes(nome),
          obra:obras(nome),
          responsaveis:agendamento_responsaveis(
            funcionario_id,
            funcionario:funcionarios(nome)
          )
        `)
        .order('data_concretagem', { ascending: true });

      if (filters?.filial_id) {
        query = query.eq('filial_id', filters.filial_id);
      }

      if (filters?.mes && filters?.ano) {
        const startDate = new Date(filters.ano, filters.mes - 1, 1);
        const endDate = new Date(filters.ano, filters.mes, 0);
        query = query
          .gte('data_concretagem', startDate.toISOString().split('T')[0])
          .lte('data_concretagem', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by funcionario if needed (after fetching due to junction table)
      if (filters?.funcionario_id && data) {
        return data.filter((a: Agendamento) => 
          a.responsaveis?.some(r => r.funcionario_id === filters.funcionario_id)
        );
      }

      return data as Agendamento[];
    },
  });
}

export function useAgendamentosNotificacoes() {
  return useQuery({
    queryKey: ['agendamentos-notificacoes'],
    queryFn: async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          filial:filiais(nome),
          cliente:clientes(nome),
          obra:obras(nome),
          responsaveis:agendamento_responsaveis(
            funcionario_id,
            funcionario:funcionarios(nome)
          )
        `)
        .eq('data_concretagem', tomorrowStr)
        .eq('status', 'agendado')
        .eq('notificado', false);

      if (error) throw error;
      return data as Agendamento[];
    },
  });
}

export function useCreateAgendamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: AgendamentoFormData) => {
      const { responsaveis, ...agendamentoData } = data;

      // Create agendamento
      const { data: agendamento, error } = await supabase
        .from('agendamentos')
        .insert({
          ...agendamentoData,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add responsaveis
      if (responsaveis.length > 0) {
        const responsaveisData = responsaveis.map(funcionario_id => ({
          agendamento_id: agendamento.id,
          funcionario_id,
        }));

        const { error: respError } = await supabase
          .from('agendamento_responsaveis')
          .insert(responsaveisData);

        if (respError) throw respError;
      }

      return agendamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast({
        title: 'Sucesso',
        description: 'Agendamento criado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAgendamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AgendamentoFormData> }) => {
      const { responsaveis, ...agendamentoData } = data;

      // Update agendamento
      const { error } = await supabase
        .from('agendamentos')
        .update(agendamentoData)
        .eq('id', id);

      if (error) throw error;

      // Update responsaveis if provided
      if (responsaveis !== undefined) {
        // Delete existing
        await supabase
          .from('agendamento_responsaveis')
          .delete()
          .eq('agendamento_id', id);

        // Add new
        if (responsaveis.length > 0) {
          const responsaveisData = responsaveis.map(funcionario_id => ({
            agendamento_id: id,
            funcionario_id,
          }));

          const { error: respError } = await supabase
            .from('agendamento_responsaveis')
            .insert(responsaveisData);

          if (respError) throw respError;
        }
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      toast({
        title: 'Sucesso',
        description: 'Agendamento atualizado com sucesso!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useMarkNotified() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agendamentos')
        .update({ notificado: true })
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-notificacoes'] });
    },
  });
}
