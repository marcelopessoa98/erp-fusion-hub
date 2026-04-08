import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ComboboxSearch } from '@/components/ui/combobox-search';
import { useEnsaios, TIPOS_ENSAIO, TipoEnsaio } from '@/hooks/useEnsaios';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, FlaskConical, FileText, Eye, Trash2, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-500' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-500' },
  { value: 'concluido', label: 'Concluído', color: 'bg-green-500' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-500' },
];

const TIPO_ICONS: Record<string, string> = {
  'Traços': '🧪',
  'Arrancamento': '🔩',
  'Laudo Cautelar de Vizinhança': '🏠',
  'Extração': '🔬',
  'Esclerometria': '🔨',
  'PIT': '📡',
};

export default function Ensaios() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ensaios, isLoading, createEnsaio, deleteEnsaio, isCreating } = useEnsaios();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Form state
  const [formFilial, setFormFilial] = useState('');
  const [formCliente, setFormCliente] = useState('');
  const [formObra, setFormObra] = useState('');
  const [formTipo, setFormTipo] = useState<TipoEnsaio>('Traços');
  const [formDataEnsaio, setFormDataEnsaio] = useState(new Date().toISOString().split('T')[0]);
  const [formResponsavel, setFormResponsavel] = useState('');

  // Fetch data for selects
  const { data: filiais = [] } = useQuery({
    queryKey: ['filiais'],
    queryFn: async () => {
      const { data } = await supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome');
      return data || [];
    },
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  const { data: obras = [] } = useQuery({
    queryKey: ['obras', formCliente],
    queryFn: async () => {
      let q = supabase.from('obras').select('id, nome, referencia, cliente_id').eq('status', 'ativa').order('nome');
      if (formCliente) q = q.eq('cliente_id', formCliente);
      const { data } = await q;
      return data || [];
    },
  });

  const { data: funcionarios = [] } = useQuery({
    queryKey: ['funcionarios-ensaios'],
    queryFn: async () => {
      const { data } = await supabase.from('funcionarios').select('id, nome').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  const filteredEnsaios = useMemo(() => {
    return ensaios.filter(e => {
      if (filterTipo !== 'todos' && e.tipo !== filterTipo) return false;
      if (filterStatus !== 'todos' && e.status !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchCliente = e.clientes?.nome?.toLowerCase().includes(term);
        const matchObra = e.obras?.nome?.toLowerCase().includes(term);
        const matchTipo = e.tipo.toLowerCase().includes(term);
        if (!matchCliente && !matchObra && !matchTipo) return false;
      }
      return true;
    });
  }, [ensaios, filterTipo, filterStatus, searchTerm]);

  const handleCreate = async () => {
    if (!formFilial || !formCliente || !formObra) return;
    await createEnsaio({
      filial_id: formFilial,
      cliente_id: formCliente,
      obra_id: formObra,
      tipo: formTipo,
      data_ensaio: formDataEnsaio,
      responsavel_id: formResponsavel || null,
      status: 'pendente',
      resultado: null,
      campos_especificos: {},
      observacoes: null,
      user_id: user?.id || null,
    });
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormFilial('');
    setFormCliente('');
    setFormObra('');
    setFormTipo('Traços');
    setFormDataEnsaio(new Date().toISOString().split('T')[0]);
    setFormResponsavel('');
  };

  const handleOpenEnsaio = (ensaio: any) => {
    if (ensaio.tipo === 'Traços') {
      navigate(`/ensaios/tracos/${ensaio.id}`);
    } else if (ensaio.tipo === 'Laudo Cautelar de Vizinhança') {
      navigate('/ensaios/laudo-cautelar');
    } else {
      navigate(`/ensaios/detalhe/${ensaio.id}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = STATUS_OPTIONS.find(o => o.value === status);
    const variant = status === 'concluido' ? 'default' : status === 'cancelado' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{s?.label || status}</Badge>;
  };

  // Stats
  const stats = useMemo(() => {
    const total = ensaios.length;
    const pendentes = ensaios.filter(e => e.status === 'pendente').length;
    const andamento = ensaios.filter(e => e.status === 'em_andamento').length;
    const concluidos = ensaios.filter(e => e.status === 'concluido').length;
    return { total, pendentes, andamento, concluidos };
  }, [ensaios]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Ensaios</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie ensaios de caracterização, dosagem e laudos técnicos
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Novo Ensaio
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-xs text-muted-foreground">Pendentes</div>
            <div className="text-2xl font-bold text-amber-500">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-xs text-muted-foreground">Em Andamento</div>
            <div className="text-2xl font-bold text-primary">{stats.andamento}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4">
            <div className="text-xs text-muted-foreground">Concluídos</div>
            <div className="text-2xl font-bold text-emerald-500">{stats.concluidos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente, obra ou tipo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Tipos</SelectItem>
            {TIPOS_ENSAIO.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando ensaios...</div>
          ) : filteredEnsaios.length === 0 ? (
            <div className="p-8 text-center">
              <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum ensaio encontrado</p>
              <Button variant="outline" className="mt-3" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Criar primeiro ensaio
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead className="text-center">Data</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnsaios.map(ensaio => (
                    <TableRow key={ensaio.id} className="text-sm cursor-pointer hover:bg-muted/50" onClick={() => handleOpenEnsaio(ensaio)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{TIPO_ICONS[ensaio.tipo] || '📋'}</span>
                          <span>{ensaio.tipo}</span>
                        </div>
                      </TableCell>
                      <TableCell>{ensaio.clientes?.nome || '—'}</TableCell>
                      <TableCell>{ensaio.obras?.nome || '—'}</TableCell>
                      <TableCell className="text-center">
                        {format(new Date(ensaio.data_ensaio), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{ensaio.funcionarios?.nome || '—'}</TableCell>
                      <TableCell className="text-center">{getStatusBadge(ensaio.status)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEnsaio(ensaio)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteEnsaio(ensaio.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Ensaio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Filial *</Label>
              <Select value={formFilial} onValueChange={setFormFilial}>
                <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
                <SelectContent>
                  {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente *</Label>
              <ComboboxSearch
                options={clientes.map(c => ({ value: c.id, label: c.nome }))}
                value={formCliente}
                onValueChange={setFormCliente}
                placeholder="Selecione o cliente"
                searchPlaceholder="Buscar cliente..."
                emptyText="Nenhum cliente encontrado"
              />
            </div>
            <div>
              <Label>Obra *</Label>
              <ComboboxSearch
                options={obras.map(o => ({ value: o.id, label: `${o.nome}${o.referencia ? ` (${o.referencia})` : ''}` }))}
                value={formObra}
                onValueChange={setFormObra}
                placeholder="Selecione a obra"
                searchPlaceholder="Buscar obra..."
                emptyText="Nenhuma obra encontrada"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Ensaio *</Label>
                <Select value={formTipo} onValueChange={v => setFormTipo(v as TipoEnsaio)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_ENSAIO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data do Ensaio</Label>
                <Input type="date" value={formDataEnsaio} onChange={e => setFormDataEnsaio(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Responsável</Label>
              <ComboboxSearch
                options={funcionarios.map(f => ({ value: f.id, label: f.nome }))}
                value={formResponsavel}
                onValueChange={setFormResponsavel}
                placeholder="Selecione o responsável"
                searchPlaceholder="Buscar funcionário..."
                emptyText="Nenhum funcionário encontrado"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!formFilial || !formCliente || !formObra || isCreating}>
              {isCreating ? 'Criando...' : 'Criar Ensaio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
