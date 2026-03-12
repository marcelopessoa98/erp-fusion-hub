import { useState } from 'react';
import { useGestaoFinanceira, LancamentoFinanceiro } from '@/hooks/useGestaoFinanceira';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, CheckCircle, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formasPagamento = [
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
];

export function LancamentosTab() {
  const { lancamentos, categorias, createLancamento, updateLancamento, deleteLancamento } = useGestaoFinanceira();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LancamentoFinanceiro | null>(null);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Fetch clientes, obras, filiais
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => { const { data } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome'); return data || []; },
  });
  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: async () => { const { data } = await supabase.from('obras').select('id, nome').order('nome'); return data || []; },
  });
  const { data: filiais = [] } = useQuery({
    queryKey: ['filiais'],
    queryFn: async () => { const { data } = await supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'); return data || []; },
  });

  const [form, setForm] = useState({
    tipo: 'despesa', categoria_id: '', filial_id: '', cliente_id: '', obra_id: '',
    descricao: '', valor: '', data_lancamento: new Date().toISOString().split('T')[0],
    data_vencimento: '', status: 'pendente', forma_pagamento: '', observacoes: '',
  });

  const resetForm = () => {
    setForm({
      tipo: 'despesa', categoria_id: '', filial_id: '', cliente_id: '', obra_id: '',
      descricao: '', valor: '', data_lancamento: new Date().toISOString().split('T')[0],
      data_vencimento: '', status: 'pendente', forma_pagamento: '', observacoes: '',
    });
    setEditing(null);
  };

  const openEdit = (l: LancamentoFinanceiro) => {
    setEditing(l);
    setForm({
      tipo: l.tipo, categoria_id: l.categoria_id || '', filial_id: l.filial_id || '',
      cliente_id: l.cliente_id || '', obra_id: l.obra_id || '', descricao: l.descricao,
      valor: String(l.valor), data_lancamento: l.data_lancamento,
      data_vencimento: l.data_vencimento || '', status: l.status,
      forma_pagamento: l.forma_pagamento || '', observacoes: l.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload: any = {
      ...form,
      valor: parseFloat(form.valor) || 0,
      categoria_id: form.categoria_id || null,
      filial_id: form.filial_id || null,
      cliente_id: form.cliente_id || null,
      obra_id: form.obra_id || null,
      data_vencimento: form.data_vencimento || null,
      forma_pagamento: form.forma_pagamento || null,
      observacoes: form.observacoes || null,
    };
    if (editing) {
      await updateLancamento.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createLancamento.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleBaixa = async (l: LancamentoFinanceiro) => {
    await updateLancamento.mutateAsync({
      id: l.id,
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
    });
  };

  const filtered = lancamentos.filter(l => {
    const matchSearch = l.descricao.toLowerCase().includes(search.toLowerCase()) ||
      l.clientes?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'todos' || l.tipo === filterTipo;
    const matchStatus = filterStatus === 'todos' || l.status === filterStatus;
    return matchSearch && matchTipo && matchStatus;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar lançamentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Lançamento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria_id} onValueChange={v => setForm(f => ({ ...f, categoria_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categorias.filter(c => c.tipo === form.tipo).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descrição *</Label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <Label>Data</Label>
                <Input type="date" value={form.data_lancamento} onChange={e => setForm(f => ({ ...f, data_lancamento: e.target.value }))} />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm(f => ({ ...f, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(fp => (
                      <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filial</Label>
                <Select value={form.filial_id} onValueChange={v => setForm(f => ({ ...f, filial_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Obra</Label>
                <Select value={form.obra_id} onValueChange={v => setForm(f => ({ ...f, obra_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.descricao || !form.valor}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(l => (
          <Card key={l.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${l.tipo === 'receita' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <CardTitle className="text-sm font-medium line-clamp-1">{l.descricao}</CardTitle>
                </div>
                <p className={`font-bold text-lg ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                  {l.tipo === 'receita' ? '+' : '-'}{formatBRL(Number(l.valor))}
                </p>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm">
              {l.categorias_financeiras && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.categorias_financeiras.cor || '#6B7280' }} />
                  <span className="text-muted-foreground">{l.categorias_financeiras.nome}</span>
                </div>
              )}
              {l.clientes?.nome && <p className="text-muted-foreground">Cliente: {l.clientes.nome}</p>}
              {l.filiais?.nome && <p className="text-muted-foreground">Filial: {l.filiais.nome}</p>}
              <p className="text-muted-foreground">Data: {format(parseISO(l.data_lancamento), 'dd/MM/yyyy')}</p>
              {l.data_vencimento && <p className="text-muted-foreground">Vencimento: {format(parseISO(l.data_vencimento), 'dd/MM/yyyy')}</p>}
              <div className="flex items-center gap-2">
                <Badge variant={l.status === 'pago' ? 'default' : l.status === 'cancelado' ? 'secondary' : 'outline'}>
                  {l.status}
                </Badge>
                {l.forma_pagamento && <Badge variant="secondary">{l.forma_pagamento}</Badge>}
              </div>
            </CardContent>
            <div className="p-4 pt-0 flex gap-2 justify-end">
              {l.status === 'pendente' && (
                <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleBaixa(l)}>
                  <CheckCircle className="h-4 w-4 mr-1" />Baixa
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => openEdit(l)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteLancamento.mutate(l.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Nenhum lançamento encontrado</div>
      )}
    </div>
  );
}
