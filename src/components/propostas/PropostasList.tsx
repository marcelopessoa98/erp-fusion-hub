import { useState } from 'react';
import { Proposta } from '@/hooks/usePropostas';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
import { CheckCircle, Trash2, Eye, Search, Pencil } from 'lucide-react';
import { format } from 'date-fns';

interface PropostasListProps {
  propostas: Proposta[];
  loading: boolean;
  onAprovar: (id: string, aprovadorNome: string) => Promise<void>;
  onAtualizarStatus: (id: string, status: string) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
  onVerDetalhes: (id: string) => void;
  onEditar: (id: string) => void;
  fetchComItens: (id: string) => Promise<Proposta>;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente: { label: 'Pendente', variant: 'outline' },
  aprovada: { label: 'Aprovada', variant: 'default' },
  enviada: { label: 'Enviada', variant: 'default' },
  cancelada: { label: 'Cancelada', variant: 'destructive' },
};

export function PropostasList({
  propostas,
  loading,
  onAprovar,
  onAtualizarStatus,
  onExcluir,
  onVerDetalhes,
  onEditar,
  fetchComItens,
}: PropostasListProps) {
  const { isAdmin, profile } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = propostas.filter((p) => {
    const matchSearch =
      p.numero.toLowerCase().includes(search.toLowerCase()) ||
      p.assunto.toLowerCase().includes(search.toLowerCase()) ||
      p.clientes?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.obras?.nome?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAprovar = async (id: string) => {
    const nome = profile?.nome || 'Administrador';
    await onAprovar(id, nome);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando propostas...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, assunto, cliente ou obra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="aprovada">Aprovada</SelectItem>
            <SelectItem value="enviada">Enviada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground">
          Nenhuma proposta encontrada
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Elaborado por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const cfg = statusConfig[p.status] || statusConfig.rascunho;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.numero}</TableCell>
                    <TableCell>{p.assunto}</TableCell>
                    <TableCell>{p.clientes?.nome}</TableCell>
                    <TableCell className="text-sm">{p.elaborado_por || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(p.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onVerDetalhes(p.id)} title="Ver detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>

                        {(p.status === 'rascunho' || p.status === 'pendente') && (
                          <Button variant="ghost" size="icon" onClick={() => onEditar(p.id)} title="Editar proposta">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}

                        {(p.status === 'rascunho' || p.status === 'pendente') && isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAprovar(p.id)}
                            title="Aprovar proposta"
                          >
                            <CheckCircle className="h-4 w-4 text-primary" />
                          </Button>
                        )}

                        {(p.status === 'rascunho' || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(p.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onExcluir(deleteId);
                setDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
