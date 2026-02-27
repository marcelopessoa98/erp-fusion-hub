import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

export const TIPOS_DOCUMENTO = [
  { tipo: 'registro_trabalho', nome: 'Registro de Trabalho', temValidade: false },
  { tipo: 'ordem_servico', nome: 'Ordem de Serviço', temValidade: true, validadeAnos: 1 },
  { tipo: 'aso', nome: 'A.S.O.', temValidade: true, validadeAnos: 1 },
  { tipo: 'nr_18', nome: 'NR 18', temValidade: true, validadeAnos: 2 },
  { tipo: 'nr_12', nome: 'NR 12', temValidade: true, validadeAnos: 2 },
  { tipo: 'nr_35', nome: 'NR 35', temValidade: true, validadeAnos: 2 },
  { tipo: 'cartao_vacina', nome: 'Cartão de Vacina', temValidade: false },
] as const;

export type TipoDocumento = typeof TIPOS_DOCUMENTO[number]['tipo'];

export interface FuncionarioDocumento {
  id: string;
  nome: string;
  cargo: string | null;
  filial_id: string | null;
  filial_nome?: string;
  documentos: Record<TipoDocumento, {
    id: string | null;
    data_emissao: string | null;
    data_validade: string | null;
    status: 'vigente' | 'vencido' | 'a_vencer' | 'pendente';
  }>;
}

export type StatusFiltro = 'todos' | 'regular' | 'irregular' | 'a_vencer';

const DIAS_ALERTA = 17;

function calcularStatus(doc: { data_emissao: string | null; data_validade: string | null } | null, temValidade: boolean): 'vigente' | 'vencido' | 'a_vencer' | 'pendente' {
  if (!doc || !doc.data_emissao) return 'pendente';
  if (!temValidade) return 'vigente';
  if (!doc.data_validade) return 'pendente';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [y, m, d] = doc.data_validade.split('-').map(Number);
  const validade = new Date(y, m - 1, d);
  
  if (validade < hoje) return 'vencido';
  
  const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes <= DIAS_ALERTA) return 'a_vencer';
  
  return 'vigente';
}

function calcularStatusFuncionario(docs: FuncionarioDocumento['documentos']): 'regular' | 'irregular' | 'a_vencer' {
  let temAVencer = false;
  for (const tipo of TIPOS_DOCUMENTO) {
    const doc = docs[tipo.tipo];
    if (doc.status === 'vencido' || doc.status === 'pendente') return 'irregular';
    if (doc.status === 'a_vencer') temAVencer = true;
  }
  return temAVencer ? 'a_vencer' : 'regular';
}

