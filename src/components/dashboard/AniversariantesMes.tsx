import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cake, Gift } from 'lucide-react';
import { format, getMonth, getDate, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Funcionario {
  id: string;
  nome: string;
  cargo: string | null;
  data_nascimento: string | null;
  filial?: { nome: string } | null;
}

export function AniversariantesMes() {
  const [aniversariantes, setAniversariantes] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAniversariantes();
  }, []);

  const fetchAniversariantes = async () => {
    try {
      const mesAtual = getMonth(new Date()) + 1;
      
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, nome, cargo, data_nascimento, filial:filiais(nome)')
        .eq('ativo', true)
        .not('data_nascimento', 'is', null)
        .order('data_nascimento');

      if (error) throw error;

      // Filtrar aniversariantes do mês atual
      const aniversariantesDoMes = (data || []).filter((func) => {
        if (!func.data_nascimento) return false;
        const dataNasc = parseISO(func.data_nascimento);
        return getMonth(dataNasc) + 1 === mesAtual;
      }).sort((a, b) => {
        const diaA = getDate(parseISO(a.data_nascimento!));
        const diaB = getDate(parseISO(b.data_nascimento!));
        return diaA - diaB;
      });

      setAniversariantes(aniversariantesDoMes);
    } catch (error) {
      console.error('Erro ao carregar aniversariantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAniversarioHoje = (dataNascimento: string) => {
    const data = parseISO(dataNascimento);
    const hoje = new Date();
    return getDate(data) === getDate(hoje) && getMonth(data) === getMonth(hoje);
  };

  const mesAtual = format(new Date(), 'MMMM', { locale: ptBR });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-pink-500" />
          Aniversariantes de {mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : aniversariantes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum aniversariante este mês</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {aniversariantes.map((func) => {
              const ehHoje = func.data_nascimento && isAniversarioHoje(func.data_nascimento);
              return (
                <div
                  key={func.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    ehHoje ? 'bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {ehHoje && <Cake className="h-5 w-5 text-pink-500 animate-bounce" />}
                    <div>
                      <p className="font-medium">{func.nome}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{func.cargo || 'Sem cargo'}</span>
                        {func.filial && (
                          <>
                            <span>•</span>
                            <span>{func.filial.nome}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={ehHoje ? 'default' : 'secondary'} className={ehHoje ? 'bg-pink-500' : ''}>
                      {func.data_nascimento &&
                        format(parseISO(func.data_nascimento), "dd 'de' MMMM", { locale: ptBR })}
                    </Badge>
                    {ehHoje && (
                      <p className="text-xs text-pink-600 font-medium mt-1">🎉 Hoje!</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
