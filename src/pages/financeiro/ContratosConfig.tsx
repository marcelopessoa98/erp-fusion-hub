import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useContratosConfig, ContratoConfigItem } from '@/hooks/useContratosConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, FileText, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Obra {
  id: string;
  nome: string;
  cliente_id: string;
  filial_id: string;
  clientes?: { nome: string; documento?: string };
  filiais?: { nome: string };
}

export default function ContratosConfig() {
  const { user, isAdmin, isGerente } = useAuth();
  const canManage = isAdmin || isGerente;
  const { contratos, isLoading, createContrato, updateContrato, deleteContrato, saveItens } = useContratosConfig();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itensDialogOpen, setItensDialogOpen] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null);

  // Form
  const [obraId, setObraId] = useState('');
  const [contratanteNome, setContratanteNome] = useState('');
  const [contratanteCnpj, setContratanteCnpj] = useState('');
  const [contratadoNome, setContratadoNome] = useState('Concre Fuji Tecnologia');
  const [contratadoCnpj, setContratadoCnpj] = useState('32.721.991/0001-98');
  const [servicosDescricao, setServicosDescricao] = useState('');
  const [numeroProposta, setNumeroProposta] = useState('');

  // Itens
  const [itens, setItens] = useState<Omit<ContratoConfigItem, 'id' | 'created_at' | 'contrato_config_id'>[]>([]);

  const { data: obras } = useQuery({
    queryKey: ['obras_for_contratos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, cliente_id, filial_id, clientes(nome, documento), filiais(nome)')
        .eq('status', 'ativa')
        .order('nome');
      if (error) throw error;
      return data as Obra[];
    },
  });

  const resetForm = () => {
    setObraId('');
    setContratanteNome('');
    setContratanteCnpj('');
    setContratadoNome('Concre Fuji Tecnologia');
    setContratadoCnpj('32.721.991/0001-98');
    setServicosDescricao('');
    setNumeroProposta('');
    setEditingId(null);
  };

  const handleObraChange = (id: string) => {
    setObraId(id);
    const obra = obras?.find((o) => o.id === id);
    if (obra?.clientes) {
      setContratanteNome(obra.clientes.nome || '');
      setContratanteCnpj(obra.clientes.documento || '');
    }
  };

  const handleSubmit = async () => {
    if (!obraId) { toast.error('Selecione a obra'); return; }
    const obra = obras?.find((o) => o.id === obraId);
    if (!obra) return;

    const payload = {
      obra_id: obraId,
      cliente_id: obra.cliente_id,
      filial_id: obra.filial_id,
      contratante_nome: contratanteNome,
      contratante_cnpj: contratanteCnpj,
      contratado_nome: contratadoNome,
      contratado_cnpj: contratadoCnpj,
      servicos_descricao: servicosDescricao,
      numero_proposta: numeroProposta || null,
      user_id: user?.id || null,
    };

    if (editingId) {
      await updateContrato.mutateAsync({ id: editingId, ...payload });
    } else {
      await createContrato.mutateAsync(payload);
    }
    setDialogOpen(false);
    resetForm();
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setObraId(c.obra_id);
    setContratanteNome(c.contratante_nome);
    setContratanteCnpj(c.contratante_cnpj);
    setContratadoNome(c.contratado_nome);
    setContratadoCnpj(c.contratado_cnpj);
    setServicosDescricao(c.servicos_descricao);
    setNumeroProposta(c.numero_proposta || '');
    setDialogOpen(true);
  };

  const openItens = (c: any) => {
    setSelectedContratoId(c.id);
    setItens(
      (c.contrato_config_itens || [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((i: any) => ({
          item_numero: i.item_numero,
          descricao: i.descricao,
          unidade: i.unidade,
          quantidade: i.quantidade,
          valor_unitario: i.valor_unitario,
          ordem: i.ordem,
        }))
    );
    setItensDialogOpen(true);
  };

  const addItem = () => {
    const nextOrdem = itens.length + 1;
    setItens([...itens, {
      item_numero: `${nextOrdem}.0`,
      descricao: '',
      unidade: 'und',
      quantidade: 0,
      valor_unitario: 0,
      ordem: nextOrdem,
    }]);
  };

  const removeItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItens(itens.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSaveItens = async () => {
    if (!selectedContratoId) return;
    await saveItens.mutateAsync({ contratoId: selectedContratoId, itens });
    setItensDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Contratos / Config
          </h1>
          <p className="text-muted-foreground">Configure valores fixos e tabela de preços unitários por obra.</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo Contrato</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar' : 'Novo'} Contrato</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="space-y-1">
                  <Label>Obra *</Label>
                  <Select value={obraId} onValueChange={handleObraChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                    <SelectContent>
                      {obras?.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Contratante</Label>
                    <Input value={contratanteNome} onChange={(e) => setContratanteNome(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>CNPJ Contratante</Label>
                    <Input value={contratanteCnpj} onChange={(e) => setContratanteCnpj(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Contratado</Label>
                    <Input value={contratadoNome} onChange={(e) => setContratadoNome(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>CNPJ Contratado</Label>
                    <Input value={contratadoCnpj} onChange={(e) => setContratadoCnpj(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Serviços</Label>
                    <Input value={servicosDescricao} onChange={(e) => setServicosDescricao(e.target.value)} placeholder="Ex: Controle Tecnológico..." />
                  </div>
                  <div className="space-y-1">
                    <Label>Nº Proposta</Label>
                    <Input value={numeroProposta} onChange={(e) => setNumeroProposta(e.target.value)} placeholder="Ex: C20250127-01" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={createContrato.isPending || updateContrato.isPending}>
                  {(createContrato.isPending || updateContrato.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contratos Cadastrados</CardTitle>
          <CardDescription>{contratos?.length || 0} contrato(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : !contratos?.length ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum contrato cadastrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obra</TableHead>
                  <TableHead>Contratante</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Itens</TableHead>
                  {canManage && <TableHead className="w-[140px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.obra?.nome || '-'}</TableCell>
                    <TableCell>{c.contratante_nome}</TableCell>
                    <TableCell className="text-xs">{c.contratante_cnpj}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{c.servicos_descricao}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.contrato_config_itens?.length || 0} itens</Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openItens(c)} title="Editar itens">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm('Excluir este contrato?')) deleteContrato.mutate(c.id);
                          }}>
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

      {/* Itens Dialog */}
      <Dialog open={itensDialogOpen} onOpenChange={setItensDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Tabela de Preços Unitários</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Item</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-20">Unidade</TableHead>
                  <TableHead className="w-24">Qtd</TableHead>
                  <TableHead className="w-28">Valor Unit.</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input value={item.item_numero} onChange={(e) => updateItem(idx, 'item_numero', e.target.value)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Input value={item.descricao} onChange={(e) => updateItem(idx, 'descricao', e.target.value)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Input value={item.unidade} onChange={(e) => updateItem(idx, 'unidade', e.target.value)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={item.valor_unitario} onChange={(e) => updateItem(idx, 'valor_unitario', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-7 w-7">
                        <X className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="outline" size="sm" className="mt-2" onClick={addItem}>
              <Plus className="h-3 w-3 mr-1" />Adicionar Item
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItensDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveItens} disabled={saveItens.isPending}>
              {saveItens.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Itens
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
