import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Package, Search, AlertTriangle, Building2, HardHat, TrendingUp } from 'lucide-react';

interface Filial {
  id: string;
  nome: string;
}

interface Material {
  id: string;
  nome: string;
  codigo: string | null;
  unidade: string;
  estoque_minimo: number | null;
}

interface EstoqueItem {
  material_id: string;
  filial_id: string;
  quantidade: number;
  material: Material;
  filial: Filial;
}

interface ResumoMaterial {
  material: Material;
  totalGeral: number;
  emEstoque: number;
  alugado: number;
  emObras: number;
  porFilial: { filial: Filial; quantidade: number }[];
}

const Estoque = () => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [estoqueData, setEstoqueData] = useState<EstoqueItem[]>([]);
  const [alugueisAtivos, setAlugueisAtivos] = useState<any[]>([]);
  const [movimentacoesObras, setMovimentacoesObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFilial, setFilterFilial] = useState<string>('todos');
  const [resumoMateriais, setResumoMateriais] = useState<ResumoMaterial[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [filiaisRes, materiaisRes, estoqueRes, alugueisRes, movRes] = await Promise.all([
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
        supabase.from('materiais').select('id, nome, codigo, unidade, estoque_minimo').order('nome'),
        supabase.from('estoque').select('*, materiais(id, nome, codigo, unidade, estoque_minimo), filiais(id, nome)'),
        supabase.from('alugueis').select('*, materiais(id, nome), filiais(id, nome), obras(id, nome)').eq('status', 'ativo'),
        supabase
          .from('movimentacoes')
          .select('*, materiais(id, nome), filiais(id, nome), obras(id, nome)')
          .eq('tipo', 'saida')
          .not('obra_id', 'is', null),
      ]);

      if (filiaisRes.error) throw filiaisRes.error;
      if (materiaisRes.error) throw materiaisRes.error;
      if (estoqueRes.error) throw estoqueRes.error;
      if (alugueisRes.error) throw alugueisRes.error;
      if (movRes.error) throw movRes.error;

      setFiliais(filiaisRes.data || []);
      setMateriais(materiaisRes.data || []);
      setEstoqueData((estoqueRes.data || []) as any);
      setAlugueisAtivos(alugueisRes.data || []);
      setMovimentacoesObras(movRes.data || []);

      // Calcular resumo por material
      const resumo: ResumoMaterial[] = (materiaisRes.data || []).map((material) => {
        const estoquesMaterial = (estoqueRes.data || []).filter((e: any) => e.material_id === material.id);
        const emEstoque = estoquesMaterial.reduce((sum: number, e: any) => sum + (e.quantidade || 0), 0);
        
        const alugadosMaterial = (alugueisRes.data || []).filter((a: any) => a.material_id === material.id);
        const alugado = alugadosMaterial.reduce((sum: number, a: any) => sum + (a.quantidade || 0), 0);

        const movObras = (movRes.data || []).filter((m: any) => m.material_id === material.id);
        const emObras = movObras.reduce((sum: number, m: any) => sum + (m.quantidade || 0), 0);

        const porFilial = (filiaisRes.data || []).map((filial) => {
          const estoqueFilial = estoquesMaterial.find((e: any) => e.filial_id === filial.id);
          return {
            filial,
            quantidade: estoqueFilial?.quantidade || 0,
          };
        });

        return {
          material,
          totalGeral: emEstoque + alugado,
          emEstoque,
          alugado,
          emObras,
          porFilial,
        };
      });

      setResumoMateriais(resumo);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar dados: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const filteredResumo = resumoMateriais.filter((r) => {
    const matchSearch =
      r.material.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.material.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterFilial === 'todos') return matchSearch;
    
    const temEstoqueNaFilial = r.porFilial.some(
      (pf) => pf.filial.id === filterFilial && pf.quantidade > 0
    );
    return matchSearch && temEstoqueNaFilial;
  });

  // Estatísticas gerais
  const totalMateriais = materiais.length;
  const materiaisComEstoqueBaixo = resumoMateriais.filter(
    (r) => r.material.estoque_minimo && r.emEstoque < r.material.estoque_minimo
  ).length;
  const totalAlugado = alugueisAtivos.reduce((sum, a) => sum + (a.quantidade || 0), 0);
  const totalEmObras = movimentacoesObras.reduce((sum, m) => sum + (m.quantidade || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral do Estoque</h1>
        <p className="text-muted-foreground">
          Controle consolidado de materiais por filial, obras e aluguéis
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total de Materiais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMateriais}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{materiaisComEstoqueBaixo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Itens Alugados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalAlugado}</div>
            <p className="text-xs text-muted-foreground">{alugueisAtivos.length} aluguéis ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <HardHat className="h-4 w-4 text-green-500" />
              Em Obras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalEmObras}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filial" />
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
            <Badge variant="secondary">{filteredResumo.length} material(is)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Total Geral</TableHead>
                    <TableHead className="text-right">Em Estoque</TableHead>
                    <TableHead className="text-right">Alugado</TableHead>
                    <TableHead className="text-right">Em Obras</TableHead>
                    {filiais.map((f) => (
                      <TableHead key={f.id} className="text-right text-xs">
                        {f.nome.split(' - ')[1] || f.nome.substring(0, 10)}
                      </TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResumo.map((r) => {
                    const estoqueBaixo = r.material.estoque_minimo && r.emEstoque < r.material.estoque_minimo;
                    return (
                      <TableRow key={r.material.id} className={estoqueBaixo ? 'bg-yellow-50' : ''}>
                        <TableCell className="font-mono text-sm">
                          {r.material.codigo || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.material.nome}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({r.material.unidade})
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold">{r.totalGeral}</TableCell>
                        <TableCell className="text-right">{r.emEstoque}</TableCell>
                        <TableCell className="text-right text-blue-600">{r.alugado}</TableCell>
                        <TableCell className="text-right text-green-600">{r.emObras}</TableCell>
                        {r.porFilial.map((pf) => (
                          <TableCell key={pf.filial.id} className="text-right text-sm">
                            {pf.quantidade}
                          </TableCell>
                        ))}
                        <TableCell>
                          {estoqueBaixo ? (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Baixo
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Estoque;
