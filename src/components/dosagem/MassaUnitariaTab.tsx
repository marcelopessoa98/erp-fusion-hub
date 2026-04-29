import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type TipoAgregado = 'miudo' | 'graudo';

interface Determinacao {
  vr: number;
  m1: number;
  m2: number;
}

interface MassaUnitariaTabProps {
  ensaioId?: string;
  initialData?: {
    tipoAgregado?: TipoAgregado;
    detA?: Determinacao;
    detB?: Determinacao;
    detC?: Determinacao;
  };
}

export function MassaUnitariaTab({ ensaioId, initialData }: MassaUnitariaTabProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tipoAgregado, setTipoAgregado] = useState<TipoAgregado>(initialData?.tipoAgregado || 'miudo');
  const [detA, setDetA] = useState<Determinacao>(initialData?.detA || { vr: 9960, m1: 5910, m2: 0 });
  const [detB, setDetB] = useState<Determinacao>(initialData?.detB || { vr: 9960, m1: 5910, m2: 0 });
  const [detC, setDetC] = useState<Determinacao>(initialData?.detC || { vr: 9960, m1: 5910, m2: 0 });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const isFirstRender = useRef(true);
  const hydratedRef = useRef(!!(initialData?.detA?.m2 || initialData?.detB?.m2 || initialData?.detC?.m2));

  const calcMU = (det: Determinacao) => {
    if (det.vr <= 0 || det.m2 <= 0) return 0;
    return (det.m2 - det.m1) / det.vr;
  };

  const muA = useMemo(() => calcMU(detA), [detA]);
  const muB = useMemo(() => calcMU(detB), [detB]);
  const muC = useMemo(() => calcMU(detC), [detC]);

  const media = useMemo(() => {
    const vals = [muA, muB, muC].filter(v => v > 0);
    if (vals.length === 0) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }, [muA, muB, muC]);

  const determinacoes = [
    { label: 'a', det: detA, set: setDetA, mu: muA },
    { label: 'b', det: detB, set: setDetB, mu: muB },
    { label: 'c', det: detC, set: setDetC, mu: muC },
  ];

  const updateDet = (
    setter: React.Dispatch<React.SetStateAction<Determinacao>>,
    field: keyof Determinacao,
    value: string
  ) => {
    setter(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const persist = async (opts: { manual?: boolean } = {}) => {
    if (!ensaioId) return;
    setSaving(true);
    try {
      const { data: current, error: fetchErr } = await supabase
        .from('ensaios').select('campos_especificos').eq('id', ensaioId).single();
      if (fetchErr) throw fetchErr;
      const campos = (current?.campos_especificos as any) || {};
      const existing = campos.massaUnitaria as any;
      const isEmpty = !detA.m2 && !detB.m2 && !detC.m2;
      const existingHasData = existing && (existing.detA?.m2 || existing.detB?.m2 || existing.detC?.m2);
      if (isEmpty && existingHasData && !opts.manual) {
        if (existing.tipoAgregado) setTipoAgregado(existing.tipoAgregado);
        if (existing.detA) setDetA(existing.detA);
        if (existing.detB) setDetB(existing.detB);
        if (existing.detC) setDetC(existing.detC);
        hydratedRef.current = true;
        setSaving(false);
        return;
      }
      const novosCampos = {
        ...campos,
        massaUnitaria: { tipoAgregado, detA, detB, detC, muA, muB, muC, media, updated_at: new Date().toISOString() },
      };
      const { error } = await supabase.from('ensaios').update({ campos_especificos: novosCampos }).eq('id', ensaioId);
      if (error) throw error;
      setSavedAt(new Date());
      hydratedRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['ensaios'] });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar massa unitária', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Re-hydrate when initialData arrives later
  useEffect(() => {
    if (!initialData || hydratedRef.current) return;
    const hasData = initialData.detA?.m2 || initialData.detB?.m2 || initialData.detC?.m2;
    if (!hasData) return;
    if (initialData.tipoAgregado) setTipoAgregado(initialData.tipoAgregado);
    if (initialData.detA) setDetA(initialData.detA);
    if (initialData.detB) setDetB(initialData.detB);
    if (initialData.detC) setDetC(initialData.detC);
    hydratedRef.current = true;
    isFirstRender.current = true;
  }, [initialData]);

  useEffect(() => {
    if (!ensaioId) return;
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const t = setTimeout(() => { persist(); }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoAgregado, detA, detB, detC, ensaioId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label className="text-xs">Tipo de Agregado</Label>
          <Select value={tipoAgregado} onValueChange={(v) => setTipoAgregado(v as TipoAgregado)}>
            <SelectTrigger className="w-[200px] h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="miudo">Agregado Miúdo</SelectItem>
              <SelectItem value="graudo">Agregado Graúdo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="h-9 flex items-center gap-1 text-sm px-4">
          Massa Unitária Média: <span className="font-bold font-mono">{media.toFixed(2)} kg/dm³</span>
        </Badge>
        {ensaioId && (
          <div className="ml-auto flex items-center gap-2">
            {saving ? (
              <span className="text-xs text-muted-foreground">Salvando...</span>
            ) : savedAt ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-green-600" />
                Salvo {savedAt.toLocaleTimeString('pt-BR')}
              </span>
            ) : null}
            <Button size="sm" variant="outline" onClick={() => persist({ manual: true })} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />Salvar
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Massa Unitária Seca Compactada — NBR 7251</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[280px]">Determinação</TableHead>
                  {determinacoes.map(d => (
                    <TableHead key={d.label} className="text-center min-w-[140px]">{d.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="text-xs">
                  <TableCell className="font-medium py-2">Vr) Volume do recipiente (dm³)</TableCell>
                  {determinacoes.map(d => (
                    <TableCell key={d.label} className="py-2">
                      <Input type="number" step="0.001" value={d.det.vr || ''} onChange={e => updateDet(d.set, 'vr', e.target.value)} className="h-10 text-sm text-center" />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="text-xs">
                  <TableCell className="font-medium py-2">M1) Massa do recipiente vazio (g)</TableCell>
                  {determinacoes.map(d => (
                    <TableCell key={d.label} className="py-2">
                      <Input type="number" step="0.01" value={d.det.m1 || ''} onChange={e => updateDet(d.set, 'm1', e.target.value)} className="h-10 text-sm text-center" />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="text-xs">
                  <TableCell className="font-medium py-2">M2) Massa recipiente + agregado (g)</TableCell>
                  {determinacoes.map(d => (
                    <TableCell key={d.label} className="py-2">
                      <Input type="number" step="0.001" value={d.det.m2 || ''} onChange={e => updateDet(d.set, 'm2', e.target.value)} className="h-10 text-sm text-center" />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="text-xs bg-muted/50 font-medium">
                  <TableCell className="py-2">Massa unitária solta = (M2 − M1) / Vr</TableCell>
                  {determinacoes.map(d => (
                    <TableCell key={d.label} className="text-center py-2 font-mono font-bold">
                      {d.mu > 0 ? d.mu.toFixed(2) : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">
            <strong>Massa Unitária Seca Compactada — NBR 7251:</strong>{' '}
            MU (kg/dm³) = (M2 − M1) / Vr, onde M2 = massa do recipiente cheio, 
            M1 = massa do recipiente vazio, Vr = volume do recipiente. Resultado é a média de 3 determinações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
