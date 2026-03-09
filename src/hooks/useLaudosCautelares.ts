import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface LaudoCautelar {
  id: string;
  filial_id: string;
  cliente_id: string;
  obra_id: string;
  endereco_vistoriado: string;
  tipo_imovel: string;
  objetivo: string;
  tipo_ocupacao: string;
  caracteristicas_edificacao: string;
  vias_acesso: string;
  padrao_construtivo: string;
  qtd_pavimentos: number;
  estruturas: string;
  vedacao: string;
  acabamento_piso: string;
  acabamento_paredes: string;
  cobertura: string;
  texto_objetivo: string;
  texto_nota_previa: string;
  texto_metodologia: string;
  texto_avaliacao_final: string;
  bairro: string;
  cidade: string;
  imagem_google_maps: string | null;
  imagem_fluxograma: string | null;
  responsavel_id: string | null;
  status: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  clientes?: { nome: string; documento?: string };
  obras?: { nome: string; endereco?: string; referencia?: string };
  filiais?: { nome: string };
  equipe_tecnica?: { nome: string; cargo?: string; formacao?: string; numero_crea?: string };
}

export interface LaudoFoto {
  id: string;
  laudo_id: string;
  numero: number;
  descricao: string;
  foto_url: string;
  created_at: string;
}

export function useLaudosCautelares() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const laudosQuery = useQuery({
    queryKey: ['laudos_cautelares'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('laudos_cautelares')
        .select('*, clientes(nome, documento), obras(nome, endereco, referencia), filiais(nome), equipe_tecnica(nome, cargo, formacao, numero_crea)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as LaudoCautelar[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (laudo: Partial<LaudoCautelar>) => {
      const { data, error } = await supabase
        .from('laudos_cautelares')
        .insert({ ...laudo, user_id: user?.id } as any)
        .select('*, clientes(nome, documento), obras(nome, endereco, referencia), filiais(nome), equipe_tecnica(nome, cargo, formacao, numero_crea)')
        .single();
      if (error) throw error;
      return data as unknown as LaudoCautelar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laudos_cautelares'] });
      toast({ title: 'Laudo criado com sucesso!' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar laudo', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaudoCautelar> & { id: string }) => {
      const { data, error } = await supabase
        .from('laudos_cautelares')
        .update(updates as any)
        .eq('id', id)
        .select('*, clientes(nome, documento), obras(nome, endereco, referencia), filiais(nome), equipe_tecnica(nome, cargo, formacao, numero_crea)')
        .single();
      if (error) throw error;
      return data as unknown as LaudoCautelar;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laudos_cautelares'] });
      toast({ title: 'Laudo atualizado!' });
    },
    onError: (e: any) => toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('laudos_cautelares').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laudos_cautelares'] });
      toast({ title: 'Laudo excluído!' });
    },
    onError: (e: any) => toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' }),
  });

  // Photos
  const fotosQuery = (laudoId: string) => useQuery({
    queryKey: ['laudo_fotos', laudoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('laudo_cautelar_fotos')
        .select('*')
        .eq('laudo_id', laudoId)
        .order('numero', { ascending: true });
      if (error) throw error;
      return data as unknown as LaudoFoto[];
    },
    enabled: !!laudoId,
  });

  const uploadFoto = async (laudoId: string, numero: number, file: File, descricao?: string) => {
    const ext = file.name.split('.').pop();
    const filePath = `${laudoId}/${numero}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('laudos-cautelares').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('laudos-cautelares').getPublicUrl(filePath);

    // Upsert foto record
    const { error } = await supabase
      .from('laudo_cautelar_fotos')
      .upsert({
        laudo_id: laudoId,
        numero,
        descricao: descricao || `Imagem ${numero}`,
        foto_url: urlData.publicUrl,
      } as any, { onConflict: 'laudo_id,numero' })
      .select();
    
    // If upsert fails due to no unique constraint, try insert/update
    if (error) {
      // Check if exists
      const { data: existing } = await supabase
        .from('laudo_cautelar_fotos')
        .select('id')
        .eq('laudo_id', laudoId)
        .eq('numero', numero)
        .single();
      
      if (existing) {
        await supabase
          .from('laudo_cautelar_fotos')
          .update({ foto_url: urlData.publicUrl, descricao: descricao || `Imagem ${numero}` } as any)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('laudo_cautelar_fotos')
          .insert({
            laudo_id: laudoId,
            numero,
            descricao: descricao || `Imagem ${numero}`,
            foto_url: urlData.publicUrl,
          } as any);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['laudo_fotos', laudoId] });
    return urlData.publicUrl;
  };

  const uploadImagemLaudo = async (laudoId: string, tipo: 'google_maps' | 'fluxograma', file: File) => {
    const ext = file.name.split('.').pop();
    const filePath = `${laudoId}/${tipo}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('laudos-cautelares').upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('laudos-cautelares').getPublicUrl(filePath);
    
    const field = tipo === 'google_maps' ? 'imagem_google_maps' : 'imagem_fluxograma';
    await supabase.from('laudos_cautelares').update({ [field]: urlData.publicUrl } as any).eq('id', laudoId);
    queryClient.invalidateQueries({ queryKey: ['laudos_cautelares'] });
    return urlData.publicUrl;
  };

  const deleteFoto = async (fotoId: string, laudoId: string) => {
    const { error } = await supabase.from('laudo_cautelar_fotos').delete().eq('id', fotoId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['laudo_fotos', laudoId] });
  };

  return {
    laudos: laudosQuery.data || [],
    isLoading: laudosQuery.isLoading,
    createLaudo: createMutation.mutateAsync,
    updateLaudo: updateMutation.mutateAsync,
    deleteLaudo: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    useFotos: fotosQuery,
    uploadFoto,
    uploadImagemLaudo,
    deleteFoto,
  };
}
