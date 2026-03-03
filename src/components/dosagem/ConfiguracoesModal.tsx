import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FORMULAS_PADRAO, MATERIAIS_PADRAO, MaterialDensidade, FormulaConfig } from '@/lib/dosagem/constants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfiguracoesModal({ open, onOpenChange }: Props) {
  const [materiais, setMateriais] = useState<MaterialDensidade[]>([...MATERIAIS_PADRAO]);
  const [formulas] = useState<FormulaConfig[]>([...FORMULAS_PADRAO]);

  const updateDensidade = (idx: number, val: number) => {
    setMateriais(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], densidade: val };
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Dosagem</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="formulas">
          <TabsList className="w-full">
            <TabsTrigger value="formulas" className="flex-1">Fórmulas</TabsTrigger>
            <TabsTrigger value="densidades" className="flex-1">Densidades</TabsTrigger>
          </TabsList>

          <TabsContent value="formulas" className="space-y-2 mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Fórmulas e constantes usadas nos cálculos de dosagem. Consulte a NBR 12655 e método do Volume Absoluto.
            </p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[180px]">Nome</TableHead>
                  <TableHead>Fórmula / Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formulas.map(f => (
                  <TableRow key={f.id} className="text-xs">
                    <TableCell className="font-medium align-top py-2">
                      <div>{f.nome}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{f.descricao}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <code className="text-[11px] bg-muted px-2 py-1 rounded block whitespace-pre-wrap">
                        {f.formula}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="densidades" className="space-y-2 mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Densidades (massa específica) dos materiais em g/cm³ (= t/m³). Altere conforme resultados dos ensaios de laboratório.
            </p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Material</TableHead>
                  <TableHead className="w-[100px]">Categoria</TableHead>
                  <TableHead className="w-[120px] text-center">Densidade (g/cm³)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materiais.map((m, i) => (
                  <TableRow key={m.id} className="text-xs">
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{m.categoria}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={m.densidade}
                        onChange={e => updateDensidade(i, parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs text-center"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
