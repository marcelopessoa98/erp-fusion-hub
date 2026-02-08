import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Trash2 } from 'lucide-react';
import { PropostaItem } from '@/hooks/usePropostas';

interface PropostaFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    proposta: {
      assunto: string;
      cliente_id: string;
      obra_id: string;
      filial_id: string;
      consideracoes_gerais?: string;
      consideracoes_pagamento?: string;
      dados_bancarios?: Record<string, string>;
      validade_dias?: number;
    },
    itens: PropostaItem[]
  ) => Promise<any>;
}

const CONSIDERACOES_PADRAO = `• A CONTRATADA disponibilizará funcionários especializados durante a execução dos ensaios (horário normal de trabalho de acordo com o sindicato local).
• A CONTRATADA fará o preenchimento da ART, mas o pagamento desta será feito pela CONTRATANTE.
• A CONTRATANTE é responsável por providenciar o acesso ao local dos ensaios e um auxiliar caso necessário.
• A programação da visita técnica para execução do ensaio deve ser repassada para a CONTRATADA com antecedência de, pelo menos, 72 horas.
• A CONTRATANTE autoriza o uso de sua marca para divulgação de serviços e ensaios nos canais de mídia utilizados pela CONTRATADA, desde que seja relacionada aos serviços ora contratados, e que não acarretem qualquer tipo de prejuízo a sua imagem.`;

const PAGAMENTO_PADRAO = `A CONTRATADA apresentará um boletim de medições de serviços, contendo os serviços efetivamente executados no período. Após aprovação, a CONTRATANTE disporá de 15 (QUINZE) dias úteis para efetuar o pagamento, a partir da data de emissão da Nota Fiscal. O pagamento será efetuado por boleto bancário ou depósito bancário na conta corrente.`;

const DADOS_BANCARIOS_PADRAO: Record<string, string> = {
  banco: 'CAIXA ECONÔMICA FEDERAL',
  agencia: '0619',
  op: '003',
  cc: '4001-0',
  pix: '85988620675',
  nome: 'RAFAELA FUJITA LIMA',
};

export function PropostaForm({ open, onClose, onSubmit }: PropostaFormProps) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [obrasFiltradas, setObrasFiltradas] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [obraId, setObraId] = useState('');
  const [assunto, setAssunto] = useState('');
  const [consideracoesGerais, setConsideracoesGerais] = useState(CONSIDERACOES_PADRAO);
  const [consideracoesPagamento, setConsideracoesPagamento] = useState(PAGAMENTO_PADRAO);
  const [dadosBancarios, setDadosBancarios] = useState(DADOS_BANCARIOS_PADRAO);
  const [validadeDias, setValidadeDias] = useState(30);
  const [itens, setItens] = useState<PropostaItem[]>([
    { descricao: '', valor_unitario: 0, unidade: 'und', detalhes: '', ordem: 0 },
  ]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (clienteId) {
      setObrasFiltradas(obras.filter((o) => o.cliente_id === clienteId));
      setObraId('');
    } else {
      setObrasFiltradas([]);
    }
  }, [clienteId, obras]);

  const fetchData = async () => {
    const [{ data: c }, { data: o }] = await Promise.all([
      supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome'),
      supabase.from('obras').select('id, nome, cliente_id, filial_id, referencia').eq('status', 'ativa').order('nome'),
    ]);
    setClientes(c || []);
    setObras(o || []);
  };

  const addItem = () => {
    setItens([...itens, { descricao: '', valor_unitario: 0, unidade: 'und', detalhes: '', ordem: itens.length }]);
  };

  const removeItem = (idx: number) => {
    if (itens.length <= 1) return;
    setItens(itens.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof PropostaItem, value: any) => {
    const updated = [...itens];
    (updated[idx] as any)[field] = value;
    setItens(updated);
  };

  const updateBancario = (key: string, value: string) => {
    setDadosBancarios({ ...dadosBancarios, [key]: value });
  };

  const handleSubmit = async () => {
    if (!clienteId || !obraId || !assunto.trim()) {
      return;
    }
    const validItens = itens.filter((i) => i.descricao.trim());
    if (validItens.length === 0) return;

    const obra = obras.find((o) => o.id === obraId);
    if (!obra) return;

    setSubmitting(true);
    try {
      await onSubmit(
        {
          assunto,
          cliente_id: clienteId,
          obra_id: obraId,
          filial_id: obra.filial_id,
          consideracoes_gerais: consideracoesGerais,
          consideracoes_pagamento: consideracoesPagamento,
          dados_bancarios: dadosBancarios,
          validade_dias: validadeDias,
        },
        validItens
      );
      resetForm();
      onClose();
    } catch {
      // error handled in hook
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setClienteId('');
    setObraId('');
    setAssunto('');
    setConsideracoesGerais(CONSIDERACOES_PADRAO);
    setConsideracoesPagamento(PAGAMENTO_PADRAO);
    setDadosBancarios(DADOS_BANCARIOS_PADRAO);
    setValidadeDias(30);
    setItens([{ descricao: '', valor_unitario: 0, unidade: 'und', detalhes: '', ordem: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Proposta Comercial</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cabeçalho */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados da Proposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Obra *</Label>
                  <Select value={obraId} onValueChange={setObraId} disabled={!clienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder={clienteId ? 'Selecione a obra' : 'Selecione um cliente primeiro'} />
                    </SelectTrigger>
                    <SelectContent>
                      {obrasFiltradas.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.nome} {o.referencia ? `(${o.referencia})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assunto *</Label>
                <Input
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  placeholder="Ex: Proposta de Ensaio de Extração"
                />
              </div>
              <div className="space-y-2">
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  value={validadeDias}
                  onChange={(e) => setValidadeDias(Number(e.target.value))}
                  className="w-32"
                />
              </div>
            </CardContent>
          </Card>

          {/* Itens / Serviços */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Ensaios / Serviços</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {itens.map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={item.descricao}
                      onChange={(e) => updateItem(idx, 'descricao', e.target.value)}
                      placeholder="Descrição do ensaio/serviço"
                    />
                  </div>
                  <div className="w-36 space-y-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.valor_unitario || ''}
                      onChange={(e) => updateItem(idx, 'valor_unitario', Number(e.target.value))}
                      placeholder="Valor (R$)"
                    />
                  </div>
                  <div className="w-24 space-y-2">
                    <Input
                      value={item.unidade}
                      onChange={(e) => updateItem(idx, 'unidade', e.target.value)}
                      placeholder="und"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(idx)}
                    disabled={itens.length <= 1}
                    className="mt-0.5"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {itens.length > 0 && itens[0].descricao && (
                <div className="mt-3">
                  <Label>Detalhes / Incluso (opcional)</Label>
                  <Textarea
                    value={itens[0].detalhes || ''}
                    onChange={(e) => updateItem(0, 'detalhes', e.target.value)}
                    placeholder="Ex: Mínimo de 2 unidades para Visita Técnica; Extração do Testemunho..."
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Considerações Gerais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Considerações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={consideracoesGerais}
                onChange={(e) => setConsideracoesGerais(e.target.value)}
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Considerações de Pagamento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Considerações de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={consideracoesPagamento}
                onChange={(e) => setConsideracoesPagamento(e.target.value)}
                rows={4}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(dadosBancarios).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs uppercase">{key}</Label>
                    <Input
                      value={val}
                      onChange={(e) => updateBancario(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !clienteId || !obraId || !assunto.trim()}
            >
              {submitting ? 'Criando...' : 'Criar Proposta'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
