import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useLaudosCautelares, type LaudoCautelar as LaudoType, type LaudoFoto } from '@/hooks/useLaudosCautelares';
import { gerarLaudoCautelarPDF } from '@/components/laudos/LaudoCautelarPDF';
import { Plus, FileText, Trash2, Upload, Image, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import laudoLogo from '@/assets/laudo-logo.png';
import laudoLateral from '@/assets/laudo-lateral.jpg';
import laudoRodape from '@/assets/laudo-rodape.png';

const TIPOS_IMOVEL = ['Imóvel residencial', 'Imóvel comercial', 'Imóvel industrial', 'Terreno', 'Galpão', 'Outro'];
const TIPOS_OCUPACAO = ['Residencial', 'Comercial', 'Industrial', 'Misto', 'Institucional'];
const PADROES_CONSTRUTIVOS = ['Baixo padrão', 'Médio padrão', 'Alto padrão'];

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

export default function LaudoCautelar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    laudos, isLoading, createLaudo, updateLaudo, deleteLaudo,
    isCreating, isUpdating, uploadFoto, uploadImagemLaudo, deleteFoto,
  } = useLaudosCautelares();

  const [selectedLaudo, setSelectedLaudo] = useState<LaudoType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<LaudoType>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load clientes, obras, filiais, equipe
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

  // Fotos for selected laudo
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

  const openNew = () => {
    setEditingId(null);
    setFormData({
      tipo_imovel: 'Imóvel residencial',
      tipo_ocupacao: 'Residencial',
      padrao_construtivo: 'Baixo padrão',
      qtd_pavimentos: 1,
      cidade: 'Fortaleza-CE',
      objetivo: 'Identificar danos já existentes.',
      caracteristicas_edificacao: 'Constituído por unidades autônomas distribuídas em blocos.',
      estruturas: 'Concreto armado e alvenaria',
      vedacao: 'Alvenaria em tijolos cerâmicos furados',
      acabamento_piso: 'Cômodos em sua maioria com revestimento cerâmico',
      acabamento_paredes: 'Revestimento argamassa e pintura',
      cobertura: 'madeira, telhas cerâmicas e revestimento gesso',
      texto_objetivo: 'Este laudo cautelar de vizinhança tem como objetivo constatar as condições das propriedades adjacentes à obra em construção e já identificar possíveis danos existentes nestas. Essa avaliação é essencial para verificar a integridade das edificações em questão. O resultado é decorrente de uma vistoria técnica realizada por um profissional habilitado e experiente, que avalia minuciosamente as propriedades vizinhas à obra em construção.',
      texto_metodologia: 'O presente documento é baseado na ABNT (Associação Brasileira de Normas Técnicas) e IBAPE (Instituto Brasileiro de Avaliação e Perícias de Engenharia), seguindo todas as aplicações práticas de vistoria cautelar de vizinhança, metodologia e parâmetros, de forma que atendam os pré-requisitos mínimos estabelecidos para o perfeito funcionamento de todo o sistema existente.',
      texto_avaliacao_final: 'Diante do exposto neste laudo cautelar de vizinhança, conclui-se que foram realizadas todas as vistorias e análises necessárias para identificar possíveis danos e anomalias no imóvel. As informações e resultados obtidos foram descritos de forma clara e objetiva.\n\nAssim, a contratada atesta que realizou todas as atividades previstas neste contrato, e que o proprietário do imóvel vistoriado teve a oportunidade de acompanhar e esclarecer quaisquer dúvidas sobre as informações obtidas.\n\nPor fim, os responsáveis da contratada, contratante e o proprietário do imóvel vistoriado assinam este laudo cautelar de vizinhança, atestando a sua concordância e aceitação das informações apresentadas.',
    });
    setShowForm(true);
  };

  const openEdit = (laudo: LaudoType) => {
    setEditingId(laudo.id);
    setFormData({ ...laudo });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.filial_id || !formData.cliente_id || !formData.obra_id) {
      toast({ title: 'Preencha filial, cliente e obra', variant: 'destructive' });
      return;
    }
    try {
      if (editingId) {
        const result = await updateLaudo({ id: editingId, ...formData });
        setSelectedLaudo(result);
      } else {
        const result = await createLaudo(formData);
        setSelectedLaudo(result);
      }
      setShowForm(false);
    } catch {}
  };

  const handleUploadFotos = async (files: FileList) => {
    if (!selectedLaudo) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Extract number from filename (e.g., "1.jpg" → 1, "foto_3.png" → 3)
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

  const handleExportPDF = async () => {
    if (!selectedLaudo) return;
    try {
      const [logoB64, lateralB64, rodapeB64] = await Promise.all([
        imageToBase64(laudoLogo),
        imageToBase64(laudoLateral),
        imageToBase64(laudoRodape),
      ]);
      await gerarLaudoCautelarPDF({
        laudo: selectedLaudo,
        fotos,
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
  };

  const selectedObra = obras.find(o => o.id === (formData.obra_id || selectedLaudo?.obra_id));
  const filteredObras = formData.cliente_id ? obras.filter(o => o.cliente_id === formData.cliente_id) : obras;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laudo Cautelar de Vizinhança</h1>
          <p className="text-sm text-muted-foreground">Gestão de laudos cautelares com exportação PDF</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Laudo</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LIST */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Laudos ({laudos.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {laudos.map(l => (
              <div
                key={l.id}
                onClick={() => setSelectedLaudo(l)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent ${selectedLaudo?.id === l.id ? 'bg-accent border-primary' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm truncate">{l.clientes?.nome || 'Sem cliente'}</p>
                  <Badge variant={l.status === 'finalizado' ? 'default' : 'secondary'} className="text-xs">
                    {l.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{l.endereco_vistoriado}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(l.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            ))}
            {!isLoading && laudos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum laudo cadastrado</p>
            )}
          </CardContent>
        </Card>

        {/* DETAIL */}
        <Card className="lg:col-span-2">
          {selectedLaudo ? (
            <>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{selectedLaudo.clientes?.nome}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(selectedLaudo)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleExportPDF}>
                      <Download className="h-4 w-4 mr-1" />PDF
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedLaudo.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="dados">
                  <TabsList>
                    <TabsTrigger value="dados">Dados</TabsTrigger>
                    <TabsTrigger value="fotos">Memorial Fotográfico</TabsTrigger>
                    <TabsTrigger value="imagens">Imagens Especiais</TabsTrigger>
                  </TabsList>

                  <TabsContent value="dados" className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="font-medium">Cliente:</span> {selectedLaudo.clientes?.nome}</div>
                      <div><span className="font-medium">Obra:</span> {selectedLaudo.obras?.nome}</div>
                      <div><span className="font-medium">Endereço vistoriado:</span> {selectedLaudo.endereco_vistoriado}</div>
                      <div><span className="font-medium">Tipo imóvel:</span> {selectedLaudo.tipo_imovel}</div>
                      <div><span className="font-medium">Padrão:</span> {selectedLaudo.padrao_construtivo}</div>
                      <div><span className="font-medium">Pavimentos:</span> {selectedLaudo.qtd_pavimentos}</div>
                      <div><span className="font-medium">Bairro:</span> {selectedLaudo.bairro}</div>
                      <div><span className="font-medium">Cidade:</span> {selectedLaudo.cidade}</div>
                    </div>
                  </TabsContent>

                  <TabsContent value="fotos" className="mt-3">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="fotos-upload" className="cursor-pointer">
                          <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90">
                            <Upload className="h-4 w-4" />Enviar Fotos (nomeie 1.jpg, 2.jpg, etc.)
                          </div>
                        </Label>
                        <input
                          id="fotos-upload"
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files && handleUploadFotos(e.target.files)}
                        />
                        <span className="text-sm text-muted-foreground">{fotos.length} foto(s) enviada(s)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {fotos.map(f => (
                          <div key={f.id} className="relative group">
                            <img src={f.foto_url} alt={`Imagem ${f.numero}`} className="w-full h-28 object-cover rounded-md border" />
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                              {f.numero}
                            </div>
                            <button
                              onClick={() => deleteFoto(f.id, selectedLaudo.id)}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="imagens" className="mt-3 space-y-4">
                    {/* Google Maps */}
                    <div>
                      <Label className="text-sm font-medium">Imagem Google Maps (10,5cm × 16,47cm)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Label htmlFor="maps-upload" className="cursor-pointer">
                          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm hover:bg-accent">
                            <Upload className="h-4 w-4" />Enviar
                          </div>
                        </Label>
                        <input
                          id="maps-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUploadImagem('google_maps', e.target.files[0])}
                        />
                      </div>
                      {selectedLaudo.imagem_google_maps && (
                        <img src={selectedLaudo.imagem_google_maps} alt="Google Maps" className="mt-2 max-h-40 rounded border" />
                      )}
                    </div>
                    {/* Fluxograma */}
                    <div>
                      <Label className="text-sm font-medium">Fluxograma de Vistoria (5,37cm × 13,44cm)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Label htmlFor="fluxo-upload" className="cursor-pointer">
                          <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm hover:bg-accent">
                            <Upload className="h-4 w-4" />Enviar
                          </div>
                        </Label>
                        <input
                          id="fluxo-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUploadImagem('fluxograma', e.target.files[0])}
                        />
                      </div>
                      {selectedLaudo.imagem_fluxograma && (
                        <img src={selectedLaudo.imagem_fluxograma} alt="Fluxograma" className="mt-2 max-h-32 rounded border" />
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
              Selecione um laudo ou crie um novo
            </CardContent>
          )}
        </Card>
      </div>

      {/* FORM DIALOG */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Laudo' : 'Novo Laudo Cautelar'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Filial *</Label>
                <Select value={formData.filial_id || ''} onValueChange={v => setFormData(p => ({ ...p, filial_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {filiais.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente *</Label>
                <Select value={formData.cliente_id || ''} onValueChange={v => setFormData(p => ({ ...p, cliente_id: v, obra_id: undefined as any }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Obra *</Label>
                <Select value={formData.obra_id || ''} onValueChange={v => {
                  const obra = obras.find(o => o.id === v);
                  setFormData(p => ({ ...p, obra_id: v, filial_id: obra?.filial_id || p.filial_id }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {filteredObras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Imóvel vistoriado */}
            <h3 className="font-semibold text-sm border-b pb-1">Imóvel Vistoriado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Endereço do Imóvel Vistoriado *</Label>
                <Input value={formData.endereco_vistoriado || ''} onChange={e => setFormData(p => ({ ...p, endereco_vistoriado: e.target.value }))} />
              </div>
              <div>
                <Label>Tipo de Imóvel</Label>
                <Select value={formData.tipo_imovel || 'Imóvel residencial'} onValueChange={v => setFormData(p => ({ ...p, tipo_imovel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_IMOVEL.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Objetivo</Label>
                <Input value={formData.objetivo || ''} onChange={e => setFormData(p => ({ ...p, objetivo: e.target.value }))} />
              </div>
              <div>
                <Label>Responsável Técnico</Label>
                <Select value={formData.responsavel_id || ''} onValueChange={v => setFormData(p => ({ ...p, responsavel_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {equipe.map(e => <SelectItem key={e.id} value={e.id}>{e.nome} - {e.numero_crea}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Imóvel a ser construído */}
            <h3 className="font-semibold text-sm border-b pb-1">Imóvel a Ser Construído</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Tipo de Ocupação</Label>
                <Select value={formData.tipo_ocupacao || 'Residencial'} onValueChange={v => setFormData(p => ({ ...p, tipo_ocupacao: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_OCUPACAO.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vias de Acesso</Label>
                <Input value={formData.vias_acesso || ''} onChange={e => setFormData(p => ({ ...p, vias_acesso: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Características da Edificação</Label>
                <Textarea value={formData.caracteristicas_edificacao || ''} onChange={e => setFormData(p => ({ ...p, caracteristicas_edificacao: e.target.value }))} rows={2} />
              </div>
            </div>

            {/* Características */}
            <h3 className="font-semibold text-sm border-b pb-1">Características do Imóvel</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Padrão Construtivo</Label>
                <Select value={formData.padrao_construtivo || 'Baixo padrão'} onValueChange={v => setFormData(p => ({ ...p, padrao_construtivo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PADROES_CONSTRUTIVOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Qtd. Pavimentos</Label>
                <Input type="number" min={1} value={formData.qtd_pavimentos || 1} onChange={e => setFormData(p => ({ ...p, qtd_pavimentos: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Estruturas</Label>
                <Input value={formData.estruturas || ''} onChange={e => setFormData(p => ({ ...p, estruturas: e.target.value }))} />
              </div>
              <div>
                <Label>Vedação</Label>
                <Input value={formData.vedacao || ''} onChange={e => setFormData(p => ({ ...p, vedacao: e.target.value }))} />
              </div>
              <div>
                <Label>Acabamento de Piso</Label>
                <Input value={formData.acabamento_piso || ''} onChange={e => setFormData(p => ({ ...p, acabamento_piso: e.target.value }))} />
              </div>
              <div>
                <Label>Acabamento de Paredes</Label>
                <Input value={formData.acabamento_paredes || ''} onChange={e => setFormData(p => ({ ...p, acabamento_paredes: e.target.value }))} />
              </div>
              <div>
                <Label>Cobertura</Label>
                <Input value={formData.cobertura || ''} onChange={e => setFormData(p => ({ ...p, cobertura: e.target.value }))} />
              </div>
              <div>
                <Label>Bairro</Label>
                <Input value={formData.bairro || ''} onChange={e => setFormData(p => ({ ...p, bairro: e.target.value }))} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={formData.cidade || ''} onChange={e => setFormData(p => ({ ...p, cidade: e.target.value }))} />
              </div>
            </div>

            {/* Textos editáveis */}
            <h3 className="font-semibold text-sm border-b pb-1">Textos do Laudo</h3>
            <div className="space-y-3">
              <div>
                <Label>Texto do Objetivo</Label>
                <Textarea value={formData.texto_objetivo || ''} onChange={e => setFormData(p => ({ ...p, texto_objetivo: e.target.value }))} rows={3} />
              </div>
              <div>
                <Label>Nota Prévia (deixe vazio para gerar automaticamente)</Label>
                <Textarea value={formData.texto_nota_previa || ''} onChange={e => setFormData(p => ({ ...p, texto_nota_previa: e.target.value }))} rows={2} />
              </div>
              <div>
                <Label>Metodologia</Label>
                <Textarea value={formData.texto_metodologia || ''} onChange={e => setFormData(p => ({ ...p, texto_metodologia: e.target.value }))} rows={3} />
              </div>
              <div>
                <Label>Avaliação Final</Label>
                <Textarea value={formData.texto_avaliacao_final || ''} onChange={e => setFormData(p => ({ ...p, texto_avaliacao_final: e.target.value }))} rows={4} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isCreating || isUpdating}>
                {editingId ? 'Salvar' : 'Criar Laudo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
