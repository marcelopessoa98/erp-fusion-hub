import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAgendamentosNotificacoes, useMarkNotified } from '@/hooks/useAgendamentos';

interface NotificacoesConcretagemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificacoesConcretagem({
  open,
  onOpenChange,
}: NotificacoesConcretagemProps) {
  const { data: notificacoes, isLoading } = useAgendamentosNotificacoes();
  const markNotified = useMarkNotified();

  const handleMarkAsRead = (id: string) => {
    markNotified.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    notificacoes?.forEach(n => markNotified.mutate(n.id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações de Concretagem
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !notificacoes || notificacoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma notificação pendente</p>
            <p className="text-sm mt-1">
              As notificações aparecem 1 dia antes da concretagem
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <Badge variant="secondary">
                {notificacoes.length} concretagem(ns) amanhã
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
              >
                Marcar todas como lidas
              </Button>
            </div>

            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {notificacoes.map(notificacao => (
                  <Card key={notificacao.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            Concretagem Amanhã
                          </p>
                          <p className="text-sm mt-1">
                            <strong>{notificacao.cliente?.nome}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notificacao.obra?.nome}
                          </p>
                          
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <p>
                              <strong>Data:</strong>{' '}
                              {format(
                                new Date(notificacao.data_concretagem + 'T00:00:00'),
                                "dd/MM/yyyy (EEEE)",
                                { locale: ptBR }
                              )}
                            </p>
                            <p>
                              <strong>Filial:</strong> {notificacao.filial?.nome}
                            </p>
                            <p>
                              <strong>Volume:</strong> {notificacao.volume} m³
                            </p>
                            {notificacao.referencia && (
                              <p>
                                <strong>Referência:</strong> {notificacao.referencia}
                              </p>
                            )}
                            {notificacao.responsaveis && notificacao.responsaveis.length > 0 && (
                              <p>
                                <strong>Responsáveis:</strong>{' '}
                                {notificacao.responsaveis
                                  .map(r => r.funcionario?.nome)
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleMarkAsRead(notificacao.id)}
                            disabled={markNotified.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar como lida
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
