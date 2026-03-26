import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Upload, Download, Trash2, FileText, Save, Package } from 'lucide-react';
import { TIPOS_DOCUMENTO, type FuncionarioDocumento, type TipoDocumento } from '@/hooks/useDocumentacaoFuncionarios';
import { formatDateBR } from '@/lib/dateUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  funcionario: FuncionarioDocumento;
  onSalvarComData: (funcionarioId: string, filialId: string, tipo: TipoDocumento, data: string | null, docId: string | null) => void;
  onMarcarSemValidade: (funcionarioId: string, filialId: string, tipo: TipoDocumento, marcado: boolean, docId: string | null) => void;
  onUploadArquivo: (funcionarioId: string, filialId: string, tipo: TipoDocumento, file: File, docId: string | null) => void;
  onExcluirArquivo: (docId: string, arquivoUrl: string) => void;
  onBaixarArquivo: (arquivoUrl: string, nomeDocumento: string) => void;
  onBaixarTodos: (funcionario: FuncionarioDocumento) => void;
}

function calcStatus(docs: FuncionarioDocumento['documentos']): 'regular' | 'irregular' | 'a_vencer' {
  let temAVencer = false;
  for (const tipo of TIPOS_DOCUMENTO) {
    const doc = docs[tipo.tipo];
    if (doc.status === 'vencido' || doc.status === 'pendente') return 'irregular';
    if (doc.status === 'a_vencer') temAVencer = true;
  }
  return temAVencer ? 'a_vencer' : 'regular';
}

const statusConfig = {
  regular: { label: 'Regular', className: 'bg-green-600 text-white' },
  irregular: { label: 'Irregular', className: 'bg-destructive text-destructive-foreground' },
  a_vencer: { label: 'A Vencer', className: 'bg-yellow-500 text-white' },
};

const docStatusBadge = (status: string) => {
  switch (status) {
    case 'vigente': return <Badge className="bg-green-600 text-white text-[10px]">OK</Badge>;
    case 'a_vencer': return <Badge className="bg-yellow-500 text-white text-[10px]">A vencer</Badge>;
    case 'vencido': return <Badge variant="destructive" className="text-[10px]">Vencido</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">Pendente</Badge>;
  }
};

export function FuncionarioDocCard({
  funcionario, onSalvarComData, onMarcarSemValidade,
  onUploadArquivo, onExcluirArquivo, onBaixarArquivo, onBaixarTodos,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editDates, setEditDates] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const globalStatus = calcStatus(funcionario.documentos);
  const cfg = statusConfig[globalStatus];

  const docsComArquivo = TIPOS_DOCUMENTO.filter(t => funcionario.documentos[t.tipo].arquivo_url);
  const totalDocs = TIPOS_DOCUMENTO.length;
  const docsPreenchidos = TIPOS_DOCUMENTO.filter(t => funcionario.documentos[t.tipo].status !== 'pendente').length;

  const handleSaveDate = (tipo: TipoDocumento) => {
    const date = editDates[tipo];
    if (!date) return;
    const doc = funcionario.documentos[tipo];
    onSalvarComData(funcionario.id, funcionario.filial_id || '', tipo, date, doc.id);
    setEditDates(prev => { const n = { ...prev }; delete n[tipo]; return n; });
  };

  const handleFileSelect = (tipo: TipoDocumento, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024) return;
    const doc = funcionario.documentos[tipo];
    onUploadArquivo(funcionario.id, funcionario.filial_id || '', tipo, file, doc.id);
    e.target.value = '';
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="font-semibold text-sm">{funcionario.nome}</p>
                  <p className="text-xs text-muted-foreground">{funcionario.cargo || 'Sem cargo'} • {funcionario.filial_nome}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {docsPreenchidos}/{totalDocs} documentos
                </span>
                {docsComArquivo.length > 0 && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {docsComArquivo.length} PDF{docsComArquivo.length > 1 ? 's' : ''}
                  </span>
                )}
                <Badge className={cfg.className}>{cfg.label}</Badge>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4">
            {/* Ação global */}
            {docsComArquivo.length > 0 && (
              <div className="flex justify-end pt-3 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onBaixarTodos(funcionario); }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Baixar todos os PDFs ({docsComArquivo.length})
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
              {TIPOS_DOCUMENTO.map((tipoInfo) => {
                const doc = funcionario.documentos[tipoInfo.tipo];
                const hasFile = !!doc.arquivo_url;
                const editValue = editDates[tipoInfo.tipo];

                return (
                  <div
                    key={tipoInfo.tipo}
                    className="border rounded-lg p-3 space-y-2 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium truncate">{tipoInfo.nome}</p>
                      {docStatusBadge(doc.status)}
                    </div>

                    {tipoInfo.temValidade ? (
                      <div className="space-y-1.5">
                        <Input
                          type="date"
                          value={editValue ?? doc.data_emissao ?? ''}
                          onChange={(e) => setEditDates(prev => ({ ...prev, [tipoInfo.tipo]: e.target.value }))}
                          className="h-8 text-xs"
                        />
                        {doc.data_validade && (
                          <p className="text-[10px] text-muted-foreground">
                            Validade: {formatDateBR(doc.data_validade)}
                          </p>
                        )}
                        {editDates[tipoInfo.tipo] && editDates[tipoInfo.tipo] !== doc.data_emissao && (
                          <Button size="sm" variant="secondary" className="h-7 w-full text-xs" onClick={() => handleSaveDate(tipoInfo.tipo)}>
                            <Save className="h-3 w-3 mr-1" /> Salvar data
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={doc.status !== 'pendente'}
                          onCheckedChange={(checked) => {
                            onMarcarSemValidade(funcionario.id, funcionario.filial_id || '', tipoInfo.tipo, !!checked, doc.id);
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {doc.status !== 'pendente' ? 'Entregue' : 'Não entregue'}
                        </span>
                      </div>
                    )}

                    {/* File actions */}
                    <div className="flex items-center gap-1 pt-1 border-t">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 flex-1 text-xs"
                            onClick={() => fileInputRefs.current[tipoInfo.tipo]?.click()}
                          >
                            {hasFile ? <FileText className="h-3.5 w-3.5 mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                            {hasFile ? 'Substituir' : 'Enviar PDF'}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{hasFile ? 'Substituir arquivo PDF' : 'Enviar arquivo PDF'}</TooltipContent>
                      </Tooltip>
                      <input
                        ref={(el) => { fileInputRefs.current[tipoInfo.tipo] = el; }}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileSelect(tipoInfo.tipo, e)}
                      />
                      {hasFile && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-primary"
                                onClick={() => onBaixarArquivo(doc.arquivo_url!, `${funcionario.nome}_${tipoInfo.nome}`)}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Baixar PDF</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive"
                                onClick={() => onExcluirArquivo(doc.id!, doc.arquivo_url!)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir arquivo</TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
