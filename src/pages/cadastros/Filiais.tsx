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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react';

interface Filial {
  id: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  ativa: boolean;
  created_at: string;
}

const Filiais = () => {
  const { isAdmin } = useAuth();
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFilial, setEditingFilial] = useState<Filial | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  const fetchFiliais = async () => {
    try {
      const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .order('nome');

      if (error) throw error;
      setFiliais(data || []);
    } catch (error) {
      console.error('Error fetching filiais:', error);
      toast.error('Erro ao carregar filiais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiliais();
  }, []);

  const resetForm = () => {
    setNome('');
    setEndereco('');
    setTelefone('');
    setEmail('');
    setEditingFilial(null);
  };

  const openEditDialog = (filial: Filial) => {
    setEditingFilial(filial);
    setNome(filial.nome);
    setEndereco(filial.endereco || '');
    setTelefone(filial.telefone || '');
    setEmail(filial.email || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingFilial) {
        const { error } = await supabase
          .from('filiais')
          .update({ nome, endereco, telefone, email })
          .eq('id', editingFilial.id);

        if (error) throw error;
        toast.success('Filial atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('filiais')
          .insert({ nome, endereco, telefone, email });

        if (error) throw error;
        toast.success('Filial criada com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchFiliais();
    } catch (error: any) {
      console.error('Error saving filial:', error);
      toast.error('Erro ao salvar filial', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtiva = async (filial: Filial) => {
    try {
      const { error } = await supabase
        .from('filiais')
        .update({ ativa: !filial.ativa })
        .eq('id', filial.id);

      if (error) throw error;
      toast.success(filial.ativa ? 'Filial desativada' : 'Filial ativada');
      fetchFiliais();
    } catch (error: any) {
      toast.error('Erro ao alterar status', { description: error.message });
    }
  };

  const deleteFilial = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta filial?')) return;

    try {
      const { error } = await supabase.from('filiais').delete().eq('id', id);
      if (error) throw error;
      toast.success('Filial excluída com sucesso!');
      fetchFiliais();
    } catch (error: any) {
      toast.error('Erro ao excluir filial', { description: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            Filiais
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as filiais da empresa
          </p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Filial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingFilial ? 'Editar Filial' : 'Nova Filial'}
                </DialogTitle>
                <DialogDescription>
                  {editingFilial
                    ? 'Atualize as informações da filial'
                    : 'Preencha os dados para criar uma nova filial'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome da filial"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Endereço completo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@empresa.com"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingFilial ? 'Salvar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Filiais</CardTitle>
          <CardDescription>
            {filiais.length} filial(is) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filiais.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma filial cadastrada ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filiais.map((filial) => (
                  <TableRow key={filial.id}>
                    <TableCell className="font-medium">{filial.nome}</TableCell>
                    <TableCell>{filial.endereco || '-'}</TableCell>
                    <TableCell>{filial.telefone || '-'}</TableCell>
                    <TableCell>{filial.email || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={filial.ativa ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => isAdmin && toggleAtiva(filial)}
                      >
                        {filial.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(filial)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFilial(filial.id)}
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

export default Filiais;
