import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Clock, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { formatDateToString } from '@/lib/dateUtils';

const MATERIAIS_PREDEFINIDOS = [
  'Forma 100x200', 'Forma 40x160', 'Forma 40x40', 'Forma 50x100',
  'Prensa', 'Chapa 90x90', 'Kit Slump Completo', 'Anel J', 'Funil V',
  'Caixa L', 'Coluna de Segregação',
];

interface Filial { id: string; nome: string; }
interface Cliente { id: string; nome: string; }
interface Obra { id: string; nome: string; referencia: string | null; filial_id: string; cliente_id: string; clientes?: Cliente; filiais?: Filial; }
interface Material { id: string; nome: string; codigo: string | null; unidade: string; }
interface AluguelObra {
  id: string; obra_id: string; material_id: string; quantidade: number;
  data_saida: string; data_previsao_retorno: string | null; observacao: string | null;
  entregue_por: string | null; recebido_por: string | null; data_entrega: string | null;
  codigo_identificacao: string | null; data_calibracao: string | null;
  materiais?: Material; obras?: Obra & { clientes?: Cliente; filiais?: Filial };
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AluguelObra | null>(null);

  const [formFilial, setFormFilial] = useState('');
  const [formCliente, setFormCliente] = useState('');
  const [formObra, setFormObra] = useState('');
  const [selectedMateriais, setSelectedMateriais] = useState<string[]>([]);
  const [formQuantidade, setFormQuantidade] = useState(0);
  const [formEntregue, setFormEntregue] = useState('');
  const [formRecebido, setFormRecebido] = useState('');
  const [formDataEntrega, setFormDataEntrega] = useState(formatDateToString(new Date()));
  const [formCodigoId, setFormCodigoId] = useState('');
  const [formDataCalibracao, setFormDataCalibracao] = useState('');
  const [formObservacao, setFormObservacao] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [obrasRes, materiaisRes, alugueisRes, filiaisRes] = await Promise.all([
        supabase.from('obras').select('*, clientes(id, nome), filiais(id, nome)').eq('status', 'ativa').order('nome'),
        supabase.from('materiais').select('id, nome, codigo, unidade').order('nome'),
        supabase.from('alugueis_obra').select('*, materiais(id, nome, codigo, unidade), obras(id, nome, referencia, filial_id, cliente_id, clientes(id, nome), filiais(id, nome))'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
      ]);
      if (obrasRes.error) throw obrasRes.error;
      if (materiaisRes.error) throw materiaisRes.error;
      if (alugueisRes.error) throw alugueisRes.error;
      if (filiaisRes.error) throw filiaisRes.error;
      setObras(obrasRes.data || []);
      setMateriais(materiaisRes.data || []);
      setAlugueisObra(alugueisRes.data || []);
      setFiliais(filiaisRes.data || []);
    } catch (error: unknown) {
      toast.error('Erro ao carregar dados: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally { setLoading(false); }
  };

  const totaisMateriais = useMemo(() => {
    const totais: Record<string, { material: Material; total: number }> = {};
    alugueisObra.forEach((ao) => {
      if (ao.materiais) {
        if (!totais[ao.material_id]) totais[ao.material_id] = { material: ao.materiais, total: 0 };
        totais[ao.material_id].total += ao.quantidade;
      }
    });
    return Object.values(totais).filter(t => t.total > 0).sort((a, b) => a.material.nome.localeCompare(b.material.nome));
  }, [alugueisObra]);

  const filteredItems = useMemo(() => {
    return alugueisObra
      .filter((ao) => {
        const obraName = ao.obras?.nome || '';
        const clienteName = ao.obras?.clientes?.nome || '';
        const materialName = ao.materiais?.nome || '';
        const matchSearch = obraName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clienteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          materialName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFilial = filterFilial === 'todos' || ao.obras?.filial_id === filterFilial;
        return matchSearch && matchFilial;
      })
      .sort((a, b) => (a.obras?.nome || '').localeCompare(b.obras?.nome || ''));
  }, [alugueisObra, searchTerm, filterFilial]);

  const formClientes = useMemo(() => {
    if (!formFilial) return [];
    const clienteIds = new Set(obras.filter(o => o.filial_id === formFilial).map(o => o.cliente_id));
    return [...clienteIds].map(id => obras.find(o => o.cliente_id === id)?.clientes).filter(Boolean) as Cliente[];
  }, [formFilial, obras]);

  const formObras = useMemo(() => {
    if (!formFilial || !formCliente) return [];
    return obras.filter(o => o.filial_id === formFilial && o.cliente_id === formCliente);
  }, [formFilial, formCliente, obras]);

  const isPrensaSelected = useMemo(() => {
    return selectedMateriais.some(id => materiais.find(m => m.id === id)?.nome.toLowerCase().includes('prensa'));
  }, [selectedMateriais, materiais]);

  const isPrensaEdit = useMemo(() => {
    if (!editingItem) return false;
    return editingItem.materiais?.nome.toLowerCase().includes('prensa') || false;
  }, [editingItem]);

  const openNew = () => {
    setEditingItem(null);
    setFormFilial(''); setFormCliente(''); setFormObra('');
    setSelectedMateriais([]); setFormQuantidade(0);
    setFormEntregue(''); setFormRecebido('');
    setFormDataEntrega(formatDateToString(new Date()));
    setFormCodigoId(''); setFormDataCalibracao(''); setFormObservacao('');
    setDialogOpen(true);
  };

  const openEdit = (item: AluguelObra) => {
    setEditingItem(item);
    setFormFilial(item.obras?.filial_id || '');
    setFormCliente(item.obras?.cliente_id || '');
    setFormObra(item.obra_id);
    setSelectedMateriais([item.material_id]);
    setFormQuantidade(item.quantidade);
    setFormEntregue(item.entregue_por || '');
    setFormRecebido(item.recebido_por || '');
    setFormDataEntrega(item.data_entrega || formatDateToString(new Date()));
    setFormCodigoId(item.codigo_identificacao || '');
    setFormDataCalibracao(item.data_calibracao || '');
    setFormObservacao(item.observacao || '');
    setDialogOpen(true);
  };

  const isPrensaForMaterial = (matId: string) => materiais.find(m => m.id === matId)?.nome.toLowerCase().includes('prensa') || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formObra || (editingItem ? false : selectedMateriais.length === 0)) return;
    try {
      if (editingItem) {
        const { error } = await supabase.from('alugueis_obra').update({
          quantidade: formQuantidade,
          entregue_por: formEntregue || null,
          recebido_por: formRecebido || null,
          data_entrega: formDataEntrega || null,
          codigo_identificacao: formCodigoId || null,
          data_calibracao: formDataCalibracao || null,
          observacao: formObservacao || null,
        }).eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Aluguel atualizado!');
      } else {
        const inserts = selectedMateriais.map(matId => ({
          obra_id: formObra,
          material_id: matId,
          quantidade: formQuantidade,
          data_saida: formDataEntrega,
          entregue_por: formEntregue || null,
          recebido_por: formRecebido || null,
          data_entrega: formDataEntrega || null,
          codigo_identificacao: isPrensaForMaterial(matId) ? formCodigoId || null : null,
          data_calibracao: isPrensaForMaterial(matId) ? formDataCalibracao || null : null,
          observacao: formObservacao || null,
          user_id: user?.id,
        }));
        const { error } = await supabase.from('alugueis_obra').insert(inserts);
        if (error) throw error;
        toast.success(`${inserts.length} aluguel(éis) adicionado(s)!`);
      }
      setDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('alugueis_obra').delete().eq('id', id);
      if (error) throw error;
      toast.success('Aluguel removido!');
      fetchData();
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const handleDeleteAllObra = async (obraId: string) => {
    try {
      const { error } = await supabase.from('alugueis_obra').delete().eq('obra_id', obraId);
      if (error) throw error;
      toast.success('Todos os aluguéis da obra removidos!');
      fetchData();
    } catch (error: unknown) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const toggleMaterial = (matId: string) => {
    setSelectedMateriais(prev => prev.includes(matId) ? prev.filter(id => id !== matId) : [...prev, matId]);
  };

  const obraIds = useMemo(() => [...new Set(filteredItems.map(i => i.obra_id))], [filteredItems]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aluguéis em Obra</h1>
          <p className="text-muted-foreground">Controle de equipamentos alugados em cada obra</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Aluguel</Button>
      </div>

      {totaisMateriais.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {totaisMateriais.map(({ material, total }) => (
            <Card key={material.id} className="bg-primary/5 border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{material.nome}</p>
                    <p className="text-lg font-bold text-primary">{total} <span className="text-xs font-normal">{material.unidade}</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar obra, cliente ou material..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-9" />
            </div>
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Filial" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as filiais</SelectItem>
                {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filteredItems.length} registro(s)</Badge>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mb-4" /><p>Nenhum aluguel cadastrado</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filial</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Ref.</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Entregue por</TableHead>
                  <TableHead>Recebido por</TableHead>
                  <TableHead>Data Entrega</TableHead>
                  <TableHead>Cód. Ident.</TableHead>
                  <TableHead>Calibração</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{item.obras?.filiais?.nome}</TableCell>
                    <TableCell className="text-xs">{item.obras?.clientes?.nome}</TableCell>
                    <TableCell className="font-medium text-sm">{item.obras?.nome}</TableCell>
                    <TableCell className="text-xs">{item.obras?.referencia || '-'}</TableCell>
                    <TableCell className="text-sm">{item.materiais?.nome}</TableCell>
                    <TableCell className="text-center font-bold">{item.quantidade}</TableCell>
                    <TableCell className="text-xs">{item.entregue_por || '-'}</TableCell>
                    <TableCell className="text-xs">{item.recebido_por || '-'}</TableCell>
                    <TableCell className="text-xs">{item.data_entrega || '-'}</TableCell>
                    <TableCell className="text-xs">{item.codigo_identificacao || '-'}</TableCell>
                    <TableCell className="text-xs">{item.data_calibracao || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover aluguel?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {obraIds.length > 0 && (
            <div className="p-4 border-t flex flex-wrap gap-2">
              {obraIds.map(obraId => {
                const obra = obras.find(o => o.id === obraId);
                if (!obra) return null;
                const count = filteredItems.filter(i => i.obra_id === obraId).length;
                return (
                  <AlertDialog key={obraId}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                        <Trash2 className="h-3 w-3 mr-1" />Apagar tudo - {obra.nome} ({count})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apagar todos os aluguéis de {obra.nome}?</AlertDialogTitle>
                        <AlertDialogDescription>Isso removerá {count} registro(s). Esta ação não pode ser desfeita.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteAllObra(obraId)}>Apagar Tudo</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                );
              })}
            </div>
          )}
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Aluguel' : 'Novo Aluguel'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <form onSubmit={handleSubmit} className="space-y-4" id="aluguel-form">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Filial *</Label>
                  <Select value={formFilial} onValueChange={v => { setFormFilial(v); setFormCliente(''); setFormObra(''); }} disabled={!!editingItem}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={formCliente} onValueChange={v => { setFormCliente(v); setFormObra(''); }} disabled={!!editingItem || !formFilial}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{formClientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Obra / Referência *</Label>
                <Select value={formObra} onValueChange={setFormObra} disabled={!!editingItem || !formCliente}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {formObras.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.nome}{o.referencia ? ` (Ref: ${o.referencia})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingItem ? (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{editingItem.materiais?.nome}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Materiais * (selecione um ou mais)</Label>
                  <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                    {MATERIAIS_PREDEFINIDOS.map(nome => {
                      const mat = materiais.find(m => m.nome.toLowerCase() === nome.toLowerCase());
                      if (!mat) return null;
                      return (
                        <div key={mat.id} className="flex items-center gap-2">
                          <Checkbox checked={selectedMateriais.includes(mat.id)} onCheckedChange={() => toggleMaterial(mat.id)} />
                          <span className="text-sm">{mat.nome}</span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs text-muted-foreground mb-2">Outros materiais:</p>
                      {materiais.filter(m => !MATERIAIS_PREDEFINIDOS.some(p => p.toLowerCase() === m.nome.toLowerCase())).map(mat => (
                        <div key={mat.id} className="flex items-center gap-2">
                          <Checkbox checked={selectedMateriais.includes(mat.id)} onCheckedChange={() => toggleMaterial(mat.id)} />
                          <span className="text-sm">{mat.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input type="number" min="0" value={formQuantidade} onChange={e => setFormQuantidade(parseInt(e.target.value) || 0)} className="h-9" required />
                </div>
                <div className="space-y-2">
                  <Label>Data Entrega *</Label>
                  <Input type="date" value={formDataEntrega} onChange={e => setFormDataEntrega(e.target.value)} className="h-9" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Entregue por</Label>
                  <Input value={formEntregue} onChange={e => setFormEntregue(e.target.value)} className="h-9" placeholder="Nome" />
                </div>
                <div className="space-y-2">
                  <Label>Recebido por</Label>
                  <Input value={formRecebido} onChange={e => setFormRecebido(e.target.value)} className="h-9" placeholder="Nome" />
                </div>
              </div>

              {(isPrensaSelected || isPrensaEdit) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-md border">
                  <div className="space-y-2">
                    <Label>Código Identificação (Prensa)</Label>
                    <Input value={formCodigoId} onChange={e => setFormCodigoId(e.target.value)} className="h-9" placeholder="Ex: PR-001" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Calibração</Label>
                    <Input type="date" value={formDataCalibracao} onChange={e => setFormDataCalibracao(e.target.value)} className="h-9" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observação</Label>
                <Input value={formObservacao} onChange={e => setFormObservacao(e.target.value)} className="h-9" placeholder="Opcional" />
              </div>
            </form>
          </ScrollArea>
          <DialogFooter className="flex-shrink-0 pt-4 border-t gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="submit" form="aluguel-form">{editingItem ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AlugueisObra;
