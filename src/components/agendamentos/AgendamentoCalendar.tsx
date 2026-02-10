import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Agendamento } from '@/hooks/useAgendamentos';
import { Edit, Trash2, Truck, ChevronLeft, ChevronRight } from 'lucide-react';

interface AgendamentoCalendarProps {
  agendamentos: Agendamento[];
  onDateSelect?: (date: Date) => void;
  onAgendamentoEdit?: (agendamento: Agendamento) => void;
  onAgendamentoDelete?: (id: string) => void;
  selectedDate?: Date;
}

export function AgendamentoCalendar({
  agendamentos,
  onDateSelect,
  onAgendamentoEdit,
  onAgendamentoDelete,
  selectedDate,
}: AgendamentoCalendarProps) {
  const [month, setMonth] = useState<Date>(new Date());

  // Get agendamentos for a specific date
  const getAgendamentosForDate = (date: Date) => {
    return agendamentos.filter(a => {
      const agendamentoDate = new Date(a.data_concretagem + 'T00:00:00');
      return isSameDay(agendamentoDate, date);
    });
  };

  // Get agendamentos for selected date
  const selectedAgendamentos = selectedDate
    ? getAgendamentosForDate(selectedDate)
    : [];

  // Dates with agendamentos for styling
  const datesWithAgendamentos = agendamentos.map(a => 
    new Date(a.data_concretagem + 'T00:00:00')
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado':
        return 'bg-blue-500';
      case 'confirmado':
        return 'bg-green-500';
      case 'realizado':
        return 'bg-gray-500';
      case 'cancelado':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

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

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Calendário de Concretagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateSelect?.(date)}
            month={month}
            onMonthChange={setMonth}
            locale={ptBR}
            className="w-full pointer-events-auto"
            classNames={{
              months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full',
              month: 'space-y-4 w-full',
              caption: 'flex justify-center pt-1 relative items-center',
              caption_label: 'text-sm font-medium capitalize',
              nav: 'space-x-1 flex items-center',
              nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border rounded-md hover:bg-accent',
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse',
              head_row: 'flex w-full',
              head_cell: 'text-muted-foreground rounded-md w-full font-normal text-[0.8rem] capitalize',
              row: 'flex w-full mt-2',
              cell: cn(
                'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full h-16',
                '[&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
              ),
              day: cn(
                'h-full w-full p-2 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md flex flex-col items-center justify-start gap-1'
              ),
              day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              day_today: 'bg-accent text-accent-foreground',
            }}
            components={{
              IconLeft: () => <ChevronLeft className="h-4 w-4" />,
              IconRight: () => <ChevronRight className="h-4 w-4" />,
              DayContent: ({ date }) => {
                const dayAgendamentos = getAgendamentosForDate(date);
                const hasAgendamentos = dayAgendamentos.length > 0;

                return (
                  <div className="flex flex-col items-center w-full">
                    <span>{date.getDate()}</span>
                    {hasAgendamentos && (
                      <div className="flex gap-0.5 flex-wrap justify-center">
                        {dayAgendamentos.slice(0, 3).map((a, i) => (
                          <div
                            key={i}
                            className={cn(
                              'w-2 h-2 rounded-full',
                              getStatusColor(a.status)
                            )}
                            title={a.cliente?.nome || 'Agendamento'}
                          />
                        ))}
                        {dayAgendamentos.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{dayAgendamentos.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            }}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm">Agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">Confirmado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm">Realizado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">Cancelado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate
              ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
              : 'Selecione uma data'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-muted-foreground text-sm">
              Clique em uma data no calendário para ver os agendamentos.
            </p>
          ) : selectedAgendamentos.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum agendamento para esta data.
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {selectedAgendamentos.map(agendamento => (
                  <Card key={agendamento.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          {agendamento.cliente?.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {agendamento.obra?.nome}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(agendamento.status)}>
                        {agendamento.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        <strong>Filial:</strong> {agendamento.filial?.nome}
                      </p>
                      <p>
                        <strong>Volume:</strong> {agendamento.volume} m³
                      </p>
                      {agendamento.referencia && (
                        <p>
                          <strong>Ref:</strong> {agendamento.referencia}
                        </p>
                      )}
                      {agendamento.responsaveis && agendamento.responsaveis.length > 0 && (
                        <p>
                          <strong>Resp:</strong>{' '}
                          {agendamento.responsaveis
                            .map(r => r.funcionario?.nome)
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1 mt-2">
                      {onAgendamentoEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => onAgendamentoEdit(agendamento)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      )}
                      {onAgendamentoDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O agendamento de {agendamento.cliente?.nome} será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onAgendamentoDelete(agendamento.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
