import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEnsaios, TIPOS_ENSAIO, TipoEnsaio, CamposEspecificos } from '@/hooks/useEnsaios';
import { supabase } from '@/integrations/supabase/client';
import { CamposEspecificosForm } from '@/components/ensaios/CamposEspecificosForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Paperclip, Download, Search } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['pendente', 'em_andamento', 'concluido'];
const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
};
const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  em_andamento: 'bg-blue-100 text-blue-800',
  concluido: 'bg-green-100 text-green-800',
};

export default function Ensaios() {
  const { user, role } = useAuth();
  const { ensaios, isLoading, createEnsaio, updateEnsaio, deleteEnsaio, isCreating, isUpdating, uploadAnexo, listAnexos, getAnexoUrl, deleteAnexo } = useEnsaios();
  const canManage = role === 'admin' || role === 'gerente';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  // Form state
  const [filialId, setFilialId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [obraId, setObraId] = useState('');
  const [tipo, setTipo] = useState<TipoEnsaio>('Arrancamento');
  const [dataEnsaio, setDataEnsaio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [responsavelId, setResponsavelId] = useState('');
  const [status, setStatus] = useState('pendente');
  const [resultado, setResultado] = useState('');
  const [camposEspecificos, setCamposEspecificos] = useState<CamposEspecificos>({});
  const [observacoes, setObservacoes] = useState('');
  const [anexos, setAnexos] = useState<File[]>([]);

  // Lookup data
  const [filiais, setFiliais] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);

  // Anexos view
  const [viewAnexosId, setViewAnexosId] = useState<string | null>(null);
  const [anexosList, setAnexosList] = useState<any[]>([]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [f, c, o, func] = await Promise.all([
        supabase.from('filiais').select('id, nome').eq('ativa', true),
        supabase.from('clientes').select('id, nome').eq('ativo', true),
        supabase.from('obras').select('id, nome, filial_id, cliente_id'),
        supabase.from('funcionarios').select('id, nome, filial_id').eq('ativo', true),
      ]);
      setFiliais(f.data || []);
      setClientes(c.data || []);
      setObras(o.data || []);
      setFuncionarios(func.data || []);
    };
    fetchLookups();
  }, []);

  const filteredObras = obras.filter(o => (!filialId || o.filial_id === filialId) && (!clienteId || o.cliente_id === clienteId));
  const filteredFuncionarios = funcionarios.filter(f => !filialId || f.filial_id === filialId);

  const resetForm = () => {
    setFilialId('');
    setClienteId('');
    setObraId('');
    setTipo('Arrancamento');
    setDataEnsaio(format(new Date(), 'yyyy-MM-dd'));
    setResponsavelId('');
    setStatus('pendente');
    setResultado('');
    setCamposEspecificos({});
    setObservacoes('');
    setAnexos([]);
    setEditId(null);
  };

  const handleSubmit = async () => {
    const payload = {
      filial_id: filialId,
      cliente_id: clienteId,
      obra_id: obraId,
      tipo,
      data_ensaio: dataEnsaio,
      responsavel_id: responsavelId || null,
      status,
      resultado: resultado || null,
      campos_especificos: camposEspecificos,
      observacoes: observacoes || null,
      user_id: user?.id || null,
    };

    try {
      let ensaioId: string;
      if (editId) {
        await updateEnsaio({ id: editId, ...payload });
        ensaioId = editId;
      } else {
        const result = await createEnsaio(payload);
        ensaioId = (result as any).id;
      }

      // Upload anexos
      for (const file of anexos) {
        await uploadAnexo(ensaioId, file);
      }

      resetForm();
      setIsDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (e) {
      // toast handled by hook
    }
  };

  const handleEdit = (ensaio: any) => {
    setEditId(ensaio.id);
    setFilialId(ensaio.filial_id);
    setClienteId(ensaio.cliente_id);
    setObraId(ensaio.obra_id);
    setTipo(ensaio.tipo);
    setDataEnsaio(ensaio.data_ensaio);
    setResponsavelId(ensaio.responsavel_id || '');
    setStatus(ensaio.status);
    setResultado(ensaio.resultado || '');
    setCamposEspecificos(ensaio.campos_especificos || {});
    setObservacoes(ensaio.observacoes || '');
    setAnexos([]);
    setIsEditDialogOpen(true);
  };

  const handleViewAnexos = async (ensaioId: string) => {
    setViewAnexosId(ensaioId);
    try {
      const files = await listAnexos(ensaioId);
      setAnexosList(files || []);
    } catch {
      setAnexosList([]);
    }
  };

  const filteredEnsaios = ensaios.filter(e => {
    if (filtroTipo !== 'todos' && e.tipo !== filtroTipo) return false;
    if (filtroStatus !== 'todos' && e.status !== filtroStatus) return false;
    if (busca) {
      const search = busca.toLowerCase();
      return (
        e.clientes?.nome?.toLowerCase().includes(search) ||
        e.obras?.nome?.toLowerCase().includes(search) ||
        e.tipo.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const formContent = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Filial *</Label>
          <Select value={filialId} onValueChange={setFilialId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cliente *</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Obra *</Label>
          <Select value={obraId} onValueChange={setObraId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {filteredObras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tipo de Ensaio *</Label>
          <Select value={tipo} onValueChange={v => { setTipo(v as TipoEnsaio); setCamposEspecificos({}); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_ENSAIO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data do Ensaio *</Label>
          <Input type="date" value={dataEnsaio} onChange={e => setDataEnsaio(e.target.value)} />
        </div>
        <div>
          <Label>Responsável</Label>
          <Select value={responsavelId} onValueChange={setResponsavelId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {filteredFuncionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/30">
        <h4 className="text-sm font-medium mb-3">Campos Específicos - {tipo}</h4>
        <CamposEspecificosForm tipo={tipo} campos={camposEspecificos} onChange={setCamposEspecificos} />
      </div>

      <div>
        <Label>Resultado / Laudo</Label>
        <Textarea value={resultado} onChange={e => setResultado(e.target.value)} placeholder="Descreva o resultado do ensaio..." />
      </div>
      <div>
        <Label>Observações</Label>
        <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} />
      </div>
      <div>
        <Label>Anexos (fotos, documentos)</Label>
        <Input type="file" multiple onChange={e => setAnexos(Array.from(e.target.files || []))} />
        {anexos.length > 0 && <p className="text-xs text-muted-foreground mt-1">{anexos.length} arquivo(s) selecionado(s)</p>}
      </div>

      <Button onClick={handleSubmit} disabled={isCreating || isUpdating || !filialId || !clienteId || !obraId} className="w-full">
        {editId ? 'Salvar Alterações' : 'Criar Ensaio'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ensaios</h1>
          <p className="text-muted-foreground">Gerenciamento de ensaios técnicos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={v => { setIsDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Ensaio</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novo Ensaio</DialogTitle></DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por cliente, obra ou tipo..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS_ENSAIO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredEnsaios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum ensaio encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnsaios.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.tipo}</TableCell>
                    <TableCell>{e.clientes?.nome || '-'}</TableCell>
                    <TableCell>{e.obras?.nome || '-'}</TableCell>
                    <TableCell>{format(new Date(e.data_ensaio + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{e.funcionarios?.nome || '-'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[e.status] || ''}>{STATUS_LABELS[e.status] || e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewAnexos(e.id)} title="Anexos">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(e)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {role === 'admin' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Excluir">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir ensaio?</AlertDialogTitle>
                                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteEnsaio(e.id)}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={v => { setIsEditDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Ensaio</DialogTitle></DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      {/* Anexos Dialog */}
      <Dialog open={!!viewAnexosId} onOpenChange={v => { if (!v) setViewAnexosId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anexos do Ensaio</DialogTitle></DialogHeader>
          {anexosList.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum anexo encontrado.</p>
          ) : (
            <div className="space-y-2">
              {anexosList.map(a => (
                <div key={a.name} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm truncate">{a.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => {
                      const url = getAnexoUrl(`${viewAnexosId}/${a.name}`);
                      window.open(url, '_blank');
                    }}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {role === 'admin' && (
                      <Button variant="ghost" size="icon" onClick={async () => {
                        await deleteAnexo(`${viewAnexosId}/${a.name}`);
                        handleViewAnexos(viewAnexosId!);
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
