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
import { Clock, Search, Plus, Pencil, Trash2, HardHat } from 'lucide-react';
import { formatDateToString } from '@/lib/dateUtils';

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

interface AluguelObra {
  id: string;
  obra_id: string;
  material_id: string;
  quantidade: number;
  data_saida: string;
  data_previsao_retorno: string | null;
  observacao: string | null;
  materiais?: Material;
}

const AlugueisObra = () => {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [alugueisObra, setAlugueisObra] = useState<AluguelObra[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFilial, setFilterFilial] = useState<string>('todos');
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [editingAluguel, setEditingAluguel] = useState<AluguelObra | null>(null);
  const [formData, setFormData] = useState({
    material_id: '',
    quantidade: 0,
    data_saida: formatDateToString(new Date()),
    data_previsao_retorno: '',
    observacao: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [obrasRes, materiaisRes, alugueisObraRes, filiaisRes] = await Promise.all([
        supabase
          .from('obras')
          .select('*, clientes(id, nome), filiais(id, nome)')
          .eq('status', 'ativa')
          .order('nome'),
        supabase.from('materiais').select('id, nome, codigo, unidade').order('nome'),
        supabase.from('alugueis_obra').select('*, materiais(id, nome, codigo, unidade)'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
      ]);

      if (obrasRes.error) throw obrasRes.error;
      if (materiaisRes.error) throw materiaisRes.error;
      if (alugueisObraRes.error) throw alugueisObraRes.error;
      if (filiaisRes.error) throw filiaisRes.error;

      setObras(obrasRes.data || []);
      setMateriais(materiaisRes.data || []);
      setAlugueisObra(alugueisObraRes.data || []);
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
    
    alugueisObra.forEach((ao) => {
      if (ao.materiais) {
        if (!totais[ao.material_id]) {
          totais[ao.material_id] = { material: ao.materiais, total: 0 };
        }
        totais[ao.material_id].total += ao.quantidade;
      }
    });
    
    return Object.values(totais).filter(t => t.total > 0);
  }, [alugueisObra]);

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

  // Alugueis de uma obra específica
  const getAlugueisObra = (obraId: string) => {
    return alugueisObra.filter((ao) => ao.obra_id === obraId);
  };

  const openAddAluguel = (obra: Obra) => {
    setSelectedObra(obra);
    setEditingAluguel(null);
    setFormData({ 
      material_id: '', 
      quantidade: 0, 
      data_saida: formatDateToString(new Date()),
      data_previsao_retorno: '',
      observacao: '' 
    });
    setDialogOpen(true);
  };

  const openEditAluguel = (obra: Obra, aluguelObra: AluguelObra) => {
    setSelectedObra(obra);
    setEditingAluguel(aluguelObra);
    setFormData({
      material_id: aluguelObra.material_id,
      quantidade: aluguelObra.quantidade,
      data_saida: aluguelObra.data_saida,
      data_previsao_retorno: aluguelObra.data_previsao_retorno || '',
      observacao: aluguelObra.observacao || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObra || !formData.material_id) return;

    try {
      if (editingAluguel) {
        // Update
        const { error } = await supabase
          .from('alugueis_obra')
          .update({
            quantidade: formData.quantidade,
            data_saida: formData.data_saida,
            data_previsao_retorno: formData.data_previsao_retorno || null,
            observacao: formData.observacao || null,
          })
          .eq('id', editingAluguel.id);

        if (error) throw error;
        toast.success('Aluguel atualizado!');
      } else {
        // Check if already exists
        const existing = alugueisObra.find(
          (ao) => ao.obra_id === selectedObra.id && ao.material_id === formData.material_id
        );

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('alugueis_obra')
            .update({
              quantidade: existing.quantidade + formData.quantidade,
              observacao: formData.observacao || existing.observacao,
            })
            .eq('id', existing.id);

          if (error) throw error;
          toast.success('Quantidade adicionada ao aluguel existente!');
        } else {
          // Insert new
          const { error } = await supabase.from('alugueis_obra').insert([
            {
              obra_id: selectedObra.id,
              material_id: formData.material_id,
              quantidade: formData.quantidade,
              data_saida: formData.data_saida,
              data_previsao_retorno: formData.data_previsao_retorno || null,
              observacao: formData.observacao || null,
              user_id: user?.id,
            },
          ]);

          if (error) throw error;
          toast.success('Aluguel adicionado à obra!');
        }
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro: ' + message);
    }
  };

  const handleDelete = async (aluguelObra: AluguelObra) => {
    if (!confirm('Remover este aluguel da obra?')) return;

    try {
      const { error } = await supabase
        .from('alugueis_obra')
        .delete()
        .eq('id', aluguelObra.id);

      if (error) throw error;
      toast.success('Aluguel removido!');
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro: ' + message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aluguéis em Obra</h1>
        <p className="text-muted-foreground">
          Controle de equipamentos alugados em cada obra
        </p>
      </div>

      {/* Cards de totais por material */}
      {totaisMateriais.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {totaisMateriais.map(({ material, total }) => (
            <Card key={material.id} className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{material.nome}</p>
                    <p className="text-lg font-bold text-blue-600">
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
            const alugueisDestaObra = getAlugueisObra(obra.id);
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
                  {alugueisDestaObra.length > 0 ? (
                    <div className="space-y-2 flex-1">
                      {alugueisDestaObra.map((ao) => (
                        <div
                          key={ao.id}
                          className="flex items-center justify-between p-2 bg-blue-50 rounded-md gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {ao.materiais?.nome}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ao.quantidade} {ao.materiais?.unidade}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditAluguel(obra, ao)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(ao)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground py-4">
                      Nenhum aluguel registrado
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => openAddAluguel(obra)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Aluguel
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog para adicionar/editar aluguel */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingAluguel ? 'Editar Aluguel' : 'Adicionar Aluguel'}
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
                <Label>Equipamento *</Label>
                <Select
                  value={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
                  disabled={!!editingAluguel}
                >
                  <SelectTrigger className="h-9">
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

              <div className="grid grid-cols-2 gap-3">
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
                  <Label>Data Saída *</Label>
                  <Input
                    type="date"
                    value={formData.data_saida}
                    onChange={(e) => setFormData({ ...formData, data_saida: e.target.value })}
                    className="h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Previsão Retorno</Label>
                <Input
                  type="date"
                  value={formData.data_previsao_retorno}
                  onChange={(e) => setFormData({ ...formData, data_previsao_retorno: e.target.value })}
                  className="h-9"
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
              {editingAluguel ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlugueisObra;
