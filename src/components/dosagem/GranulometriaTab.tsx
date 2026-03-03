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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
} from 'recharts';

type TipoAgregado = 'miudo' | 'graudo';

export function GranulometriaTab() {
  const [tipoAgregado, setTipoAgregado] = useState<TipoAgregado>('miudo');
  const [zonaGraudoIdx, setZonaGraudoIdx] = useState(0);

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

  // Chart data
  const chartData = useMemo(() => {
    return dados.filter(d => d.abertura > 0.075).map(d => {
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
        const zona = ZONAS_GRAUDO[zonaGraudoIdx];
        if (zona) {
          const faixa = zona.faixas[d.abertura];
          if (faixa) {
            point.faixaInf = faixa[0];
            point.faixaSup = faixa[1];
          }
        }
      }

      return point;
    }).reverse(); // menor abertura primeiro para o gráfico
  }, [dados, tipoAgregado, zonaGraudoIdx]);

  const updateMassa = (arr: number[], setArr: React.Dispatch<React.SetStateAction<number[]>>, idx: number, val: string) => {
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
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="miudo">Agregado Miúdo</SelectItem>
              <SelectItem value="graudo">Agregado Graúdo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tipoAgregado === 'graudo' && (
          <div>
            <Label className="text-xs">Faixa Granulométrica</Label>
            <Select value={String(zonaGraudoIdx)} onValueChange={(v) => setZonaGraudoIdx(Number(v))}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ZONAS_GRAUDO.map((z, i) => (
                  <SelectItem key={i} value={String(i)}>{z.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-4">
          <Badge variant="outline" className="h-8 flex items-center gap-1">
            MF: <span className="font-bold">{moduloFinura.toFixed(2)}</span>
          </Badge>
          <Badge variant="outline" className="h-8 flex items-center gap-1">
            Dmáx: <span className="font-bold">{diametroMaximo} mm</span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Table */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Dados Granulométricos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-[80px]">Peneira</TableHead>
                    <TableHead className="w-[80px] text-center">Massa A (g)</TableHead>
                    <TableHead className="w-[80px] text-center">Massa B (g)</TableHead>
                    <TableHead className="w-[60px] text-center">% Ret. A</TableHead>
                    <TableHead className="w-[60px] text-center">% Ret. B</TableHead>
                    <TableHead className="w-[50px] text-center">Var.</TableHead>
                    <TableHead className="w-[60px] text-center">Média %</TableHead>
                    <TableHead className="w-[60px] text-center">Acum. %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((d, i) => (
                    <TableRow key={d.abertura} className="text-xs">
                      <TableCell className="font-medium py-1">{d.label}</TableCell>
                      <TableCell className="py-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={massasA[i] || ''}
                          onChange={e => updateMassa(massasA, setMassasA, i, e.target.value)}
                          className="h-7 text-xs text-center w-full"
                        />
                      </TableCell>
                      <TableCell className="py-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={massasB[i] || ''}
                          onChange={e => updateMassa(massasB, setMassasB, i, e.target.value)}
                          className="h-7 text-xs text-center w-full"
                        />
                      </TableCell>
                      <TableCell className="text-center py-1 text-muted-foreground">{d.percRetidaA.toFixed(1)}</TableCell>
                      <TableCell className="text-center py-1 text-muted-foreground">{d.percRetidaB.toFixed(1)}</TableCell>
                      <TableCell className={`text-center py-1 ${d.variacao > 4 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                        {d.variacao.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center py-1 text-muted-foreground">{d.mediaRetida.toFixed(1)}</TableCell>
                      <TableCell className="text-center py-1 font-medium">{d.retidaAcumulada.toFixed(1)}</TableCell>
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
            <ResponsiveContainer width="100%" height={420}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="abertura"
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                  type="number"
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
                    <Line type="monotone" dataKey="zonaUtilInf" stroke="hsl(var(--primary))" strokeDasharray="5 5" dot={false} name="Zona Utilizável Inf." strokeWidth={1} />
                    <Line type="monotone" dataKey="zonaOtimaInf" stroke="hsl(var(--chart-2))" strokeDasharray="3 3" dot={false} name="Zona Ótima Inf." strokeWidth={1} />
                    <Line type="monotone" dataKey="zonaOtimaSup" stroke="hsl(var(--chart-2))" strokeDasharray="3 3" dot={false} name="Zona Ótima Sup." strokeWidth={1} />
                    <Line type="monotone" dataKey="zonaUtilSup" stroke="hsl(var(--primary))" strokeDasharray="5 5" dot={false} name="Zona Utilizável Sup." strokeWidth={1} />
                  </>
                ) : (
                  <>
                    <Line type="monotone" dataKey="faixaInf" stroke="hsl(var(--primary))" strokeDasharray="5 5" dot={false} name="Faixa Inferior" strokeWidth={1} />
                    <Line type="monotone" dataKey="faixaSup" stroke="hsl(var(--primary))" strokeDasharray="5 5" dot={false} name="Faixa Superior" strokeWidth={1} />
                  </>
                )}

                <Line type="monotone" dataKey="material" stroke="hsl(var(--destructive))" dot={{ r: 3 }} name="Material Ensaiado" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
