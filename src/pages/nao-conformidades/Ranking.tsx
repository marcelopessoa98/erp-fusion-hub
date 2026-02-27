import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Trophy, Medal, Award, Star, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Filial {
  id: string;
  nome: string;
}

interface FuncionarioRanking {
  funcionario_id: string;
  funcionario_nome: string;
  filial_nome: string;
  total_ncs: number;
  ncs_leves: number;
  ncs_medias: number;
  ncs_graves: number;
  ncs_criticas: number;
  pontuacao: number;
}

const Ranking = () => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [ranking, setRanking] = useState<FuncionarioRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFilial, setFilterFilial] = useState<string>('todos');
  const [filterMes, setFilterMes] = useState<string>(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchFiliais();
  }, []);

  useEffect(() => {
    fetchRanking();
  }, [filterFilial, filterMes]);

  const fetchFiliais = async () => {
    const { data, error } = await supabase
      .from('filiais')
      .select('id, nome')
      .eq('ativa', true)
      .order('nome');
    if (!error) setFiliais(data || []);
  };

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const [ano, mes] = filterMes.split('-').map(Number);
      const dataInicio = startOfMonth(new Date(ano, mes - 1));
      const dataFim = endOfMonth(new Date(ano, mes - 1));

      // Buscar todos os funcionários ativos
      let funcQuery = supabase
        .from('funcionarios')
        .select('id, nome, filial_id, filiais(nome)')
        .eq('ativo', true);

      if (filterFilial !== 'todos') {
        funcQuery = funcQuery.eq('filial_id', filterFilial);
      }

      const { data: funcionarios, error: funcError } = await funcQuery;
      if (funcError) throw funcError;

      // Buscar NCs do período
      let ncQuery = supabase
        .from('nao_conformidades')
        .select('funcionario_id, gravidade')
        .gte('data_ocorrencia', format(dataInicio, 'yyyy-MM-dd'))
        .lte('data_ocorrencia', format(dataFim, 'yyyy-MM-dd'))
        .not('funcionario_id', 'is', null);

      if (filterFilial !== 'todos') {
        ncQuery = ncQuery.eq('filial_id', filterFilial);
      }

      const { data: ncs, error: ncError } = await ncQuery;
      if (ncError) throw ncError;

      // Agrupar NCs por funcionário
      const ncsPorFuncionario: Record<
        string,
        { total: number; leves: number; medias: number; graves: number; criticas: number }
      > = {};

      ncs?.forEach((nc: any) => {
        if (!nc.funcionario_id) return;
        if (!ncsPorFuncionario[nc.funcionario_id]) {
          ncsPorFuncionario[nc.funcionario_id] = {
            total: 0,
            leves: 0,
            medias: 0,
            graves: 0,
            criticas: 0,
          };
        }
        ncsPorFuncionario[nc.funcionario_id].total++;
        if (nc.gravidade === 'leve') ncsPorFuncionario[nc.funcionario_id].leves++;
        if (nc.gravidade === 'media') ncsPorFuncionario[nc.funcionario_id].medias++;
        if (nc.gravidade === 'grave') ncsPorFuncionario[nc.funcionario_id].graves++;
        if (nc.gravidade === 'critica') ncsPorFuncionario[nc.funcionario_id].criticas++;
      });

      // Calcular ranking
      const rankingData: FuncionarioRanking[] = (funcionarios || []).map((func: any) => {
        const ncsFunc = ncsPorFuncionario[func.id] || {
          total: 0,
          leves: 0,
          medias: 0,
          graves: 0,
          criticas: 0,
        };

        // Pontuação: 100 pontos base, menos penalidades por NC
        // Leve: -5, Média: -10, Grave: -20, Crítica: -40
        const pontuacao = Math.max(
          0,
          100 -
            ncsFunc.leves * 5 -
            ncsFunc.medias * 10 -
            ncsFunc.graves * 20 -
            ncsFunc.criticas * 40
        );

        return {
          funcionario_id: func.id,
          funcionario_nome: func.nome,
          filial_nome: func.filiais?.nome || 'Sem filial',
          total_ncs: ncsFunc.total,
          ncs_leves: ncsFunc.leves,
          ncs_medias: ncsFunc.medias,
          ncs_graves: ncsFunc.graves,
          ncs_criticas: ncsFunc.criticas,
          pontuacao,
        };
      });

      // Ordenar por pontuação (maior primeiro)
      rankingData.sort((a, b) => b.pontuacao - a.pontuacao);

      setRanking(rankingData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar ranking: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const meses = Array.from({ length: 12 }, (_, i) => {
    const data = subMonths(new Date(), i);
    return {
      value: format(data, 'yyyy-MM'),
      label: format(data, "MMMM 'de' yyyy", { locale: ptBR }),
    };
  });

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return (
          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
            {position}
          </span>
        );
    }
  };

  const getPontuacaoColor = (pontuacao: number) => {
    if (pontuacao >= 90) return 'text-green-600';
    if (pontuacao >= 70) return 'text-yellow-600';
    if (pontuacao >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const top3 = ranking.slice(0, 3);
  const semNCs = ranking.filter((r) => r.total_ncs === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ranking de Funcionários</h1>
          <p className="text-muted-foreground">
            Funcionário do mês baseado em não conformidades
          </p>
        </div>
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

      {/* Top 3 */}
      {!loading && top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((func, index) => (
            <Card
              key={func.funcionario_id}
              className={
                index === 0
                  ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white'
                  : index === 1
                  ? 'border-gray-300 bg-gradient-to-br from-gray-50 to-white'
                  : 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'
              }
            >
              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">{getPositionIcon(index + 1)}</div>
                <CardTitle className="text-lg">{func.funcionario_nome}</CardTitle>
                <CardDescription>{func.filial_nome}</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className={`text-3xl font-bold ${getPontuacaoColor(func.pontuacao)}`}>
                  {func.pontuacao} pts
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {func.total_ncs === 0 ? (
                    <Badge className="bg-green-100 text-green-800">
                      <Star className="h-3 w-3 mr-1" />
                      Sem NCs
                    </Badge>
                  ) : (
                    <span>{func.total_ncs} NC(s) no período</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Funcionários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ranking.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Sem NCs no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{semNCs}</div>
            <p className="text-xs text-muted-foreground">
              {ranking.length > 0 ? ((semNCs / ranking.length) * 100).toFixed(0) : 0}% do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média de Pontuação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ranking.length > 0
                ? (ranking.reduce((s, r) => s + r.pontuacao, 0) / ranking.length).toFixed(1)
                : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista completa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking Completo</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : ranking.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mb-4" />
              <p>Nenhum funcionário encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranking.map((func, index) => (
                <div
                  key={func.funcionario_id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-8 flex justify-center">{getPositionIcon(index + 1)}</div>
                  <div className="flex-1">
                    <div className="font-medium">{func.funcionario_nome}</div>
                    <div className="text-sm text-muted-foreground">{func.filial_nome}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    {func.total_ncs > 0 && (
                      <div className="flex gap-1 text-xs">
                        {func.ncs_leves > 0 && (
                          <Badge variant="outline" className="border-blue-300 text-blue-700">
                            {func.ncs_leves} leve
                          </Badge>
                        )}
                        {func.ncs_medias > 0 && (
                          <Badge variant="outline" className="border-yellow-300 text-yellow-700">
                            {func.ncs_medias} média
                          </Badge>
                        )}
                        {func.ncs_graves > 0 && (
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            {func.ncs_graves} grave
                          </Badge>
                        )}
                        {func.ncs_criticas > 0 && (
                          <Badge variant="outline" className="border-red-300 text-red-700">
                            {func.ncs_criticas} crítica
                          </Badge>
                        )}
                      </div>
                    )}
                    {func.total_ncs === 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        <Star className="h-3 w-3 mr-1" />
                        Perfeito
                      </Badge>
                    )}
                    <div
                      className={`text-lg font-bold min-w-[60px] text-right ${getPontuacaoColor(
                        func.pontuacao
                      )}`}
                    >
                      {func.pontuacao} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Ranking;
