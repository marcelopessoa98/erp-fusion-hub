import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  PENEIRAS_MIUDO,
  PENEIRAS_GRAUDO,
  ZONAS_MIUDO,
  ZONAS_GRAUDO,
  Peneira,
} from '@/lib/dosagem/constants';
import {
  calcularGranulometria,
  calcularModuloFinura,
  calcularDiametroMaximo,
  DadosPeneira,
} from '@/lib/dosagem/calculations';
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from 'recharts';

type TipoAgregado = 'miudo' | 'graudo';

// Colors matching Excel spreadsheet
const COLORS = {
  zonaUtilInf: '#2563eb',    // blue
  zonaOtimaInf: '#16a34a',   // green
  zonaOtimaSup: '#16a34a',   // green
  zonaUtilSup: '#2563eb',    // blue
  material: '#dc2626',       // red
  brita0: '#f59e0b',         // amber
  brita1: '#8b5cf6',         // violet
  brita2: '#06b6d4',         // cyan
  brita3: '#ec4899',         // pink
  brita4: '#84cc16',         // lime
};

export function GranulometriaTab() {
  const [tipoAgregado, setTipoAgregado] = useState<TipoAgregado>('miudo');

  const peneiras = tipoAgregado === 'miudo' ? PENEIRAS_MIUDO : PENEIRAS_GRAUDO;

  const [massasA, setMassasA] = useState<number[]>(() => peneiras.map(() => 0));
  const [massasB, setMassasB] = useState<number[]>(() => peneiras.map(() => 0));

  // Reset when switching type
  const handleTipoChange = (tipo: TipoAgregado) => {
    const p = tipo === 'miudo' ? PENEIRAS_MIUDO : PENEIRAS_GRAUDO;
    setTipoAgregado(tipo);
    setMassasA(p.map(() => 0));
    setMassasB(p.map(() => 0));
  };

  const dados = useMemo(
    () => calcularGranulometria(peneiras, massasA, massasB),
    [peneiras, massasA, massasB]
  );

  const moduloFinura = useMemo(() => calcularModuloFinura(dados), [dados]);
  const diametroMaximo = useMemo(() => calcularDiametroMaximo(dados), [dados]);

  const totalA = massasA.reduce((s, v) => s + v, 0);
  const totalB = massasB.reduce((s, v) => s + v, 0);

  // Detect which brita zone the material falls into (for graúdo)
  const detectedZona = useMemo(() => {
    if (tipoAgregado !== 'graudo') return null;
    // Find zone where material best fits
    for (let zi = 0; zi < ZONAS_GRAUDO.length; zi++) {
      const zona = ZONAS_GRAUDO[zi];
      let withinZone = true;
      for (const d of dados) {
        const faixa = zona.faixas[d.abertura];
        if (faixa && d.retidaAcumulada > 0) {
          if (d.retidaAcumulada < faixa[0] - 5 || d.retidaAcumulada > faixa[1] + 5) {
            withinZone = false;
            break;
          }
        }
      }
      if (withinZone && totalA > 0) return zona.nome;
    }
    return null;
  }, [tipoAgregado, dados, totalA]);

  // Chart data - X axis goes from large (left) to small (right)
  const chartData = useMemo(() => {
    return dados.filter(d => d.abertura >= 0.15).map(d => {
      const point: any = {
        abertura: d.abertura,
        label: d.label,
        material: d.retidaAcumulada,
      };

      if (tipoAgregado === 'miudo') {
        const zona = ZONAS_MIUDO[d.abertura];
        if (zona) {
          point.zonaUtilInf = zona[0];
          point.zonaOtimaInf = zona[1];
          point.zonaOtimaSup = zona[2];
          point.zonaUtilSup = zona[3];
        }
      } else {
        // Show ALL brita zones simultaneously
        for (let zi = 0; zi < ZONAS_GRAUDO.length; zi++) {
          const zona = ZONAS_GRAUDO[zi];
          const faixa = zona.faixas[d.abertura];
          if (faixa) {
            point[`brita${zi}Inf`] = faixa[0];
            point[`brita${zi}Sup`] = faixa[1];
          }
        }
      }

      return point;
    });
    // No reverse - data naturally goes from large to small abertura
  }, [dados, tipoAgregado]);

  const updateMassa = (setArr: React.Dispatch<React.SetStateAction<number[]>>, idx: number, val: string) => {
    const n = parseFloat(val) || 0;
    setArr(prev => {
      const next = [...prev];
      next[idx] = n;
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label className="text-xs">Tipo de Agregado</Label>
          <Select value={tipoAgregado} onValueChange={(v) => handleTipoChange(v as TipoAgregado)}>
            <SelectTrigger className="w-[200px] h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="miudo">Agregado Miúdo</SelectItem>
              <SelectItem value="graudo">Agregado Graúdo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="h-9 flex items-center gap-1 text-sm px-3">
            MF: <span className="font-bold">{moduloFinura.toFixed(2)}</span>
          </Badge>
          <Badge variant="outline" className="h-9 flex items-center gap-1 text-sm px-3">
            Dmáx: <span className="font-bold">{diametroMaximo} mm</span>
          </Badge>
          {tipoAgregado === 'graudo' && detectedZona && (
            <Badge className="h-9 flex items-center gap-1 text-sm px-3">
              Classificação: {detectedZona}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Table */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Dados Granulométricos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[80px]">Peneira</TableHead>
                    <TableHead className="w-[100px] text-center">Massa A (g)</TableHead>
                    <TableHead className="w-[100px] text-center">Massa B (g)</TableHead>
                    <TableHead className="w-[65px] text-center">% Ret. A</TableHead>
                    <TableHead className="w-[65px] text-center">% Ret. B</TableHead>
                    <TableHead className="w-[55px] text-center">Var.</TableHead>
                    <TableHead className="w-[65px] text-center">Média %</TableHead>
                    <TableHead className="w-[65px] text-center">Acum. %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((d, i) => (
                    <TableRow key={d.abertura} className="text-xs">
                      <TableCell className="font-medium py-1.5">{d.label}</TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={massasA[i] || ''}
                          onChange={e => updateMassa(setMassasA, i, e.target.value)}
                          className="h-9 text-sm text-center w-full"
                        />
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={massasB[i] || ''}
                          onChange={e => updateMassa(setMassasB, i, e.target.value)}
                          className="h-9 text-sm text-center w-full"
                        />
                      </TableCell>
                      <TableCell className="text-center py-1.5 text-muted-foreground">{d.percRetidaA.toFixed(1)}</TableCell>
                      <TableCell className="text-center py-1.5 text-muted-foreground">{d.percRetidaB.toFixed(1)}</TableCell>
                      <TableCell className={`text-center py-1.5 ${d.variacao > 4 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                        {d.variacao.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center py-1.5 text-muted-foreground">{d.mediaRetida.toFixed(1)}</TableCell>
                      <TableCell className="text-center py-1.5 font-medium">{d.retidaAcumulada.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="text-xs font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{totalA.toFixed(1)}</TableCell>
                    <TableCell className="text-center">{totalB.toFixed(1)}</TableCell>
                    <TableCell colSpan={5}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Curva Granulométrica</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={460}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="abertura"
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                  type="number"
                  reversed={true}
                  tickFormatter={(v) => v >= 1 ? v.toFixed(1) : v.toFixed(2)}
                  label={{ value: 'Abertura (mm)', position: 'bottom', offset: 5, fontSize: 11 }}
                  fontSize={10}
                />
                <YAxis
                  domain={[0, 100]}
                  label={{ value: '% Retida Acumulada', angle: -90, position: 'insideLeft', offset: 0, fontSize: 11 }}
                  fontSize={10}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [v.toFixed(1) + '%', name]}
                  labelFormatter={(v) => `Peneira: ${v} mm`}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />

                {tipoAgregado === 'miudo' ? (
                  <>
                    <Line type="monotone" dataKey="zonaUtilInf" stroke={COLORS.zonaUtilInf} strokeDasharray="8 4" dot={false} name="Zona Utilizável Inf." strokeWidth={1.5} />
                    <Line type="monotone" dataKey="zonaOtimaInf" stroke={COLORS.zonaOtimaInf} strokeDasharray="4 3" dot={false} name="Zona Ótima Inf." strokeWidth={1.5} />
                    <Line type="monotone" dataKey="zonaOtimaSup" stroke={COLORS.zonaOtimaSup} strokeDasharray="4 3" dot={false} name="Zona Ótima Sup." strokeWidth={1.5} />
                    <Line type="monotone" dataKey="zonaUtilSup" stroke={COLORS.zonaUtilInf} strokeDasharray="8 4" dot={false} name="Zona Utilizável Sup." strokeWidth={1.5} />
                  </>
                ) : (
                  <>
                    {ZONAS_GRAUDO.map((zona, zi) => {
                      const colors = [COLORS.brita0, COLORS.brita1, COLORS.brita2, COLORS.brita3, COLORS.brita4];
                      const color = colors[zi] || COLORS.brita0;
                      return (
                        <Line key={`inf${zi}`} type="monotone" dataKey={`brita${zi}Inf`} stroke={color} strokeDasharray="6 3" dot={false} name={`${zona.nome} Inf.`} strokeWidth={1} connectNulls />
                      );
                    })}
                    {ZONAS_GRAUDO.map((zona, zi) => {
                      const colors = [COLORS.brita0, COLORS.brita1, COLORS.brita2, COLORS.brita3, COLORS.brita4];
                      const color = colors[zi] || COLORS.brita0;
                      return (
                        <Line key={`sup${zi}`} type="monotone" dataKey={`brita${zi}Sup`} stroke={color} strokeDasharray="6 3" dot={false} name={`${zona.nome} Sup.`} strokeWidth={1} connectNulls />
                      );
                    })}
                  </>
                )}

                <Line type="monotone" dataKey="material" stroke={COLORS.material} dot={{ r: 3 }} name="Material Ensaiado" strokeWidth={2.5} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
