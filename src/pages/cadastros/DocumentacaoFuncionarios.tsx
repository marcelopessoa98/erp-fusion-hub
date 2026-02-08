import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentacaoDashboard } from '@/components/documentacao/DocumentacaoDashboard';
import { FuncionarioDocRow } from '@/components/documentacao/FuncionarioDocRow';
import { useDocumentacaoFuncionarios, TIPOS_DOCUMENTO } from '@/hooks/useDocumentacaoFuncionarios';

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
  } = useDocumentacaoFuncionarios();

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
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Funcionário</TableHead>
                {TIPOS_DOCUMENTO.map((t) => (
                  <TableHead key={t.tipo} className="text-center text-xs min-w-[130px]">
                    {t.nome}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionarios.length === 0 ? (
                <TableRow>
                  <td colSpan={TIPOS_DOCUMENTO.length + 1} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário encontrado
                  </td>
                </TableRow>
              ) : (
                funcionarios.map((f) => (
                  <FuncionarioDocRow
                    key={f.id}
                    funcionario={f}
                    onSalvarComData={salvarDocumento}
                    onMarcarSemValidade={marcarDocumentoSemValidade}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default DocumentacaoFuncionarios;
