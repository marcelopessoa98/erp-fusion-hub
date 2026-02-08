import { forwardRef } from 'react';
import { Proposta } from '@/hooks/usePropostas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import headerImg from '@/assets/proposta-header.png';
import footerImg from '@/assets/proposta-footer.png';
import assinaturaImg from '@/assets/proposta-assinatura.jpg';

interface PropostaA4PreviewProps {
  proposta: Proposta;
}

const PAGE_STYLE: React.CSSProperties = {
  width: '210mm',
  minHeight: '297mm',
  position: 'relative',
  background: '#fff',
  fontFamily: "'Times New Roman', Times, serif",
  fontSize: '11px',
  lineHeight: 1.5,
  color: '#000',
  pageBreakAfter: 'always',
  boxSizing: 'border-box',
};

const CONTENT_STYLE: React.CSSProperties = {
  padding: '12mm 22mm 38mm 22mm',
};

const HEADER_STYLE: React.CSSProperties = {
  width: '100%',
  display: 'block',
};

const FOOTER_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  display: 'block',
};

export const PropostaA4Preview = forwardRef<HTMLDivElement, PropostaA4PreviewProps>(
  ({ proposta }, ref) => {
    const dataFormatada = format(new Date(proposta.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    return (
      <div ref={ref} className="proposta-print-root">
        {/* ═══ PAGE 1 ═══ */}
        <div style={PAGE_STYLE}>
          <img src={headerImg} alt="" style={HEADER_STYLE} />
          <div style={CONTENT_STYLE}>
            {/* INFO */}
            <table style={{ width: '100%', fontSize: '10px', marginBottom: '6mm', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ padding: '2px 0' }}><strong>Proposta:</strong> {proposta.numero}</td>
                  <td style={{ padding: '2px 0', textAlign: 'right' }}><strong>Data:</strong> {dataFormatada}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ padding: '2px 0' }}><strong>Assunto:</strong> {proposta.assunto}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ padding: '2px 0' }}><strong>Solicitante/Contratante:</strong> {proposta.clientes?.nome || '—'}</td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ padding: '2px 0' }}>
                    <strong>Obra:</strong> {proposta.obras?.nome || '—'} {proposta.obras?.referencia ? `(${proposta.obras.referencia})` : ''}
                  </td>
                </tr>
                {proposta.elaborado_por && (
                  <tr>
                    <td colSpan={2} style={{ padding: '2px 0' }}><strong>Elaborado por:</strong> {proposta.elaborado_por}</td>
                  </tr>
                )}
                {proposta.aprovado_por_nome && (
                  <tr>
                    <td colSpan={2} style={{ padding: '2px 0' }}><strong>Aprovado por:</strong> {proposta.aprovado_por_nome}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* ITEMS TABLE */}
            {proposta.itens && proposta.itens.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#3c3c3c', color: '#fff' }}>
                    <th style={{ border: '1px solid #666', padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>ENSAIO/SERVIÇO</th>
                    <th style={{ border: '1px solid #666', padding: '4px 8px', textAlign: 'right', fontWeight: 600, width: '130px' }}>VALOR (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {proposta.itens.map((item, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f5f5f5' }}>
                      <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{item.descricao}</td>
                      <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right' }}>
                        {Number(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/{item.unidade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Incluso */}
            {proposta.itens?.[0]?.detalhes && (
              <div style={{ marginBottom: '4mm' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '2px' }}>Incluso:</p>
                {proposta.itens[0].detalhes.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} style={{ margin: '1px 0', paddingLeft: '4mm' }}>
                    • {line.trim().replace(/^[-•]\s*/, '')}
                  </p>
                ))}
              </div>
            )}

            {/* CONSIDERAÇÕES GERAIS */}
            <SectionTitle>CONSIDERAÇÕES GERAIS</SectionTitle>
            {proposta.consideracoes_gerais && (
              <div style={{ marginBottom: '4mm' }}>
                {proposta.consideracoes_gerais.split('\n').filter(Boolean).map((line, i) => {
                  const trimmed = line.trim().replace(/^[•-]\s*/, '');
                  if (!trimmed) return null;
                  return <p key={i} style={{ margin: '1px 0', paddingLeft: '4mm', textAlign: 'justify' }}>• {trimmed}</p>;
                })}
              </div>
            )}

            {/* CONSIDERAÇÕES DE PAGAMENTO */}
            <SectionTitle>CONSIDERAÇÕES DE PAGAMENTO</SectionTitle>
            {proposta.consideracoes_pagamento && (
              <p style={{ marginBottom: '3mm', textAlign: 'justify' }}>{proposta.consideracoes_pagamento}</p>
            )}

            {/* DADOS BANCÁRIOS */}
            {proposta.dados_bancarios && Object.keys(proposta.dados_bancarios).length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4mm', fontSize: '10px' }}>
                <tbody>
                  {Object.entries(proposta.dados_bancarios).map(([key, val]) => (
                    <tr key={key}>
                      <td style={{ border: '1px solid #ccc', padding: '2px 8px', fontWeight: 'bold', textTransform: 'uppercase', backgroundColor: '#f5f5f5', width: '100px' }}>{key}</td>
                      <td style={{ border: '1px solid #ccc', padding: '2px 8px' }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* VALIDADE */}
            <p style={{ marginTop: '4mm' }}>
              <strong>Validade da Proposta:</strong> {proposta.validade_dias} dias
            </p>
          </div>
          <img src={footerImg} alt="" style={FOOTER_STYLE} />
        </div>

        {/* ═══ PAGE 2 ═══ */}
        <div style={{ ...PAGE_STYLE, pageBreakAfter: 'auto' }}>
          <img src={headerImg} alt="" style={HEADER_STYLE} />
          <div style={CONTENT_STYLE}>
            {/* ACEITE */}
            <SectionTitle>ACEITE DA PROPOSTA</SectionTitle>
            <p style={{ marginBottom: '3mm' }}>
              Para aprovação, preencher os dados abaixo e enviar pelo e-mail: <strong>comercial@concrefuji.com.br</strong>
            </p>
            <p style={{ marginBottom: '12mm' }}>De acordo com os valores orçados autorizo a realização do serviço:</p>

            <div style={{ marginBottom: '3mm' }}>
              <div style={{ borderBottom: '1px solid #000', width: '80mm' }} />
              <p style={{ fontSize: '9px', color: '#666', marginTop: '1mm' }}>Assinatura do responsável pela autorização</p>
            </div>
            <p style={{ fontSize: '10px', marginBottom: '15mm' }}>Data: _____/_____/_______</p>

            {/* ASSINATURA CONCREFUJI */}
            <div style={{ marginTop: '20mm' }}>
              <p style={{ fontWeight: 'bold', fontSize: '12px' }}>CONCREFUJI TECNOLOGIA</p>
              <p style={{ fontWeight: 'bold' }}>RAFAELA FUJITA LIMA</p>
              <p style={{ fontSize: '10px' }}>Engenheira Responsável</p>
              <p style={{ fontSize: '10px' }}>CREA nº 12.208-D</p>
              <img src={assinaturaImg} alt="Assinatura" style={{ width: '50mm', marginTop: '3mm' }} />
            </div>
          </div>
          <img src={footerImg} alt="" style={FOOTER_STYLE} />
        </div>

        <style>{`
          @media print {
            .proposta-print-root {
              margin: 0;
              padding: 0;
            }
            @page {
              size: A4;
              margin: 0;
            }
          }
        `}</style>
      </div>
    );
  }
);

PropostaA4Preview.displayName = 'PropostaA4Preview';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: '#c41e1e', marginBottom: '2mm', marginTop: '4mm' }}>
      {children}
    </h2>
  );
}
