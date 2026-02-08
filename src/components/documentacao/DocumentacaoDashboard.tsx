import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, XCircle, Users } from 'lucide-react';
import type { StatusFiltro } from '@/hooks/useDocumentacaoFuncionarios';

interface Props {
  contagens: {
    regular: number;
    irregular: number;
    a_vencer: number;
    total: number;
  };
  statusFiltro: StatusFiltro;
  onStatusClick: (status: StatusFiltro) => void;
}

export function DocumentacaoDashboard({ contagens, statusFiltro, onStatusClick }: Props) {
  const cards = [
    {
      label: 'Total',
      value: contagens.total,
      icon: Users,
      status: 'todos' as StatusFiltro,
      className: 'border-border',
      iconClass: 'text-muted-foreground',
    },
    {
      label: 'Regular',
      value: contagens.regular,
      icon: CheckCircle,
      status: 'regular' as StatusFiltro,
      className: 'border-green-500/30 bg-green-500/5',
      iconClass: 'text-green-600',
    },
    {
      label: 'Prestes a Vencer',
      value: contagens.a_vencer,
      icon: AlertTriangle,
      status: 'a_vencer' as StatusFiltro,
      className: 'border-yellow-500/30 bg-yellow-500/5',
      iconClass: 'text-yellow-600',
    },
    {
      label: 'Irregular',
      value: contagens.irregular,
      icon: XCircle,
      status: 'irregular' as StatusFiltro,
      className: 'border-red-500/30 bg-red-500/5',
      iconClass: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.status}
          className={`cursor-pointer transition-all hover:shadow-md ${card.className} ${
            statusFiltro === card.status ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => onStatusClick(statusFiltro === card.status ? 'todos' : card.status)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <card.icon className={`h-8 w-8 ${card.iconClass}`} />
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
