import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const TIPOS_ENSAIO = [
  'Arrancamento',
  'Laudo Cautelar de Vizinhança',
  'Extração',
  'Esclerometria',
  'PIT',
  'Traços',
] as const;

export type TipoEnsaio = typeof TIPOS_ENSAIO[number];

export interface CamposEspecificos {
  // Arrancamento
  carga_maxima?: number;
  diametro_chumbador?: string;
  profundidade?: string;
  // Extração
  diametro_corpo_prova?: string;
  resistencia_compressao?: number;
  // Esclerometria
  indice_esclerometrico?: number;
  superficie_ensaiada?: string;
  // PIT
  comprimento_estaca?: number;
  tipo_estaca?: string;
  impedancia?: string;
  // Traços
  tipo_concreto?: string;
  fck?: number;
  slump?: string;
  aditivos?: string;
  // Laudo Cautelar
  tipo_imovel?: string;
  endereco_imovel?: string;
  anomalias_encontradas?: string;
}

export interface Ensaio {
  id: string;
  filial_id: string;
  cliente_id: string;
  obra_id: string;
  tipo: TipoEnsaio;
  data_ensaio: string;
  responsavel_id: string | null;
  status: string;
  resultado: string | null;
  campos_especificos: CamposEspecificos;
  observacoes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  filiais?: { nome: string };
  clientes?: { nome: string };
  obras?: { nome: string };
  funcionarios?: { nome: string };
}

export function useEnsaios() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const ensaiosQuery = useQuery({
    queryKey: ['ensaios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ensaios')
        .select('*, filiais(nome), clientes(nome), obras(nome), funcionarios(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Ensaio[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (ensaio: Omit<Ensaio, 'id' | 'created_at' | 'updated_at' | 'filiais' | 'clientes' | 'obras' | 'funcionarios'>) => {
      const { data, error } = await supabase
        .from('ensaios')
        .insert(ensaio as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensaios'] });
      toast({ title: 'Ensaio criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar ensaio', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ensaio> & { id: string }) => {
      const { data, error } = await supabase
        .from('ensaios')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensaios'] });
      toast({ title: 'Ensaio atualizado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar ensaio', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ensaios').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ensaios'] });
      toast({ title: 'Ensaio excluído com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir ensaio', description: error.message, variant: 'destructive' });
    },
  });

  const uploadAnexo = async (ensaioId: string, file: File) => {
    const filePath = `${ensaioId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('ensaios-anexos').upload(filePath, file);
    if (error) throw error;
    return filePath;
  };

  const listAnexos = async (ensaioId: string) => {
    const { data, error } = await supabase.storage.from('ensaios-anexos').list(ensaioId);
    if (error) throw error;
    return data;
  };

  const getAnexoUrl = (filePath: string) => {
    const { data } = supabase.storage.from('ensaios-anexos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const deleteAnexo = async (filePath: string) => {
    const { error } = await supabase.storage.from('ensaios-anexos').remove([filePath]);
    if (error) throw error;
  };

  return {
    ensaios: ensaiosQuery.data || [],
    isLoading: ensaiosQuery.isLoading,
    createEnsaio: createMutation.mutateAsync,
    updateEnsaio: updateMutation.mutateAsync,
    deleteEnsaio: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    uploadAnexo,
    listAnexos,
    getAnexoUrl,
    deleteAnexo,
  };
}
