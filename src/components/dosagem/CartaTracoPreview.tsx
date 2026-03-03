import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MaterialTraco, ResultadoDosagem } from '@/lib/dosagem/calculations';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materiais: MaterialTraco[];
  resultado: ResultadoDosagem;
  volumeBetoneira: number;
  nomeTraco: string;
  slump: string;
  relacaoAC: number;
}

export function CartaTracoPreview({
  open,
  onOpenChange,
  materiais,
  resultado,
  volumeBetoneira,
  nomeTraco,
  slump,
  relacaoAC,
}: Props) {
  const now = new Date().toLocaleDateString('pt-BR');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carta de Traço - Preview</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 print:text-black">
          {/* Header */}
          <div className="border-b pb-3">
            <h2 className="text-lg font-bold">{nomeTraco || 'Carta de Traço'}</h2>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div><span className="text-muted-foreground">Data:</span> {now}</div>
              <div><span className="text-muted-foreground">Slump:</span> {slump}</div>
              <div><span className="text-muted-foreground">a/c:</span> {relacaoAC}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-1">
              <div><span className="text-muted-foreground">Cc:</span> {resultado.consumoCimento.toFixed(1)} kg/m³</div>
              <div><span className="text-muted-foreground">T.A.:</span> {resultado.teorArgamassa.toFixed(1)}%</div>
              <div><span className="text-muted-foreground">Traço:</span> {resultado.tracoUnitario}</div>
            </div>
          </div>

          {/* Consumo por m³ */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Consumo por m³</h3>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Massa (kg)</TableHead>
                  <TableHead className="text-center">Densidade</TableHead>
                  <TableHead className="text-center">Volume (m³)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiais.map(m => (
                  <TableRow key={m.id} className="text-xs">
                    <TableCell>{m.nome}</TableCell>
                    <TableCell className="text-center font-mono">{m.massa.toFixed(1)}</TableCell>
                    <TableCell className="text-center">{m.densidade.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-mono">{m.volume.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="text-xs font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{materiais.reduce((s, m) => s + m.massa, 0).toFixed(1)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-center font-mono">{resultado.volumeTotal.toFixed(4)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Consumo por betonada */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Consumo por Betonada ({volumeBetoneira} m³)</h3>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Seco (kg)</TableHead>
                  <TableHead className="text-center">Corrigido (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiais.map(m => (
                  <TableRow key={m.id} className="text-xs">
                    <TableCell>{m.nome}</TableCell>
                    <TableCell className="text-center font-mono">{(m.massa * volumeBetoneira).toFixed(1)}</TableCell>
                    <TableCell className="text-center font-mono">{(m.massaCorrigida * volumeBetoneira).toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="text-center pt-4 border-t">
            <Badge variant={resultado.status === 'fechado' ? 'default' : 'destructive'}>
              {resultado.status === 'fechado' ? 'Traço Fechado ✓' : `Volume: ${resultado.volumeTotal.toFixed(4)} m³`}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
