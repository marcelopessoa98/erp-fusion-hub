import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GranulometriaTab } from '@/components/dosagem/GranulometriaTab';
import { MassaEspecificaTab } from '@/components/dosagem/MassaEspecificaTab';
import { MassaUnitariaTab } from '@/components/dosagem/MassaUnitariaTab';
import { DosagemTab } from '@/components/dosagem/DosagemTab';
import { ConfiguracoesModal } from '@/components/dosagem/ConfiguracoesModal';
import { useEnsaios } from '@/hooks/useEnsaios';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Settings, FileDown, Save } from 'lucide-react';
import { gerarLaudoDosagemPDF } from '@/lib/dosagemPdfExport';
import { useToast } from '@/hooks/use-toast';

export default function EnsaioTracos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { ensaios, updateEnsaio } = useEnsaios();
  const [configOpen, setConfigOpen] = useState(false);
  const [status, setStatus] = useState('pendente');
  const [responsavelTecnico, setResponsavelTecnico] = useState('');

  const ensaio = ensaios.find(e => e.id === id);

  useEffect(() => {
    if (ensaio) {
      setStatus(ensaio.status);
    }
  }, [ensaio]);

  const { data: equipeTecnica = [] } = useQuery({
    queryKey: ['equipe-tecnica'],
    queryFn: async () => {
      const { data } = await supabase.from('equipe_tecnica').select('*').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setStatus(newStatus);
    await updateEnsaio({ id, status: newStatus });
  };

  const handleGerarLaudo = async () => {
    if (!ensaio) return;
    const tecnico = equipeTecnica.find(t => t.id === responsavelTecnico);
    if (!tecnico) {
      toast({ title: 'Selecione o responsável técnico para gerar o laudo', variant: 'destructive' });
      return;
    }

    try {
      await gerarLaudoDosagemPDF({
        cliente: ensaio.clientes?.nome || '',
        obra: ensaio.obras?.nome || '',
        dataEnsaio: ensaio.data_ensaio,
        responsavel: {
          nome: tecnico.nome,
          cargo: tecnico.cargo || 'Engenheiro(a) Responsável',
          crea: tecnico.numero_crea || '',
          carimboUrl: tecnico.carimbo_url || null,
        },
        // These will be populated from the DosagemTab state
        // For now use campos_especificos from the ensaio
        fck: (ensaio.campos_especificos as any)?.fck || 30,
        slump: (ensaio.campos_especificos as any)?.slump || '100±20',
        relacaoAC: (ensaio.campos_especificos as any)?.relacao_ac || 0.55,
        tracoUnitario: (ensaio.campos_especificos as any)?.traco_unitario || '1: 1,39: 2,22: 0,55',
        teorArgamassa: (ensaio.campos_especificos as any)?.teor_argamassa || 51.8,
        materiais: (ensaio.campos_especificos as any)?.materiais || [
          { nome: 'Cimento', massa: 440, tipo: 'cimento', descricaoCimento: 'MIZU CP III 32 RS' },
          { nome: 'Areia 2,36 mm', massa: 613, tipo: 'areia' },
          { nome: 'Brita 19 mm', massa: 980, tipo: 'brita' },
        ],
        agua: (ensaio.campos_especificos as any)?.agua || 242,
        volumePadiolas: (ensaio.campos_especificos as any)?.volume_padiolas || [],
      });
      toast({ title: 'Laudo de dosagem gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar laudo', description: error.message, variant: 'destructive' });
    }
  };

  if (!ensaio) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/ensaios')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          Ensaio não encontrado ou carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ensaios')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Traços — Dosagem e Granulometria</h1>
            <p className="text-sm text-muted-foreground">
              {ensaio.clientes?.nome} • {ensaio.obras?.nome}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />Configurações
          </Button>
        </div>
      </div>

      {/* Responsável Técnico + Gerar Laudo */}
      <div className="flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-muted/30">
        <div className="flex-1 min-w-[250px]">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsável Técnico (para laudo)</label>
          <Select value={responsavelTecnico} onValueChange={setResponsavelTecnico}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione o engenheiro(a)" />
            </SelectTrigger>
            <SelectContent>
              {equipeTecnica.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome} {t.numero_crea ? `(CREA ${t.numero_crea})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleGerarLaudo} disabled={!responsavelTecnico}>
          <FileDown className="h-4 w-4 mr-2" />Gerar Laudo de Dosagem
        </Button>
      </div>

      <Tabs defaultValue="granulometria">
        <TabsList>
          <TabsTrigger value="granulometria">Granulometria</TabsTrigger>
          <TabsTrigger value="massa_especifica">Massa Específica</TabsTrigger>
          <TabsTrigger value="massa_unitaria">Massa Unitária</TabsTrigger>
          <TabsTrigger value="dosagem">Dosagem (1m³)</TabsTrigger>
        </TabsList>

        <TabsContent value="granulometria" className="mt-4">
          <GranulometriaTab
            ensaioId={ensaio.id}
            initialData={(ensaio.campos_especificos as any)?.granulometria}
          />
        </TabsContent>

        <TabsContent value="massa_especifica" className="mt-4">
          <MassaEspecificaTab
            ensaioId={ensaio.id}
            initialData={(ensaio.campos_especificos as any)?.massaEspecifica}
          />
        </TabsContent>

        <TabsContent value="massa_unitaria" className="mt-4">
          <MassaUnitariaTab
            ensaioId={ensaio.id}
            initialData={(ensaio.campos_especificos as any)?.massaUnitaria}
          />
        </TabsContent>

        <TabsContent value="dosagem" className="mt-4">
          <DosagemTab
            ensaioId={ensaio.id}
            initialData={(ensaio.campos_especificos as any)?.dosagem}
          />
        </TabsContent>
      </Tabs>

      <ConfiguracoesModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
