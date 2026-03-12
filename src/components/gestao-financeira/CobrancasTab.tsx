import { useState } from 'react';
import { useGestaoFinanceira, CobrancaCliente } from '@/hooks/useGestaoFinanceira';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO, isBefore } from 'date-fns';
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

const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function CobrancasTab() {
  const { cobrancas, createCobranca, updateCobranca, deleteCobranca } = useGestaoFinanceira();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CobrancaCliente | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [form, setForm] = useState({
    cliente_id: '', obra_id: '', filial_id: '', descricao: '', valor: '',
    dia_vencimento: '10', mes_referencia: String(currentMonth), ano_referencia: String(currentYear),
    forma_pagamento: '', observacoes: '',
  });

  const resetForm = () => {
    setForm({
      cliente_id: '', obra_id: '', filial_id: '', descricao: '', valor: '',
      dia_vencimento: '10', mes_referencia: String(currentMonth), ano_referencia: String(currentYear),
      forma_pagamento: '', observacoes: '',
    });
    setEditing(null);
  };

  const openEdit = (c: CobrancaCliente) => {
    setEditing(c);
    setForm({
      cliente_id: c.cliente_id, obra_id: c.obra_id || '', filial_id: c.filial_id || '',
      descricao: c.descricao, valor: String(c.valor), dia_vencimento: String(c.dia_vencimento),
      mes_referencia: String(c.mes_referencia), ano_referencia: String(c.ano_referencia),
      forma_pagamento: c.forma_pagamento || '', observacoes: c.observacoes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const mes = parseInt(form.mes_referencia);
    const ano = parseInt(form.ano_referencia);
    const dia = parseInt(form.dia_vencimento);
    const dataVenc = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    const payload: any = {
      cliente_id: form.cliente_id,
      obra_id: form.obra_id || null,
      filial_id: form.filial_id || null,
      descricao: form.descricao,
      valor: parseFloat(form.valor) || 0,
      dia_vencimento: dia,
      mes_referencia: mes,
      ano_referencia: ano,
      data_vencimento: dataVenc,
      forma_pagamento: form.forma_pagamento || null,
      observacoes: form.observacoes || null,
    };
    if (editing) {
      await updateCobranca.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createCobranca.mutateAsync(payload);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleBaixa = async (c: CobrancaCliente) => {
    await updateCobranca.mutateAsync({
      id: c.id,
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
    });
  };

  const getStatus = (c: CobrancaCliente) => {
    if (c.status === 'pago') return 'pago';
    if (c.status === 'cancelado') return 'cancelado';
    if (isBefore(parseISO(c.data_vencimento), now)) return 'atrasado';
    return 'pendente';
  };

  const filtered = cobrancas.filter(c => {
    const matchSearch = c.descricao.toLowerCase().includes(search.toLowerCase()) ||
      c.clientes?.nome?.toLowerCase().includes(search.toLowerCase());
    const status = getStatus(c);
    const matchStatus = filterStatus === 'todos' || status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cobranças..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(v) => { setIsDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Cobrança</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Cobrança' : 'Nova Cobrança'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm(f => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filial</Label>
                <Select value={form.filial_id} onValueChange={v => setForm(f => ({ ...f, filial_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
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
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição *</Label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div>
                <Label>Mês Referência</Label>
                <Select value={form.mes_referencia} onValueChange={v => setForm(f => ({ ...f, mes_referencia: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meses.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Input type="number" value={form.ano_referencia} onChange={e => setForm(f => ({ ...f, ano_referencia: e.target.value }))} />
              </div>
              <div>
                <Label>Dia Vencimento</Label>
                <Input type="number" min="1" max="31" value={form.dia_vencimento} onChange={e => setForm(f => ({ ...f, dia_vencimento: e.target.value }))} />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.forma_pagamento} onValueChange={v => setForm(f => ({ ...f, forma_pagamento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {formasPagamento.map(fp => <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>)}
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
              <Button onClick={handleSave} disabled={!form.cliente_id || !form.descricao || !form.valor}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(c => {
          const status = getStatus(c);
          return (
            <Card key={c.id} className={`flex flex-col ${status === 'atrasado' ? 'border-orange-300' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium">{c.clientes?.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground">{c.descricao}</p>
                  </div>
                  <p className="font-bold text-lg">{formatBRL(Number(c.valor))}</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2 text-sm">
                <p className="text-muted-foreground">Ref: {meses[c.mes_referencia - 1]}/{c.ano_referencia}</p>
                <p className="text-muted-foreground">Vencimento: {format(parseISO(c.data_vencimento), 'dd/MM/yyyy')}</p>
                {c.data_pagamento && <p className="text-green-600">Pago em: {format(parseISO(c.data_pagamento), 'dd/MM/yyyy')}</p>}
                {c.filiais?.nome && <p className="text-muted-foreground">Filial: {c.filiais.nome}</p>}
                {c.obras?.nome && <p className="text-muted-foreground">Obra: {c.obras.nome}</p>}
                <div className="flex items-center gap-2">
                  <Badge variant={status === 'pago' ? 'default' : status === 'atrasado' ? 'destructive' : status === 'cancelado' ? 'secondary' : 'outline'}>
                    {status === 'atrasado' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {status}
                  </Badge>
                  {c.forma_pagamento && <Badge variant="secondary">{c.forma_pagamento}</Badge>}
                </div>
              </CardContent>
              <div className="p-4 pt-0 flex gap-2 justify-end">
                {status !== 'pago' && status !== 'cancelado' && (
                  <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleBaixa(c)}>
                    <CheckCircle className="h-4 w-4 mr-1" />Baixa
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
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
                      <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteCobranca.mutate(c.id)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">Nenhuma cobrança encontrada</div>
      )}
    </div>
  );
}
