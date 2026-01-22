import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Filial {
  id: string;
  nome: string;
}

interface Material {
  id: string;
  nome: string;
  codigo: string | null;
}

interface Obra {
  id: string;
  nome: string;
}

interface Aluguel {
  id: string;
  data_saida: string;
  data_previsao_retorno: string | null;
  data_retorno: string | null;
  quantidade: number;
  status: string;
  observacao: string | null;
  created_at: string;
  material_id: string;
  filial_id: string;
  obra_id: string | null;
  materiais?: Material;
  filiais?: Filial;
  obras?: Obra;
}

const Alugueis = () => {
  const { user, isGerente } = useAuth();
  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    material_id: '',
    filial_id: '',
    obra_id: '',
    quantidade: 1,
    data_saida: format(new Date(), 'yyyy-MM-dd'),
    data_previsao_retorno: '',
    observacao: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alugRes, matRes, filRes, obrasRes] = await Promise.all([
        supabase
          .from('alugueis')
          .select('*, materiais(id, nome, codigo), filiais(id, nome), obras(id, nome)')
          .order('created_at', { ascending: false }),
        supabase.from('materiais').select('id, nome, codigo').order('nome'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
        supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
      ]);

      if (alugRes.error) throw alugRes.error;
      if (matRes.error) throw matRes.error;
      if (filRes.error) throw filRes.error;
      if (obrasRes.error) throw obrasRes.error;

      setAlugueis(alugRes.data || []);
      setMateriais(matRes.data || []);
      setFiliais(filRes.data || []);
      setObras(obrasRes.data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar dados: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      material_id: '',
      filial_id: '',
      obra_id: '',
      quantidade: 1,
      data_saida: format(new Date(), 'yyyy-MM-dd'),
      data_previsao_retorno: '',
      observacao: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('alugueis').insert([
        {
          material_id: formData.material_id,
          filial_id: formData.filial_id,
          obra_id: formData.obra_id || null,
          quantidade: formData.quantidade,
          data_saida: formData.data_saida,
          data_previsao_retorno: formData.data_previsao_retorno || null,
          observacao: formData.observacao || null,
          status: 'ativo',
          user_id: user?.id,
        },
      ]);

      if (error) throw error;

      toast.success('Aluguel registrado com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao registrar aluguel: ' + message);
    }
  };

  const registrarDevolucao = async (aluguel: Aluguel) => {
    if (!confirm('Confirmar devolução deste equipamento?')) return;

    try {
      const { error } = await supabase
        .from('alugueis')
        .update({
          status: 'devolvido',
          data_retorno: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', aluguel.id);

      if (error) throw error;
      toast.success('Devolução registrada com sucesso!');
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao registrar devolução: ' + message);
    }
  };

  const filteredAlugueis = alugueis.filter((a) => {
    const matchSearch =
      a.materiais?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.obras?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'todos' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (aluguel: Aluguel) => {
    if (aluguel.status === 'devolvido') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Devolvido
        </Badge>
      );
    }

    if (aluguel.data_previsao_retorno && isPast(new Date(aluguel.data_previsao_retorno))) {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Atrasado
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        Em uso
      </Badge>
    );
  };

  const getDiasRestantes = (aluguel: Aluguel) => {
    if (aluguel.status === 'devolvido' || !aluguel.data_previsao_retorno) return null;
    const dias = differenceInDays(new Date(aluguel.data_previsao_retorno), new Date());
    if (dias < 0) return `${Math.abs(dias)} dia(s) de atraso`;
    if (dias === 0) return 'Vence hoje';
    return `${dias} dia(s) restantes`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aluguéis</h1>
          <p className="text-muted-foreground">
            Controle de equipamentos alugados e devoluções
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Aluguel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Aluguel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="filial">Filial *</Label>
                <Select
                  value={formData.filial_id}
                  onValueChange={(value) => setFormData({ ...formData, filial_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a filial" />
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
                <Label htmlFor="material">Equipamento *</Label>
                <Select
                  value={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {materiais.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.codigo ? `[${m.codigo}] ` : ''}{m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obra">Obra (destino)</Label>
                <Select
                  value={formData.obra_id}
                  onValueChange={(value) => setFormData({ ...formData, obra_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a obra" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantidade">Quantidade *</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="1"
                    value={formData.quantidade}
                    onChange={(e) =>
                      setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_saida">Data Saída *</Label>
                  <Input
                    id="data_saida"
                    type="date"
                    value={formData.data_saida}
                    onChange={(e) => setFormData({ ...formData, data_saida: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_previsao_retorno">Previsão de Retorno</Label>
                <Input
                  id="data_previsao_retorno"
                  type="date"
                  value={formData.data_previsao_retorno}
                  onChange={(e) =>
                    setFormData({ ...formData, data_previsao_retorno: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full">
                Registrar Aluguel
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {alugueis.filter((a) => a.status === 'ativo').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alugueis.filter(
                (a) =>
                  a.status === 'ativo' &&
                  a.data_previsao_retorno &&
                  isPast(new Date(a.data_previsao_retorno))
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Devolvidos (mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {alugueis.filter(
                (a) =>
                  a.status === 'devolvido' &&
                  new Date(a.data_retorno || '').getMonth() === new Date().getMonth()
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar equipamento ou obra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Em uso</SelectItem>
                <SelectItem value="devolvido">Devolvidos</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filteredAlugueis.length} registro(s)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAlugueis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4" />
              <p>Nenhum aluguel encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlugueis.map((aluguel) => (
                  <TableRow key={aluguel.id}>
                    <TableCell className="font-medium">
                      {aluguel.materiais?.nome}
                      <span className="text-xs text-muted-foreground ml-1">
                        x{aluguel.quantidade}
                      </span>
                    </TableCell>
                    <TableCell>{aluguel.filiais?.nome}</TableCell>
                    <TableCell>{aluguel.obras?.nome || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(aluguel.data_saida), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {aluguel.data_previsao_retorno
                        ? format(new Date(aluguel.data_previsao_retorno), 'dd/MM/yyyy', {
                            locale: ptBR,
                          })
                        : '-'}
                      {aluguel.status === 'ativo' && getDiasRestantes(aluguel) && (
                        <div className="text-xs text-muted-foreground">
                          {getDiasRestantes(aluguel)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(aluguel)}</TableCell>
                    <TableCell className="text-right">
                      {aluguel.status === 'ativo' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => registrarDevolucao(aluguel)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Devolver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Alugueis;
