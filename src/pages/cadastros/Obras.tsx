import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogDescription,
  DialogFooter,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, HardHat, Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Filial {
  id: string;
  nome: string;
}

interface Cliente {
  id: string;
  nome: string;
}

interface Obra {
  id: string;
  nome: string;
  endereco: string | null;
  status: string;
  data_inicio: string | null;
  data_previsao_fim: string | null;
  cliente_id: string;
  filial_id: string;
  clientes?: Cliente;
  filiais?: Filial;
}

const statusOptions = [
  { value: 'ativa', label: 'Ativa', color: 'default' },
  { value: 'pausada', label: 'Pausada', color: 'secondary' },
  { value: 'concluida', label: 'Concluída', color: 'outline' },
  { value: 'cancelada', label: 'Cancelada', color: 'destructive' },
] as const;

const Obras = () => {
  const { isGerente } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObra, setEditingObra] = useState<Obra | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFilial, setFilterFilial] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form state
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [status, setStatus] = useState('ativa');
  const [dataInicio, setDataInicio] = useState('');
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [filialId, setFilialId] = useState('');

  const fetchData = async () => {
    try {
      const [obrasRes, filiaisRes, clientesRes] = await Promise.all([
        supabase
          .from('obras')
          .select('*, clientes(id, nome), filiais(id, nome)')
          .order('created_at', { ascending: false }),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
        supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome'),
      ]);

      if (obrasRes.error) throw obrasRes.error;
      if (filiaisRes.error) throw filiaisRes.error;
      if (clientesRes.error) throw clientesRes.error;

      setObras(obrasRes.data || []);
      setFiliais(filiaisRes.data || []);
      setClientes(clientesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setNome('');
    setEndereco('');
    setStatus('ativa');
    setDataInicio('');
    setDataPrevisaoFim('');
    setClienteId('');
    setFilialId('');
    setEditingObra(null);
  };

  const openEditDialog = (obra: Obra) => {
    setEditingObra(obra);
    setNome(obra.nome);
    setEndereco(obra.endereco || '');
    setStatus(obra.status);
    setDataInicio(obra.data_inicio || '');
    setDataPrevisaoFim(obra.data_previsao_fim || '');
    setClienteId(obra.cliente_id);
    setFilialId(obra.filial_id);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clienteId || !filialId) {
      toast.error('Selecione o cliente e a filial');
      return;
    }

    setSaving(true);

    try {
      const data = {
        nome,
        endereco: endereco || null,
        status,
        data_inicio: dataInicio || null,
        data_previsao_fim: dataPrevisaoFim || null,
        cliente_id: clienteId,
        filial_id: filialId,
      };

      if (editingObra) {
        const { error } = await supabase
          .from('obras')
          .update(data)
          .eq('id', editingObra.id);

        if (error) throw error;
        toast.success('Obra atualizada com sucesso!');
      } else {
        const { error } = await supabase.from('obras').insert(data);

        if (error) throw error;
        toast.success('Obra criada com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving obra:', error);
      toast.error('Erro ao salvar obra', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteObra = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta obra?')) return;

    try {
      const { error } = await supabase.from('obras').delete().eq('id', id);
      if (error) throw error;
      toast.success('Obra excluída com sucesso!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir obra', { description: error.message });
    }
  };

  const getStatusBadge = (statusValue: string) => {
    const statusConfig = statusOptions.find((s) => s.value === statusValue);
    return (
      <Badge variant={statusConfig?.color as any || 'default'}>
        {statusConfig?.label || statusValue}
      </Badge>
    );
  };

  const filteredObras = obras.filter((obra) => {
    const matchesSearch =
      obra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilial = filterFilial === 'all' || obra.filial_id === filterFilial;
    const matchesStatus = filterStatus === 'all' || obra.status === filterStatus;

    return matchesSearch && matchesFilial && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <HardHat className="h-8 w-8" />
            Obras
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as obras dos clientes
          </p>
        </div>
        {isGerente && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Obra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingObra ? 'Editar Obra' : 'Nova Obra'}
                </DialogTitle>
                <DialogDescription>
                  {editingObra
                    ? 'Atualize as informações da obra'
                    : 'Preencha os dados para criar uma nova obra'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Obra *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Construção Bloco A"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Select value={clienteId} onValueChange={setClienteId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filial">Filial *</Label>
                    <Select value={filialId} onValueChange={setFilialId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {filiais.map((filial) => (
                          <SelectItem key={filial.id} value={filial.id}>
                            {filial.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Endereço da obra"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataInicio">Data Início</Label>
                    <Input
                      id="dataInicio"
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataPrevisaoFim">Previsão Fim</Label>
                    <Input
                      id="dataPrevisaoFim"
                      type="date"
                      value={dataPrevisaoFim}
                      onChange={(e) => setDataPrevisaoFim(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingObra ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Obras</CardTitle>
              <CardDescription>
                {filteredObras.length} obra(s) encontrada(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterFilial} onValueChange={setFilterFilial}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {filiais.map((filial) => (
                    <SelectItem key={filial.id} value={filial.id}>
                      {filial.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredObras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma obra encontrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Previsão Fim</TableHead>
                  <TableHead>Status</TableHead>
                  {isGerente && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredObras.map((obra) => (
                  <TableRow key={obra.id}>
                    <TableCell className="font-medium">{obra.nome}</TableCell>
                    <TableCell>{obra.clientes?.nome || '-'}</TableCell>
                    <TableCell>{obra.filiais?.nome || '-'}</TableCell>
                    <TableCell>
                      {obra.data_inicio
                        ? format(new Date(obra.data_inicio), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {obra.data_previsao_fim
                        ? format(new Date(obra.data_previsao_fim), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(obra.status)}</TableCell>
                    {isGerente && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(obra)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteObra(obra.id)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Obras;
