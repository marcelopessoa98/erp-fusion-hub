import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  cor: string | null;
  ativo: boolean;
  created_at: string;
}

export interface LancamentoFinanceiro {
  id: string;
  tipo: string;
  categoria_id: string | null;
  filial_id: string | null;
  cliente_id: string | null;
  obra_id: string | null;
  descricao: string;
  valor: number;
  data_lancamento: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  observacoes: string | null;
  user_id: string | null;
  created_at: string;
  categorias_financeiras?: CategoriaFinanceira;
  clientes?: { nome: string };
  obras?: { nome: string };
  filiais?: { nome: string };
}

export interface CobrancaCliente {
  id: string;
  cliente_id: string;
  obra_id: string | null;
  filial_id: string | null;
  descricao: string;
  valor: number;
  dia_vencimento: number;
  mes_referencia: number;
  ano_referencia: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  observacoes: string | null;
  user_id: string | null;
  created_at: string;
  clientes?: { nome: string };
  obras?: { nome: string };
  filiais?: { nome: string };
}

export function useGestaoFinanceira() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Categorias
  const { data: categorias = [], isLoading: loadingCategorias } = useQuery({
    queryKey: ['categorias_financeiras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .order('tipo', { ascending: true })
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as CategoriaFinanceira[];
    },
    enabled: !!user,
  });

  const createCategoria = useMutation({
    mutationFn: async (cat: Partial<CategoriaFinanceira>) => {
      const { data, error } = await supabase.from('categorias_financeiras').insert(cat).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias_financeiras'] });
      toast({ title: 'Categoria criada com sucesso' });
    },
    onError: (e: Error) => toast({ title: 'Erro ao criar categoria', description: e.message, variant: 'destructive' }),
  });

  const updateCategoria = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CategoriaFinanceira> & { id: string }) => {
      const { data, error } = await supabase.from('categorias_financeiras').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias_financeiras'] });
      toast({ title: 'Categoria atualizada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteCategoria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categorias_financeiras').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias_financeiras'] });
      toast({ title: 'Categoria excluída' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Lançamentos
  const { data: lancamentos = [], isLoading: loadingLancamentos } = useQuery({
    queryKey: ['lancamentos_financeiros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_financeiros')
        .select('*, categorias_financeiras(*), clientes(nome), obras(nome), filiais(nome)')
        .order('data_lancamento', { ascending: false });
      if (error) throw error;
      return data as LancamentoFinanceiro[];
    },
    enabled: !!user,
  });

  const createLancamento = useMutation({
    mutationFn: async (lanc: Partial<LancamentoFinanceiro>) => {
      const { data, error } = await supabase.from('lancamentos_financeiros').insert({ ...lanc, user_id: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos_financeiros'] });
      toast({ title: 'Lançamento criado com sucesso' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateLancamento = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LancamentoFinanceiro> & { id: string }) => {
      const { data, error } = await supabase.from('lancamentos_financeiros').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos_financeiros'] });
      toast({ title: 'Lançamento atualizado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteLancamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lancamentos_financeiros'] });
      toast({ title: 'Lançamento excluído' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Cobranças
  const { data: cobrancas = [], isLoading: loadingCobrancas } = useQuery({
    queryKey: ['cobrancas_clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cobrancas_clientes')
        .select('*, clientes(nome), obras(nome), filiais(nome)')
        .order('data_vencimento', { ascending: false });
      if (error) throw error;
      return data as CobrancaCliente[];
    },
    enabled: !!user,
  });

  const createCobranca = useMutation({
    mutationFn: async (cob: Partial<CobrancaCliente>) => {
      const { data, error } = await supabase.from('cobrancas_clientes').insert({ ...cob, user_id: user?.id }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas_clientes'] });
      toast({ title: 'Cobrança criada com sucesso' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateCobranca = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CobrancaCliente> & { id: string }) => {
      const { data, error } = await supabase.from('cobrancas_clientes').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas_clientes'] });
      toast({ title: 'Cobrança atualizada' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteCobranca = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cobrancas_clientes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cobrancas_clientes'] });
      toast({ title: 'Cobrança excluída' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // Stats
  const totalReceitas = lancamentos.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesas = lancamentos.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0);
  const saldo = totalReceitas - totalDespesas;
  const cobrancasAtrasadas = cobrancas.filter(c => c.status === 'pendente' && new Date(c.data_vencimento) < new Date());
  const cobrancasPendentes = cobrancas.filter(c => c.status === 'pendente');

  return {
    categorias, loadingCategorias, createCategoria, updateCategoria, deleteCategoria,
    lancamentos, loadingLancamentos, createLancamento, updateLancamento, deleteLancamento,
    cobrancas, loadingCobrancas, createCobranca, updateCobranca, deleteCobranca,
    totalReceitas, totalDespesas, saldo, cobrancasAtrasadas, cobrancasPendentes,
  };
}
