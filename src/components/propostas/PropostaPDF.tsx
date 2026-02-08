import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Proposta } from '@/hooks/usePropostas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RED = [196, 30, 30] as const;
const DARK = [60, 60, 60] as const;

export async function gerarPropostaPDF(proposta: Proposta) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 15;

  const dataFormatada = format(new Date(proposta.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // ─── HEADER ───
  const addHeader = () => {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('CONCREFUJI TECNOLOGIA EM CONCRETO LTDA', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(15);
    doc.setTextColor(...RED);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA COMERCIAL', pageWidth / 2, y, { align: 'center' });
    y += 3;
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);
  };

  const sectionTitle = (num: number, title: string) => {
    checkPageBreak(15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RED);
    doc.text(`${num}. ${title}`, margin, y);
    y += 7;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > 265) {
      addFooter(doc, doc.getNumberOfPages());
      doc.addPage();
      y = 20;
    }
  };

  // ─── PAGE 1 ───
  addHeader();

  // Info box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Proposta Nº: ${proposta.numero}`, margin, y);
  doc.text(`Data: ${dataFormatada}`, pageWidth / 2, y);
  y += 6;
  doc.text(`Assunto: ${proposta.assunto}`, margin, y);
  doc.text(`Validade: ${proposta.validade_dias} dias`, pageWidth / 2, y);
  y += 6;
  doc.text(`Solicitante/Contratante: ${proposta.clientes?.nome || ''}`, margin, y);
  y += 6;
  doc.text(`Obra: ${proposta.obras?.nome || ''} ${proposta.obras?.referencia ? `(${proposta.obras.referencia})` : ''}`, margin, y);
  y += 6;
  if (proposta.elaborado_por) {
    doc.text(`Elaborado por: ${proposta.elaborado_por}`, margin, y);
    y += 6;
  }
  if (proposta.aprovado_por_nome) {
    doc.text(`Aprovado por: ${proposta.aprovado_por_nome}`, margin, y);
    y += 6;
  }
  doc.setFont('helvetica', 'normal');
  y += 4;

  // 1. OBJETO
  sectionTitle(1, 'OBJETO DA PROPOSTA');
  const objetoText = 'Visando atender a demanda solicitada, o Laboratório ConcreFuji Tecnologia apresenta a seguinte proposta comercial para a realização do(s) ensaio(s) e/ou serviço(s) abaixo elencados:';
  const objetoLines = doc.splitTextToSize(objetoText, contentWidth);
  doc.text(objetoLines, margin, y);
  y += objetoLines.length * 5 + 5;

  // Items table
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
      headStyles: { fillColor: [...DARK], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } },
    });
    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // Detalhes
  if (proposta.itens?.[0]?.detalhes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Incluso:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    proposta.itens[0].detalhes.split('\n').filter(Boolean).forEach((line) => {
      const trimmed = line.trim().replace(/^[-•]\s*/, '');
      const wrapped = doc.splitTextToSize(`• ${trimmed}`, contentWidth - 5);
      checkPageBreak(wrapped.length * 5);
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 5;
    });
    y += 5;
  }

  // 2. CONSIDERAÇÕES GERAIS
  sectionTitle(2, 'CONSIDERAÇÕES GERAIS');
  if (proposta.consideracoes_gerais) {
    proposta.consideracoes_gerais.split('\n').filter(Boolean).forEach((line) => {
      const trimmed = line.trim().replace(/^[-•]\s*/, '');
      if (!trimmed) return;
      const wrapped = doc.splitTextToSize(`• ${trimmed}`, contentWidth - 5);
      checkPageBreak(wrapped.length * 5 + 2);
      doc.text(wrapped, margin + 3, y);
      y += wrapped.length * 5 + 2;
    });
  }
  y += 5;

  // 3. CONSIDERAÇÕES DE PAGAMENTO
  sectionTitle(3, 'CONSIDERAÇÕES DE PAGAMENTO');
  if (proposta.consideracoes_pagamento) {
    const cpLines = doc.splitTextToSize(proposta.consideracoes_pagamento, contentWidth);
    checkPageBreak(cpLines.length * 5 + 5);
    doc.text(cpLines, margin, y);
    y += cpLines.length * 5 + 5;
  }

  // Banking data
  const db = proposta.dados_bancarios || {};
  if (Object.keys(db).length > 0) {
    checkPageBreak(Object.keys(db).length * 8 + 10);
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
  checkPageBreak(60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('• ACEITE DA PROPOSTA', margin, y);
  y += 7;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Validade da Proposta: ${proposta.validade_dias} dias`, margin, y);
  y += 6;
  doc.text('Para aprovação, preencher os dados abaixo e enviar pelo e-mail: comercial@concrefuji.com.br', margin, y);
  y += 10;
  doc.text('De acordo com os valores orçados autorizo a realização do serviço:', margin, y);
  y += 15;

  doc.line(margin, y, margin + 80, y);
  y += 5;
  doc.setFontSize(9);
  doc.text('Assinatura do responsável pela autorização', margin, y);
  y += 8;
  doc.text('Data: _____/_____/_______', margin, y);
  y += 15;

  // Signature
  checkPageBreak(25);
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

  // Footers
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
    pageWidth / 2, pageHeight - 14, { align: 'center' }
  );
  doc.text(
    'Rua Nunes Valente 3840, Fortaleza – CE / Brasil – CEP 60120-295',
    pageWidth / 2, pageHeight - 8, { align: 'center' }
  );
  doc.text(
    'Fone: (85) 3016-1557 / (85) 9 88620675 | Email: concrefuji@gmail.com',
    pageWidth / 2, pageHeight - 4, { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
}
