import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Search, Building2, Plus, Pencil, Trash2, HardHat } from 'lucide-react';

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
  referencia: string | null;
  filial_id: string;
  cliente_id: string;
  clientes?: Cliente;
  filiais?: Filial;
}

interface Material {
  id: string;
  nome: string;
  codigo: string | null;
  unidade: string;
}

interface MaterialObra {
  id: string;
  obra_id: string;
  material_id: string;
  quantidade: number;
  observacao: string | null;
  materiais?: Material;
}

const MateriaisObra = () => {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [materiaisObra, setMateriaisObra] = useState<MaterialObra[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFilial, setFilterFilial] = useState<string>('todos');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialObra | null>(null);
  const [formData, setFormData] = useState({
    material_id: '',
    quantidade: 0,
    observacao: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [obrasRes, materiaisRes, materiaisObraRes, filiaisRes] = await Promise.all([
        supabase
          .from('obras')
          .select('*, clientes(id, nome), filiais(id, nome)')
          .eq('status', 'ativa')
          .order('nome'),
        supabase.from('materiais').select('id, nome, codigo, unidade').order('nome'),
        supabase.from('materiais_obra').select('*, materiais(id, nome, codigo, unidade)'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
      ]);

      if (obrasRes.error) throw obrasRes.error;
      if (materiaisRes.error) throw materiaisRes.error;
      if (materiaisObraRes.error) throw materiaisObraRes.error;
      if (filiaisRes.error) throw filiaisRes.error;

      setObras(obrasRes.data || []);
      setMateriais(materiaisRes.data || []);
      setMateriaisObra(materiaisObraRes.data || []);
      setFiliais(filiaisRes.data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar dados: ' + message);
    } finally {
      setLoading(false);
    }
  };

  // Calcula totais por material (para os cards do header)
  const totaisMateriais = useMemo(() => {
    const totais: Record<string, { material: Material; total: number }> = {};
    
    materiaisObra.forEach((mo) => {
      if (mo.materiais) {
        if (!totais[mo.material_id]) {
          totais[mo.material_id] = { material: mo.materiais, total: 0 };
        }
        totais[mo.material_id].total += mo.quantidade;
      }
    });
    
    return Object.values(totais).filter(t => t.total > 0);
  }, [materiaisObra]);

  // Filtra obras
  const filteredObras = useMemo(() => {
    return obras.filter((obra) => {
      const matchSearch = 
        obra.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.clientes?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        obra.referencia?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilial = filterFilial === 'todos' || obra.filial_id === filterFilial;
      return matchSearch && matchFilial;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [obras, searchTerm, filterFilial]);

  // Materiais de uma obra específica
  const getMateriaisObra = (obraId: string) => {
    return materiaisObra.filter((mo) => mo.obra_id === obraId);
  };

  const openAddMaterial = (obra: Obra) => {
    setSelectedObra(obra);
    setEditingMaterial(null);
    setFormData({ material_id: '', quantidade: 0, observacao: '' });
    setDialogOpen(true);
  };

  const openEditMaterial = (obra: Obra, materialObra: MaterialObra) => {
    setSelectedObra(obra);
    setEditingMaterial(materialObra);
    setFormData({
      material_id: materialObra.material_id,
      quantidade: materialObra.quantidade,
      observacao: materialObra.observacao || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra || !formData.material_id) return;

    try {
      if (editingMaterial) {
        // Update
        const { error } = await supabase
          .from('materiais_obra')
          .update({
            quantidade: formData.quantidade,
            observacao: formData.observacao || null,
          })
          .eq('id', editingMaterial.id);

        if (error) throw error;
        toast.success('Material atualizado!');
      } else {
        // Check if already exists
        const existing = materiaisObra.find(
          (mo) => mo.obra_id === selectedObra.id && mo.material_id === formData.material_id
        );

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('materiais_obra')
            .update({
              quantidade: existing.quantidade + formData.quantidade,
              observacao: formData.observacao || existing.observacao,
            })
            .eq('id', existing.id);

          if (error) throw error;
          toast.success('Quantidade adicionada ao material existente!');
        } else {
          // Insert new
          const { error } = await supabase.from('materiais_obra').insert([
            {
              obra_id: selectedObra.id,
              material_id: formData.material_id,
              quantidade: formData.quantidade,
              observacao: formData.observacao || null,
              user_id: user?.id,
            },
          ]);

          if (error) throw error;
          toast.success('Material adicionado à obra!');
        }
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro: ' + message);
    }
  };

  const handleDelete = async (materialObra: MaterialObra) => {
    if (!confirm('Remover este material da obra?')) return;

    try {
      const { error } = await supabase
        .from('materiais_obra')
        .delete()
        .eq('id', materialObra.id);

      if (error) throw error;
      toast.success('Material removido!');
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro: ' + message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Materiais em Obra</h1>
        <p className="text-muted-foreground">
          Controle de materiais alocados em cada obra
        </p>
      </div>

      {/* Cards de totais por material */}
      {totaisMateriais.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {totaisMateriais.map(({ material, total }) => (
            <Card key={material.id} className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{material.nome}</p>
                    <p className="text-lg font-bold text-primary">
                      {total} <span className="text-xs font-normal">{material.unidade}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar obra, cliente ou referência..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger className="w-[180px] h-9">
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
            <Badge variant="secondary">{filteredObras.length} obra(s)</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de Obras */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredObras.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <HardHat className="h-12 w-12 mb-4" />
            <p>Nenhuma obra encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredObras.map((obra) => {
            const materiaisDestaObra = getMateriaisObra(obra.id);
            return (
              <Card key={obra.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base font-semibold truncate">
                        {obra.nome}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {obra.clientes?.nome}
                      </p>
                      {obra.referencia && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Ref: {obra.referencia}
                        </Badge>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {obra.filiais?.nome?.split(' - ')[1] || obra.filiais?.nome}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {materiaisDestaObra.length > 0 ? (
                    <div className="space-y-2 flex-1">
                      {materiaisDestaObra.map((mo) => (
                        <div
                          key={mo.id}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-md gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {mo.materiais?.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {mo.quantidade} {mo.materiais?.unidade}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditMaterial(obra, mo)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(mo)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-4">
                      Nenhum material alocado
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => openAddMaterial(obra)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Material
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para adicionar/editar material */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial ? 'Editar Material' : 'Adicionar Material'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedObra && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{selectedObra.nome}</p>
                  <p className="text-xs text-muted-foreground">{selectedObra.clientes?.nome}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Material *</Label>
                <Select
                  value={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
                  disabled={!!editingMaterial}
                >
                  <SelectTrigger className="h-9">
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
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.quantidade}
                  onChange={(e) =>
                    setFormData({ ...formData, quantidade: parseInt(e.target.value) || 0 })
                  }
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Observação</Label>
                <Input
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  className="h-9"
                  placeholder="Opcional"
                />
              </div>
            </form>
          </ScrollArea>
          <DialogFooter className="flex-shrink-0 pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingMaterial ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MateriaisObra;
