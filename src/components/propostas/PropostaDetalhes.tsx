import { useEffect, useState } from 'react';
import { Proposta } from '@/hooks/usePropostas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface PropostaDetalhesProps {
  propostaId: string | null;
  onClose: () => void;
  fetchComItens: (id: string) => Promise<Proposta>;
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  aguardando_ceo: 'Aguardando Validação CEO',
  aprovada_ceo: 'Aprovada CEO',
  enviada: 'Enviada',
  cancelada: 'Cancelada',
};

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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Proposta</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : proposta ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-bold font-mono">{proposta.numero}</p>
                    <p className="text-muted-foreground">{proposta.assunto}</p>
                  </div>
                  <Badge>{statusLabels[proposta.status] || proposta.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                  <div><span className="text-muted-foreground">Cliente:</span> {proposta.clientes?.nome}</div>
                  <div><span className="text-muted-foreground">Obra:</span> {proposta.obras?.nome}</div>
                  <div><span className="text-muted-foreground">Validade:</span> {proposta.validade_dias} dias</div>
                  <div><span className="text-muted-foreground">Criada em:</span> {format(new Date(proposta.created_at), 'dd/MM/yyyy')}</div>
                </div>
              </CardContent>
            </Card>

            {proposta.itens && proposta.itens.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ensaios / Serviços</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor (R$)</TableHead>
                        <TableHead>Unidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposta.itens.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell className="text-right">
                            {Number(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{item.unidade}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
