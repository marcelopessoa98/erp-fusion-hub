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
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Filial {
  id: string;
  nome: string;
}

interface Material {
  id: string;
  nome: string;
  codigo: string | null;
  unidade: string;
}

interface Obra {
  id: string;
  nome: string;
}

interface Movimentacao {
  id: string;
  tipo: string;
  quantidade: number;
  observacao: string | null;
  created_at: string;
  material_id: string;
  filial_id: string;
  obra_id: string | null;
  materiais?: Material;
  filiais?: Filial;
  obras?: Obra;
}

const Movimentacoes = () => {
  const { user } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterFilial, setFilterFilial] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tipo: 'entrada',
    material_id: '',
    filial_id: '',
    obra_id: '',
    quantidade: 1,
    observacao: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [movRes, matRes, filRes, obrasRes] = await Promise.all([
        supabase
          .from('movimentacoes')
          .select('*, materiais(id, nome, codigo, unidade), filiais(id, nome), obras(id, nome)')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('materiais').select('id, nome, codigo, unidade').order('nome'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
        supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
      ]);

      if (movRes.error) throw movRes.error;
      if (matRes.error) throw matRes.error;
      if (filRes.error) throw filRes.error;
      if (obrasRes.error) throw obrasRes.error;

      setMovimentacoes(movRes.data || []);
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
      tipo: 'entrada',
      material_id: '',
      filial_id: '',
      obra_id: '',
      quantidade: 1,
      observacao: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Insert movimentacao
      const { error: movError } = await supabase.from('movimentacoes').insert([
        {
          tipo: formData.tipo,
          material_id: formData.material_id,
          filial_id: formData.filial_id,
          obra_id: formData.obra_id || null,
          quantidade: formData.quantidade,
          observacao: formData.observacao || null,
          user_id: user?.id,
        },
      ]);

      if (movError) throw movError;

      // Update estoque
      const { data: estoqueData } = await supabase
        .from('estoque')
        .select('id, quantidade')
        .eq('material_id', formData.material_id)
        .eq('filial_id', formData.filial_id)
        .single();

      const ajuste = formData.tipo === 'entrada' ? formData.quantidade : -formData.quantidade;

      if (estoqueData) {
        await supabase
          .from('estoque')
          .update({ quantidade: estoqueData.quantidade + ajuste })
          .eq('id', estoqueData.id);
      } else if (formData.tipo === 'entrada') {
        await supabase.from('estoque').insert([
          {
            material_id: formData.material_id,
            filial_id: formData.filial_id,
            quantidade: formData.quantidade,
          },
        ]);
      }

      toast.success('Movimentação registrada com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao registrar movimentação: ' + message);
    }
  };

  const filteredMovimentacoes = movimentacoes.filter((m) => {
    const matchSearch =
      m.materiais?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.materiais?.codigo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filterTipo === 'todos' || m.tipo === filterTipo;
    const matchFilial = filterFilial === 'todos' || m.filial_id === filterFilial;
    return matchSearch && matchTipo && matchFilial;
  });

  const getTipoIcon = (tipo: string) => {
    if (tipo === 'entrada') return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
    if (tipo === 'saida') return <ArrowUpCircle className="h-4 w-4 text-red-600" />;
    return <ArrowLeftRight className="h-4 w-4 text-blue-600" />;
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === 'entrada') return <Badge className="bg-green-100 text-green-800">Entrada</Badge>;
    if (tipo === 'saida') return <Badge className="bg-red-100 text-red-800">Saída</Badge>;
    return <Badge className="bg-blue-100 text-blue-800">Transferência</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Movimentações</h1>
          <p className="text-muted-foreground">Registre entradas e saídas de materiais</p>
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
              Nova Movimentação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Movimentação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        Entrada
                      </div>
                    </SelectItem>
                    <SelectItem value="saida">
                      <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-red-600" />
                        Saída
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <Label htmlFor="material">Material *</Label>
                <Select
                  value={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o material" />
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

              {formData.tipo === 'saida' && (
                <div className="space-y-2">
                  <Label htmlFor="obra">Obra (opcional)</Label>
                  <Select
                    value={formData.obra_id}
                    onValueChange={(value) => setFormData({ ...formData, obra_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a obra destino" />
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
              )}

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
                Registrar Movimentação
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
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
            <Badge variant="secondary">{filteredMovimentacoes.length} registro(s)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredMovimentacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ArrowLeftRight className="h-12 w-12 mb-4" />
              <p>Nenhuma movimentação encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-sm">
                      {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getTipoBadge(mov.tipo)}</TableCell>
                    <TableCell className="font-medium">
                      {mov.materiais?.nome}
                      {mov.materiais?.codigo && (
                        <span className="text-xs text-muted-foreground ml-2">
                          [{mov.materiais.codigo}]
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{mov.filiais?.nome}</TableCell>
                    <TableCell>{mov.obras?.nome || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade} {mov.materiais?.unidade}
                      </span>
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

export default Movimentacoes;
