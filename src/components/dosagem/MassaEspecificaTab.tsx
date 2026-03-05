import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TipoAgregado = 'miudo' | 'graudo';

interface EnsaioChapman {
  ms: number; // Massa de agregado seco (g)
  va: number; // Volume corrigido da água (cm³)
  lf: number; // Leitura final (cm³)
}

export function MassaEspecificaTab() {
  const [tipoAgregado, setTipoAgregado] = useState<TipoAgregado>('miudo');

  const [ensaioA, setEnsaioA] = useState<EnsaioChapman>({ ms: 500, va: 200, lf: 0 });
  const [ensaioB, setEnsaioB] = useState<EnsaioChapman>({ ms: 500, va: 200, lf: 0 });

  // δ = Ms / (Lf - Va)
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
              <Input
                type="number"
                step="0.1"
                value={ensaioA.ms || ''}
                onChange={e => updateEnsaio(setEnsaioA, 'ms', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Va) Volume corrigido da água no frasco (cm³)</Label>
              <Input
                type="number"
                step="0.1"
                value={ensaioA.va || ''}
                onChange={e => updateEnsaio(setEnsaioA, 'va', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Lf) Leitura final no frasco c/ água + agregado (cm³)</Label>
              <Input
                type="number"
                step="0.1"
                value={ensaioA.lf || ''}
                onChange={e => updateEnsaio(setEnsaioA, 'lf', e.target.value)}
                className="h-10 text-sm"
              />
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
              <Input
                type="number"
                step="0.1"
                value={ensaioB.ms || ''}
                onChange={e => updateEnsaio(setEnsaioB, 'ms', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Va) Volume corrigido da água no frasco (cm³)</Label>
              <Input
                type="number"
                step="0.1"
                value={ensaioB.va || ''}
                onChange={e => updateEnsaio(setEnsaioB, 'va', e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Lf) Leitura final no frasco c/ água + agregado (cm³)</Label>
              <Input
                type="number"
                step="0.1"
                value={ensaioB.lf || ''}
                onChange={e => updateEnsaio(setEnsaioB, 'lf', e.target.value)}
                className="h-10 text-sm"
              />
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

      {/* Fórmula de referência */}
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