export function useDocumentacaoFuncionarios() {
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState<FuncionarioDocumento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialFiltro, setFilialFiltro] = useState<string>('todas');
  const [buscaNome, setBuscaNome] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todos');
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: funcs }, { data: docs }, { data: filiaisData }] = await Promise.all([
        supabase.from('funcionarios').select('id, nome, cargo, filial_id, filiais(nome)').eq('ativo', true).order('nome'),
        supabase.from('documentos_funcionarios').select('*'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
      ]);

      if (filiaisData) setFiliais(filiaisData);

      if (funcs) {
        const docsMap = new Map<string, Map<string, any>>();
        docs?.forEach((d) => {
          if (!docsMap.has(d.funcionario_id)) docsMap.set(d.funcionario_id, new Map());
          docsMap.get(d.funcionario_id)!.set(d.tipo_documento, d);
        });

        const result: FuncionarioDocumento[] = funcs.map((f: any) => {
          const funcDocs = docsMap.get(f.id);
          const documentos = {} as FuncionarioDocumento['documentos'];

          TIPOS_DOCUMENTO.forEach(({ tipo, temValidade }) => {
            const doc = funcDocs?.get(tipo) || null;
            documentos[tipo] = {
              id: doc?.id || null,
              data_emissao: doc?.data_emissao || null,
              data_validade: doc?.data_validade || null,
              status: calcularStatus(doc, temValidade),
            };
          });

          return {
            id: f.id,
            nome: f.nome,
            cargo: f.cargo,
            filial_id: f.filial_id,
            filial_nome: f.filiais?.nome || 'Sem filial',
            documentos,
          };
        });

        setFuncionarios(result);
      }
    } catch (error) {
      console.error('Erro ao buscar documentação:', error);
      toast.error('Erro ao carregar documentação');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const salvarDocumento = async (
    funcionarioId: string,
    filialId: string,
    tipoDocumento: TipoDocumento,
    dataEmissao: string | null,
    docId: string | null
  ) => {
    const tipoInfo = TIPOS_DOCUMENTO.find(t => t.tipo === tipoDocumento)!;
    let dataValidade: string | null = null;

    if (tipoInfo.temValidade && dataEmissao) {
      const [y, m, d] = dataEmissao.split('-').map(Number);
      const validade = new Date(y + tipoInfo.validadeAnos, m - 1, d);
      dataValidade = `${validade.getFullYear()}-${String(validade.getMonth() + 1).padStart(2, '0')}-${String(validade.getDate()).padStart(2, '0')}`;
    }

    const status = calcularStatus(
      { data_emissao: dataEmissao, data_validade: dataValidade },
      tipoInfo.temValidade
    );

    try {
      if (docId) {
        const { error } = await supabase
          .from('documentos_funcionarios')
          .update({
            data_emissao: dataEmissao,
            data_validade: dataValidade,
            status,
            nome_documento: tipoInfo.nome,
          })
          .eq('id', docId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('documentos_funcionarios')
          .insert({
            funcionario_id: funcionarioId,
            filial_id: filialId,
            tipo_documento: tipoDocumento,
            nome_documento: tipoInfo.nome,
            data_emissao: dataEmissao,
            data_validade: dataValidade,
            status,
            user_id: user?.id,
          });
        if (error) throw error;
      }

      toast.success(`${tipoInfo.nome} atualizado com sucesso`);
      await fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar documento:', error);
      toast.error('Erro ao salvar documento: ' + error.message);
    }
  };

  const marcarDocumentoSemValidade = async (
    funcionarioId: string,
    filialId: string,
    tipoDocumento: TipoDocumento,
    marcado: boolean,
    docId: string | null
  ) => {
    const tipoInfo = TIPOS_DOCUMENTO.find(t => t.tipo === tipoDocumento)!;
    const hoje = new Date();
    const dataEmissao = marcado
      ? `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
      : null;

    try {
      if (docId && !marcado) {
        const { error } = await supabase
          .from('documentos_funcionarios')
          .update({ data_emissao: null, status: 'pendente' })
          .eq('id', docId);
        if (error) throw error;
      } else if (docId && marcado) {
        const { error } = await supabase
          .from('documentos_funcionarios')
          .update({ data_emissao: dataEmissao, status: 'vigente' })
          .eq('id', docId);
        if (error) throw error;
      } else if (marcado) {
        const { error } = await supabase
          .from('documentos_funcionarios')
          .insert({
            funcionario_id: funcionarioId,
            filial_id: filialId,
            tipo_documento: tipoDocumento,
            nome_documento: tipoInfo.nome,
            data_emissao: dataEmissao,
            status: 'vigente',
            user_id: user?.id,
          });
        if (error) throw error;
      }

      await fetchData();
    } catch (error: any) {
      console.error('Erro ao atualizar documento:', error);
      toast.error('Erro ao atualizar: ' + error.message);
    }
  };

  // Filtered list
  const funcionariosFiltrados = funcionarios.filter((f) => {
    if (filialFiltro !== 'todas' && f.filial_id !== filialFiltro) return false;
    if (buscaNome && !f.nome.toLowerCase().includes(buscaNome.toLowerCase())) return false;
    if (statusFiltro !== 'todos') {
      const status = calcularStatusFuncionario(f.documentos);
      if (statusFiltro !== status) return false;
    }
    return true;
  });

  // Dashboard counts
  const contagens = {
    regular: funcionarios.filter(f => calcularStatusFuncionario(f.documentos) === 'regular').length,
    irregular: funcionarios.filter(f => calcularStatusFuncionario(f.documentos) === 'irregular').length,
    a_vencer: funcionarios.filter(f => calcularStatusFuncionario(f.documentos) === 'a_vencer').length,
    total: funcionarios.length,
  };

  return {
    funcionarios: funcionariosFiltrados,
    loading,
    filiais,
    filialFiltro,
    setFilialFiltro,
    buscaNome,
    setBuscaNome,
    statusFiltro,
    setStatusFiltro,
    contagens,
    salvarDocumento,
    marcarDocumentoSemValidade,
    refetch: fetchData,
  };
}
