import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServicosExtras, ServicoExtra } from '@/hooks/useServicosExtras';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Filter, Edit, Trash2, Wrench, Check, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateToString, formatDateBR } from '@/lib/dateUtils';

export default function ServicosExtras() {
  const { profile, role, user } = useAuth();
  const { toast } = useToast();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Filter state
  const [filterClienteId, setFilterClienteId] = useState<string>('all');
  const [filterStatusPagamento, setFilterStatusPagamento] = useState<string>('all');
  const [filterStatusServico, setFilterStatusServico] = useState<string>('all');
  const [filterMes, setFilterMes] = useState<string>(String(currentMonth));
  const [filterAno, setFilterAno] = useState<string>(String(currentYear));

  // Dialog states
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [selectedServico, setSelectedServico] = useState<ServicoExtra | null>(null);
  const [deleteServico, setDeleteServico] = useState<ServicoExtra | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    filial_id: '',
    cliente_id: '',
    obra_id: '',
    material_recebido: '',
    descricao_servico: '',
    status_pagamento: 'pendente' as 'pago' | 'pendente',
    data_recebimento: formatDateToString(new Date()),
  });

  // Fetch data
  const { data: filiais } = useQuery({
    queryKey: ['filiais'],
    queryFn: async () => {
      const { data, error } = await supabase.from('filiais').select('*').eq('ativa', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clientes').select('*').eq('ativo', true);
      if (error) throw error;
      return data;
    },
  });

  const { data: obras } = useQuery({
    queryKey: ['obras', formData.cliente_id],
    queryFn: async () => {
      let query = supabase.from('obras').select('*').eq('status', 'ativa');
      if (formData.cliente_id) {
        query = query.eq('cliente_id', formData.cliente_id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!formData.cliente_id,
  });

  const { servicos, isLoading, createServico, updateServico, deleteServico: deleteServicoMutation } = useServicosExtras({
    cliente_id: filterClienteId !== 'all' ? filterClienteId : undefined,
    status_pagamento: filterStatusPagamento !== 'all' ? filterStatusPagamento : undefined,
    status_servico: filterStatusServico !== 'all' ? filterStatusServico : undefined,
    mes: parseInt(filterMes),
    ano: parseInt(filterAno),
  });

  const resetForm = () => {
    setFormData({
      filial_id: '',
      cliente_id: '',
      obra_id: '',
      material_recebido: '',
      descricao_servico: '',
      status_pagamento: 'pendente',
      data_recebimento: formatDateToString(new Date()),
    });
  };

  const handleSubmit = async () => {
    if (!formData.filial_id || !formData.cliente_id || !formData.obra_id || !formData.material_recebido || !formData.descricao_servico) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    await createServico.mutateAsync({
      ...formData,
      status_servico: 'pendente',
      user_id: user?.id || null,
      usuario_nome: profile?.nome || 'Usuário',
    });

    resetForm();
    setIsNewDialogOpen(false);
  };

  const handleUpdateStatus = async (servico: ServicoExtra, newStatus: 'pendente' | 'finalizado') => {
    await updateServico.mutateAsync({
      id: servico.id,
      status_servico: newStatus,
    });
    setIsManageDialogOpen(false);
    setSelectedServico(null);
  };

  const handleDelete = async () => {
    if (deleteServico) {
      await deleteServicoMutation.mutateAsync(deleteServico.id);
      setDeleteServico(null);
    }
  };

  const clearFilters = () => {
    setFilterClienteId('all');
    setFilterStatusPagamento('all');
    setFilterStatusServico('all');
    setFilterMes(String(currentMonth));
    setFilterAno(String(currentYear));
  };

  const getStatusServicoBadge = (status: string) => {
    return status === 'finalizado' ? (
      <Badge variant="default"><Check className="h-3 w-3 mr-1" /> Finalizado</Badge>
    ) : (
      <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>
    );
  };

  const getStatusPagamentoBadge = (status: string) => {
    return status === 'pago' ? (
      <Badge variant="default"><DollarSign className="h-3 w-3 mr-1" /> Pago</Badge>
    ) : (
      <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" /> Pendente</Badge>
    );
  };

  const meses = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const anos = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serviços Extras</h1>
          <p className="text-muted-foreground">Gerencie os serviços extras recebidos</p>
        </div>
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Serviço Extra</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Filial *</Label>
                  <Select value={formData.filial_id} onValueChange={(v) => setFormData({ ...formData, filial_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {filiais?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Recebimento *</Label>
                  <Input
                    type="date"
                    value={formData.data_recebimento}
                    onChange={(e) => setFormData({ ...formData, data_recebimento: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(v) => setFormData({ ...formData, cliente_id: v, obra_id: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Obra *</Label>
                  <Select
                    value={formData.obra_id}
                    onValueChange={(v) => setFormData({ ...formData, obra_id: v })}
                    disabled={!formData.cliente_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.cliente_id ? 'Selecione' : 'Selecione um cliente primeiro'} />
                    </SelectTrigger>
                    <SelectContent>
                      {obras?.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Material Recebido *</Label>
                <Textarea
                  value={formData.material_recebido}
                  onChange={(e) => setFormData({ ...formData, material_recebido: e.target.value })}
                  placeholder="Descreva o material recebido..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição do Serviço *</Label>
                <Textarea
                  value={formData.descricao_servico}
                  onChange={(e) => setFormData({ ...formData, descricao_servico: e.target.value })}
                  placeholder="Descreva o serviço a ser realizado..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Status de Pagamento</Label>
                <Select
                  value={formData.status_pagamento}
                  onValueChange={(v) => setFormData({ ...formData, status_pagamento: v as 'pago' | 'pendente' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago no Recebimento</SelectItem>
                    <SelectItem value="pendente">Pendente de Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-muted-foreground">
                Registrado por: <strong>{profile?.nome || 'Usuário'}</strong>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createServico.isPending}>
                {createServico.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={filterAno} onValueChange={setFilterAno}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={filterClienteId} onValueChange={setFilterClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Pagamento</Label>
              <Select value={filterStatusPagamento} onValueChange={setFilterStatusPagamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Serviço</Label>
              <Select value={filterStatusServico} onValueChange={setFilterStatusServico}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" onClick={clearFilters}>Limpar Filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Serviços ({servicos?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : !servicos?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum serviço encontrado para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registrado por</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicos.map((servico) => (
                    <TableRow key={servico.id}>
                      <TableCell>
                        {formatDateBR(servico.data_recebimento)}
                      </TableCell>
                      <TableCell>{servico.filial?.nome}</TableCell>
                      <TableCell>{servico.cliente?.nome}</TableCell>
                      <TableCell>{servico.obra?.nome}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={servico.descricao_servico}>
                        {servico.descricao_servico}
                      </TableCell>
                      <TableCell>{getStatusPagamentoBadge(servico.status_pagamento)}</TableCell>
                      <TableCell>{getStatusServicoBadge(servico.status_servico)}</TableCell>
                      <TableCell>{servico.usuario_nome}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedServico(servico);
                              setIsManageDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {role === 'admin' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteServico(servico)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Service Dialog */}
      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Serviço</DialogTitle>
          </DialogHeader>
          {selectedServico && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Cliente:</strong> {selectedServico.cliente?.nome}
                </div>
                <div>
                  <strong>Obra:</strong> {selectedServico.obra?.nome}
                </div>
                <div>
                  <strong>Data:</strong> {formatDateBR(selectedServico.data_recebimento)}
                </div>
                <div>
                  <strong>Pagamento:</strong> {getStatusPagamentoBadge(selectedServico.status_pagamento)}
                </div>
              </div>
              <div className="text-sm">
                <strong>Material:</strong>
                <p className="mt-1 text-muted-foreground">{selectedServico.material_recebido}</p>
              </div>
              <div className="text-sm">
                <strong>Serviço:</strong>
                <p className="mt-1 text-muted-foreground">{selectedServico.descricao_servico}</p>
              </div>
              <div className="text-sm">
                <strong>Status Atual:</strong> {getStatusServicoBadge(selectedServico.status_servico)}
              </div>
              <div className="flex gap-2 pt-4">
                {selectedServico.status_servico === 'pendente' ? (
                  <Button
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedServico, 'finalizado')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Marcar como Finalizado
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(selectedServico, 'pendente')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Reabrir como Pendente
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteServico} onOpenChange={() => setDeleteServico(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
