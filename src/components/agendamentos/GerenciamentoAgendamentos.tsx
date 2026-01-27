import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/dialog';
import { List, Edit, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAgendamentos, Agendamento } from '@/hooks/useAgendamentos';

interface GerenciamentoAgendamentosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (agendamento: Agendamento) => void;
}

export function GerenciamentoAgendamentos({
  open,
  onOpenChange,
  onEdit,
}: GerenciamentoAgendamentosProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [mes, setMes] = useState<string>(String(currentMonth));
  const [ano, setAno] = useState<string>(String(currentYear));
  const [filialId, setFilialId] = useState<string>('');
  const [funcionarioId, setFuncionarioId] = useState<string>('');

  // Fetch filiais
  const { data: filiais } = useQuery({
    queryKey: ['filiais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('filiais')
        .select('*')
        .eq('ativa', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Fetch funcionarios
  const { data: funcionarios } = useQuery({
    queryKey: ['funcionarios-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: agendamentos, isLoading } = useAgendamentos({
    mes: parseInt(mes),
    ano: parseInt(ano),
    filial_id: filialId || undefined,
    funcionario_id: funcionarioId || undefined,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'agendado':
        return 'default';
      case 'confirmado':
        return 'secondary';
      case 'realizado':
        return 'outline';
      case 'cancelado':
        return 'destructive';
      default:
        return 'default';
    }
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

  const clearFilters = () => {
    setMes(String(currentMonth));
    setAno(String(currentYear));
    setFilialId('');
    setFuncionarioId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Gerenciamento de Agendamentos
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Select value={ano} onValueChange={setAno}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map(a => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Filial</Label>
                <Select value={filialId} onValueChange={setFilialId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {filiais?.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Funcionário</Label>
                <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {funcionarios?.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !agendamentos || agendamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum agendamento encontrado para os filtros selecionados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendamentos.map(agendamento => (
                  <TableRow key={agendamento.id}>
                    <TableCell className="font-medium">
                      {format(
                        new Date(agendamento.data_concretagem + 'T00:00:00'),
                        'dd/MM/yyyy',
                        { locale: ptBR }
                      )}
                    </TableCell>
                    <TableCell>{agendamento.cliente?.nome}</TableCell>
                    <TableCell>
                      {agendamento.obra?.nome}
                      {agendamento.referencia && (
                        <span className="block text-xs text-muted-foreground">
                          {agendamento.referencia}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{agendamento.filial?.nome}</TableCell>
                    <TableCell>{agendamento.volume} m³</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(agendamento.status)}>
                        {agendamento.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onEdit(agendamento);
                          onOpenChange(false);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="text-sm text-muted-foreground pt-2 border-t">
          {agendamentos?.length || 0} agendamento(s) encontrado(s)
        </div>
      </DialogContent>
    </Dialog>
  );
}
