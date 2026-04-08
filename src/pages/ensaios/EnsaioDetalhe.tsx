import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnsaios, CamposEspecificos } from '@/hooks/useEnsaios';
import { ArrowLeft, Save } from 'lucide-react';

const CAMPOS_POR_TIPO: Record<string, { key: keyof CamposEspecificos; label: string; type: string }[]> = {
  'Arrancamento': [
    { key: 'carga_maxima', label: 'Carga Máxima (kN)', type: 'number' },
    { key: 'diametro_chumbador', label: 'Diâmetro do Chumbador', type: 'text' },
    { key: 'profundidade', label: 'Profundidade', type: 'text' },
  ],
  'Extração': [
    { key: 'diametro_corpo_prova', label: 'Diâmetro do Corpo de Prova', type: 'text' },
    { key: 'resistencia_compressao', label: 'Resistência à Compressão (MPa)', type: 'number' },
  ],
  'Esclerometria': [
    { key: 'indice_esclerometrico', label: 'Índice Esclerométrico', type: 'number' },
    { key: 'superficie_ensaiada', label: 'Superfície Ensaiada', type: 'text' },
  ],
  'PIT': [
    { key: 'comprimento_estaca', label: 'Comprimento da Estaca (m)', type: 'number' },
    { key: 'tipo_estaca', label: 'Tipo de Estaca', type: 'text' },
    { key: 'impedancia', label: 'Impedância', type: 'text' },
  ],
};

export default function EnsaioDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ensaios, updateEnsaio, isUpdating } = useEnsaios();

  const ensaio = ensaios.find(e => e.id === id);
  const [status, setStatus] = useState('pendente');
  const [resultado, setResultado] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [campos, setCampos] = useState<CamposEspecificos>({});

  useEffect(() => {
    if (ensaio) {
      setStatus(ensaio.status);
      setResultado(ensaio.resultado || '');
      setObservacoes(ensaio.observacoes || '');
      setCampos(ensaio.campos_especificos || {});
    }
  }, [ensaio]);

  const handleSave = async () => {
    if (!id) return;
    await updateEnsaio({
      id,
      status,
      resultado,
      observacoes,
      campos_especificos: campos,
    });
  };

  if (!ensaio) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/ensaios')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
        <div className="text-center py-12 text-muted-foreground">Ensaio não encontrado.</div>
      </div>
    );
  }

  const camposConfig = CAMPOS_POR_TIPO[ensaio.tipo] || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/ensaios')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{ensaio.tipo}</h1>
            <p className="text-sm text-muted-foreground">
              {ensaio.clientes?.nome} • {ensaio.obras?.nome}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isUpdating}>
          <Save className="h-4 w-4 mr-2" />{isUpdating ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Resultado</Label>
              <Textarea value={resultado} onChange={e => setResultado(e.target.value)} placeholder="Resultado do ensaio..." rows={3} />
            </div>
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações..." rows={3} />
            </div>
          </CardContent>
        </Card>

        {camposConfig.length > 0 && (
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Dados Específicos — {ensaio.tipo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {camposConfig.map(campo => (
                <div key={campo.key}>
                  <Label className="text-xs">{campo.label}</Label>
                  <Input
                    type={campo.type}
                    value={(campos as any)[campo.key] || ''}
                    onChange={e => setCampos(prev => ({
                      ...prev,
                      [campo.key]: campo.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                    }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
