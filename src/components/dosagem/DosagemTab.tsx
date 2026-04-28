import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { MATERIAIS_PADRAO } from '@/lib/dosagem/constants';
import { calcularVolume, calcularDosagem, calcularBetonada, MaterialTraco, ResultadoDosagem } from '@/lib/dosagem/calculations';
import { CheckCircle, AlertTriangle, XCircle, Plus, Trash2, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MaterialRow {
  materialId: string;
  massa: number;
  umidade: number;
  aditivoPercent: number;
}

interface DosagemTabProps {
  ensaioId?: string;
  initialData?: {
    relacaoAC?: number;
    slump?: string;
    volumeBetoneira?: number;
    nomeTraco?: string;
    rows?: MaterialRow[];
  };
}

export function DosagemTab({ ensaioId, initialData }: DosagemTabProps = {}) {
  const { toast } = useToast();
  const [relacaoAC, setRelacaoAC] = useState(initialData?.relacaoAC ?? 0.55);
  const [slump, setSlump] = useState(initialData?.slump ?? '100±20');
  const [volumeBetoneira, setVolumeBetoneira] = useState(initialData?.volumeBetoneira ?? 1.0);
  const [nomeTraco, setNomeTraco] = useState(initialData?.nomeTraco ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const isFirstRender = useRef(true);

  const [rows, setRows] = useState<MaterialRow[]>(initialData?.rows && initialData.rows.length ? initialData.rows : [
    { materialId: 'cimento', massa: 400, umidade: 0, aditivoPercent: 0 },
    { materialId: 'areia_media', massa: 600, umidade: 2, aditivoPercent: 0 },
    { materialId: 'brita1', massa: 900, umidade: 0.5, aditivoPercent: 0 },
    { materialId: 'agua', massa: 220, umidade: 0, aditivoPercent: 0 },
  ]);

  const persist = async () => {
    if (!ensaioId) return;
    setSaving(true);
    try {
      const { data: current, error: fetchErr } = await supabase
        .from('ensaios').select('campos_especificos').eq('id', ensaioId).single();
      if (fetchErr) throw fetchErr;
      const campos = (current?.campos_especificos as any) || {};
      const novosCampos = {
        ...campos,
        dosagem: { relacaoAC, slump, volumeBetoneira, nomeTraco, rows, updated_at: new Date().toISOString() },
      };
      const { error } = await supabase.from('ensaios').update({ campos_especificos: novosCampos }).eq('id', ensaioId);
      if (error) throw error;
      setSavedAt(new Date());
    } catch (e: any) {
      toast({ title: 'Erro ao salvar dosagem', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!ensaioId) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const t = setTimeout(() => { persist(); }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relacaoAC, slump, volumeBetoneira, nomeTraco, rows, ensaioId]);

  const addRow = () => {
    setRows(prev => [...prev, { materialId: '', massa: 0, umidade: 0, aditivoPercent: 0 }]);
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof MaterialRow, value: any) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'massa' || field === 'materialId') {
        const cimentoRow = next.find(r => {
          const mat = MATERIAIS_PADRAO.find(m => m.id === r.materialId);
          return mat?.categoria === 'cimento';
        });
        const aguaRow = next.find(r => {
          const mat = MATERIAIS_PADRAO.find(m => m.id === r.materialId);
          return mat?.categoria === 'agua';
        });
        if (cimentoRow && aguaRow) {
          aguaRow.massa = Math.round(cimentoRow.massa * relacaoAC * 100) / 100;
        }
        for (const r of next) {
          const mat = MATERIAIS_PADRAO.find(m => m.id === r.materialId);
          if (mat?.categoria === 'aditivo' && cimentoRow && r.aditivoPercent > 0) {
            r.massa = Math.round(cimentoRow.massa * r.aditivoPercent / 100 * 100) / 100;
          }
        }
      }
      return next;
    });
  };

  const handleACChange = (val: number) => {
    setRelacaoAC(val);
    setRows(prev => {
      const next = [...prev];
      const cimentoRow = next.find(r => MATERIAIS_PADRAO.find(m => m.id === r.materialId)?.categoria === 'cimento');
      const aguaRow = next.find(r => MATERIAIS_PADRAO.find(m => m.id === r.materialId)?.categoria === 'agua');
      if (cimentoRow && aguaRow) {
        aguaRow.massa = Math.round(cimentoRow.massa * val * 100) / 100;
      }
      return next;
    });
  };

  const materiais: MaterialTraco[] = useMemo(() => {
    return rows
      .map(r => {
        const mat = MATERIAIS_PADRAO.find(m => m.id === r.materialId);
        if (!mat) return null;
        const volume = calcularVolume(r.massa, mat.densidade);
        return {
          id: mat.id,
          nome: mat.nome,
          massa: r.massa,
          densidade: mat.densidade,
          umidade: r.umidade,
          volume,
          massaCorrigida: mat.categoria === 'areia' || mat.categoria === 'brita'
            ? r.massa * (1 + r.umidade / 100)
            : r.massa,
          categoria: mat.categoria,
        };
      })
      .filter(Boolean) as MaterialTraco[];
  }, [rows]);

  const resultado: ResultadoDosagem = useMemo(() => {
    return calcularDosagem(materiais, relacaoAC, 0);
  }, [materiais, relacaoAC]);

  const betonada = useMemo(() => {
    return calcularBetonada(materiais, volumeBetoneira);
  }, [materiais, volumeBetoneira]);

  const volumePercent = Math.min(resultado.volumeTotal * 100, 110);

  const statusIcon = {
    baixo: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    fechado: <CheckCircle className="h-5 w-5 text-green-500" />,
    alto: <XCircle className="h-5 w-5 text-red-500" />,
  };

  const statusColor = {
    baixo: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    fechado: 'border-green-500 bg-green-50 dark:bg-green-950/20',
    alto: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  };

  const statusText = {
    baixo: 'Volume abaixo de 1m³ — ajuste as massas',
    fechado: '✓ Traço Fechado! Volume = 1,000 m³',
    alto: 'Volume acima de 1m³ — reduza as massas',
  };

  const progressColor = resultado.status === 'fechado' ? '[&>div]:bg-green-500' :
    resultado.status === 'alto' ? '[&>div]:bg-red-500' : '[&>div]:bg-yellow-500';

  const materiaisDisponiveis = MATERIAIS_PADRAO.filter(
    m => !rows.some(r => r.materialId === m.id)
  );

  return (
    <div className="space-y-4">
      {/* Volume Indicator */}
      <Card className={cn('border-2', statusColor[resultado.status])}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            {statusIcon[resultado.status]}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Volume Absoluto Total</span>
                <span className="text-lg font-bold font-mono">
                  {resultado.volumeTotal.toFixed(4)} m³
                </span>
              </div>
              <Progress value={volumePercent} className={cn('h-3', progressColor)} />
              <p className="text-xs mt-1 text-muted-foreground">{statusText[resultado.status]}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Parameters */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Parâmetros do Traço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <Label className="text-xs">Nome do Traço</Label>
              <Input value={nomeTraco} onChange={e => setNomeTraco(e.target.value)} placeholder="Ex: T-1 Parede FCK25" className="h-10 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Relação a/c</Label>
                <Input type="number" step="0.01" min="0.2" max="1.0" value={relacaoAC} onChange={e => handleACChange(parseFloat(e.target.value) || 0)} className="h-10 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Slump (mm)</Label>
                <Input value={slump} onChange={e => setSlump(e.target.value)} className="h-10 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Volume Betoneira (m³)</Label>
              <Input type="number" step="0.1" min="0.1" value={volumeBetoneira} onChange={e => setVolumeBetoneira(parseFloat(e.target.value) || 1)} className="h-10 text-sm" />
            </div>

            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Consumo Cimento:</span>
                <span className="font-medium">{resultado.consumoCimento.toFixed(1)} kg/m³</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Teor Argamassa:</span>
                <span className="font-medium">{resultado.teorArgamassa.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Traço Unitário:</span>
                <span className="font-medium font-mono text-[11px]">{resultado.tracoUnitario}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Água Corrigida:</span>
                <span className="font-medium">{resultado.aguaCorrigida.toFixed(1)} L</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Materials Table */}
        <Card className="xl:col-span-2">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Materiais</CardTitle>
            <Button size="sm" variant="outline" onClick={addRow} className="h-8 text-xs">
              <Plus className="h-3 w-3 mr-1" />Adicionar
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[200px]">Material</TableHead>
                    <TableHead className="w-[110px] text-center">Massa (kg)</TableHead>
                    <TableHead className="w-[80px] text-center">Dens.</TableHead>
                    <TableHead className="w-[90px] text-center">Umid. %</TableHead>
                    <TableHead className="w-[100px] text-center">Volume (m³)</TableHead>
                    <TableHead className="w-[100px] text-center">M. Corrig.</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => {
                    const mat = MATERIAIS_PADRAO.find(m => m.id === row.materialId);
                    const volume = mat ? calcularVolume(row.massa, mat.densidade) : 0;
                    const massaCorrigida = mat && (mat.categoria === 'areia' || mat.categoria === 'brita')
                      ? row.massa * (1 + row.umidade / 100) : row.massa;
                    const isCalcField = mat?.categoria === 'agua';
                    const isAditivo = mat?.categoria === 'aditivo';

                    return (
                      <TableRow key={i} className="text-xs">
                        <TableCell className="py-1.5">
                          <Select value={row.materialId} onValueChange={v => updateRow(i, 'materialId', v)}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {mat && <SelectItem value={mat.id}>{mat.nome}</SelectItem>}
                              {materiaisDisponiveis.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1.5">
                          {isAditivo ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.1"
                                value={row.aditivoPercent || ''}
                                onChange={e => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  const cimentoRow = rows.find(r => MATERIAIS_PADRAO.find(m => m.id === r.materialId)?.categoria === 'cimento');
                                  const newRows = [...rows];
                                  newRows[i] = { ...newRows[i], aditivoPercent: pct, massa: cimentoRow ? Math.round(cimentoRow.massa * pct / 100 * 100) / 100 : 0 };
                                  setRows(newRows);
                                }}
                                className="h-9 text-sm text-center w-16"
                                placeholder="%"
                              />
                              <span className="text-[10px] text-muted-foreground">%</span>
                            </div>
                          ) : (
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={row.massa || ''}
                              onChange={e => updateRow(i, 'massa', parseFloat(e.target.value) || 0)}
                              className={cn('h-9 text-sm text-center', isCalcField && 'bg-muted text-muted-foreground')}
                              readOnly={isCalcField}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center py-1.5 text-muted-foreground">
                          {mat?.densidade.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {(mat?.categoria === 'areia' || mat?.categoria === 'brita') ? (
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={row.umidade || ''}
                              onChange={e => updateRow(i, 'umidade', parseFloat(e.target.value) || 0)}
                              className="h-9 text-sm text-center"
                            />
                          ) : (
                            <span className="block text-center text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-1.5 font-mono text-muted-foreground">
                          {volume.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-center py-1.5 font-mono text-muted-foreground">
                          {massaCorrigida.toFixed(1)}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <Button variant="ghost" size="icon" onClick={() => removeRow(i)} className="h-7 w-7">
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="text-xs font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{rows.reduce((s, r) => s + r.massa, 0).toFixed(1)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-center font-mono">{resultado.volumeTotal.toFixed(4)}</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Betonada */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Consumo por Betonada ({volumeBetoneira} m³)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>Material</TableHead>
                <TableHead className="text-center">Massa Seca (kg)</TableHead>
                <TableHead className="text-center">Massa Corrigida (kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {betonada.map(b => (
                <TableRow key={b.nome} className="text-xs">
                  <TableCell>{b.nome}</TableCell>
                  <TableCell className="text-center font-mono">{b.massa.toFixed(1)}</TableCell>
                  <TableCell className="text-center font-mono">{b.massaCorrigida.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
