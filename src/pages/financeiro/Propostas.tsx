import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePropostas, Proposta, PropostaItem } from '@/hooks/usePropostas';
import { PropostaForm } from '@/components/propostas/PropostaForm';
import { PropostasList } from '@/components/propostas/PropostasList';
import { PropostaDetalhes } from '@/components/propostas/PropostaDetalhes';

const Propostas = () => {
  const {
    propostas,
    loading,
    criarProposta,
    editarProposta,
    aprovarProposta,
    atualizarStatus,
    excluirProposta,
    fetchPropostaComItens,
  } = usePropostas();

  const [formOpen, setFormOpen] = useState(false);
  const [detalhesId, setDetalhesId] = useState<string | null>(null);
  const [propostaEditando, setPropostaEditando] = useState<Proposta | null>(null);

  const handleEditar = async (id: string) => {
    const proposta = await fetchPropostaComItens(id);
    setPropostaEditando(proposta);
    setFormOpen(true);
  };

  const handleFormSubmit = async (
    dados: {
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
    if (propostaEditando) {
      await editarProposta(propostaEditando.id, dados, itens);
    } else {
      await criarProposta(dados, itens);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setPropostaEditando(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propostas Comerciais</h1>
          <p className="text-muted-foreground">
            Geração e gestão de propostas comerciais — FOR-CFT-025
          </p>
        </div>
        <Button onClick={() => { setPropostaEditando(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Proposta
        </Button>
      </div>

      <PropostasList
        propostas={propostas}
        loading={loading}
        onAprovar={aprovarProposta}
        onAtualizarStatus={atualizarStatus}
        onExcluir={excluirProposta}
        onVerDetalhes={setDetalhesId}
        onEditar={handleEditar}
        fetchComItens={fetchPropostaComItens}
      />

      <PropostaForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        propostaParaEditar={propostaEditando}
      />

      <PropostaDetalhes
        propostaId={detalhesId}
        onClose={() => setDetalhesId(null)}
        fetchComItens={fetchPropostaComItens}
      />
    </div>
  );
};

export default Propostas;
