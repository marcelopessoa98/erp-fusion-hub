import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
} from 'recharts';

type TipoAgregado = 'miudo' | 'graudo';

const ZONE_COLORS = {
  zonaUtil: '#2563eb',
  zonaOtima: '#16a34a',
  material: '#dc2626',
  brita0: '#f59e0b',
  brita1: '#8b5cf6',
  brita2: '#06b6d4',
};

// Custom legend component to avoid overlapping
function ChartLegend({ tipoAgregado }: { tipoAgregado: TipoAgregado }) {
  const items = tipoAgregado === 'miudo'
    ? [
        { color: ZONE_COLORS.zonaUtil, label: 'Zona Utilizável', dashed: true },
        { color: ZONE_COLORS.zonaOtima, label: 'Zona Ótima', dashed: true },
        { color: ZONE_COLORS.material, label: 'Material Ensaiado', dashed: false },
      ]
    : [
        { color: ZONE_COLORS.brita0, label: 'Brita 0 (4,75/12,5)', dashed: true },
        { color: ZONE_COLORS.brita1, label: 'Brita 1 (9,5/25)', dashed: true },
        { color: ZONE_COLORS.brita2, label: 'Brita 2 (19/31,5)', dashed: true },
        { color: ZONE_COLORS.material, label: 'Material Ensaiado', dashed: false },
      ];

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 px-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <svg width="20" height="10">
            <line
              x1="0" y1="5" x2="20" y2="5"
              stroke={item.color}
              strokeWidth={item.dashed ? 1.5 : 2.5}
              strokeDasharray={item.dashed ? '4 3' : 'none'}
            />
            {!item.dashed && <circle cx="10" cy="5" r="2.5" fill={item.color} />}
          </svg>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

interface GranulometriaTabProps {
  ensaioId?: string;
  initialData?: {
    tipoAgregado?: TipoAgregado;
    massasA?: number[];
    massasB?: number[];
  };
}

export function GranulometriaTab({ ensaioId, initialData }: GranulometriaTabProps = {}) {
  const { toast } = useToast();
  const [tipoAgregado, setTipoAgregado] = useState<TipoAgregado>(initialData?.tipoAgregado || 'miudo');

  const peneiras = tipoAgregado === 'miudo' ? PENEIRAS_MIUDO : PENEIRAS_GRAUDO;

  const [massasA, setMassasA] = useState<number[]>(() => {
    if (initialData?.massasA && initialData.massasA.length === peneiras.length) return initialData.massasA;
    return peneiras.map(() => 0);
  });
  const [massasB, setMassasB] = useState<number[]>(() => {
    if (initialData?.massasB && initialData.massasB.length === peneiras.length) return initialData.massasB;
    return peneiras.map(() => 0);
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const isFirstRender = useRef(true);

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

  const detectedZona = useMemo(() => {
    if (tipoAgregado !== 'graudo') return null;
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

  // Build chart data, filtering irrelevant points for graúdo
  const chartData = useMemo(() => {
    const raw = dados.filter(d => d.abertura >= 0.15);

    return raw
      .map(d => {
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
          let allSame = true;
          for (let zi = 0; zi < ZONAS_GRAUDO.length; zi++) {
            const zona = ZONAS_GRAUDO[zi];
            const faixa = zona.faixas[d.abertura];
            if (faixa) {
              point[`brita${zi}Inf`] = faixa[0];
              point[`brita${zi}Sup`] = faixa[1];
              if (faixa[0] !== 100 || faixa[1] !== 100) allSame = false;
              if (faixa[0] !== 0 || faixa[1] !== 0) allSame = false;
            }
          }
          // Keep point even if zones are flat - we need material line continuity
        }

        return point;
      });
  }, [dados, tipoAgregado]);

  const updateMassa = (setArr: React.Dispatch<React.SetStateAction<number[]>>, idx: number, val: string) => {
    const n = parseFloat(val) || 0;
    setArr(prev => {
      const next = [...prev];
      next[idx] = n;
      return next;
    });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-background border rounded-md shadow-md p-2 text-xs max-w-[200px]">
        <p className="font-semibold mb-1">Peneira: {label} mm</p>
        {payload
          .filter((p: any) => p.value != null)
          .map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="leading-tight">
              {p.name}: {Number(p.value).toFixed(1)}%
            </p>
          ))}
      </div>
    );
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
            <ResponsiveContainer width="100%" height={430}>
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
                <Tooltip content={<CustomTooltip />} />

                {tipoAgregado === 'miudo' ? (
                  <>
                    {/* Area fill between zona útil limits */}
                    <Area type="monotone" dataKey="zonaUtilSup" stroke="none" fill={ZONE_COLORS.zonaUtil} fillOpacity={0.08} legendType="none" />
                    <Area type="monotone" dataKey="zonaUtilInf" stroke="none" fill="hsl(var(--background))" fillOpacity={1} legendType="none" />
                    {/* Area fill between zona ótima limits */}
                    <Area type="monotone" dataKey="zonaOtimaSup" stroke="none" fill={ZONE_COLORS.zonaOtima} fillOpacity={0.1} legendType="none" />
                    <Area type="monotone" dataKey="zonaOtimaInf" stroke="none" fill="hsl(var(--background))" fillOpacity={1} legendType="none" />

                    <Line type="monotone" dataKey="zonaUtilInf" stroke={ZONE_COLORS.zonaUtil} strokeDasharray="8 4" dot={false} name="Zona Utilizável" strokeWidth={1.5} legendType="none" />
                    <Line type="monotone" dataKey="zonaUtilSup" stroke={ZONE_COLORS.zonaUtil} strokeDasharray="8 4" dot={false} name="Zona Utilizável Sup." strokeWidth={1.5} legendType="none" />
                    <Line type="monotone" dataKey="zonaOtimaInf" stroke={ZONE_COLORS.zonaOtima} strokeDasharray="4 3" dot={false} name="Zona Ótima" strokeWidth={1.5} legendType="none" />
                    <Line type="monotone" dataKey="zonaOtimaSup" stroke={ZONE_COLORS.zonaOtima} strokeDasharray="4 3" dot={false} name="Zona Ótima Sup." strokeWidth={1.5} legendType="none" />
                  </>
                ) : (
                  <>
                    {ZONAS_GRAUDO.map((zona, zi) => {
                      const colors = [ZONE_COLORS.brita0, ZONE_COLORS.brita1, ZONE_COLORS.brita2];
                      const color = colors[zi] || ZONE_COLORS.brita0;
                      return (
                        <Area key={`area${zi}`} type="monotone" dataKey={`brita${zi}Sup`} stroke="none" fill={color} fillOpacity={0.06} legendType="none" connectNulls />
                      );
                    })}
                    {ZONAS_GRAUDO.map((zona, zi) => {
                      const colors = [ZONE_COLORS.brita0, ZONE_COLORS.brita1, ZONE_COLORS.brita2];
                      const color = colors[zi] || ZONE_COLORS.brita0;
                      return (
                        <Area key={`areaInf${zi}`} type="monotone" dataKey={`brita${zi}Inf`} stroke="none" fill="hsl(var(--background))" fillOpacity={1} legendType="none" connectNulls />
                      );
                    })}
                    {ZONAS_GRAUDO.map((zona, zi) => {
                      const colors = [ZONE_COLORS.brita0, ZONE_COLORS.brita1, ZONE_COLORS.brita2];
                      const color = colors[zi] || ZONE_COLORS.brita0;
                      return [
                        <Line key={`inf${zi}`} type="monotone" dataKey={`brita${zi}Inf`} stroke={color} strokeDasharray="6 3" dot={false} name={`${zona.nome} Inf.`} strokeWidth={1.2} connectNulls legendType="none" />,
                        <Line key={`sup${zi}`} type="monotone" dataKey={`brita${zi}Sup`} stroke={color} strokeDasharray="6 3" dot={false} name={`${zona.nome} Sup.`} strokeWidth={1.2} connectNulls legendType="none" />,
                      ];
                    })}
                  </>
                )}

                <Line type="monotone" dataKey="material" stroke={ZONE_COLORS.material} dot={{ r: 3 }} name="Material Ensaiado" strokeWidth={2.5} connectNulls legendType="none" />
              </ComposedChart>
            </ResponsiveContainer>
            {/* Custom legend below chart - no overlap */}
            <ChartLegend tipoAgregado={tipoAgregado} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
