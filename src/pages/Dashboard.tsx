import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, HardHat, UserCog, AlertTriangle, Clock, CalendarDays, FileWarning } from 'lucide-react';
import { AniversariantesMes } from '@/components/dashboard/AniversariantesMes';

interface DashboardStats {
  filiais: number;
  clientes: number;
  obras: number;
  funcionarios: number;
  agendamentosPendentes: number;
  ncAbertas: number;
  horasExtrasMes: number;
  docIrregulares: number;
}

const Dashboard = () => {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    filiais: 0,
    clientes: 0,
    obras: 0,
    funcionarios: 0,
    agendamentosPendentes: 0,
    ncAbertas: 0,
    horasExtrasMes: 0,
    docIrregulares: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hoje = new Date();
        const hojeStr = hoje.toISOString().split('T')[0];

        const [
          { count: filiais },
          { count: clientes },
          { count: obras },
          { count: funcionarios },
          { count: agendamentosPendentes },
          { count: ncAbertas },
        ] = await Promise.all([
          supabase.from('filiais').select('*', { count: 'exact', head: true }).eq('ativa', true),
          supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('obras').select('*', { count: 'exact', head: true }).eq('status', 'ativa'),
          supabase.from('funcionarios').select('*', { count: 'exact', head: true }).eq('ativo', true),
          supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('status', 'agendado').gte('data_concretagem', hojeStr),
          supabase.from('nao_conformidades').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
        ]);

        // Horas extras do mês atual
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: horasData } = await supabase
          .from('horas_extras')
          .select('horas')
          .gte('data', startOfMonth.toISOString().split('T')[0]);

        const totalHoras = horasData?.reduce((acc, item) => acc + Number(item.horas), 0) || 0;

        // Documentação irregular: funcionários com docs vencidos ou pendentes
        const { data: allFuncs } = await supabase.from('funcionarios').select('id').eq('ativo', true);
        const { data: allDocs } = await supabase.from('documentos_funcionarios').select('funcionario_id, data_validade, data_emissao, tipo_documento');

        let docIrregulares = 0;
        const tiposObrigatorios = ['registro_trabalho', 'ordem_servico', 'aso', 'nr_18', 'nr_12', 'nr_35', 'cartao_vacina'];
        if (allFuncs) {
          const docsMap = new Map<string, Map<string, any>>();
          allDocs?.forEach((d) => {
            if (!docsMap.has(d.funcionario_id)) docsMap.set(d.funcionario_id, new Map());
            docsMap.get(d.funcionario_id)!.set(d.tipo_documento, d);
          });
          allFuncs.forEach((f) => {
            const funcDocs = docsMap.get(f.id);
            for (const tipo of tiposObrigatorios) {
              const doc = funcDocs?.get(tipo);
              if (!doc || !doc.data_emissao) { docIrregulares++; return; }
              if (doc.data_validade) {
                const val = new Date(doc.data_validade);
                if (val < hoje) { docIrregulares++; return; }
              }
            }
          });
        }

        setStats({
          filiais: filiais || 0,
          clientes: clientes || 0,
          obras: obras || 0,
          funcionarios: funcionarios || 0,
          agendamentosPendentes: agendamentosPendentes || 0,
          ncAbertas: ncAbertas || 0,
          horasExtrasMes: totalHoras,
          docIrregulares,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Filiais Ativas', value: stats.filiais, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Clientes', value: stats.clientes, icon: Users, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Obras em Andamento', value: stats.obras, icon: HardHat, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { title: 'Funcionários', value: stats.funcionarios, icon: UserCog, color: 'text-purple-600', bg: 'bg-purple-100' },
    { title: 'Agendamentos Pendentes', value: stats.agendamentosPendentes, icon: CalendarDays, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { title: 'NC Abertas', value: stats.ncAbertas, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    { title: 'Horas Extras (Mês)', value: `${stats.horasExtrasMes.toFixed(1)}h`, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'Doc. Irregulares', value: stats.docIrregulares, icon: FileWarning, color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Olá, {profile?.nome?.split(' ')[0] || 'Usuário'}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao ERP Integrado. Você está logado como <span className="font-medium capitalize">{role}</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Rápido</CardTitle>
            <CardDescription>Funcionalidades mais utilizadas</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link to="/agendamentos" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <span>Agendamentos</span>
            </Link>
            <Link to="/horas-extras/lancamentos" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>Lançar Horas Extras</span>
            </Link>
            <Link to="/nao-conformidades/funcionarios" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <span>Registrar NC de Funcionário</span>
            </Link>
            <Link to="/nao-conformidades/clientes" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <span>Registrar NC de Cliente</span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Módulos do Sistema</CardTitle>
            <CardDescription>Navegue pelos módulos disponíveis</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link to="/cadastros/filiais" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Cadastros</div>
                <div className="text-sm text-muted-foreground">Filiais, Clientes, Obras, Funcionários</div>
              </div>
            </Link>
            <Link to="/agendamentos" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Agendamentos</div>
                <div className="text-sm text-muted-foreground">Concretagens e Programações</div>
              </div>
            </Link>
            <Link to="/horas-extras/lancamentos" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Horas Extras</div>
                <div className="text-sm text-muted-foreground">Lançamentos e Relatórios</div>
              </div>
            </Link>
            <Link to="/nao-conformidades/funcionarios" className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Não Conformidades</div>
                <div className="text-sm text-muted-foreground">Funcionários, Clientes e Ranking</div>
              </div>
            </Link>
          </CardContent>
        </Card>

        <AniversariantesMes />
      </div>
    </div>
  );
};

export default Dashboard;
