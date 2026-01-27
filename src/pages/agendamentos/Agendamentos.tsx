import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Bell, List } from 'lucide-react';
import { AgendamentoCalendar } from '@/components/agendamentos/AgendamentoCalendar';
import { AgendamentoForm } from '@/components/agendamentos/AgendamentoForm';
import { NotificacoesConcretagem } from '@/components/agendamentos/NotificacoesConcretagem';
import { GerenciamentoAgendamentos } from '@/components/agendamentos/GerenciamentoAgendamentos';
import {
  useAgendamentos,
  useAgendamentosNotificacoes,
  useCreateAgendamento,
  useUpdateAgendamento,
  Agendamento,
  AgendamentoFormData,
} from '@/hooks/useAgendamentos';

export default function Agendamentos() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [notificacoesOpen, setNotificacoesOpen] = useState(false);
  const [gerenciamentoOpen, setGerenciamentoOpen] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);

  const { data: agendamentos, isLoading } = useAgendamentos();
  const { data: notificacoes } = useAgendamentosNotificacoes();
  const createAgendamento = useCreateAgendamento();
  const updateAgendamento = useUpdateAgendamento();

  const handleNewAgendamento = () => {
    setEditingAgendamento(null);
    setFormOpen(true);
  };

  const handleEditAgendamento = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento);
    setFormOpen(true);
  };

  const handleSubmit = (data: AgendamentoFormData) => {
    if (editingAgendamento) {
      updateAgendamento.mutate(
        { id: editingAgendamento.id, data },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingAgendamento(null);
          },
        }
      );
    } else {
      createAgendamento.mutate(data, {
        onSuccess: () => {
          setFormOpen(false);
        },
      });
    }
  };

  const notificacoesCount = notificacoes?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos de Concretagem</h1>
          <p className="text-muted-foreground">
            Gerencie os agendamentos de concretagem do mês
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleNewAgendamento}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>

          <Button
            variant="outline"
            onClick={() => setNotificacoesOpen(true)}
            className="relative"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notificações
            {notificacoesCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificacoesCount}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => setGerenciamentoOpen(true)}
          >
            <List className="h-4 w-4 mr-2" />
            Gerenciamento
          </Button>
        </div>
      </div>

      {/* Calendar */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <AgendamentoCalendar
          agendamentos={agendamentos || []}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          onAgendamentoEdit={handleEditAgendamento}
        />
      )}

      {/* Form Modal */}
      <AgendamentoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editData={editingAgendamento}
        isLoading={createAgendamento.isPending || updateAgendamento.isPending}
      />

      {/* Notificações Modal */}
      <NotificacoesConcretagem
        open={notificacoesOpen}
        onOpenChange={setNotificacoesOpen}
      />

      {/* Gerenciamento Modal */}
      <GerenciamentoAgendamentos
        open={gerenciamentoOpen}
        onOpenChange={setGerenciamentoOpen}
        onEdit={handleEditAgendamento}
      />
    </div>
  );
}
