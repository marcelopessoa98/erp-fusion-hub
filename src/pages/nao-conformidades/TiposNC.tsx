import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tags, Loader2, Users, Building2 } from 'lucide-react';

interface TipoNC {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: 'funcionario' | 'cliente';
  ativo: boolean;
  created_at: string;
}

const TiposNC = () => {
  const { isGerente } = useAuth();
  const [tiposNC, setTiposNC] = useState<TipoNC[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoNC | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'funcionario' | 'cliente'>('funcionario');

  // Form state
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<'funcionario' | 'cliente'>('funcionario');

  const fetchTiposNC = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_nc')
        .select('*')
        .order('nome');

      if (error) throw error;
      setTiposNC((data || []) as TipoNC[]);
    } catch (error) {
      console.error('Error fetching tipos NC:', error);
      toast.error('Erro ao carregar tipos de NC');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTiposNC();
  }, []);

  const resetForm = () => {
    setNome('');
    setDescricao('');
    setCategoria(activeTab);
    setEditingTipo(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setCategoria(activeTab);
    setDialogOpen(true);
  };

  const openEditDialog = (tipo: TipoNC) => {
    setEditingTipo(tipo);
    setNome(tipo.nome);
    setDescricao(tipo.descricao || '');
    setCategoria(tipo.categoria);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        nome,
        descricao: descricao || null,
        categoria,
      };

      if (editingTipo) {
        const { error } = await supabase
          .from('tipos_nc')
          .update(data)
          .eq('id', editingTipo.id);

        if (error) throw error;
        toast.success('Tipo de NC atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('tipos_nc').insert(data);

        if (error) throw error;
        toast.success('Tipo de NC criado com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchTiposNC();
    } catch (error: any) {
      console.error('Error saving tipo NC:', error);
      toast.error('Erro ao salvar tipo de NC', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (tipo: TipoNC) => {
    try {
      const { error } = await supabase
        .from('tipos_nc')
        .update({ ativo: !tipo.ativo })
        .eq('id', tipo.id);

      if (error) throw error;
      toast.success(tipo.ativo ? 'Tipo desativado' : 'Tipo ativado');
      fetchTiposNC();
    } catch (error: any) {
      toast.error('Erro ao alterar status', { description: error.message });
    }
  };

  const deleteTipo = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de NC?')) return;

    try {
      const { error } = await supabase.from('tipos_nc').delete().eq('id', id);
      if (error) throw error;
      toast.success('Tipo de NC excluído com sucesso!');
      fetchTiposNC();
    } catch (error: any) {
      toast.error('Erro ao excluir tipo de NC', { description: error.message });
    }
  };

  const tiposFuncionario = tiposNC.filter((t) => t.categoria === 'funcionario');
  const tiposCliente = tiposNC.filter((t) => t.categoria === 'cliente');

  const renderTable = (tipos: TipoNC[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead>Status</TableHead>
          {isGerente && <TableHead className="w-[100px]">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tipos.length === 0 ? (
          <TableRow>
            <TableCell colSpan={isGerente ? 4 : 3} className="text-center text-muted-foreground py-8">
              Nenhum tipo cadastrado
            </TableCell>
          </TableRow>
        ) : (
          tipos.map((tipo) => (
            <TableRow key={tipo.id}>
              <TableCell className="font-medium">{tipo.nome}</TableCell>
              <TableCell>{tipo.descricao || '-'}</TableCell>
              <TableCell>
                <Badge
                  variant={tipo.ativo ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => isGerente && toggleAtivo(tipo)}
                >
                  {tipo.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              {isGerente && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(tipo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTipo(tipo.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Tags className="h-8 w-8" />
            Tipos de Não Conformidade
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre os tipos de NC para funcionários e clientes
          </p>
        </div>
        {isGerente && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTipo ? 'Editar Tipo de NC' : 'Novo Tipo de NC'}
                </DialogTitle>
                <DialogDescription>
                  {editingTipo
                    ? 'Atualize as informações do tipo'
                    : 'Preencha os dados para criar um novo tipo'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Atraso"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva o tipo de não conformidade..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select value={categoria} onValueChange={(v: 'funcionario' | 'cliente') => setCategoria(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="funcionario">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Funcionário
                        </div>
                      </SelectItem>
                      <SelectItem value="cliente">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Cliente
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingTipo ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos Cadastrados</CardTitle>
          <CardDescription>
            Gerencie os tipos de não conformidades por categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'funcionario' | 'cliente')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="funcionario" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Funcionários ({tiposFuncionario.length})
                </TabsTrigger>
                <TabsTrigger value="cliente" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Clientes ({tiposCliente.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="funcionario" className="mt-4">
                {renderTable(tiposFuncionario)}
              </TabsContent>
              <TabsContent value="cliente" className="mt-4">
                {renderTable(tiposCliente)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TiposNC;
