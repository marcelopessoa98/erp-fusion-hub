import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react';

interface Categoria {
  id: string;
  nome: string;
  descricao: string | null;
}

interface Material {
  id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  unidade: string;
  estoque_minimo: number | null;
  categoria_id: string | null;
  categorias_material?: Categoria;
  created_at: string;
}

const Materiais = () => {
  const { isGerente } = useAuth();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    unidade: 'un',
    estoque_minimo: 0,
    categoria_id: '',
  });

  const [categoriaFormData, setCategoriaFormData] = useState({
    nome: '',
    descricao: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [materiaisRes, categoriasRes] = await Promise.all([
        supabase
          .from('materiais')
          .select('*, categorias_material(id, nome, descricao)')
          .order('nome'),
        supabase.from('categorias_material').select('*').order('nome'),
      ]);

      if (materiaisRes.error) throw materiaisRes.error;
      if (categoriasRes.error) throw categoriasRes.error;

      setMateriais(materiaisRes.data || []);
      setCategorias(categoriasRes.data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar dados: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      descricao: '',
      unidade: 'un',
      estoque_minimo: 0,
      categoria_id: '',
    });
    setEditingMaterial(null);
  };

  const openEditDialog = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      nome: material.nome,
      codigo: material.codigo || '',
      descricao: material.descricao || '',
      unidade: material.unidade,
      estoque_minimo: material.estoque_minimo || 0,
      categoria_id: material.categoria_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        nome: formData.nome,
        codigo: formData.codigo || null,
        descricao: formData.descricao || null,
        unidade: formData.unidade,
        estoque_minimo: formData.estoque_minimo,
        categoria_id: formData.categoria_id || null,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from('materiais')
          .update(payload)
          .eq('id', editingMaterial.id);
        if (error) throw error;
        toast.success('Material atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('materiais').insert([payload]);
        if (error) throw error;
        toast.success('Material cadastrado com sucesso!');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao salvar material: ' + message);
    }
  };

  const handleCategoriaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('categorias_material').insert([
        {
          nome: categoriaFormData.nome,
          descricao: categoriaFormData.descricao || null,
        },
      ]);

      if (error) throw error;
      toast.success('Categoria criada com sucesso!');
      setCategoriaDialogOpen(false);
      setCategoriaFormData({ nome: '', descricao: '' });
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao criar categoria: ' + message);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    try {
      const { error } = await supabase.from('materiais').delete().eq('id', id);
      if (error) throw error;
      toast.success('Material excluído com sucesso!');
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao excluir material: ' + message);
    }
  };

  const filteredMateriais = materiais.filter(
    (m) =>
      m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.categorias_material?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Materiais</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de materiais e categorias
          </p>
        </div>
        {isGerente && (
          <div className="flex gap-2">
            <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Categoria</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategoriaSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-nome">Nome *</Label>
                    <Input
                      id="cat-nome"
                      value={categoriaFormData.nome}
                      onChange={(e) =>
                        setCategoriaFormData({ ...categoriaFormData, nome: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-descricao">Descrição</Label>
                    <Input
                      id="cat-descricao"
                      value={categoriaFormData.descricao}
                      onChange={(e) =>
                        setCategoriaFormData({ ...categoriaFormData, descricao: e.target.value })
                      }
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Criar Categoria
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

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
                  Novo Material
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingMaterial ? 'Editar Material' : 'Novo Material'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="codigo">Código</Label>
                      <Input
                        id="codigo"
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unidade">Unidade *</Label>
                      <Select
                        value={formData.unidade}
                        onValueChange={(value) => setFormData({ ...formData, unidade: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="un">Unidade (un)</SelectItem>
                          <SelectItem value="kg">Quilograma (kg)</SelectItem>
                          <SelectItem value="m">Metro (m)</SelectItem>
                          <SelectItem value="m2">Metro² (m²)</SelectItem>
                          <SelectItem value="m3">Metro³ (m³)</SelectItem>
                          <SelectItem value="l">Litro (L)</SelectItem>
                          <SelectItem value="pç">Peça (pç)</SelectItem>
                          <SelectItem value="cx">Caixa (cx)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                      <Input
                        id="estoque_minimo"
                        type="number"
                        min="0"
                        value={formData.estoque_minimo}
                        onChange={(e) =>
                          setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select
                      value={formData.categoria_id}
                      onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full">
                    {editingMaterial ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary">
              {filteredMateriais.length} material(is)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredMateriais.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mb-4" />
              <p>Nenhum material encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Est. Mínimo</TableHead>
                  {isGerente && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMateriais.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-mono text-sm">
                      {material.codigo || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{material.nome}</TableCell>
                    <TableCell>
                      {material.categorias_material ? (
                        <Badge variant="outline">{material.categorias_material.nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{material.unidade}</TableCell>
                    <TableCell>{material.estoque_minimo || 0}</TableCell>
                    {isGerente && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(material)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMaterial(material.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

export default Materiais;
