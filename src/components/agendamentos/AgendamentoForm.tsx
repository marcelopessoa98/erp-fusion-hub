import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AgendamentoFormData, Agendamento } from '@/hooks/useAgendamentos';

interface AgendamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AgendamentoFormData) => void;
  editData?: Agendamento | null;
  isLoading?: boolean;
}

export function AgendamentoForm({
  open,
  onOpenChange,
  onSubmit,
  editData,
  isLoading,
}: AgendamentoFormProps) {
  const [filialId, setFilialId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [obraId, setObraId] = useState('');
  const [referencia, setReferencia] = useState('');
  const [dataConcretagem, setDataConcretagem] = useState<Date>();
  const [volume, setVolume] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState('agendado');
  const [responsaveis, setResponsaveis] = useState<string[]>([]);

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

  // Fetch clientes based on selected filial (through obras)
  const { data: clientes } = useQuery({
    queryKey: ['clientes-agendamento', filialId],
    queryFn: async () => {
      if (!filialId) return [];
      
      // Get unique clients from obras in this filial
      const { data: obras, error } = await supabase
        .from('obras')
        .select('cliente_id, cliente:clientes(id, nome)')
        .eq('filial_id', filialId)
        .eq('status', 'ativa');
      
      if (error) throw error;
      
      // Get unique clients
      const uniqueClients = new Map();
      obras?.forEach(o => {
        if (o.cliente && !uniqueClients.has(o.cliente.id)) {
          uniqueClients.set(o.cliente.id, o.cliente);
        }
      });
      
      return Array.from(uniqueClients.values());
    },
    enabled: !!filialId,
  });

  // Fetch obras based on selected filial and cliente
  const { data: obras } = useQuery({
    queryKey: ['obras-agendamento', filialId, clienteId],
    queryFn: async () => {
      if (!filialId || !clienteId) return [];
      const { data, error } = await supabase
        .from('obras')
        .select('*')
        .eq('filial_id', filialId)
        .eq('cliente_id', clienteId)
        .eq('status', 'ativa')
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!filialId && !!clienteId,
  });

  // Fetch funcionarios based on selected filial
  const { data: funcionarios } = useQuery({
    queryKey: ['funcionarios-agendamento', filialId],
    queryFn: async () => {
      if (!filialId) return [];
      const { data, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('filial_id', filialId)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: !!filialId,
  });

  // Reset form when dialog opens/closes or editData changes
  useEffect(() => {
    if (editData) {
      setFilialId(editData.filial_id);
      setClienteId(editData.cliente_id);
      setObraId(editData.obra_id);
      setReferencia(editData.referencia || '');
      setDataConcretagem(new Date(editData.data_concretagem + 'T00:00:00'));
      setVolume(String(editData.volume));
      setObservacoes(editData.observacoes || '');
      setStatus(editData.status);
      setResponsaveis(editData.responsaveis?.map(r => r.funcionario_id) || []);
    } else {
      resetForm();
    }
  }, [editData, open]);

  const resetForm = () => {
    setFilialId('');
    setClienteId('');
    setObraId('');
    setReferencia('');
    setDataConcretagem(undefined);
    setVolume('');
    setObservacoes('');
    setStatus('agendado');
    setResponsaveis([]);
  };

  // Reset dependent fields when filial changes
  useEffect(() => {
    if (!editData) {
      setClienteId('');
      setObraId('');
      setResponsaveis([]);
    }
  }, [filialId, editData]);

  // Reset obra when cliente changes
  useEffect(() => {
    if (!editData) {
      setObraId('');
    }
  }, [clienteId, editData]);

  const handleResponsavelToggle = (funcionarioId: string) => {
    setResponsaveis(prev =>
      prev.includes(funcionarioId)
        ? prev.filter(id => id !== funcionarioId)
        : [...prev, funcionarioId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!filialId || !clienteId || !obraId || !dataConcretagem || !volume) {
      return;
    }

    onSubmit({
      filial_id: filialId,
      cliente_id: clienteId,
      obra_id: obraId,
      referencia,
      data_concretagem: format(dataConcretagem, 'yyyy-MM-dd'),
      volume: parseFloat(volume),
      observacoes,
      status,
      responsaveis,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Editar Agendamento' : 'Novo Agendamento de Concretagem'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Filial *</Label>
              <Select value={filialId} onValueChange={setFilialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a filial" />
                </SelectTrigger>
                <SelectContent>
                  {filiais?.map(filial => (
                    <SelectItem key={filial.id} value={filial.id}>
                      {filial.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId} disabled={!filialId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map(cliente => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Obra *</Label>
              <Select value={obraId} onValueChange={setObraId} disabled={!clienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a obra" />
                </SelectTrigger>
                <SelectContent>
                  {obras?.map(obra => (
                    <SelectItem key={obra.id} value={obra.id}>
                      {obra.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Referência</Label>
              <Input
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                placeholder="Ex: Laje 2º pavimento"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Concretagem *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dataConcretagem && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataConcretagem
                      ? format(dataConcretagem, 'PPP', { locale: ptBR })
                      : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataConcretagem}
                    onSelect={setDataConcretagem}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Volume (m³) *</Label>
              <Input
                type="number"
                step="0.01"
                value={volume}
                onChange={e => setVolume(e.target.value)}
                placeholder="Ex: 25.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="realizado">Realizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Responsáveis Técnicos</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
              {!filialId ? (
                <p className="text-sm text-muted-foreground">
                  Selecione uma filial primeiro
                </p>
              ) : funcionarios?.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum funcionário cadastrado nesta filial
                </p>
              ) : (
                funcionarios?.map(func => (
                  <div key={func.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={func.id}
                      checked={responsaveis.includes(func.id)}
                      onCheckedChange={() => handleResponsavelToggle(func.id)}
                    />
                    <label
                      htmlFor={func.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {func.nome} {func.cargo && `(${func.cargo})`}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : editData ? 'Salvar Alterações' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
