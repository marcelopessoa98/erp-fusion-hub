import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePropostas } from '@/hooks/usePropostas';
import { PropostaForm } from '@/components/propostas/PropostaForm';
import { PropostasList } from '@/components/propostas/PropostasList';
import { PropostaDetalhes } from '@/components/propostas/PropostaDetalhes';

const Propostas = () => {
  const {
    propostas,
    loading,
    criarProposta,
    atualizarStatus,
    excluirProposta,
    fetchPropostaComItens,
  } = usePropostas();

  const [formOpen, setFormOpen] = useState(false);
  const [detalhesId, setDetalhesId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propostas Comerciais</h1>
          <p className="text-muted-foreground">
            Geração e gestão de propostas comerciais — FOR-CFT-025
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Proposta
        </Button>
      </div>

      <PropostasList
        propostas={propostas}
        loading={loading}
        onAtualizarStatus={atualizarStatus}
        onExcluir={excluirProposta}
        onVerDetalhes={setDetalhesId}
        fetchComItens={fetchPropostaComItens}
      />

      <PropostaForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={criarProposta}
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
