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
import { Plus, Pencil, Trash2, UserCog, Loader2, Search } from 'lucide-react';

interface Filial {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  nome: string;
  documento: string | null;
  cargo: string | null;
  telefone: string | null;
  email: string | null;
  data_admissao: string | null;
  ativo: boolean;
  filial_id: string | null;
  filiais?: Filial;
}

const Funcionarios = () => {
  const { isGerente } = useAuth();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFilial, setFilterFilial] = useState<string>('all');

  // Form state
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [cargo, setCargo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [filialId, setFilialId] = useState<string>('');

  const fetchData = async () => {
    try {
      const [funcionariosRes, filiaisRes] = await Promise.all([
        supabase
          .from('funcionarios')
          .select('*, filiais(id, nome)')
          .order('nome'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
      ]);

      if (funcionariosRes.error) throw funcionariosRes.error;
      if (filiaisRes.error) throw filiaisRes.error;

      setFuncionarios(funcionariosRes.data || []);
      setFiliais(filiaisRes.data || []);
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
    setDocumento('');
    setCargo('');
    setTelefone('');
    setEmail('');
    setDataAdmissao('');
    setFilialId('');
    setEditingFuncionario(null);
  };

  const openEditDialog = (funcionario: Funcionario) => {
    setEditingFuncionario(funcionario);
    setNome(funcionario.nome);
    setDocumento(funcionario.documento || '');
    setCargo(funcionario.cargo || '');
    setTelefone(funcionario.telefone || '');
    setEmail(funcionario.email || '');
    setDataAdmissao(funcionario.data_admissao || '');
    setFilialId(funcionario.filial_id || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        nome,
        documento: documento || null,
        cargo: cargo || null,
        telefone: telefone || null,
        email: email || null,
        data_admissao: dataAdmissao || null,
        filial_id: filialId || null,
      };

      if (editingFuncionario) {
        const { error } = await supabase
          .from('funcionarios')
          .update(data)
          .eq('id', editingFuncionario.id);

        if (error) throw error;
        toast.success('Funcionário atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('funcionarios').insert(data);

        if (error) throw error;
        toast.success('Funcionário criado com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving funcionario:', error);
      toast.error('Erro ao salvar funcionário', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (funcionario: Funcionario) => {
    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ ativo: !funcionario.ativo })
        .eq('id', funcionario.id);

      if (error) throw error;
      toast.success(funcionario.ativo ? 'Funcionário desativado' : 'Funcionário ativado');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao alterar status', { description: error.message });
    }
  };

  const deleteFuncionario = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;

    try {
      const { error } = await supabase.from('funcionarios').delete().eq('id', id);
      if (error) throw error;
      toast.success('Funcionário excluído com sucesso!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao excluir funcionário', { description: error.message });
    }
  };

  const filteredFuncionarios = funcionarios.filter((func) => {
    const matchesSearch =
      func.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      func.documento?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilial = filterFilial === 'all' || func.filial_id === filterFilial;

    return matchesSearch && matchesFilial;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UserCog className="h-8 w-8" />
            Funcionários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os funcionários da empresa
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
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
                </DialogTitle>
                <DialogDescription>
                  {editingFuncionario
                    ? 'Atualize as informações do funcionário'
                    : 'Preencha os dados para criar um novo funcionário'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documento">CPF</Label>
                    <Input
                      id="documento"
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo</Label>
                    <Input
                      id="cargo"
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      placeholder="Ex: Operador"
                    />
                  </div>
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
                    <Label htmlFor="dataAdmissao">Data de Admissão</Label>
                    <Input
                      id="dataAdmissao"
                      type="date"
                      value={dataAdmissao}
                      onChange={(e) => setDataAdmissao(e.target.value)}
                    />
                  </div>
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
                <div className="space-y-2">
                  <Label htmlFor="filial">Filial</Label>
                  <Select value={filialId} onValueChange={setFilialId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a filial" />
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
                <DialogFooter>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingFuncionario ? 'Salvar' : 'Criar'}
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
              <CardTitle>Lista de Funcionários</CardTitle>
              <CardDescription>
                {filteredFuncionarios.length} funcionário(s) encontrado(s)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterFilial} onValueChange={setFilterFilial}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {filiais.map((filial) => (
                    <SelectItem key={filial.id} value={filial.id}>
                      {filial.nome}
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
          ) : filteredFuncionarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterFilial !== 'all'
                ? 'Nenhum funcionário encontrado.'
                : 'Nenhum funcionário cadastrado ainda.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  {isGerente && <TableHead className="w-[100px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuncionarios.map((funcionario) => (
                  <TableRow key={funcionario.id}>
                    <TableCell className="font-medium">{funcionario.nome}</TableCell>
                    <TableCell>{funcionario.cargo || '-'}</TableCell>
                    <TableCell>{funcionario.filiais?.nome || '-'}</TableCell>
                    <TableCell>{funcionario.telefone || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={funcionario.ativo ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => isGerente && toggleAtivo(funcionario)}
                      >
                        {funcionario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    {isGerente && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(funcionario)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFuncionario(funcionario.id)}
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

export default Funcionarios;
