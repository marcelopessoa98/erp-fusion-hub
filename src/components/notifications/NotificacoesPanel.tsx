import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Cake, Calendar, Clock, DollarSign, FileWarning, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, subMonths } from 'date-fns';

interface Notification {
  id: string;
  type: 'aniversario' | 'agendamento' | 'horas_extras' | 'servico_extra' | 'documento_vencendo' | 'nc_repetida';
  title: string;
  description: string;
  icon: React.ElementType;
}

const LIMITE_HORAS_EXTRAS_MES = 44; // CLT limit

export function NotificacoesPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const notifs: Notification[] = [];
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const diaAtual = hoje.getDate();

    try {
      // 1. Aniversariantes do dia
      const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('id, nome, data_nascimento')
        .eq('ativo', true)
        .not('data_nascimento', 'is', null);

      if (funcionarios) {
        funcionarios.forEach((f) => {
          if (f.data_nascimento) {
            const [, m, d] = f.data_nascimento.split('-').map(Number);
            if (m === mesAtual && d === diaAtual) {
              notifs.push({
                id: `aniv-${f.id}`,
                type: 'aniversario',
                title: '🎂 Aniversariante do dia',
                description: f.nome,
                icon: Cake,
              });
            }
          }
        });
      }

      // 2. Agendamentos do dia
      const hojeStr = format(hoje, 'yyyy-MM-dd');
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('id, volume, referencia, obras(nome), clientes(nome)')
        .eq('data_concretagem', hojeStr)
        .eq('status', 'agendado');

      if (agendamentos) {
        agendamentos.forEach((a: any) => {
          notifs.push({
            id: `agend-${a.id}`,
            type: 'agendamento',
            title: '📅 Agendamento hoje',
            description: `${a.obras?.nome || 'Obra'} - ${a.clientes?.nome || 'Cliente'} (${a.volume}m³)`,
            icon: Calendar,
          });
        });
      }

      // 3. Funcionários que atingiram limite de horas extras no mês
      const inicioMes = format(new Date(hoje.getFullYear(), hoje.getMonth(), 1), 'yyyy-MM-dd');
      const { data: horasExtras } = await supabase
        .from('horas_extras')
        .select('funcionario_id, horas, funcionarios(nome)')
        .gte('data', inicioMes);

      if (horasExtras) {
        const porFuncionario: Record<string, { nome: string; total: number }> = {};
        horasExtras.forEach((he: any) => {
          if (!porFuncionario[he.funcionario_id]) {
            porFuncionario[he.funcionario_id] = {
              nome: he.funcionarios?.nome || 'Funcionário',
              total: 0,
            };
          }
          porFuncionario[he.funcionario_id].total += Number(he.horas);
        });

        Object.entries(porFuncionario).forEach(([id, data]) => {
          if (data.total >= LIMITE_HORAS_EXTRAS_MES) {
            notifs.push({
              id: `he-${id}`,
              type: 'horas_extras',
              title: '⚠️ Limite de HE atingido',
              description: `${data.nome}: ${data.total.toFixed(1)}h (limite: ${LIMITE_HORAS_EXTRAS_MES}h)`,
              icon: Clock,
            });
          }
        });
      }

      // 4. Serviços extras com pendência de pagamento > 1 mês
      const umMesAtras = format(subMonths(hoje, 1), 'yyyy-MM-dd');
      const { data: servicosPendentes } = await supabase
        .from('servicos_extras')
        .select('id, descricao_servico, data_recebimento, clientes(nome), obras(nome)')
        .eq('status_pagamento', 'pendente')
        .lte('data_recebimento', umMesAtras);

      if (servicosPendentes) {
        servicosPendentes.forEach((s: any) => {
          notifs.push({
            id: `se-${s.id}`,
            type: 'servico_extra',
            title: '💰 Pagamento pendente (+1 mês)',
            description: `${s.clientes?.nome || 'Cliente'} - ${s.descricao_servico?.substring(0, 50)}`,
            icon: DollarSign,
          });
        });
      }

      // 5. Documentos de funcionários vencendo em 17 dias ou vencidos
      const { data: docsVencendo } = await supabase
        .from('documentos_funcionarios')
        .select('id, tipo_documento, nome_documento, data_validade, funcionarios(nome)')
        .not('data_validade', 'is', null);

      if (docsVencendo) {
        const hojeMs = hoje.getTime();
        docsVencendo.forEach((doc: any) => {
          if (!doc.data_validade) return;
          const [y, m, d] = doc.data_validade.split('-').map(Number);
          const validade = new Date(y, m - 1, d);
          const diasRestantes = Math.ceil((validade.getTime() - hojeMs) / (1000 * 60 * 60 * 24));
          const nomeFunc = doc.funcionarios?.nome || 'Funcionário';

          if (diasRestantes < 0) {
            notifs.push({
              id: `doc-venc-${doc.id}`,
              type: 'documento_vencendo',
              title: '🚨 Documento vencido',
              description: `${nomeFunc}: ${doc.nome_documento} venceu há ${Math.abs(diasRestantes)} dia(s)`,
              icon: FileWarning,
            });
          } else if (diasRestantes <= 17) {
            notifs.push({
              id: `doc-av-${doc.id}`,
              type: 'documento_vencendo',
              title: '📋 Documento a vencer',
              description: `${nomeFunc}: ${doc.nome_documento} vence em ${diasRestantes} dia(s)`,
              icon: FileWarning,
            });
          }
        });
      }

      // 6. NCs repetidas do mesmo tipo pelo mesmo funcionário ou cliente
      const { data: ncsRepetidas, error: ncsError } = await supabase
        .from('nao_conformidades')
        .select('tipo_nc_id, funcionario_id, cliente_id, tipo, funcionarios(nome), clientes(nome), tipos_nc(nome)')
        .not('tipo_nc_id', 'is', null);

      if (ncsError) {
        console.error('Erro ao buscar NCs repetidas:', ncsError);
      }

      if (ncsRepetidas) {
        const agrupado: Record<string, { count: number; nome: string; tipoNome: string }> = {};
        ncsRepetidas.forEach((nc: any) => {
          const entityId = nc.funcionario_id || nc.cliente_id;
          if (!entityId) return;
          const key = `${nc.tipo_nc_id}-${entityId}`;
          if (!agrupado[key]) {
            const entityNome = nc.funcionarios?.nome || nc.clientes?.nome || 'Desconhecido';
            const tipoNome = nc.tipos_nc?.nome || 'Tipo desconhecido';
            agrupado[key] = { count: 0, nome: entityNome, tipoNome };
          }
          agrupado[key].count++;
        });

        Object.entries(agrupado).forEach(([key, data]) => {
          if (data.count > 1) {
            notifs.push({
              id: `nc-rep-${key}`,
              type: 'nc_repetida',
              title: '⚠️ NC repetida',
              description: `${data.nome}: "${data.tipoNome}" (${data.count}x)`,
              icon: AlertTriangle,
            });
          }
        });
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    } finally {
      setNotifications(notifs);
      setLoading(false);
    }
  };

  const totalNotifs = notifications.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalNotifs > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
              {totalNotifs}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          <p className="text-xs text-muted-foreground">{totalNotifs} alerta(s) ativo(s)</p>
        </div>
        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação no momento
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div key={n.id} className="p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <n.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
