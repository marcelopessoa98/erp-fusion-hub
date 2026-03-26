import { useRef } from 'react';
import { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, Upload, Download, Trash2, FileText } from 'lucide-react';
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
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'vigente': return <Badge className="bg-green-600 text-white text-[10px] px-1.5">OK</Badge>;
    case 'a_vencer': return <Badge className="bg-yellow-500 text-white text-[10px] px-1.5">A vencer</Badge>;
    case 'vencido': return <Badge variant="destructive" className="text-[10px] px-1.5">Vencido</Badge>;
    default: return <Badge variant="outline" className="text-[10px] px-1.5">Pendente</Badge>;
  }
};

export function FuncionarioDocRow({ funcionario, onSalvarComData, onMarcarSemValidade, onUploadArquivo, onExcluirArquivo, onBaixarArquivo }: Props) {
  const [editDates, setEditDates] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleDateChange = (tipo: TipoDocumento, value: string) => {
    setEditDates(prev => ({ ...prev, [tipo]: value }));
  };

  const handleSaveDate = (tipo: TipoDocumento) => {
    const date = editDates[tipo];
    if (!date) return;
    const doc = funcionario.documentos[tipo];
    onSalvarComData(funcionario.id, funcionario.filial_id || '', tipo, date, doc.id);
    setEditDates(prev => {
      const next = { ...prev };
      delete next[tipo];
      return next;
    });
  };

  const handleFileSelect = (tipo: TipoDocumento, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      return;
    }
    const doc = funcionario.documentos[tipo];
    onUploadArquivo(funcionario.id, funcionario.filial_id || '', tipo, file, doc.id);
    e.target.value = '';
  };

  return (
    <TableRow>
      <TableCell className="font-medium min-w-[180px]">
        <div>
          <p className="font-semibold text-sm">{funcionario.nome}</p>
          <p className="text-xs text-muted-foreground">{funcionario.cargo || 'Sem cargo'} • {funcionario.filial_nome}</p>
        </div>
      </TableCell>
      {TIPOS_DOCUMENTO.map((tipoInfo) => {
        const doc = funcionario.documentos[tipoInfo.tipo];
        const isChecked = doc.status !== 'pendente';
        const hasFile = !!doc.arquivo_url;

        const fileActions = (
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {hasFile && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-primary"
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
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => onExcluirArquivo(doc.id!, doc.arquivo_url!)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir arquivo</TooltipContent>
                </Tooltip>
              </>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRefs.current[tipoInfo.tipo]?.click()}
                >
                  {hasFile ? <FileText className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{hasFile ? 'Substituir arquivo' : 'Enviar PDF'}</TooltipContent>
            </Tooltip>
            <input
              ref={(el) => { fileInputRefs.current[tipoInfo.tipo] = el; }}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(tipoInfo.tipo, e)}
            />
          </div>
        );

        if (!tipoInfo.temValidade) {
          return (
            <TableCell key={tipoInfo.tipo} className="text-center">
              <div className="flex flex-col items-center gap-1">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    onMarcarSemValidade(funcionario.id, funcionario.filial_id || '', tipoInfo.tipo, !!checked, doc.id);
                  }}
                />
                {statusBadge(doc.status)}
                {fileActions}
              </div>
            </TableCell>
          );
        }

        const editValue = editDates[tipoInfo.tipo];
        const currentDate = editValue ?? doc.data_emissao ?? '';

        return (
          <TableCell key={tipoInfo.tipo} className="text-center min-w-[150px]">
            <div className="flex flex-col items-center gap-1">
              <Input
                type="date"
                value={currentDate}
                onChange={(e) => handleDateChange(tipoInfo.tipo, e.target.value)}
                className="h-8 text-xs w-[130px]"
              />
              {doc.data_validade && (
                <span className="text-[10px] text-muted-foreground">
                  Val: {formatDateBR(doc.data_validade)}
                </span>
              )}
              <div className="flex items-center gap-1">
                {statusBadge(doc.status)}
                {editDates[tipoInfo.tipo] && editDates[tipoInfo.tipo] !== doc.data_emissao && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={() => handleSaveDate(tipoInfo.tipo)}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {fileActions}
            </div>
          </TableCell>
        );
      })}
    </TableRow>
  );
}
