import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Proposta } from '@/hooks/usePropostas';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { PropostaA4Preview } from './PropostaA4Preview';

interface PropostaDetalhesProps {
  propostaId: string | null;
  onClose: () => void;
  fetchComItens: (id: string) => Promise<Proposta>;
}

export function PropostaDetalhes({ propostaId, onClose, fetchComItens }: PropostaDetalhesProps) {
  const [proposta, setProposta] = useState<Proposta | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: proposta ? `Proposta_${proposta.numero}` : 'Proposta',
  });

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
      <DialogContent className="max-w-[920px] max-h-[95vh] overflow-y-auto p-2 sm:p-4">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : proposta ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={() => handlePrint()} size="sm" variant="outline">
                <FileDown className="h-4 w-4 mr-2" /> Gerar PDF / Imprimir
              </Button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
              <div style={{ transform: 'scale(0.48)', transformOrigin: 'top left', width: '210mm' }}>
                <PropostaA4Preview ref={printRef} proposta={proposta} />
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
