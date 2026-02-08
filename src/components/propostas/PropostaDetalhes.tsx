import { useEffect, useState } from 'react';
import { Proposta } from '@/hooks/usePropostas';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { PropostaA4Preview } from './PropostaA4Preview';

interface PropostaDetalhesProps {
  propostaId: string | null;
  onClose: () => void;
  fetchComItens: (id: string) => Promise<Proposta>;
}

export function PropostaDetalhes({ propostaId, onClose, fetchComItens }: PropostaDetalhesProps) {
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propostaId) {
      setLoading(true);
      fetchComItens(propostaId)
        .then(setProposta)
        .finally(() => setLoading(false));
    } else {
      setProposta(null);
    }
  }, [propostaId]);

  return (
    <Dialog open={!!propostaId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[900px] max-h-[95vh] overflow-y-auto p-2 sm:p-4">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : proposta ? (
          <PropostaA4Preview proposta={proposta} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
