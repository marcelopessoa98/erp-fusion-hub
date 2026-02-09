import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContratoConfigItem {
  id: string;
  contrato_config_id: string;
  item_numero: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  ordem: number;
  created_at: string;
}

export interface ContratoConfig {
  id: string;
  obra_id: string;
  cliente_id: string;
  filial_id: string;
  contratante_nome: string;
  contratante_cnpj: string;
  contratado_nome: string;
  contratado_cnpj: string;
  servicos_descricao: string;
  numero_proposta: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  obra?: { nome: string };
  cliente?: { nome: string };
  filial?: { nome: string };
  contrato_config_itens?: ContratoConfigItem[];
}

export function useContratosConfig(obraId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contratos, isLoading } = useQuery({
    queryKey: ['contratos_config', obraId],
    queryFn: async () => {
      let query = supabase
        .from('contratos_config')
        .select(`
          *,
          obra:obras(nome),
          cliente:clientes(nome),
          filial:filiais(nome),
          contrato_config_itens(*)
        `)
        .order('created_at', { ascending: false });

      if (obraId) {
        query = query.eq('obra_id', obraId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContratoConfig[];
    },
  });

  const createContrato = useMutation({
    mutationFn: async (contrato: {
      obra_id: string;
      cliente_id: string;
      filial_id: string;
      contratante_nome: string;
      contratante_cnpj: string;
      contratado_nome: string;
      contratado_cnpj: string;
      servicos_descricao: string;
      numero_proposta?: string;
      user_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('contratos_config')
        .insert([contrato])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_config'] });
      toast({ title: 'Contrato criado', description: 'Configuração do contrato salva com sucesso.' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const updateContrato = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContratoConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('contratos_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_config'] });
      toast({ title: 'Contrato atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteContrato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contratos_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_config'] });
      toast({ title: 'Contrato excluído' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  // Itens
  const saveItens = useMutation({
    mutationFn: async ({ contratoId, itens }: { contratoId: string; itens: Omit<ContratoConfigItem, 'id' | 'created_at' | 'contrato_config_id'>[] }) => {
      // Delete existing
      await supabase.from('contrato_config_itens').delete().eq('contrato_config_id', contratoId);
      // Insert new
      if (itens.length > 0) {
        const { error } = await supabase
          .from('contrato_config_itens')
          .insert(itens.map((item) => ({ ...item, contrato_config_id: contratoId })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_config'] });
      toast({ title: 'Itens salvos' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao salvar itens', description: error.message, variant: 'destructive' });
    },
  });

  return { contratos, isLoading, createContrato, updateContrato, deleteContrato, saveItens };
}
