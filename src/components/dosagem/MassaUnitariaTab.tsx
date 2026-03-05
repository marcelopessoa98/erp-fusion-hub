import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TipoAgregado = 'miudo' | 'graudo';

interface Determinacao {
  vr: number; // Volume do recipiente (dm³)
  m1: number; // Massa do recipiente vazio (g)
  m2: number; // Massa recipiente + agregado (g)
}

export function MassaUnitariaTab() {
  const [tipoAgregado, setTipoAgregado] = useState<TipoAgregado>('miudo');

  const [detA, setDetA] = useState<Determinacao>({ vr: 9960, m1: 5910, m2: 0 });
  const [detB, setDetB] = useState<Determinacao>({ vr: 9960, m1: 5910, m2: 0 });
  const [detC, setDetC] = useState<Determinacao>({ vr: 9960, m1: 5910, m2: 0 });

  // MU = (M2 - M1) / Vr
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
                      <Input
                        type="number"
                        step="0.001"
                        value={d.det.vr || ''}
                        onChange={e => updateDet(d.set, 'vr', e.target.value)}
                        className="h-10 text-sm text-center"
                      />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="text-xs">
                  <TableCell className="font-medium py-2">M1) Massa do recipiente vazio (g)</TableCell>
                  {determinacoes.map(d => (
                    <TableCell key={d.label} className="py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={d.det.m1 || ''}
                        onChange={e => updateDet(d.set, 'm1', e.target.value)}
                        className="h-10 text-sm text-center"
                      />
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="text-xs">
                  <TableCell className="font-medium py-2">M2) Massa recipiente + agregado (g)</TableCell>
                  {determinacoes.map(d => (
                    <TableCell key={d.label} className="py-2">
                      <Input
                        type="number"
                        step="0.001"
                        value={d.det.m2 || ''}
                        onChange={e => updateDet(d.set, 'm2', e.target.value)}
                        className="h-10 text-sm text-center"
                      />
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

      {/* Fórmula de referência */}
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
