import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Search, AlertTriangle, CheckCircle, Clock, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Filial {
  id: string;
  nome: string;
}

interface Funcionario {
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
}

interface NaoConformidade {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  gravidade: string;
  status: string;
  data_ocorrencia: string;
  acao_corretiva: string | null;
  data_resolucao: string | null;
  created_at: string;
  filial_id: string;
  funcionario_id: string | null;
  cliente_id: string | null;
  obra_id: string | null;
  filiais?: Filial;
  funcionarios?: Funcionario;
  clientes?: Cliente;
  obras?: Obra;
}

const Ocorrencias = () => {
  const { user, isGerente, isAdmin } = useAuth();
  const [ocorrencias, setOcorrencias] = useState<NaoConformidade[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterGravidade, setFilterGravidade] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOcorrencia, setSelectedOcorrencia] = useState<NaoConformidade | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    tipo: 'funcionario',
    gravidade: 'leve',
    filial_id: '',
    funcionario_id: '',
    cliente_id: '',
    obra_id: '',
    data_ocorrencia: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ocRes, funcRes, cliRes, filRes, obrasRes] = await Promise.all([
        supabase
          .from('nao_conformidades')
          .select(
            '*, filiais(id, nome), funcionarios(id, nome), clientes(id, nome), obras(id, nome)'
          )
          .order('created_at', { ascending: false }),
        supabase.from('funcionarios').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome'),
        supabase.from('obras').select('id, nome').eq('status', 'ativa').order('nome'),
      ]);

      if (ocRes.error) throw ocRes.error;
      if (funcRes.error) throw funcRes.error;
      if (cliRes.error) throw cliRes.error;
      if (filRes.error) throw filRes.error;
      if (obrasRes.error) throw obrasRes.error;

      setOcorrencias(ocRes.data || []);
      setFuncionarios(funcRes.data || []);
      setClientes(cliRes.data || []);
      setFiliais(filRes.data || []);
      setObras(obrasRes.data || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao carregar dados: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      tipo: 'execucao',
      gravidade: 'leve',
      filial_id: '',
      funcionario_id: '',
      cliente_id: '',
      obra_id: '',
      data_ocorrencia: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('nao_conformidades').insert([
        {
          titulo: formData.titulo,
          descricao: formData.descricao,
          tipo: formData.tipo as "cliente" | "funcionario",
          gravidade: formData.gravidade as "leve" | "media" | "grave" | "gravissima",
          filial_id: formData.filial_id,
          funcionario_id: formData.funcionario_id || null,
          cliente_id: formData.cliente_id || null,
          obra_id: formData.obra_id || null,
          data_ocorrencia: formData.data_ocorrencia,
          status: 'aberta',
          user_id: user?.id,
        },
      ]);

      if (error) throw error;

      toast.success('Não conformidade registrada com sucesso!');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao registrar: ' + message);
    }
  };

  const deleteOcorrencia = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta ocorrência? Esta ação não pode ser desfeita.')) return;
    try {
      const { error } = await supabase.from('nao_conformidades').delete().eq('id', id);
      if (error) throw error;
      toast.success('Ocorrência excluída com sucesso!');
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao excluir: ' + message);
    }
  };

  const resolverOcorrencia = async (id: string, acaoCorretiva: string) => {
    try {
      const { error } = await supabase
        .from('nao_conformidades')
        .update({
          status: 'resolvida',
          acao_corretiva: acaoCorretiva,
          data_resolucao: format(new Date(), 'yyyy-MM-dd'),
          resolvido_por: user?.id,
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Ocorrência resolvida com sucesso!');
      setViewDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error('Erro ao resolver: ' + message);
    }
  };

  const filteredOcorrencias = ocorrencias.filter((o) => {
    const matchSearch =
      o.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.funcionarios?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'todos' || o.status === filterStatus;
    const matchGravidade = filterGravidade === 'todos' || o.gravidade === filterGravidade;
    return matchSearch && matchStatus && matchGravidade;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aberta':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Aberta
          </Badge>
        );
      case 'em_analise':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Em Análise
          </Badge>
        );
      case 'resolvida':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolvida
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGravidadeBadge = (gravidade: string) => {
    switch (gravidade) {
      case 'leve':
        return <Badge variant="outline" className="border-blue-300 text-blue-700">Leve</Badge>;
      case 'media':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-700">Média</Badge>;
      case 'grave':
        return <Badge variant="outline" className="border-orange-300 text-orange-700">Grave</Badge>;
      case 'critica':
        return <Badge variant="outline" className="border-red-300 text-red-700">Crítica</Badge>;
      default:
        return <Badge variant="outline">{gravidade}</Badge>;
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      execucao: 'Execução',
      material: 'Material',
      seguranca: 'Segurança',
      qualidade: 'Qualidade',
      prazo: 'Prazo',
      documentacao: 'Documentação',
    };
    return tipos[tipo] || tipo;
  };

  // Estatísticas
  const abertas = ocorrencias.filter((o) => o.status === 'aberta').length;
  const emAnalise = ocorrencias.filter((o) => o.status === 'em_analise').length;
  const resolvidas = ocorrencias.filter((o) => o.status === 'resolvida').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ocorrências</h1>
          <p className="text-muted-foreground">Registre e gerencie não conformidades</p>
        </div>
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
              Nova Ocorrência
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Registrar Não Conformidade</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3 pr-2">
              <div className="space-y-1">
                <Label className="text-xs">Título *</Label>
                <Input
                  id="titulo"
                  className="h-9"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Breve descrição do problema"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Detalhes da ocorrência..."
                  rows={2}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="execucao">Execução</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="seguranca">Segurança</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="prazo">Prazo</SelectItem>
                      <SelectItem value="documentacao">Documentação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gravidade *</Label>
                  <Select
                    value={formData.gravidade}
                    onValueChange={(value) => setFormData({ ...formData, gravidade: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leve">Leve</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="grave">Grave</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Filial *</Label>
                  <Select
                    value={formData.filial_id}
                    onValueChange={(value) => setFormData({ ...formData, filial_id: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {filiais.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data *</Label>
                  <Input
                    id="data_ocorrencia"
                    type="date"
                    className="h-9"
                    value={formData.data_ocorrencia}
                    onChange={(e) =>
                      setFormData({ ...formData, data_ocorrencia: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Funcionário</Label>
                  <Select
                    value={formData.funcionario_id}
                    onValueChange={(value) => setFormData({ ...formData, funcionario_id: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {funcionarios.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Obra</Label>
                  <Select
                    value={formData.obra_id}
                    onValueChange={(value) => setFormData({ ...formData, obra_id: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      {obras.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </form>
            <div className="flex-shrink-0 pt-4 border-t">
              <Button onClick={handleSubmit} className="w-full">
                Registrar Ocorrência
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{abertas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{emAnalise}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolvidas (mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvidas}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberta">Abertas</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="resolvida">Resolvidas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterGravidade} onValueChange={setFilterGravidade}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Gravidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="grave">Grave</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filteredOcorrencias.length} registro(s)</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOcorrencias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4" />
              <p>Nenhuma ocorrência encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Gravidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOcorrencias.map((oc) => (
                  <TableRow key={oc.id}>
                    <TableCell>
                      {format(new Date(oc.data_ocorrencia), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {oc.titulo}
                    </TableCell>
                    <TableCell>{getTipoLabel(oc.tipo)}</TableCell>
                    <TableCell>{getGravidadeBadge(oc.gravidade)}</TableCell>
                    <TableCell>{oc.funcionarios?.nome || '-'}</TableCell>
                    <TableCell>{getStatusBadge(oc.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOcorrencia(oc);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteOcorrencia(oc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Ocorrência</DialogTitle>
          </DialogHeader>
          {selectedOcorrencia && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Título</Label>
                <p className="font-medium">{selectedOcorrencia.titulo}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição</Label>
                <p>{selectedOcorrencia.descricao}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p>{getTipoLabel(selectedOcorrencia.tipo)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Gravidade</Label>
                  <div className="mt-1">{getGravidadeBadge(selectedOcorrencia.gravidade)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Filial</Label>
                  <p>{selectedOcorrencia.filiais?.nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Responsável</Label>
                  <p>{selectedOcorrencia.funcionarios?.nome || '-'}</p>
                </div>
              </div>
              {selectedOcorrencia.obras && (
                <div>
                  <Label className="text-muted-foreground">Obra</Label>
                  <p>{selectedOcorrencia.obras.nome}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedOcorrencia.status)}</div>
              </div>
              {selectedOcorrencia.acao_corretiva && (
                <div>
                  <Label className="text-muted-foreground">Ação Corretiva</Label>
                  <p>{selectedOcorrencia.acao_corretiva}</p>
                </div>
              )}

              {isGerente && selectedOcorrencia.status !== 'resolvida' && (
                <div className="pt-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const acao = formData.get('acao_corretiva') as string;
                      if (acao) resolverOcorrencia(selectedOcorrencia.id, acao);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="acao_corretiva">Ação Corretiva *</Label>
                      <Textarea
                        id="acao_corretiva"
                        name="acao_corretiva"
                        placeholder="Descreva a ação tomada para resolver..."
                        rows={3}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Marcar como Resolvida
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Ocorrencias;
