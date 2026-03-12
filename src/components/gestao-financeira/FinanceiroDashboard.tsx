import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGestaoFinanceira } from '@/hooks/useGestaoFinanceira';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FinanceiroDashboard() {
  const { lancamentos, cobrancas, categorias, totalReceitas, totalDespesas, saldo, cobrancasAtrasadas, cobrancasPendentes } = useGestaoFinanceira();

  // Monthly summary for chart
  const monthlyData = (() => {
    const map: Record<string, { mes: string; receitas: number; despesas: number }> = {};
    lancamentos.filter(l => l.status === 'pago').forEach(l => {
      const d = parseISO(l.data_lancamento);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM/yy', { locale: ptBR });
      if (!map[key]) map[key] = { mes: label, receitas: 0, despesas: 0 };
      if (l.tipo === 'receita') map[key].receitas += Number(l.valor);
      else map[key].despesas += Number(l.valor);
    });
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);
  })();

  // Category breakdown for pie
  const categoryData = (() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};
    lancamentos.filter(l => l.tipo === 'despesa' && l.status === 'pago').forEach(l => {
      const cat = l.categorias_financeiras;
      const name = cat?.nome || 'Sem categoria';
      const color = cat?.cor || '#6B7280';
      if (!map[name]) map[name] = { name, value: 0, color };
      map[name].value += Number(l.valor);
    });
    return Object.values(map);
  })();

  const today = new Date();

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatBRL(totalReceitas)}</div>
            <p className="text-xs text-muted-foreground">Total recebido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatBRL(totalDespesas)}</div>
            <p className="text-xs text-muted-foreground">Total pago</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBRL(saldo)}</div>
            <p className="text-xs text-muted-foreground">Receitas - Despesas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{cobrancasAtrasadas.length}</div>
            <p className="text-xs text-muted-foreground">Cobranças em atraso</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Receitas x Despesas (Mensal)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nenhum dado disponível</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nenhuma despesa registrada</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de cobranças atrasadas */}
      {cobrancasAtrasadas.length > 0 && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Cobranças Atrasadas ({cobrancasAtrasadas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cobrancasAtrasadas.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium">{c.clientes?.nome}</p>
                    <p className="text-sm text-muted-foreground">{c.descricao}</p>
                    <p className="text-xs text-orange-600">Vencimento: {format(parseISO(c.data_vencimento), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{formatBRL(Number(c.valor))}</p>
                    <Badge variant="destructive" className="text-xs">Atrasado</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimos Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lancamentos.slice(0, 8).map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${l.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="font-medium text-sm">{l.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.categorias_financeiras?.nome} • {format(parseISO(l.data_lancamento), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {l.tipo === 'receita' ? '+' : '-'}{formatBRL(Number(l.valor))}
                  </p>
                  <Badge variant={l.status === 'pago' ? 'default' : l.status === 'atrasado' ? 'destructive' : 'secondary'} className="text-xs">
                    {l.status}
                  </Badge>
                </div>
              </div>
            ))}
            {lancamentos.length === 0 && (
              <p className="text-center text-muted-foreground py-8">Nenhum lançamento registrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
