import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Download, FileText, Clock, Users, Building2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Filial {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  nome: string;
}

interface HoraExtraAgrupada {
  funcionario_id: string;
  funcionario_nome: string;
  filial_nome: string;
  total_horas: number;
  total_normal: number;
  total_noturno: number;
  total_feriado: number;
  total_sobreaviso: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Relatorios = () => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFilial, setFilterFilial] = useState<string>('todos');
  const [filterMes, setFilterMes] = useState<string>(format(new Date(), 'yyyy-MM'));

  const [resumo, setResumo] = useState<HoraExtraAgrupada[]>([]);
  const [totaisPorTipo, setTotaisPorTipo] = useState<{ name: string; value: number }[]>([]);
  const [totaisPorFilial, setTotaisPorFilial] = useState<{ name: string; horas: number }[]>([]);

  useEffect(() => {
    fetchFiliais();
  }, []);

  useEffect(() => {
    fetchRelatorio();
  }, [filterFilial, filterMes]);

  const fetchFiliais = async () => {
    const { data, error } = await supabase
      .from('filiais')
      .select('id, nome')
      .eq('ativa', true)
      .order('nome');
    if (!error) setFiliais(data || []);
  };

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const [ano, mes] = filterMes.split('-').map(Number);
      const dataInicio = startOfMonth(new Date(ano, mes - 1));
      const dataFim = endOfMonth(new Date(ano, mes - 1));

      let query = supabase
        .from('horas_extras')
        .select('*, funcionarios(id, nome), filiais(id, nome)')
        .gte('data', format(dataInicio, 'yyyy-MM-dd'))
        .lte('data', format(dataFim, 'yyyy-MM-dd'))
        .eq('aprovado', true);

      if (filterFilial !== 'todos') {
        query = query.eq('filial_id', filterFilial);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Agrupar por funcionário
      const agrupado: Record<string, HoraExtraAgrupada> = {};
      data?.forEach((h: any) => {
        const key = h.funcionario_id;
        if (!agrupado[key]) {
          agrupado[key] = {
            funcionario_id: h.funcionario_id,
            funcionario_nome: h.funcionarios?.nome || 'N/A',
            filial_nome: h.filiais?.nome || 'N/A',
            total_horas: 0,
            total_normal: 0,
            total_noturno: 0,
            total_feriado: 0,
            total_sobreaviso: 0,
          };
        }
        agrupado[key].total_horas += Number(h.horas);
        if (h.tipo === 'normal') agrupado[key].total_normal += Number(h.horas);
        if (h.tipo === 'noturno') agrupado[key].total_noturno += Number(h.horas);
        if (h.tipo === 'feriado') agrupado[key].total_feriado += Number(h.horas);
        if (h.tipo === 'sobreaviso') agrupado[key].total_sobreaviso += Number(h.horas);
      });

      const resumoArray = Object.values(agrupado).sort((a, b) => b.total_horas - a.total_horas);
      setResumo(resumoArray);

      // Totais por tipo
      const tiposTotal = {
        normal: resumoArray.reduce((s, r) => s + r.total_normal, 0),
        noturno: resumoArray.reduce((s, r) => s + r.total_noturno, 0),
        feriado: resumoArray.reduce((s, r) => s + r.total_feriado, 0),
        sobreaviso: resumoArray.reduce((s, r) => s + r.total_sobreaviso, 0),
      };
      setTotaisPorTipo([
        { name: 'Normal (50%)', value: tiposTotal.normal },
        { name: 'Noturno', value: tiposTotal.noturno },
        { name: 'Feriado (100%)', value: tiposTotal.feriado },
        { name: 'Sobreaviso', value: tiposTotal.sobreaviso },
      ]);

      // Totais por filial
      const filiaisMap: Record<string, number> = {};
      data?.forEach((h: any) => {
        const nome = h.filiais?.nome || 'Sem filial';
        filiaisMap[nome] = (filiaisMap[nome] || 0) + Number(h.horas);
      });
      setTotaisPorFilial(
        Object.entries(filiaisMap).map(([name, horas]) => ({ name, horas }))
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar relatório: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (resumo.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const headers = ['Funcionário', 'Filial', 'Normal', 'Noturno', 'Feriado', 'Sobreaviso', 'Total'];
    const rows = resumo.map((r) => [
      r.funcionario_nome,
      r.filial_nome,
      r.total_normal,
      r.total_noturno,
      r.total_feriado,
      r.total_sobreaviso,
      r.total_horas,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `horas-extras-${filterMes}.csv`;
    link.click();

    toast.success('Relatório exportado com sucesso!');
  };

  const meses = Array.from({ length: 12 }, (_, i) => {
    const data = subMonths(new Date(), i);
    return {
      value: format(data, 'yyyy-MM'),
      label: format(data, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  });

  const totalGeral = resumo.reduce((s, r) => s + r.total_horas, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios de Horas Extras</h1>
          <p className="text-muted-foreground">Visualize e exporte dados consolidados</p>
        </div>
        <Button onClick={exportarCSV} disabled={resumo.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filial</Label>
              <Select value={filterFilial} onValueChange={setFilterFilial}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as filiais</SelectItem>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total de Horas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGeral}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Funcionários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Filiais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totaisPorFilial.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média por Funcionário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {resumo.length > 0 ? (totalGeral / resumo.length).toFixed(1) : 0}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      {!loading && resumo.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horas por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={totaisPorTipo.filter((t) => t.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {totaisPorTipo.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horas por Filial</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={totaisPorFilial}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="horas" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela detalhada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por Funcionário</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : resumo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p>Nenhum dado para o período selecionado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead className="text-right">Normal</TableHead>
                  <TableHead className="text-right">Noturno</TableHead>
                  <TableHead className="text-right">Feriado</TableHead>
                  <TableHead className="text-right">Sobreaviso</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumo.map((r) => (
                  <TableRow key={r.funcionario_id}>
                    <TableCell className="font-medium">{r.funcionario_nome}</TableCell>
                    <TableCell>{r.filial_nome}</TableCell>
                    <TableCell className="text-right">{r.total_normal}h</TableCell>
                    <TableCell className="text-right">{r.total_noturno}h</TableCell>
                    <TableCell className="text-right">{r.total_feriado}h</TableCell>
                    <TableCell className="text-right">{r.total_sobreaviso}h</TableCell>
                    <TableCell className="text-right font-bold">{r.total_horas}h</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-bold">
                    Total Geral
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {resumo.reduce((s, r) => s + r.total_normal, 0)}h
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {resumo.reduce((s, r) => s + r.total_noturno, 0)}h
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {resumo.reduce((s, r) => s + r.total_feriado, 0)}h
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {resumo.reduce((s, r) => s + r.total_sobreaviso, 0)}h
                  </TableCell>
                  <TableCell className="text-right font-bold">{totalGeral}h</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;
