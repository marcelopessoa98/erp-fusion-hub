import { Proposta } from '@/hooks/usePropostas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoImg from '@/assets/logo.png';

interface PropostaA4PreviewProps {
  proposta: Proposta;
}

const FOOTER_TEXT = {
  doc: 'FOR-CFT-025 V.01',
  date: 'Data de elaboração: 10/08/2022',
  copy: 'COPIA CONTROLADA',
  prohibition: 'A reprodução parcial ou integral do presente documento é expressamente proibida.',
  address: 'Rua Nunes Valente 3840, Fortaleza – CE / Brasil – CEP 60120-295',
  phone: 'Fone: (85) 3016-1557 / (85) 9 88620675 | Email: concrefuji@gmail.com',
};

export function PropostaA4Preview({ proposta }: PropostaA4PreviewProps) {
  const dataFormatada = format(new Date(proposta.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="bg-white text-black font-['Times_New_Roman',_serif] text-[11px] leading-[1.5] mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '15mm 20mm', boxShadow: '0 0 20px rgba(0,0,0,0.15)' }}>
      {/* HEADER */}
      <div className="flex items-center justify-between border-b-2 border-[#c41e1e] pb-3 mb-4">
        <img src={logoImg} alt="ConcreFuji" className="h-14 object-contain" />
        <div className="text-right">
          <h1 className="text-[16px] font-bold text-[#c41e1e] tracking-wide">PROPOSTA COMERCIAL</h1>
          <p className="text-[9px] text-gray-500 mt-1">CONCREFUJI TECNOLOGIA EM CONCRETO LTDA</p>
        </div>
      </div>

      {/* INFO BAR */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4 text-[10px] border border-gray-300 rounded p-3 bg-gray-50">
        <div><strong>Proposta Nº:</strong> {proposta.numero}</div>
        <div><strong>Data:</strong> {dataFormatada}</div>
        <div><strong>Assunto:</strong> {proposta.assunto}</div>
        <div><strong>Validade:</strong> {proposta.validade_dias} dias</div>
        <div><strong>Solicitante/Contratante:</strong> {proposta.clientes?.nome || '—'}</div>
        <div><strong>Obra:</strong> {proposta.obras?.nome || '—'} {proposta.obras?.referencia ? `(${proposta.obras.referencia})` : ''}</div>
        {proposta.elaborado_por && (
          <div><strong>Elaborado por:</strong> {proposta.elaborado_por}</div>
        )}
        {proposta.aprovado_por_nome && (
          <div><strong>Aprovado por:</strong> {proposta.aprovado_por_nome}</div>
        )}
      </div>

      {/* 1. OBJETO DA PROPOSTA */}
      <SectionTitle number={1} title="OBJETO DA PROPOSTA" />
      <p className="mb-3 text-justify">
        Visando atender a demanda solicitada, o Laboratório ConcreFuji Tecnologia apresenta a seguinte proposta comercial para a realização do(s) ensaio(s) e/ou serviço(s) abaixo elencados:
      </p>

      {/* TABELA DE ITENS */}
      {proposta.itens && proposta.itens.length > 0 && (
        <table className="w-full border-collapse mb-3">
          <thead>
            <tr className="bg-[#3c3c3c] text-white text-[10px]">
              <th className="border border-gray-400 px-3 py-2 text-left font-semibold">ENSAIO/SERVIÇO</th>
              <th className="border border-gray-400 px-3 py-2 text-right font-semibold w-[140px]">VALOR (R$)</th>
            </tr>
          </thead>
          <tbody>
            {proposta.itens.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-3 py-2">{item.descricao}</td>
                <td className="border border-gray-300 px-3 py-2 text-right">
                  {Number(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{item.unidade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Detalhes / Incluso */}
      {proposta.itens?.[0]?.detalhes && (
        <div className="mb-4">
          <p className="font-bold mb-1">Incluso:</p>
          <ul className="list-none pl-2">
            {proposta.itens[0].detalhes.split('\n').filter(Boolean).map((line, i) => (
              <li key={i} className="before:content-['•'] before:mr-2">
                {line.trim().replace(/^[-•]\s*/, '')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2. CONSIDERAÇÕES GERAIS */}
      <SectionTitle number={2} title="CONSIDERAÇÕES GERAIS" />
      {proposta.consideracoes_gerais && (
        <ul className="list-none pl-0 mb-4 space-y-1">
          {proposta.consideracoes_gerais.split('\n').filter(Boolean).map((line, i) => {
            const trimmed = line.trim().replace(/^[•-]\s*/, '');
            if (!trimmed) return null;
            return (
              <li key={i} className="text-justify pl-3">
                <span className="mr-1">•</span>{trimmed}
              </li>
            );
          })}
        </ul>
      )}

      {/* 3. CONSIDERAÇÕES DE PAGAMENTO */}
      <SectionTitle number={3} title="CONSIDERAÇÕES DE PAGAMENTO" />
      {proposta.consideracoes_pagamento && (
        <p className="mb-3 text-justify">{proposta.consideracoes_pagamento}</p>
      )}

      {/* DADOS BANCÁRIOS */}
      {proposta.dados_bancarios && Object.keys(proposta.dados_bancarios).length > 0 && (
        <table className="w-full border-collapse mb-4 text-[10px]">
          <tbody>
            {Object.entries(proposta.dados_bancarios).map(([key, val]) => (
              <tr key={key}>
                <td className="border border-gray-300 px-3 py-1.5 font-bold uppercase bg-gray-50 w-[100px]">{key}</td>
                <td className="border border-gray-300 px-3 py-1.5">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ACEITE */}
      <div className="mt-6 mb-6">
        <p className="font-bold text-[12px] text-[#c41e1e] mb-2">• ACEITE DA PROPOSTA</p>
        <p className="mb-1">Validade da Proposta: <strong>{proposta.validade_dias} dias</strong></p>
        <p className="mb-4">Para aprovação, preencher os dados abaixo e enviar pelo e-mail: <strong>comercial@concrefuji.com.br</strong></p>
        <p className="mb-6">De acordo com os valores orçados autorizo a realização do serviço:</p>

        <div className="mt-8 mb-2">
          <div className="border-b border-black w-[300px]" />
          <p className="text-[9px] text-gray-600 mt-1">Assinatura do responsável pela autorização</p>
        </div>
        <p className="text-[10px]">Data: _____/_____/_______</p>
      </div>

      {/* ASSINATURA CONCREFUJI */}
      <div className="mt-10 pt-4 border-t border-gray-200">
        <p className="font-bold text-[12px]">CONCREFUJI TECNOLOGIA</p>
        <p className="font-bold">RAFAELA FUJITA LIMA</p>
        <p className="text-[10px]">Engenheira Responsável</p>
        <p className="text-[10px]">CREA nº 12.208-D</p>
      </div>

      {/* FOOTER */}
      <div className="mt-8 pt-3 border-t border-gray-300 text-[7px] text-gray-500 text-center space-y-0.5">
        <div className="flex justify-between">
          <span>{FOOTER_TEXT.doc}</span>
          <span className="font-semibold">{FOOTER_TEXT.copy}</span>
          <span>{FOOTER_TEXT.date}</span>
        </div>
        <p>{FOOTER_TEXT.prohibition}</p>
        <p>{FOOTER_TEXT.address}</p>
        <p>{FOOTER_TEXT.phone}</p>
      </div>
    </div>
  );
}

function SectionTitle({ number, title }: { number: number; title: string }) {
  return (
    <h2 className="text-[13px] font-bold text-[#c41e1e] mb-2 mt-4">
      {number}. {title}
    </h2>
  );
}
