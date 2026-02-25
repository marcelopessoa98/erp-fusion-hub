import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CamposEspecificos, TipoEnsaio } from '@/hooks/useEnsaios';

interface Props {
  tipo: TipoEnsaio;
  campos: CamposEspecificos;
  onChange: (campos: CamposEspecificos) => void;
}

export function CamposEspecificosForm({ tipo, campos, onChange }: Props) {
  const set = (key: keyof CamposEspecificos, value: any) => {
    onChange({ ...campos, [key]: value });
  };

  switch (tipo) {
    case 'Arrancamento':
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Carga Máxima (kN)</Label>
            <Input type="number" value={campos.carga_maxima || ''} onChange={e => set('carga_maxima', Number(e.target.value))} />
          </div>
          <div>
            <Label>Diâmetro do Chumbador</Label>
            <Input value={campos.diametro_chumbador || ''} onChange={e => set('diametro_chumbador', e.target.value)} />
          </div>
          <div>
            <Label>Profundidade</Label>
            <Input value={campos.profundidade || ''} onChange={e => set('profundidade', e.target.value)} />
          </div>
        </div>
      );

    case 'Extração':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Diâmetro do Corpo de Prova</Label>
            <Input value={campos.diametro_corpo_prova || ''} onChange={e => set('diametro_corpo_prova', e.target.value)} />
          </div>
          <div>
            <Label>Resistência à Compressão (MPa)</Label>
            <Input type="number" value={campos.resistencia_compressao || ''} onChange={e => set('resistencia_compressao', Number(e.target.value))} />
          </div>
        </div>
      );

    case 'Esclerometria':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Índice Esclerométrico</Label>
            <Input type="number" value={campos.indice_esclerometrico || ''} onChange={e => set('indice_esclerometrico', Number(e.target.value))} />
          </div>
          <div>
            <Label>Superfície Ensaiada</Label>
            <Input value={campos.superficie_ensaiada || ''} onChange={e => set('superficie_ensaiada', e.target.value)} />
          </div>
        </div>
      );

    case 'PIT':
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Comprimento da Estaca (m)</Label>
            <Input type="number" value={campos.comprimento_estaca || ''} onChange={e => set('comprimento_estaca', Number(e.target.value))} />
          </div>
          <div>
            <Label>Tipo de Estaca</Label>
            <Input value={campos.tipo_estaca || ''} onChange={e => set('tipo_estaca', e.target.value)} />
          </div>
          <div>
            <Label>Impedância</Label>
            <Input value={campos.impedancia || ''} onChange={e => set('impedancia', e.target.value)} />
          </div>
        </div>
      );

    case 'Traços':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Concreto</Label>
            <Input value={campos.tipo_concreto || ''} onChange={e => set('tipo_concreto', e.target.value)} />
          </div>
          <div>
            <Label>FCK (MPa)</Label>
            <Input type="number" value={campos.fck || ''} onChange={e => set('fck', Number(e.target.value))} />
          </div>
          <div>
            <Label>Slump</Label>
            <Input value={campos.slump || ''} onChange={e => set('slump', e.target.value)} />
          </div>
          <div>
            <Label>Aditivos</Label>
            <Input value={campos.aditivos || ''} onChange={e => set('aditivos', e.target.value)} />
          </div>
        </div>
      );

    case 'Laudo Cautelar de Vizinhança':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Tipo de Imóvel</Label>
            <Input value={campos.tipo_imovel || ''} onChange={e => set('tipo_imovel', e.target.value)} />
          </div>
          <div>
            <Label>Endereço do Imóvel</Label>
            <Input value={campos.endereco_imovel || ''} onChange={e => set('endereco_imovel', e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Anomalias Encontradas</Label>
            <Textarea value={campos.anomalias_encontradas || ''} onChange={e => set('anomalias_encontradas', e.target.value)} />
          </div>
        </div>
      );

    default:
      return null;
  }
}
