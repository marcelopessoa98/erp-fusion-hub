import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Download, FileText, Clock, Users, Building2, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, getDay, parseISO } from 'date-fns';
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
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface Filial {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  nome: string;
  cargo: string | null;
}

interface Obra {
  id: string;
  nome: string;
}

interface HoraExtraDetalhada {
  id: string;
  data: string;
  horas: number;
  tipo: string;
  observacao: string | null;
  funcionario_nome: string;
  funcionario_cargo: string | null;
  filial_nome: string;
  obra_nome: string | null;
}

interface HoraExtraAgrupada {
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_cargo: string | null;
  filial_nome: string;
  total_horas: number;
  total_normal: number;
  total_noturno: number;
  total_feriado: number;
  total_sobreaviso: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const Relatorios = () => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros gerais
  const [filterFilial, setFilterFilial] = useState<string>('todos');
  const [filterMes, setFilterMes] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Filtros por funcionário
  const [funcDataInicio, setFuncDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [funcDataFim, setFuncDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [funcFilial, setFuncFilial] = useState<string>('');
  const [funcFuncionario, setFuncFuncionario] = useState<string>('');
  const [relatorioFuncionario, setRelatorioFuncionario] = useState<HoraExtraDetalhada[]>([]);

  // Filtros por obra
  const [obraDataInicio, setObraDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [obraDataFim, setObraDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [obraFilial, setObraFilial] = useState<string>('');
  const [obraObra, setObraObra] = useState<string>('');
  const [relatorioObra, setRelatorioObra] = useState<HoraExtraDetalhada[]>([]);

  const [resumo, setResumo] = useState<HoraExtraAgrupada[]>([]);
  const [totaisPorTipo, setTotaisPorTipo] = useState<{ name: string; value: number }[]>([]);
  const [totaisPorFilial, setTotaisPorFilial] = useState<{ name: string; horas: number }[]>([]);
  const [topFuncionariosPorFilial, setTopFuncionariosPorFilial] = useState<Record<string, { nome: string; horas: number }[]>>({});
  const [topObrasPorFilial, setTopObrasPorFilial] = useState<Record<string, { nome: string; horas: number }[]>>({});

  useEffect(() => {
    fetchFiliais();
    fetchFuncionarios();
    fetchObras();
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

  const fetchFuncionarios = async () => {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('id, nome, cargo')
      .eq('ativo', true)
      .order('nome');
    if (!error) setFuncionarios(data || []);
  };

  const fetchObras = async () => {
    const { data, error } = await supabase
      .from('obras')
      .select('id, nome')
      .eq('status', 'ativa')
      .order('nome');
    if (!error) setObras(data || []);
  };

  const fetchRelatorio = async () => {
    setLoading(true);
    try {
      const [ano, mes] = filterMes.split('-').map(Number);
      const dataInicio = startOfMonth(new Date(ano, mes - 1));
      const dataFim = endOfMonth(new Date(ano, mes - 1));

      let query = supabase
        .from('horas_extras')
        .select('*, funcionarios(id, nome, cargo), filiais(id, nome), obras(id, nome)')
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
            funcionario_cargo: h.funcionarios?.cargo,
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

      // Top funcionários por filial
      const funcPorFilial: Record<string, Record<string, number>> = {};
      data?.forEach((h: any) => {
        const filialNome = h.filiais?.nome || 'Sem filial';
        const funcNome = h.funcionarios?.nome || 'N/A';
        if (!funcPorFilial[filialNome]) funcPorFilial[filialNome] = {};
        funcPorFilial[filialNome][funcNome] = (funcPorFilial[filialNome][funcNome] || 0) + Number(h.horas);
      });
      const topFunc: Record<string, { nome: string; horas: number }[]> = {};
      Object.entries(funcPorFilial).forEach(([filial, funcs]) => {
        topFunc[filial] = Object.entries(funcs)
          .map(([nome, horas]) => ({ nome, horas }))
          .sort((a, b) => b.horas - a.horas)
          .slice(0, 5);
      });
      setTopFuncionariosPorFilial(topFunc);

      // Top obras por filial
      const obrasPorFilial: Record<string, Record<string, number>> = {};
      data?.forEach((h: any) => {
        if (!h.obras?.nome) return;
        const filialNome = h.filiais?.nome || 'Sem filial';
        const obraNome = h.obras?.nome;
        if (!obrasPorFilial[filialNome]) obrasPorFilial[filialNome] = {};
        obrasPorFilial[filialNome][obraNome] = (obrasPorFilial[filialNome][obraNome] || 0) + Number(h.horas);
      });
      const topObras: Record<string, { nome: string; horas: number }[]> = {};
      Object.entries(obrasPorFilial).forEach(([filial, obrasData]) => {
        topObras[filial] = Object.entries(obrasData)
          .map(([nome, horas]) => ({ nome, horas }))
          .sort((a, b) => b.horas - a.horas)
          .slice(0, 5);
      });
      setTopObrasPorFilial(topObras);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar relatório: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const buscarRelatorioFuncionario = async () => {
    if (!funcFilial || !funcFuncionario) {
      toast.error('Selecione a filial e o funcionário');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('horas_extras')
        .select('*, funcionarios(nome, cargo), filiais(nome), obras(nome)')
        .eq('filial_id', funcFilial)
        .eq('funcionario_id', funcFuncionario)
        .gte('data', funcDataInicio)
        .lte('data', funcDataFim)
        .order('data', { ascending: true });

      if (error) throw error;

      const detalhado = (data || []).map((h: any) => ({
        id: h.id,
        data: h.data,
        horas: h.horas,
        tipo: h.tipo,
        observacao: h.observacao,
        funcionario_nome: h.funcionarios?.nome || '',
        funcionario_cargo: h.funcionarios?.cargo,
        filial_nome: h.filiais?.nome || '',
        obra_nome: h.obras?.nome,
      }));

      setRelatorioFuncionario(detalhado);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao buscar relatório: ' + message);
    }
  };

  const buscarRelatorioObra = async () => {
    if (!obraFilial || !obraObra) {
      toast.error('Selecione a filial e a obra');
      return;
    }

    try {
      const { data, error } = await (supabase
        .from('horas_extras')
        .select('*, funcionarios(nome, cargo), filiais(nome), obras(nome)') as any)
        .eq('filial_id', obraFilial)
        .eq('obra_id', obraObra)
        .gte('data', obraDataInicio)
        .lte('data', obraDataFim)
        .order('data', { ascending: true });

      if (error) throw error;

      const detalhado = (data || []).map((h: any) => ({
        id: h.id,
        data: h.data,
        horas: h.horas,
        tipo: h.tipo,
        observacao: h.observacao,
        funcionario_nome: h.funcionarios?.nome || '',
        funcionario_cargo: h.funcionarios?.cargo,
        filial_nome: h.filiais?.nome || '',
        obra_nome: h.obras?.nome,
      }));

      setRelatorioObra(detalhado);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao buscar relatório: ' + message);
    }
  };

  const exportarRelatorioFuncionario = async (formato: 'pdf' | 'docx') => {
    if (relatorioFuncionario.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const func = funcionarios.find((f) => f.id === funcFuncionario);
    const filial = filiais.find((f) => f.id === funcFilial);
    const totalHoras = relatorioFuncionario.reduce((s, r) => s + Number(r.horas), 0);

    const content = `
RELATÓRIO DE HORAS EXTRAS - POR FUNCIONÁRIO

Filial: ${filial?.nome || ''}
Funcionário: ${func?.nome || ''} - ${func?.cargo || 'Sem cargo'}
Período: ${format(parseISO(funcDataInicio), 'dd/MM/yyyy')} a ${format(parseISO(funcDataFim), 'dd/MM/yyyy')}

${relatorioFuncionario.map((r) => {
  const dia = diasSemana[getDay(parseISO(r.data))];
  return `${dia} - ${format(parseISO(r.data), 'dd/MM/yyyy')} - ${r.horas}h - ${r.obra_nome || 'Sem obra'} - ${r.observacao || ''}`;
}).join('\n')}

TOTAL GERAL: ${totalHoras}h
    `.trim();

    // Criar blob e download
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-funcionario-${func?.nome?.replace(/\s/g, '_')}-${format(new Date(), 'yyyyMMdd')}.txt`;
    link.click();

    toast.success('Relatório exportado! (Versão texto - para PDF/Word, use um conversor)');
  };

  const exportarRelatorioObra = async (formato: 'pdf' | 'docx') => {
    if (relatorioObra.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const obra = obras.find((o) => o.id === obraObra);
    const filial = filiais.find((f) => f.id === obraFilial);
    const totalHoras = relatorioObra.reduce((s, r) => s + Number(r.horas), 0);

    const content = `
RELATÓRIO DE HORAS EXTRAS - POR OBRA

Filial: ${filial?.nome || ''}
Obra: ${obra?.nome || ''}
Período: ${format(parseISO(obraDataInicio), 'dd/MM/yyyy')} a ${format(parseISO(obraDataFim), 'dd/MM/yyyy')}

${relatorioObra.map((r) => {
  return `${format(parseISO(r.data), 'dd/MM/yyyy')} - ${r.horas}h - ${r.funcionario_nome} - ${r.observacao || ''}`;
}).join('\n')}

TOTAL GERAL: ${totalHoras}h
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-obra-${obra?.nome?.replace(/\s/g, '_')}-${format(new Date(), 'yyyyMMdd')}.txt`;
    link.click();

    toast.success('Relatório exportado! (Versão texto - para PDF/Word, use um conversor)');
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
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="funcionario">Por Funcionário</TabsTrigger>
          <TabsTrigger value="obra">Por Obra</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-6">
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

          {/* Gráficos por Filial */}
          {!loading && Object.keys(topFuncionariosPorFilial).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(topFuncionariosPorFilial).map(([filial, funcs]) => (
                <Card key={filial}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Funcionários - {filial}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={funcs} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="horas" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Gráficos de Obras por Filial */}
          {!loading && Object.keys(topObrasPorFilial).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(topObrasPorFilial).map(([filial, obrasData]) => (
                <Card key={filial}>
                  <CardHeader>
                    <CardTitle className="text-base">Top Obras com Horas Extras - {filial}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={obrasData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="horas" fill="#00C49F" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Gráficos gerais */}
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
                      {totaisPorTipo.map((entry, index) => (
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
        </TabsContent>

        {/* Relatório por Funcionário */}
        <TabsContent value="funcionario" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relatório por Funcionário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={funcDataInicio}
                    onChange={(e) => setFuncDataInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={funcDataFim}
                    onChange={(e) => setFuncDataFim(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filial</Label>
                  <Select value={funcFilial} onValueChange={setFuncFilial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {filiais.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Select value={funcFuncionario} onValueChange={setFuncFuncionario}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {funcionarios.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={buscarRelatorioFuncionario}>Buscar</Button>
            </CardContent>
          </Card>

          {relatorioFuncionario.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Resultado</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => exportarRelatorioFuncionario('pdf')}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF/TXT
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportarRelatorioFuncionario('docx')}>
                    <Download className="h-4 w-4 mr-1" />
                    Word/TXT
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p><strong>Filial:</strong> {relatorioFuncionario[0]?.filial_nome}</p>
                  <p><strong>Funcionário:</strong> {relatorioFuncionario[0]?.funcionario_nome} - {relatorioFuncionario[0]?.funcionario_cargo || 'Sem cargo'}</p>
                  <p><strong>Período:</strong> {format(parseISO(funcDataInicio), 'dd/MM/yyyy')} a {format(parseISO(funcDataFim), 'dd/MM/yyyy')}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia da Semana</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Obra</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorioFuncionario.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{diasSemana[getDay(parseISO(r.data))]}</TableCell>
                        <TableCell>{format(parseISO(r.data), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{r.horas}h</TableCell>
                        <TableCell>{r.obra_nome || '-'}</TableCell>
                        <TableCell>{r.observacao || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell>{relatorioFuncionario.reduce((s, r) => s + Number(r.horas), 0)}h</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Relatório por Obra */}
        <TabsContent value="obra" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Relatório por Obra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input
                    type="date"
                    value={obraDataInicio}
                    onChange={(e) => setObraDataInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={obraDataFim}
                    onChange={(e) => setObraDataFim(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filial</Label>
                  <Select value={obraFilial} onValueChange={setObraFilial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {filiais.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Obra</Label>
                  <Select value={obraObra} onValueChange={setObraObra}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {obras.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={buscarRelatorioObra}>Buscar</Button>
            </CardContent>
          </Card>

          {relatorioObra.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Resultado</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => exportarRelatorioObra('pdf')}>
                    <Download className="h-4 w-4 mr-1" />
                    PDF/TXT
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportarRelatorioObra('docx')}>
                    <Download className="h-4 w-4 mr-1" />
                    Word/TXT
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p><strong>Filial:</strong> {relatorioObra[0]?.filial_nome}</p>
                  <p><strong>Obra:</strong> {relatorioObra[0]?.obra_nome}</p>
                  <p><strong>Período:</strong> {format(parseISO(obraDataInicio), 'dd/MM/yyyy')} a {format(parseISO(obraDataFim), 'dd/MM/yyyy')}</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorioObra.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{format(parseISO(r.data), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{r.horas}h</TableCell>
                        <TableCell>{r.funcionario_nome}</TableCell>
                        <TableCell>{r.observacao || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell>{relatorioObra.reduce((s, r) => s + Number(r.horas), 0)}h</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
