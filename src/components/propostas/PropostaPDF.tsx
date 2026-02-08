import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Proposta } from '@/hooks/usePropostas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export async function gerarPropostaPDF(proposta: Proposta) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  const addHeader = () => {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('CONCREFUJI TECNOLOGIA', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA COMERCIAL', pageWidth / 2, y, { align: 'center' });
    y += 10;
  };

  const addLine = () => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  // Page 1
  addHeader();
  addLine();

  // Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Proposta: ${proposta.numero}`, margin, y);
  y += 7;
  doc.text(`Assunto: ${proposta.assunto}`, margin, y);
  y += 7;
  doc.text(`Solicitante/Contratante: ${proposta.clientes?.nome || ''}`, margin, y);
  y += 7;
  doc.text(`Obra: ${proposta.obras?.nome || ''}`, margin, y);
  y += 10;

  // 1. OBJETO DA PROPOSTA
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. OBJETO DA PROPOSTA', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const objetoText = 'Visando atender a demanda solicitada, o Laboratório ConcreFuji Tecnologia apresenta a seguinte proposta comercial para a realização do(s) ensaio(s) e/ou serviço(s) abaixo elencados:';
  const objetoLines = doc.splitTextToSize(objetoText, contentWidth);
  doc.text(objetoLines, margin, y);
  y += objetoLines.length * 5 + 5;

  // Tabela de itens
  if (proposta.itens && proposta.itens.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['ENSAIO/SERVIÇO', 'VALOR (R$)']],
      body: proposta.itens.map((item) => [
        item.descricao,
        `${Number(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/${item.unidade}`,
      ]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // Detalhes dos itens
  if (proposta.itens?.[0]?.detalhes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Incluso:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const detalhesLines = proposta.itens[0].detalhes.split('\n').filter(Boolean);
    detalhesLines.forEach((line) => {
      const trimmed = line.trim().replace(/^[-•]\s*/, '');
      const wrapped = doc.splitTextToSize(`• ${trimmed}`, contentWidth - 5);
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 5;
    });
    y += 5;
  }

  // Check page break
  if (y > 220) {
    addFooter(doc, 1);
    doc.addPage();
    y = 15;
    addHeader();
    addLine();
  }

  // 2. CONSIDERAÇÕES GERAIS
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. CONSIDERAÇÕES GERAIS', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (proposta.consideracoes_gerais) {
    const cgLines = proposta.consideracoes_gerais.split('\n').filter(Boolean);
    cgLines.forEach((line) => {
      const trimmed = line.trim().replace(/^[-•]\s*/, '');
      if (!trimmed) return;
      const wrapped = doc.splitTextToSize(`• ${trimmed}`, contentWidth - 5);
      if (y + wrapped.length * 5 > 260) {
        addFooter(doc, doc.getNumberOfPages());
        doc.addPage();
        y = 20;
      }
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 5 + 2;
    });
  }
  y += 5;

  // Page break for payment
  if (y > 180) {
    addFooter(doc, doc.getNumberOfPages());
    doc.addPage();
    y = 15;
    addHeader();
    addLine();
  }

  // 3. CONSIDERAÇÕES DE PAGAMENTO
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. CONSIDERAÇÕES DE PAGAMENTO', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (proposta.consideracoes_pagamento) {
    const cpLines = doc.splitTextToSize(proposta.consideracoes_pagamento, contentWidth);
    doc.text(cpLines, margin, y);
    y += cpLines.length * 5 + 5;
  }

  // Dados bancários
  const db = proposta.dados_bancarios || {};
  if (Object.keys(db).length > 0) {
    autoTable(doc, {
      startY: y,
      body: Object.entries(db).map(([k, v]) => [k.toUpperCase() + ':', v]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 } },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ACEITE
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('• ACEITE DA PROPOSTA', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Validade da Proposta: ${proposta.validade_dias} dias`, margin, y);
  y += 6;
  doc.text('Para aprovação, preencher os dados abaixo e enviar pelo e-mail: comercial@concrefuji.com.br', margin, y);
  y += 10;
  doc.text('De acordo com os valores orçados autorizo a realização do serviço:', margin, y);
  y += 15;

  // Linha de assinatura
  doc.line(margin, y, margin + 80, y);
  y += 5;
  doc.setFontSize(9);
  doc.text('Assinatura do responsável pela autorização', margin, y);
  y += 8;
  doc.text('Data: _____/_____/_______', margin, y);
  y += 15;

  // Responsável
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONCREFUJI TECNOLOGIA', margin, y);
  y += 5;
  doc.text('RAFAELA FUJITA LIMA', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Engenheira Responsável', margin, y);
  y += 5;
  doc.text('CREA nº 12.208-D', margin, y);

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }

  doc.save(`Proposta_${proposta.numero}.pdf`);
}

function addFooter(doc: jsPDF, page: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text('FOR-CFT-025 V.01', 20, pageHeight - 18);
  doc.text('Data de elaboração: 10/08/2022', 20, pageHeight - 14);
  doc.text(`Página ${page} de ${totalPages}`, 20, pageHeight - 10);
  doc.text('COPIA CONTROLADA', pageWidth / 2, pageHeight - 18, { align: 'center' });
  doc.text(
    'A reprodução parcial ou integral do presente documento é expressamente proibida.',
    pageWidth / 2,
    pageHeight - 14,
    { align: 'center' }
  );
  doc.text(
    'Rua Nunes Valente 3840, Fortaleza – CE / Brasil – CEP 60120-295',
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );
  doc.text(
    'Fone: (85) 3016-1557 / (85) 9 88620675 | Email: concrefuji@gmail.com',
    pageWidth / 2,
    pageHeight - 4,
    { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
}
