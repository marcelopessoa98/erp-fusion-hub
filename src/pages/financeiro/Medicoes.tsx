import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMedicoes, MedicaoItem } from '@/hooks/useMedicoes';
import { useContratosConfig } from '@/hooks/useContratosConfig';
import { generateMedicaoPDF } from '@/components/medicoes/MedicaoPDFExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, ClipboardList, Loader2, FileDown, Trash2, Eye } from 'lucide-react';
import { formatDateBR } from '@/lib/dateUtils';

const formatCurrency = (val: number) =>
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Obra {
  id: string;
  nome: string;
  cliente_id: string;
  filial_id: string;
}

export default function Medicoes() {
  const { user, isAdmin } = useAuth();
  const { medicoes, isLoading, createMedicao, deleteMedicao } = useMedicoes();
  const { contratos } = useContratosConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [obraId, setObraId] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [itens, setItens] = useState<MedicaoItem[]>([]);
  const [horasExtrasIds, setHorasExtrasIds] = useState<string[]>([]);
  const [servicosExtrasIds, setServicosExtrasIds] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [detailMedicao, setDetailMedicao] = useState<any>(null);

  const { data: obras } = useQuery({
    queryKey: ['obras_medicoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('obras')
        .select('id, nome, cliente_id, filial_id')
        .order('nome');
      if (error) throw error;
      return data as Obra[];
    },
  });

  const selectedContrato = useMemo(() => {
    return contratos?.find((c) => c.obra_id === obraId);
  }, [contratos, obraId]);

  const selectedObra = useMemo(() => {
    return obras?.find((o) => o.id === obraId);
  }, [obras, obraId]);

  // Get next numero_medicao for obra
  const nextNumero = useMemo(() => {
    if (!obraId || !medicoes) return 1;
    const obraMedicoes = medicoes.filter((m) => m.obra_id === obraId);
    return obraMedicoes.length > 0
      ? Math.max(...obraMedicoes.map((m) => m.numero_medicao)) + 1
      : 1;
  }, [obraId, medicoes]);

  const loadPreview = async () => {
    if (!obraId || !periodoInicio || !periodoFim) return;
    setLoadingPreview(true);

    try {
      const newItens: MedicaoItem[] = [];
      let ordem = 1;

      // Load contrato items
      if (selectedContrato?.contrato_config_itens) {
        selectedContrato.contrato_config_itens
          .sort((a, b) => a.ordem - b.ordem)
          .forEach((ci) => {
            newItens.push({
              descricao: ci.descricao,
              unidade: ci.unidade,
              quantidade: ci.quantidade,
              valor_unitario: ci.valor_unitario,
              valor_total: 0,
              checado: false,
              ordem: ordem++,
            });
          });
      }

      // Fetch horas extras não medidas para a obra no período
      const { data: horasExtras } = await supabase
        .from('horas_extras')
        .select('*, funcionarios(nome)')
        .eq('obra_id', obraId)
        .eq('medido', false)
        .gte('data', periodoInicio)
        .lte('data', periodoFim);

      if (horasExtras && horasExtras.length > 0) {
        // Group by tipo
        const byTipo: Record<string, { horas: number; ids: string[]; detalhes: string[] }> = {};
        horasExtras.forEach((he: any) => {
          const tipo = he.tipo || 'normal';
          if (!byTipo[tipo]) byTipo[tipo] = { horas: 0, ids: [], detalhes: [] };
          byTipo[tipo].horas += Number(he.horas);
          byTipo[tipo].ids.push(he.id);
          const d = he.data.split('-');
          byTipo[tipo].detalhes.push(`${d[2]}/${d[1]}(${he.horas}h)`);
        });

        const heIds: string[] = [];
        Object.entries(byTipo).forEach(([tipo, data]) => {
          const tipoLabel = tipo === 'normal' ? 'SEG A SEX' : tipo === 'noturno' ? 'NOTURNO' : 'SABADO/DOMINGO/FERIADO';
          newItens.push({
            descricao: `HORA EXTRA FUNCIONARIO - ${tipoLabel} - ${data.detalhes.join(', ')}`,
            unidade: 'und',
            quantidade: 1,
            valor_unitario: 0,
            valor_total: 0,
            checado: false,
            ordem: ordem++,
          });
          heIds.push(...data.ids);
        });
        setHorasExtrasIds(heIds);
      } else {
        setHorasExtrasIds([]);
      }

      // Fetch serviços extras não medidos para a obra no período
      const { data: servicosExtras } = await supabase
        .from('servicos_extras')
        .select('*')
        .eq('obra_id', obraId)
        .eq('medido', false)
        .gte('data_recebimento', periodoInicio)
        .lte('data_recebimento', periodoFim);

      if (servicosExtras && servicosExtras.length > 0) {
        const seIds: string[] = [];
        servicosExtras.forEach((se: any) => {
          newItens.push({
            descricao: `${se.descricao_servico} - ${se.material_recebido}`,
            unidade: 'und',
            quantidade: 1,
            valor_unitario: Number(se.valor),
            valor_total: Number(se.valor),
            checado: true,
            ordem: ordem++,
          });
          seIds.push(se.id);
        });
        setServicosExtrasIds(seIds);
      } else {
        setServicosExtrasIds([]);
      }

      setItens(newItens);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (obraId && periodoInicio && periodoFim) {
      loadPreview();
    }
  }, [obraId, periodoInicio, periodoFim]);

  const updateItem = (idx: number, field: keyof MedicaoItem, value: any) => {
    setItens((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantidade' || field === 'valor_unitario' || field === 'checado') {
          if (updated.checado) {
            updated.valor_total = Number(updated.quantidade) * Number(updated.valor_unitario);
          } else {
            updated.valor_total = 0;
          }
        }
        return updated;
      })
    );
  };

  const valorTotal = useMemo(() => {
    return itens.reduce((sum, i) => sum + (i.checado ? i.valor_total : 0), 0);
  }, [itens]);

  const handleSave = async () => {
    if (!selectedObra || !periodoInicio || !periodoFim) return;

    await createMedicao.mutateAsync({
      medicao: {
        obra_id: obraId,
        cliente_id: selectedObra.cliente_id,
        filial_id: selectedObra.filial_id,
        numero_medicao: nextNumero,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        valor_total: valorTotal,
        status: 'rascunho',
        user_id: user?.id || null,
      },
      itens: itens.map((i) => ({
        descricao: i.descricao,
        unidade: i.unidade,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
        valor_total: i.valor_total,
        checado: i.checado,
        ordem: i.ordem,
      })),
      horasExtrasIds,
      servicosExtrasIds,
    });

    setDialogOpen(false);
    setItens([]);
    setObraId('');
    setPeriodoInicio('');
    setPeriodoFim('');
  };

  const exportPDF = (med: any) => {
    const contrato = contratos?.find((c) => c.obra_id === med.obra_id);
    generateMedicaoPDF({
      contratanteNome: contrato?.contratante_nome || med.cliente?.nome || '',
      contratanteCnpj: contrato?.contratante_cnpj || '',
      contratadoNome: contrato?.contratado_nome || 'Concre Fuji Tecnologia',
      contratadoCnpj: contrato?.contratado_cnpj || '32.721.991/0001-98',
      servicos: contrato?.servicos_descricao || '',
      numeroProposta: contrato?.numero_proposta || '',
      obraNome: med.obra?.nome || '',
      numeroMedicao: med.numero_medicao,
      periodoInicio: med.periodo_inicio,
      periodoFim: med.periodo_fim,
      itens: (med.medicao_itens || []).sort((a: any, b: any) => a.ordem - b.ordem),
      valorTotal: Number(med.valor_total),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-7 w-7" />
            Medições
          </h1>
          <p className="text-muted-foreground">Checklist de serviços executados para faturamento por obra.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Gerar Medição</Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[92vh]">
            <DialogHeader>
              <DialogTitle>Gerar Nova Medição</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-2">
              {/* Selectors */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Obra *</Label>
                  <Select value={obraId} onValueChange={setObraId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {obras?.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Período Início *</Label>
                  <Input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Período Fim *</Label>
                  <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
                </div>
              </div>

              {selectedContrato && (
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  Contrato: <strong>{selectedContrato.contratante_nome}</strong> | Proposta: {selectedContrato.numero_proposta || 'N/A'} | Medição #{nextNumero}
                </div>
              )}

              {!selectedContrato && obraId && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠ Nenhum contrato configurado para esta obra. Cadastre em Contratos/Config.
                </div>
              )}

              {loadingPreview ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : itens.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">✓</TableHead>
                      <TableHead className="w-12">Item</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-16">Und</TableHead>
                      <TableHead className="w-20">Qtd</TableHead>
                      <TableHead className="w-24">Preço Unit.</TableHead>
                      <TableHead className="w-24">Qt Exec.</TableHead>
                      <TableHead className="w-28">Valor Exec.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, idx) => (
                      <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={item.checado}
                            onCheckedChange={(v) => updateItem(idx, 'checado', !!v)}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{item.ordem.toFixed(1)}</TableCell>
                        <TableCell className="text-xs">{item.descricao}</TableCell>
                        <TableCell className="text-xs">{item.unidade}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => updateItem(idx, 'quantidade', parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs w-16"
                          />
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {item.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.checado ? (item.valor_total / (item.valor_unitario || 1)).toFixed(2) : ''}
                            onChange={(e) => {
                              const qtExec = parseFloat(e.target.value) || 0;
                              updateItem(idx, 'valor_total', qtExec * item.valor_unitario);
                            }}
                            className="h-7 text-xs w-20"
                            disabled={!item.checado}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {item.checado && item.valor_total > 0
                            ? formatCurrency(item.valor_total)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : obraId && periodoInicio && periodoFim ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum item encontrado. Configure o contrato ou verifique o período.
                </div>
              ) : null}

              {itens.length > 0 && (
                <div className="flex justify-end text-lg font-bold">
                  TOTAL: {formatCurrency(valorTotal)}
                </div>
              )}
            </div>
            <DialogFooter className="border-t pt-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSave}
                disabled={createMedicao.isPending || !obraId || !periodoInicio || !periodoFim}
              >
                {createMedicao.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Medição
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Medições Geradas</CardTitle>
          <CardDescription>{medicoes?.length || 0} medição(ões)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : !medicoes?.length ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma medição gerada.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicoes.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-medium">{med.numero_medicao}</TableCell>
                    <TableCell>{med.obra?.nome || '-'}</TableCell>
                    <TableCell>{med.cliente?.nome || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {formatDateBR(med.periodo_inicio)} a {formatDateBR(med.periodo_fim)}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(med.valor_total))}</TableCell>
                    <TableCell>
                      <Badge variant={med.status === 'aprovada' ? 'default' : 'secondary'}>
                        {med.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailMedicao(med)} title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => exportPDF(med)} title="Exportar PDF">
                          <FileDown className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm('Excluir esta medição?')) deleteMedicao.mutate(med.id);
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detailMedicao} onOpenChange={(open) => !open && setDetailMedicao(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Medição #{detailMedicao?.numero_medicao} - {detailMedicao?.obra?.nome}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-y-auto">
            {detailMedicao && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Item</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-16">Und</TableHead>
                    <TableHead className="w-20">Qtd</TableHead>
                    <TableHead className="w-24">Preço Unit.</TableHead>
                    <TableHead className="w-28">Valor Exec.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(detailMedicao.medicao_itens || [])
                    .sort((a: any, b: any) => a.ordem - b.ordem)
                    .map((item: any) => (
                      <TableRow key={item.id} className={item.checado ? '' : 'opacity-50'}>
                        <TableCell className="text-xs">{item.ordem.toFixed(1)}</TableCell>
                        <TableCell className="text-xs">{item.descricao}</TableCell>
                        <TableCell className="text-xs">{item.unidade}</TableCell>
                        <TableCell className="text-xs">{item.quantidade}</TableCell>
                        <TableCell className="text-xs text-right">
                          {Number(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          {item.checado && Number(item.valor_total) > 0
                            ? formatCurrency(Number(item.valor_total))
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
            {detailMedicao && (
              <div className="flex justify-end text-lg font-bold mt-3">
                TOTAL: {formatCurrency(Number(detailMedicao.valor_total))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailMedicao(null)}>Fechar</Button>
            <Button onClick={() => exportPDF(detailMedicao)}>
              <FileDown className="h-4 w-4 mr-2" />Exportar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
