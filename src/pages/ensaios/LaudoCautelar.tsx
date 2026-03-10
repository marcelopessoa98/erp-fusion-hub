import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useLaudosCautelares, type LaudoCautelar as LaudoType, type LaudoFoto } from '@/hooks/useLaudosCautelares';
import { gerarLaudoCautelarPDF } from '@/components/laudos/LaudoCautelarPDF';
import { Plus, FileText, Trash2, Upload, Image as ImageIcon, Download, Eye, ArrowLeft, ArrowRight, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import laudoLogo from '@/assets/laudo-logo.png';
import laudoLateral from '@/assets/laudo-lateral.jpg';
import laudoRodape from '@/assets/laudo-rodape.png';

// ─── Options for multi-select fields ───
const TIPOS_IMOVEL = ['Imóvel residencial', 'Imóvel comercial', 'Imóvel industrial', 'Terreno', 'Galpão', 'Outro'];
const TIPOS_OCUPACAO = ['Residencial', 'Comercial', 'Industrial', 'Misto', 'Institucional'];
const PADROES_CONSTRUTIVOS = ['Baixo padrão', 'Médio padrão', 'Alto padrão'];

const ESTRUTURAS = ['Concreto armado', 'Alvenaria estrutural', 'Estrutura metálica', 'Madeira'];
const VEDACOES = ['Alvenaria em tijolos cerâmicos furados', 'Alvenaria em blocos de concreto', 'Alvenaria em tijolos maciços', 'Drywall'];
const ACABAMENTOS_PISO = ['Revestimento cerâmico', 'Porcelanato', 'Cimento queimado', 'Piso vinílico', 'Madeira', 'Sem revestimento'];
const ACABAMENTOS_PAREDE = ['Revestimento argamassa e pintura', 'Revestimento cerâmico', 'Textura', 'Sem revestimento', 'Massa corrida e pintura'];
const COBERTURAS = ['Telhas cerâmicas', 'Telhas de fibrocimento', 'Telhas metálicas', 'Laje impermeabilizada', 'Madeira', 'Revestimento gesso'];

const STEPS = ['Obra & Cliente', 'Imóvel Vistoriado', 'Características', 'Imagens', 'Equipe & Finalização'];

const AVALIACAO_PADRAO = `Diante do exposto neste laudo cautelar de vizinhança, conclui-se que foram realizadas todas as vistorias e análises necessárias para identificar possíveis danos e anomalias no imóvel. As informações e resultados obtidos foram descritos de forma clara e objetiva.

Assim, a contratada atesta que realizou todas as atividades previstas neste contrato, e que o proprietário do imóvel vistoriado teve a oportunidade de acompanhar e esclarecer quaisquer dúvidas sobre as informações obtidas.

Por fim, os responsáveis da contratada, contratante e o proprietário do imóvel vistoriado assinam este laudo cautelar de vizinhança, atestando a sua concordância e aceitação das informações apresentadas.`;

const OBJETIVO_PADRAO = 'Este laudo cautelar de vizinhança tem como objetivo constatar as condições das propriedades adjacentes à obra em construção e já identificar possíveis danos existentes nestas. Essa avaliação é essencial para verificar a integridade das edificações em questão. O resultado é decorrente de uma vistoria técnica realizada por um profissional habilitado e experiente, que avalia minuciosamente as propriedades vizinhas à obra em construção.';

const METODOLOGIA_PADRAO = 'O presente documento é baseado na ABNT (Associação Brasileira de Normas Técnicas) e IBAPE (Instituto Brasileiro de Avaliação e Perícias de Engenharia), seguindo todas as aplicações práticas de vistoria cautelar de vizinhança, metodologia e parâmetros, de forma que atendam os pré-requisitos mínimos estabelecidos para o perfeito funcionamento de todo o sistema existente.';

function imageToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function toggleMulti(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

// ─── Multi-checkbox group component ───
function MultiCheckGroup({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (val: string) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map(opt => (
          <label key={opt} className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 cursor-pointer text-sm transition-colors">
            <Checkbox checked={selected.includes(opt)} onCheckedChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function LaudoCautelar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    laudos, isLoading, createLaudo, updateLaudo, deleteLaudo,
    isCreating, isUpdating, uploadFoto, uploadImagemLaudo, deleteFoto,
  } = useLaudosCautelares();

  // View mode: 'list' | 'new' | 'detail'
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedLaudo, setSelectedLaudo] = useState<LaudoType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Step wizard state
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Partial<LaudoType>>({});

  // Multi-select characteristics
  const [selEstrutura, setSelEstrutura] = useState<string[]>(['Concreto armado']);
  const [selVedacao, setSelVedacao] = useState<string[]>(['Alvenaria em tijolos cerâmicos furados']);
  const [selPiso, setSelPiso] = useState<string[]>(['Revestimento cerâmico']);
  const [selParedes, setSelParedes] = useState<string[]>(['Revestimento argamassa e pintura']);
  const [selCobertura, setSelCobertura] = useState<string[]>(['Telhas cerâmicas', 'Revestimento gesso']);

  // Image state for wizard
  const [figLoc, setFigLoc] = useState<File | null>(null);
  const [figLocPreview, setFigLocPreview] = useState('');
  const [figFlux, setFigFlux] = useState<File | null>(null);
  const [figFluxPreview, setFigFluxPreview] = useState('');
  const [wizardFotos, setWizardFotos] = useState<{ id: string; file: File; preview: string; numero: number }[]>([]);

  // Equipe selection
  const [equipeIds, setEquipeIds] = useState<string[]>([]);

  // Load reference data
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nome, documento').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: async () => {
      const { data } = await supabase.from('obras').select('id, nome, endereco, referencia, cliente_id, filial_id').order('nome');
      return data || [];
    },
  });

  const { data: filiais = [] } = useQuery({
    queryKey: ['filiais'],
    queryFn: async () => {
      const { data } = await supabase.from('filiais').select('id, nome').eq('ativa', true).order('nome');
      return data || [];
    },
  });

  const { data: equipe = [] } = useQuery({
    queryKey: ['equipe_tecnica'],
    queryFn: async () => {
      const { data } = await supabase.from('equipe_tecnica').select('id, nome, cargo, formacao, numero_crea').eq('ativo', true).order('nome');
      return data || [];
    },
  });

  // Fotos for selected laudo (detail view)
  const { data: fotos = [] } = useQuery({
    queryKey: ['laudo_fotos', selectedLaudo?.id],
    queryFn: async () => {
      if (!selectedLaudo?.id) return [];
      const { data } = await supabase
        .from('laudo_cautelar_fotos')
        .select('*')
        .eq('laudo_id', selectedLaudo.id)
        .order('numero');
      return (data || []) as unknown as LaudoFoto[];
    },
    enabled: !!selectedLaudo?.id,
  });

  const filteredObras = formData.cliente_id ? obras.filter(o => o.cliente_id === formData.cliente_id) : obras;
  const selectedObra = obras.find(o => o.id === formData.obra_id);
  const selectedCliente = clientes.find(c => c.id === formData.cliente_id);

  // ─── Actions ───

  const openNew = () => {
    setEditingId(null);
    setStep(0);
    setFormData({
      tipo_imovel: 'Imóvel residencial',
      tipo_ocupacao: 'Residencial',
      padrao_construtivo: 'Baixo padrão',
      qtd_pavimentos: 1,
      cidade: 'Fortaleza-CE',
      objetivo: 'Identificar danos já existentes.',
      texto_objetivo: OBJETIVO_PADRAO,
      texto_metodologia: METODOLOGIA_PADRAO,
      texto_avaliacao_final: AVALIACAO_PADRAO,
      caracteristicas_edificacao: 'Constituído por unidades autônomas distribuídas em blocos.',
    });
    setSelEstrutura(['Concreto armado']);
    setSelVedacao(['Alvenaria em tijolos cerâmicos furados']);
    setSelPiso(['Revestimento cerâmico']);
    setSelParedes(['Revestimento argamassa e pintura']);
    setSelCobertura(['Telhas cerâmicas', 'Revestimento gesso']);
    setEquipeIds([]);
    setFigLoc(null); setFigLocPreview('');
    setFigFlux(null); setFigFluxPreview('');
    setWizardFotos([]);
    setView('new');
  };

  const openDetail = (laudo: LaudoType) => {
    setSelectedLaudo(laudo);
    setView('detail');
  };

  const handleClienteSelect = (id: string) => {
    setFormData(p => ({ ...p, cliente_id: id, obra_id: undefined as any }));
  };

  const handleObraSelect = (id: string) => {
    const obra = obras.find(o => o.id === id);
    setFormData(p => ({
      ...p,
      obra_id: id,
      cliente_id: obra?.cliente_id || p.cliente_id,
      filial_id: obra?.filial_id || p.filial_id,
    }));
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'loc' | 'flux') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'loc') {
        setFigLoc(file);
        setFigLocPreview(reader.result as string);
      } else {
        setFigFlux(file);
        setFigFluxPreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFotosUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setWizardFotos(prev => {
          const match = file.name.match(/(\d+)/);
          const num = match ? parseInt(match[1]) : prev.length + 1;
          return [...prev, { id: crypto.randomUUID(), file, preview: reader.result as string, numero: num }]
            .sort((a, b) => a.numero - b.numero);
        });
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeFoto = (id: string) => {
    setWizardFotos(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async (status: 'rascunho' | 'finalizado') => {
    if (!formData.filial_id || !formData.cliente_id || !formData.obra_id) {
      toast({ title: 'Selecione filial, cliente e obra', variant: 'destructive' });
      return;
    }
    if (status === 'finalizado' && !formData.endereco_vistoriado) {
      toast({ title: 'Endereço do imóvel vistoriado é obrigatório', variant: 'destructive' });
      return;
    }

    try {
      const payload: Partial<LaudoType> = {
        ...formData,
        estruturas: selEstrutura.join(', '),
        vedacao: selVedacao.join(', '),
        acabamento_piso: selPiso.join(', '),
        acabamento_paredes: selParedes.join(', '),
        cobertura: selCobertura.join(', '),
        status,
      };

      let laudoResult: LaudoType;
      if (editingId) {
        laudoResult = await updateLaudo({ id: editingId, ...payload });
      } else {
        laudoResult = await createLaudo(payload);
      }

      // Upload images if provided
      if (figLoc) {
        await uploadImagemLaudo(laudoResult.id, 'google_maps', figLoc);
      }
      if (figFlux) {
        await uploadImagemLaudo(laudoResult.id, 'fluxograma', figFlux);
      }

      // Upload memorial photos
      for (const foto of wizardFotos) {
        await uploadFoto(laudoResult.id, foto.numero, foto.file);
      }

      toast({ title: status === 'finalizado' ? 'Laudo criado com sucesso!' : 'Rascunho salvo!' });
      setSelectedLaudo(laudoResult);
      setView('detail');
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  const handleExportPDF = async (laudo: LaudoType, laudoFotos: LaudoFoto[]) => {
    try {
      const [logoB64, lateralB64, rodapeB64] = await Promise.all([
        imageToBase64(laudoLogo),
        imageToBase64(laudoLateral),
        imageToBase64(laudoRodape),
      ]);
      await gerarLaudoCautelarPDF({
        laudo,
        fotos: laudoFotos,
        equipe: equipe as any,
        logoBase64: logoB64,
        lateralBase64: lateralB64,
        rodapeBase64: rodapeB64,
      });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este laudo?')) return;
    await deleteLaudo(id);
    if (selectedLaudo?.id === id) setSelectedLaudo(null);
    setView('list');
  };

  // Upload fotos in detail view
  const handleUploadFotosDetail = async (files: FileList) => {
    if (!selectedLaudo) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const match = file.name.match(/(\d+)/);
      const numero = match ? parseInt(match[1]) : i + 1;
      try {
        await uploadFoto(selectedLaudo.id, numero, file);
      } catch (e: any) {
        toast({ title: `Erro ao enviar ${file.name}`, description: e.message, variant: 'destructive' });
      }
    }
    toast({ title: `${files.length} foto(s) enviada(s)!` });
  };

  const handleUploadImagem = async (tipo: 'google_maps' | 'fluxograma', file: File) => {
    if (!selectedLaudo) return;
    try {
      await uploadImagemLaudo(selectedLaudo.id, tipo, file);
      toast({ title: `Imagem ${tipo === 'google_maps' ? 'Google Maps' : 'Fluxograma'} enviada!` });
    } catch (e: any) {
      toast({ title: 'Erro ao enviar imagem', description: e.message, variant: 'destructive' });
    }
  };

  // ═══════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Laudos Cautelares</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de laudos de vizinhança</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Novo Laudo</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left text-sm font-medium p-3">Cliente</th>
                  <th className="text-left text-sm font-medium p-3">Obra</th>
                  <th className="text-left text-sm font-medium p-3">Endereço</th>
                  <th className="text-left text-sm font-medium p-3">Status</th>
                  <th className="text-left text-sm font-medium p-3">Data</th>
                  <th className="text-right text-sm font-medium p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
                )}
                {!isLoading && laudos.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum laudo cadastrado</td></tr>
                )}
                {laudos.map(l => (
                  <tr key={l.id} className="border-b hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => openDetail(l)}>
                    <td className="p-3 text-sm font-medium">{l.clientes?.nome || '—'}</td>
                    <td className="p-3 text-sm">{l.obras?.nome || '—'}</td>
                    <td className="p-3 text-sm text-muted-foreground truncate max-w-[200px]">{l.endereco_vistoriado}</td>
                    <td className="p-3">
                      <Badge variant={l.status === 'finalizado' ? 'default' : 'secondary'} className="text-xs">
                        {l.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {format(new Date(l.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => openDetail(l)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(l.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // NEW LAUDO - STEP WIZARD
  // ═══════════════════════════════════════
  if (view === 'new') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Novo Laudo Cautelar</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados do laudo passo a passo</p>
          </div>
          <Button variant="outline" onClick={() => setView('list')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                i === step ? 'bg-primary text-primary-foreground' :
                i < step ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>

        {/* Step 0: Obra & Cliente */}
        {step === 0 && (
          <Card>
            <CardHeader><CardTitle>Seleção de Obra e Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Filial *</Label>
                <Select value={formData.filial_id || ''} onValueChange={v => setFormData(p => ({ ...p, filial_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a filial" /></SelectTrigger>
                  <SelectContent>
                    {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente *</Label>
                <Select value={formData.cliente_id || ''} onValueChange={handleClienteSelect}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} {c.documento ? `— ${c.documento}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Obra *</Label>
                <Select value={formData.obra_id || ''} onValueChange={handleObraSelect}>
                  <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                  <SelectContent>
                    {filteredObras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome} — {o.endereco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {selectedObra && selectedCliente && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">Dados herdados automaticamente:</p>
                  <p className="text-sm text-muted-foreground">Contratante: {selectedCliente.nome}</p>
                  {selectedCliente.documento && <p className="text-sm text-muted-foreground">CNPJ/CPF: {selectedCliente.documento}</p>}
                  <p className="text-sm text-muted-foreground">Obra: {selectedObra.nome}</p>
                  <p className="text-sm text-muted-foreground">Endereço da Obra: {selectedObra.endereco}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 1: Imóvel Vistoriado */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Identificação do Imóvel Vistoriado</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Endereço do Imóvel Vistoriado *</Label>
                <Input value={formData.endereco_vistoriado || ''} onChange={e => setFormData(p => ({ ...p, endereco_vistoriado: e.target.value }))} placeholder="Ex: Rua Júlio Pinto, 2080" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Imóvel</Label>
                  <Select value={formData.tipo_imovel || 'Imóvel residencial'} onValueChange={v => setFormData(p => ({ ...p, tipo_imovel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_IMOVEL.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Ocupação</Label>
                  <Select value={formData.tipo_ocupacao || 'Residencial'} onValueChange={v => setFormData(p => ({ ...p, tipo_ocupacao: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIPOS_OCUPACAO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Objetivo</Label>
                <Input value={formData.objetivo || ''} onChange={e => setFormData(p => ({ ...p, objetivo: e.target.value }))} />
              </div>
              <div>
                <Label>Vias de Acesso</Label>
                <Input value={formData.vias_acesso || ''} onChange={e => setFormData(p => ({ ...p, vias_acesso: e.target.value }))} placeholder="Ex: Av. José Jatahy, Av. Duque de Caxias" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Bairro</Label>
                  <Input value={formData.bairro || ''} onChange={e => setFormData(p => ({ ...p, bairro: e.target.value }))} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={formData.cidade || ''} onChange={e => setFormData(p => ({ ...p, cidade: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Características da Edificação</Label>
                <Textarea value={formData.caracteristicas_edificacao || ''} onChange={e => setFormData(p => ({ ...p, caracteristicas_edificacao: e.target.value }))} rows={2} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Características */}
        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Características do Imóvel Vistoriado</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Padrão Construtivo</Label>
                  <Select value={formData.padrao_construtivo || 'Baixo padrão'} onValueChange={v => setFormData(p => ({ ...p, padrao_construtivo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PADROES_CONSTRUTIVOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pavimentos</Label>
                  <Input type="number" min={1} value={formData.qtd_pavimentos || 1} onChange={e => setFormData(p => ({ ...p, qtd_pavimentos: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
              <MultiCheckGroup label="Estrutura" options={ESTRUTURAS} selected={selEstrutura} onChange={v => setSelEstrutura(prev => toggleMulti(prev, v))} />
              <MultiCheckGroup label="Vedação" options={VEDACOES} selected={selVedacao} onChange={v => setSelVedacao(prev => toggleMulti(prev, v))} />
              <MultiCheckGroup label="Acabamento de Piso" options={ACABAMENTOS_PISO} selected={selPiso} onChange={v => setSelPiso(prev => toggleMulti(prev, v))} />
              <MultiCheckGroup label="Acabamento de Paredes" options={ACABAMENTOS_PAREDE} selected={selParedes} onChange={v => setSelParedes(prev => toggleMulti(prev, v))} />
              <MultiCheckGroup label="Cobertura" options={COBERTURAS} selected={selCobertura} onChange={v => setSelCobertura(prev => toggleMulti(prev, v))} />
            </CardContent>
          </Card>
        )}

        {/* Step 3: Imagens */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Figura 1 — Localização (Google Maps)</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Tamanho fixo no PDF: 10,5 cm × 16,47 cm — Legenda automática</p>
                {figLocPreview ? (
                  <div className="relative inline-block">
                    <img src={figLocPreview} alt="Localização" className="max-w-sm rounded-md border" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setFigLoc(null); setFigLocPreview(''); }}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload size={24} className="text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Upload da imagem de localização</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'loc')} />
                  </label>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Figura 2 — Fluxograma de Vistoria</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Tamanho fixo no PDF: 5,37 cm × 13,44 cm</p>
                {figFluxPreview ? (
                  <div className="relative inline-block">
                    <img src={figFluxPreview} alt="Fluxograma" className="max-w-sm rounded-md border" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setFigFlux(null); setFigFluxPreview(''); }}>
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload size={24} className="text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Upload do fluxograma (ou usar padrão)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'flux')} />
                  </label>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Memorial Fotográfico</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {wizardFotos.length} foto(s) adicionada(s). Upload múltiplo — ordenação automática pelo nome do arquivo (1.jpg, 2.jpg, etc.)
                </p>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mb-4">
                  <ImageIcon size={24} className="text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique para adicionar fotos</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFotosUpload} />
                </label>
                {wizardFotos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {wizardFotos.map(f => (
                      <div key={f.id} className="relative group">
                        <img src={f.preview} alt={`Foto ${f.numero}`} className="w-full h-32 object-cover rounded-md border" />
                        <span className="absolute bottom-1 left-1 bg-foreground/80 text-background text-xs px-2 py-0.5 rounded font-mono">
                          {f.numero}
                        </span>
                        <Button
                          variant="destructive" size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFoto(f.id)}
                        ><X size={12} /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Equipe & Finalização */}
        {step === 4 && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Equipe Técnica</CardTitle></CardHeader>
              <CardContent>
                {equipe.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Cadastre membros na seção Equipe Técnica primeiro.</p>
                ) : (
                  <div className="space-y-3">
                    {equipe.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={equipeIds.includes(m.id)}
                          onCheckedChange={() => setEquipeIds(prev =>
                            prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium">{m.nome}</p>
                          <p className="text-xs text-muted-foreground">{m.cargo} — {m.formacao} — CREA: {m.numero_crea}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Responsável Técnico</CardTitle></CardHeader>
              <CardContent>
                <Select value={formData.responsavel_id || ''} onValueChange={v => setFormData(p => ({ ...p, responsavel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                  <SelectContent>
                    {equipe.map(e => <SelectItem key={e.id} value={e.id}>{e.nome} - CREA {e.numero_crea}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Textos do Laudo (editáveis)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Texto do Objetivo</Label>
                  <Textarea value={formData.texto_objetivo || ''} onChange={e => setFormData(p => ({ ...p, texto_objetivo: e.target.value }))} rows={4} className="text-sm" />
                </div>
                <div>
                  <Label>Nota Prévia (deixe vazio para gerar automaticamente)</Label>
                  <Textarea value={formData.texto_nota_previa || ''} onChange={e => setFormData(p => ({ ...p, texto_nota_previa: e.target.value }))} rows={2} className="text-sm" />
                </div>
                <div>
                  <Label>Metodologia</Label>
                  <Textarea value={formData.texto_metodologia || ''} onChange={e => setFormData(p => ({ ...p, texto_metodologia: e.target.value }))} rows={4} className="text-sm" />
                </div>
                <div>
                  <Label>Avaliação Final</Label>
                  <Textarea value={formData.texto_avaliacao_final || ''} onChange={e => setFormData(p => ({ ...p, texto_avaliacao_final: e.target.value }))} rows={6} className="text-sm" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)} className="gap-2">
            <ArrowLeft size={16} /> Anterior
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleSave('rascunho')} disabled={isCreating || isUpdating} className="gap-2">
              <Save size={16} /> {isCreating || isUpdating ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} className="gap-2">
                Próximo <ArrowRight size={16} />
              </Button>
            ) : (
              <Button onClick={() => handleSave('finalizado')} disabled={isCreating || isUpdating} className="gap-2">
                <Save size={16} /> {isCreating || isUpdating ? 'Salvando...' : 'Finalizar Laudo'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════
  if (view === 'detail' && selectedLaudo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Laudo — {selectedLaudo.obras?.nome || 'Obra'}</h1>
            <p className="text-sm text-muted-foreground">Cliente: {selectedLaudo.clientes?.nome || '—'}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView('list')} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button onClick={() => handleExportPDF(selectedLaudo, fotos)} className="gap-2">
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(selectedLaudo.id)} className="gap-2">
              <Trash2 className="h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Identificação do Imóvel Vistoriado</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Endereço:</strong> {selectedLaudo.endereco_vistoriado}</p>
              <p><strong>Tipo:</strong> {selectedLaudo.tipo_imovel}</p>
              <p><strong>Objetivo:</strong> {selectedLaudo.objetivo}</p>
              <p><strong>Ocupação:</strong> {selectedLaudo.tipo_ocupacao}</p>
              <p><strong>Vias de acesso:</strong> {selectedLaudo.vias_acesso}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Identificação do Imóvel a Ser Construído</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong>Proprietário:</strong> {selectedLaudo.clientes?.nome}</p>
              <p><strong>Documento:</strong> {selectedLaudo.clientes?.documento || '—'}</p>
              <p><strong>Endereço da Obra:</strong> {selectedLaudo.obras?.endereco}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Características do Imóvel</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <p><strong>Padrão:</strong> {selectedLaudo.padrao_construtivo}</p>
              <p><strong>Pavimentos:</strong> {selectedLaudo.qtd_pavimentos}</p>
              <p><strong>Estrutura:</strong> {selectedLaudo.estruturas || '—'}</p>
              <p><strong>Vedação:</strong> {selectedLaudo.vedacao || '—'}</p>
              <p><strong>Piso:</strong> {selectedLaudo.acabamento_piso || '—'}</p>
              <p><strong>Paredes:</strong> {selectedLaudo.acabamento_paredes || '—'}</p>
              <p><strong>Cobertura:</strong> {selectedLaudo.cobertura || '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Images Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(selectedLaudo.imagem_google_maps || selectedLaudo.imagem_fluxograma) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Figuras</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {selectedLaudo.imagem_google_maps && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Figura 1 – Localização do imóvel vistoriado</p>
                    <img src={selectedLaudo.imagem_google_maps} alt="Localização" className="max-w-full rounded-md border" />
                    <p className="text-xs text-muted-foreground mt-1">Fonte: Adaptada do Google Maps</p>
                  </div>
                )}
                {selectedLaudo.imagem_fluxograma && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Figura 2 – Fluxograma</p>
                    <img src={selectedLaudo.imagem_fluxograma} alt="Fluxograma" className="max-w-sm rounded-md border" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Upload de Imagens</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Imagem Google Maps (10,5cm × 16,47cm)</Label>
                <label className="mt-1 flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted/50 cursor-pointer w-fit">
                  <Upload className="h-4 w-4" />Enviar
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadImagem('google_maps', e.target.files[0])} />
                </label>
              </div>
              <div>
                <Label className="text-sm font-medium">Fluxograma (5,37cm × 13,44cm)</Label>
                <label className="mt-1 flex items-center gap-2 px-3 py-2 border rounded-md text-sm hover:bg-muted/50 cursor-pointer w-fit">
                  <Upload className="h-4 w-4" />Enviar
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleUploadImagem('fluxograma', e.target.files[0])} />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Memorial Fotográfico */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Memorial Fotográfico ({fotos.length} fotos)</CardTitle>
              <label className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 cursor-pointer">
                <Upload className="h-4 w-4" />Enviar Fotos (nomeie 1.jpg, 2.jpg...)
                <input type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && handleUploadFotosDetail(e.target.files)} />
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {fotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {fotos.map(f => (
                  <div key={f.id} className="relative group">
                    <img src={f.foto_url} alt={`Imagem ${f.numero}`} className="w-full h-32 object-cover rounded-md border" />
                    <span className="absolute bottom-1 left-1 bg-foreground/80 text-background text-xs px-2 py-0.5 rounded font-mono">{f.numero}</span>
                    <button
                      onClick={() => deleteFoto(f.id, selectedLaudo.id)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma foto enviada ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Equipe Técnica */}
        {selectedLaudo.equipe_tecnica && (
          <Card>
            <CardHeader><CardTitle className="text-base">Equipe Técnica</CardTitle></CardHeader>
            <CardContent>
              <div className="p-3 rounded-md bg-muted/50 text-sm">
                <p className="font-medium">{selectedLaudo.equipe_tecnica.nome}</p>
                <p className="text-muted-foreground">{selectedLaudo.equipe_tecnica.cargo} — {selectedLaudo.equipe_tecnica.formacao} — CREA: {selectedLaudo.equipe_tecnica.numero_crea}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Avaliação Final */}
        <Card>
          <CardHeader><CardTitle className="text-base">Avaliação Final</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{selectedLaudo.texto_avaliacao_final}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
