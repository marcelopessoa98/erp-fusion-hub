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
import { toast } from '@/components/ui/sonner';
import { Plus, Search, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Pencil, List } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface HoraExtra {
  id: string;
  data: string;
  horas: number;
  tipo: string;
  observacao: string | null;
  aprovado: boolean | null;
  created_at: string;
  funcionario_id: string;
  filial_id: string;
  obra_id?: string | null;
  funcionarios?: Funcionario;
  filiais?: Filial;
  obras?: Obra;
}

interface LancamentoItem {
  id: string;
  obra_id: string;
  data: string;
  horas: number;
  tipo: string;
  observacao: string;
}

const Lancamentos = () => {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente' || isAdmin;
  
  const [lancamentos, setLancamentos] = useState<HoraExtra[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAprovado, setFilterAprovado] = useState<string>('todos');
  const [filterFilial, setFilterFilial] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gerenciamentoOpen, setGerenciamentoOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<HoraExtra | null>(null);

  // Multi-form state
  const [selectedFilial, setSelectedFilial] = useState('');
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [lancamentoItems, setLancamentoItems] = useState<LancamentoItem[]>([
    { id: '1', obra_id: '', data: format(new Date(), 'yyyy-MM-dd'), horas: 1, tipo: 'normal', observacao: '' },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lancRes, funcRes, filRes, obrasRes] = await Promise.all([
        supabase
          .from('horas_extras')
          .select('*, funcionarios(id, nome, cargo), filiais(id, nome)')
          .order('data', { ascending: false })
          .limit(100),
        supabase.from('funcionarios').select('id, nome, cargo').eq('ativo', true).order('nome'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
        supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
      ]);

      if (lancRes.error) throw lancRes.error;
      if (funcRes.error) throw funcRes.error;
      if (filRes.error) throw filRes.error;
      if (obrasRes.error) throw obrasRes.error;

      setLancamentos((lancRes.data || []) as any);
      setFuncionarios(funcRes.data || []);
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
    setSelectedFilial('');
    setSelectedFuncionario('');
    setLancamentoItems([
      { id: '1', obra_id: '', data: format(new Date(), 'yyyy-MM-dd'), horas: 1, tipo: 'normal', observacao: '' },
    ]);
    setEditingLancamento(null);
  };

  const addLancamentoItem = () => {
    setLancamentoItems([
      ...lancamentoItems,
      {
        id: Date.now().toString(),
        obra_id: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        horas: 1,
        tipo: 'normal',
        observacao: '',
      },
    ]);
  };

  const removeLancamentoItem = (id: string) => {
    if (lancamentoItems.length > 1) {
      setLancamentoItems(lancamentoItems.filter((item) => item.id !== id));
    }
  };

  const updateLancamentoItem = (id: string, field: keyof LancamentoItem, value: string | number) => {
    setLancamentoItems(
      lancamentoItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFilial || !selectedFuncionario) {
      toast.error('Selecione a filial e o funcionário');
      return;
    }

    try {
      const inserts = lancamentoItems.map((item) => ({
        funcionario_id: selectedFuncionario,
        filial_id: selectedFilial,
        obra_id: item.obra_id || null,
        data: item.data,
        horas: item.horas,
        tipo: item.tipo,
        observacao: item.observacao || null,
        aprovado: false,
        user_id: user?.id,
      }));

      const { error } = await supabase.from('horas_extras').insert(inserts);

      if (error) throw error;

      toast.success(`${inserts.length} lançamento(s) registrado(s) com sucesso!`);
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao lançar horas extras: ' + message);
    }
  };

  const handleEdit = async (lanc: HoraExtra) => {
    setEditingLancamento(lanc);
    setSelectedFilial(lanc.filial_id);
    setSelectedFuncionario(lanc.funcionario_id);
    setLancamentoItems([
      {
        id: lanc.id,
        obra_id: lanc.obra_id || '',
        data: lanc.data,
        horas: lanc.horas,
        tipo: lanc.tipo,
        observacao: lanc.observacao || '',
      },
    ]);
    setGerenciamentoOpen(false);
    setDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingLancamento) return;

    const item = lancamentoItems[0];

    try {
      const { error } = await supabase
        .from('horas_extras')
        .update({
          funcionario_id: selectedFuncionario,
          filial_id: selectedFilial,
          obra_id: item.obra_id || null,
          data: item.data,
          horas: item.horas,
          tipo: item.tipo,
          observacao: item.observacao || null,
        })
        .eq('id', editingLancamento.id);

      if (error) throw error;

      toast.success('Lançamento atualizado com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar lançamento: ' + message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;

    try {
      const { error } = await supabase.from('horas_extras').delete().eq('id', id);
      if (error) throw error;
      toast.success('Lançamento excluído com sucesso!');
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao excluir lançamento: ' + message);
    }
  };

  const aprovarLancamento = async (id: string, aprovado: boolean) => {
    try {
      const { error } = await supabase
        .from('horas_extras')
        .update({ aprovado, aprovado_por: user?.id })
        .eq('id', id);

      if (error) throw error;
      toast.success(aprovado ? 'Lançamento aprovado!' : 'Lançamento rejeitado!');
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao atualizar lançamento: ' + message);
    }
  };

  const filteredLancamentos = lancamentos.filter((l) => {
    const matchSearch = l.funcionarios?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchAprovado =
      filterAprovado === 'todos' ||
      (filterAprovado === 'pendente' && l.aprovado === false) ||
      (filterAprovado === 'aprovado' && l.aprovado === true);
    const matchFilial = filterFilial === 'todos' || l.filial_id === filterFilial;
    return matchSearch && matchAprovado && matchFilial;
  });

  const getStatusBadge = (aprovado: boolean | null) => {
    if (aprovado === true) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aprovado
        </Badge>
      );
    }
    if (aprovado === false) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Rejeitado
      </Badge>
    );
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'normal':
        return <Badge variant="outline">Normal (50%)</Badge>;
      case 'noturno':
        return <Badge variant="outline" className="border-purple-300 text-purple-700">Noturno</Badge>;
      case 'feriado':
        return <Badge variant="outline" className="border-red-300 text-red-700">Feriado (100%)</Badge>;
      case 'sobreaviso':
        return <Badge variant="outline" className="border-blue-300 text-blue-700">Sobreaviso</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  // Estatísticas do mês
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);
  const lancamentosMes = lancamentos.filter(
    (l) => new Date(l.data) >= inicioMes && new Date(l.data) <= fimMes
  );
  const horasAprovadas = lancamentosMes
    .filter((l) => l.aprovado === true)
    .reduce((sum, l) => sum + Number(l.horas), 0);
  const horasPendentes = lancamentosMes
    .filter((l) => l.aprovado === false)
    .reduce((sum, l) => sum + Number(l.horas), 0);

  const filteredObras = selectedFilial
    ? obras.filter((o) => {
        // Se a obra não tem filial_id ou corresponde à filial selecionada
        return true; // Mostrar todas por enquanto, já que obras pode não ter filial_id no select
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lançamentos de Horas Extras</h1>
          <p className="text-muted-foreground">Registre e acompanhe horas extras dos funcionários</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGerenciamentoOpen(true)}>
            <List className="mr-2 h-4 w-4" />
            Gerenciar Lançamentos
          </Button>
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
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLancamento ? 'Editar Lançamento' : 'Lançar Horas Extras'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={editingLancamento ? handleUpdate : handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filial">Filial *</Label>
                    <Select value={selectedFilial} onValueChange={setSelectedFilial}>
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
                    <Label htmlFor="funcionario">Funcionário *</Label>
                    <Select value={selectedFuncionario} onValueChange={setSelectedFuncionario}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {funcionarios.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.nome} {f.cargo && `(${f.cargo})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                  {lancamentoItems.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg bg-muted/30 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Lançamento {index + 1}</span>
                        {lancamentoItems.length > 1 && !editingLancamento && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLancamentoItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Obra</Label>
                          <Select
                            value={item.obra_id}
                            onValueChange={(value) => updateLancamentoItem(item.id, 'obra_id', value)}
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

                        <div className="space-y-2">
                          <Label>Data *</Label>
                          <Input
                            type="date"
                            value={item.data}
                            onChange={(e) => updateLancamentoItem(item.id, 'data', e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Horas *</Label>
                          <Input
                            type="number"
                            min="0.5"
                            step="0.5"
                            max="24"
                            value={item.horas}
                            onChange={(e) =>
                              updateLancamentoItem(item.id, 'horas', parseFloat(e.target.value) || 1)
                            }
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Tipo *</Label>
                          <Select
                            value={item.tipo}
                            onValueChange={(value) => updateLancamentoItem(item.id, 'tipo', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal (50%)</SelectItem>
                              <SelectItem value="noturno">Noturno</SelectItem>
                              <SelectItem value="feriado">Feriado/Domingo (100%)</SelectItem>
                              <SelectItem value="sobreaviso">Sobreaviso</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Observação</Label>
                        <Textarea
                          value={item.observacao}
                          onChange={(e) => updateLancamentoItem(item.id, 'observacao', e.target.value)}
                          placeholder="Motivo ou justificativa..."
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {!editingLancamento && (
                  <Button type="button" variant="outline" onClick={addLancamentoItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Outro Lançamento
                  </Button>
                )}

                <Button type="submit" className="w-full">
                  {editingLancamento ? 'Atualizar Lançamento' : `Registrar ${lancamentoItems.length} Lançamento(s)`}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Gerenciamento Dialog */}
      <Dialog open={gerenciamentoOpen} onOpenChange={setGerenciamentoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Lançamentos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar funcionário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterFilial} onValueChange={setFilterFilial}>
                <SelectTrigger className="w-[180px]">
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
            </div>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLancamentos.slice(0, 50).map((lanc) => (
                    <TableRow key={lanc.id}>
                      <TableCell>
                        {format(new Date(lanc.data), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{lanc.funcionarios?.nome}</TableCell>
                      <TableCell>{lanc.obras?.nome || '-'}</TableCell>
                      <TableCell>{getTipoBadge(lanc.tipo)}</TableCell>
                      <TableCell className="text-right font-medium">{lanc.horas}h</TableCell>
                      <TableCell>{getStatusBadge(lanc.aprovado)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(lanc)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(lanc.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cards de resumo do mês */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lancamentosMes.reduce((sum, l) => sum + Number(l.horas), 0)}h
            </div>
            <p className="text-xs text-muted-foreground">
              {lancamentosMes.length} lançamento(s)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{horasAprovadas}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{horasPendentes}h</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAprovado} onValueChange={setFilterAprovado}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="aprovado">Aprovados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger className="w-[180px]">
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
            <Badge variant="secondary">{filteredLancamentos.length} registro(s)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLancamentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4" />
              <p>Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Horas</TableHead>
                  <TableHead>Status</TableHead>
                  {isGerente && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLancamentos.map((lanc) => (
                  <TableRow key={lanc.id}>
                    <TableCell>
                      {format(new Date(lanc.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lanc.funcionarios?.nome}
                      {lanc.funcionarios?.cargo && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({lanc.funcionarios.cargo})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{lanc.filiais?.nome}</TableCell>
                    <TableCell>{lanc.obras?.nome || '-'}</TableCell>
                    <TableCell>{getTipoBadge(lanc.tipo)}</TableCell>
                    <TableCell className="text-right font-medium">{lanc.horas}h</TableCell>
                    <TableCell>{getStatusBadge(lanc.aprovado)}</TableCell>
                    {isGerente && (
                      <TableCell className="text-right">
                        {lanc.aprovado === false && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600"
                              onClick={() => aprovarLancamento(lanc.id, true)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
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

export default Lancamentos;
