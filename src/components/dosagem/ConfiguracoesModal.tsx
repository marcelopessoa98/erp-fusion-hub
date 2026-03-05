import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock } from 'lucide-react';
import { FORMULAS_PADRAO, MATERIAIS_PADRAO, MaterialDensidade, FormulaConfig } from '@/lib/dosagem/constants';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfiguracoesModal({ open, onOpenChange }: Props) {
  const { isAdmin } = useAuth();
  const [materiais, setMateriais] = useState<MaterialDensidade[]>([...MATERIAIS_PADRAO]);
  const [formulas, setFormulas] = useState<FormulaConfig[]>([...FORMULAS_PADRAO]);

  const updateDensidade = (idx: number, val: number) => {
    if (!isAdmin) return;
    setMateriais(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], densidade: val };
      return next;
    });
  };

  const updateFormula = (idx: number, field: 'formula' | 'descricao', val: string) => {
    if (!isAdmin) return;
    setFormulas(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Configurações de Dosagem</DialogTitle>
            <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-xs">
              {isAdmin ? (
                <><Unlock className="h-3 w-3 mr-1" />Admin — Editável</>
              ) : (
                <><Lock className="h-3 w-3 mr-1" />Somente Leitura</>
              )}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="formulas">
          <TabsList className="w-full">
            <TabsTrigger value="formulas" className="flex-1">Fórmulas</TabsTrigger>
            <TabsTrigger value="densidades" className="flex-1">Densidades</TabsTrigger>
          </TabsList>

          <TabsContent value="formulas" className="space-y-2 mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Fórmulas e constantes usadas nos cálculos de dosagem. Consulte a NBR 12655 e método do Volume Absoluto.
              {!isAdmin && ' Apenas administradores podem alterar as fórmulas.'}
            </p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[180px]">Nome</TableHead>
                  <TableHead>Fórmula / Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formulas.map((f, idx) => (
                  <TableRow key={f.id} className="text-xs">
                    <TableCell className="font-medium align-top py-2">
                      <div>{f.nome}</div>
                    </TableCell>
                    <TableCell className="py-2 space-y-2">
                      {isAdmin ? (
                        <>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Descrição</Label>
                            <Input
                              value={f.descricao}
                              onChange={e => updateFormula(idx, 'descricao', e.target.value)}
                              className="h-9 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Fórmula</Label>
                            <Textarea
                              value={f.formula}
                              onChange={e => updateFormula(idx, 'formula', e.target.value)}
                              className="text-xs min-h-[60px] font-mono"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] text-muted-foreground">{f.descricao}</div>
                          <code className="text-[11px] bg-muted px-2 py-1 rounded block whitespace-pre-wrap">
                            {f.formula}
                          </code>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="densidades" className="space-y-2 mt-4">
            <p className="text-xs text-muted-foreground mb-3">
              Densidades (massa específica) dos materiais em g/cm³ (= t/m³). 
              {isAdmin ? ' Altere conforme resultados dos ensaios de laboratório.' : ' Apenas administradores podem alterar.'}
            </p>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Material</TableHead>
                  <TableHead className="w-[100px]">Categoria</TableHead>
                  <TableHead className="w-[140px] text-center">Densidade (g/cm³)</TableHead>
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
                        className="h-9 text-sm text-center"
                        readOnly={!isAdmin}
                        disabled={!isAdmin}
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
