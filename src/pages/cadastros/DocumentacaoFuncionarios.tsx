import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentacaoDashboard } from '@/components/documentacao/DocumentacaoDashboard';
import { FuncionarioDocCard } from '@/components/documentacao/FuncionarioDocCard';
import { useDocumentacaoFuncionarios, TIPOS_DOCUMENTO, type FuncionarioDocumento } from '@/hooks/useDocumentacaoFuncionarios';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';

const DocumentacaoFuncionarios = () => {
  const {
    funcionarios,
    loading,
    filiais,
    filialFiltro,
    setFilialFiltro,
    buscaNome,
    setBuscaNome,
    statusFiltro,
    setStatusFiltro,
    contagens,
    salvarDocumento,
    marcarDocumentoSemValidade,
    uploadArquivo,
    excluirArquivo,
    baixarArquivo,
  } = useDocumentacaoFuncionarios();

  const handleBaixarTodos = async (funcionario: FuncionarioDocumento) => {
    const docsComArquivo = TIPOS_DOCUMENTO.filter(t => funcionario.documentos[t.tipo].arquivo_url);
    if (docsComArquivo.length === 0) {
      toast.error('Nenhum arquivo disponível para download');
      return;
    }

    toast.info(`Baixando ${docsComArquivo.length} arquivo(s)...`);

    for (const tipoInfo of docsComArquivo) {
      const doc = funcionario.documentos[tipoInfo.tipo];
      if (doc.arquivo_url) {
        try {
          const { data, error } = await supabase.storage
            .from('documentos-funcionarios')
            .download(doc.arquivo_url);
          if (error) throw error;

          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${funcionario.nome}_${tipoInfo.nome}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {
          toast.error(`Erro ao baixar ${tipoInfo.nome}`);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentação de Funcionários</h1>
        <p className="text-muted-foreground">Acompanhamento de documentos, validade e alertas de vencimento.</p>
      </div>

      <DocumentacaoDashboard
        contagens={contagens}
        statusFiltro={statusFiltro}
        onStatusClick={setStatusFiltro}
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar funcionário..."
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filialFiltro} onValueChange={setFilialFiltro}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por filial" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as filiais</SelectItem>
            {filiais.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : funcionarios.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum funcionário encontrado
        </div>
      ) : (
        <div className="space-y-3">
          {funcionarios.map((f) => (
            <FuncionarioDocCard
              key={f.id}
              funcionario={f}
              onSalvarComData={salvarDocumento}
              onMarcarSemValidade={marcarDocumentoSemValidade}
              onUploadArquivo={uploadArquivo}
              onExcluirArquivo={excluirArquivo}
              onBaixarArquivo={baixarArquivo}
              onBaixarTodos={handleBaixarTodos}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentacaoFuncionarios;
