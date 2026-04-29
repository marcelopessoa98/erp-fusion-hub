import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Check } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

type TipoAgregado = 'miudo' | 'graudo';

interface EnsaioChapman {
  ms: number;
  va: number;
  lf: number;
}

interface MassaEspecificaTabProps {
  ensaioId?: string;
  initialData?: {
    tipoAgregado?: TipoAgregado;
    ensaioA?: EnsaioChapman;
    ensaioB?: EnsaioChapman;
  };
}

export function MassaEspecificaTab({ ensaioId, initialData }: MassaEspecificaTabProps = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tipoAgregado, setTipoAgregado] = useState<TipoAgregado>(initialData?.tipoAgregado || 'miudo');
  const [ensaioA, setEnsaioA] = useState<EnsaioChapman>(initialData?.ensaioA || { ms: 500, va: 200, lf: 0 });
  const [ensaioB, setEnsaioB] = useState<EnsaioChapman>(initialData?.ensaioB || { ms: 500, va: 200, lf: 0 });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const isFirstRender = useRef(true);
  const hydratedRef = useRef(!!(initialData?.ensaioA?.lf || initialData?.ensaioB?.lf));

  const densidadeA = useMemo(() => {
    const denom = ensaioA.lf - ensaioA.va;
    if (denom <= 0) return 0;
    return ensaioA.ms / denom;
  }, [ensaioA]);

  const densidadeB = useMemo(() => {
    const denom = ensaioB.lf - ensaioB.va;
    if (denom <= 0) return 0;
    return ensaioB.ms / denom;
  }, [ensaioB]);

  const media = useMemo(() => {
    const validCount = (densidadeA > 0 ? 1 : 0) + (densidadeB > 0 ? 1 : 0);
    if (validCount === 0) return 0;
    return (densidadeA + densidadeB) / validCount;
  }, [densidadeA, densidadeB]);

  const updateEnsaio = (
    setter: React.Dispatch<React.SetStateAction<EnsaioChapman>>,
    field: keyof EnsaioChapman,
    value: string
  ) => {
    setter(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

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
        massaEspecifica: { tipoAgregado, ensaioA, ensaioB, densidadeA, densidadeB, media, updated_at: new Date().toISOString() },
      };
      const { error } = await supabase.from('ensaios').update({ campos_especificos: novosCampos }).eq('id', ensaioId);
      if (error) throw error;
      setSavedAt(new Date());
    } catch (e: any) {
      toast({ title: 'Erro ao salvar massa específica', description: e.message, variant: 'destructive' });
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
  }, [tipoAgregado, ensaioA, ensaioB, ensaioId]);

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
          Massa Específica Média: <span className="font-bold font-mono">{media.toFixed(3)} g/cm³</span>
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
            <Button size="sm" variant="outline" onClick={persist} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />Salvar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ensaio A */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Determinação A</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Ms) Massa de agregado seco (g)</Label>
              <Input type="number" step="0.1" value={ensaioA.ms || ''} onChange={e => updateEnsaio(setEnsaioA, 'ms', e.target.value)} className="h-10 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Va) Volume corrigido da água no frasco (cm³)</Label>
              <Input type="number" step="0.1" value={ensaioA.va || ''} onChange={e => updateEnsaio(setEnsaioA, 'va', e.target.value)} className="h-10 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Lf) Leitura final no frasco c/ água + agregado (cm³)</Label>
              <Input type="number" step="0.1" value={ensaioA.lf || ''} onChange={e => updateEnsaio(setEnsaioA, 'lf', e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">δ = Ms / (Lf − Va)</span>
                <span className="font-bold font-mono">{densidadeA.toFixed(3)} g/cm³</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ensaio B */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Determinação B</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Ms) Massa de agregado seco (g)</Label>
              <Input type="number" step="0.1" value={ensaioB.ms || ''} onChange={e => updateEnsaio(setEnsaioB, 'ms', e.target.value)} className="h-10 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Va) Volume corrigido da água no frasco (cm³)</Label>
              <Input type="number" step="0.1" value={ensaioB.va || ''} onChange={e => updateEnsaio(setEnsaioB, 'va', e.target.value)} className="h-10 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Lf) Leitura final no frasco c/ água + agregado (cm³)</Label>
              <Input type="number" step="0.1" value={ensaioB.lf || ''} onChange={e => updateEnsaio(setEnsaioB, 'lf', e.target.value)} className="h-10 text-sm" />
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">δ = Ms / (Lf − Va)</span>
                <span className="font-bold font-mono">{densidadeB.toFixed(3)} g/cm³</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground">
            <strong>Método do Frasco de Chapman — NBR 9776:</strong>{' '}
            Massa Específica Real dos Grãos (g/cm³) = Ms / (Lf − Va), onde Ms = massa seca do agregado, 
            Lf = leitura final no frasco com água + agregado, Va = volume de água inicial no frasco.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
