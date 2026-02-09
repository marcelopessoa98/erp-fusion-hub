import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { MedicaoItem } from '@/hooks/useMedicoes';

interface MedicaoPDFData {
  contratanteNome: string;
  contratanteCnpj: string;
  contratadoNome: string;
  contratadoCnpj: string;
  servicos: string;
  numeroProposta: string;
  obraNome: string;
  numeroMedicao: number;
  periodoInicio: string;
  periodoFim: string;
  itens: MedicaoItem[];
  valorTotal: number;
}

function formatCurrency(val: number) {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

export function generateMedicaoPDF(data: MedicaoPDFData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();

  // Header - Logo text
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 0, 0);
  doc.text('CONCRE', pageW / 2 - 20, 18);
  doc.setTextColor(0);
  doc.text('FUJI', pageW / 2 + 12, 18);

  // Subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('MEDIÇÃO MENSAL DOS SERVIÇOS EXECUTADOS', pageW / 2, 26, { align: 'center' });

  // Header info table
  const startY = 30;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  const headerData = [
    ['Contratante:', data.contratanteNome, 'CNPJ:', data.contratanteCnpj],
    ['Contratado:', data.contratadoNome, 'CNPJ:', data.contratadoCnpj],
    ['Serviços:', data.servicos, 'MEDIÇÃO', String(data.numeroMedicao)],
    ['Nº da Proposta:', data.numeroProposta, 'PERÍODO', `${formatDateBR(data.periodoInicio)} A ${formatDateBR(data.periodoFim)}`],
  ];

  autoTable(doc, {
    startY,
    body: headerData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { cellWidth: 72 },
      2: { fontStyle: 'bold', cellWidth: 25 },
      3: { cellWidth: 55 },
    },
    didParseCell: (hookData) => {
      hookData.cell.styles.textColor = [0, 0, 0];
      hookData.cell.styles.fillColor = [255, 255, 255];
    },
  });

  // Obra title
  const afterHeader = (doc as any).lastAutoTable.finalY + 3;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`OBRA: ${data.obraNome}`, pageW / 2, afterHeader, { align: 'center' });

  // Items table
  const tableHead = [['ITEM', 'DESCRIÇÃO', 'UNIDADE', 'QUANTIDADE', 'PREÇO UNITÁRIO', 'QUANT. EXECUTADA', 'VALOR EXECUTADO']];
  const tableBody = data.itens.map((item) => [
    item.ordem.toFixed(1),
    item.descricao,
    item.unidade,
    item.quantidade > 0 ? String(item.quantidade) : '',
    formatCurrency(item.valor_unitario),
    item.checado && item.valor_total > 0 ? formatCurrency(item.valor_total / item.valor_unitario || 0) : '',
    item.checado && item.valor_total > 0 ? formatCurrency(item.valor_total) : '',
  ]);

  autoTable(doc, {
    startY: afterHeader + 3,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 14 },
      1: { cellWidth: 55, halign: 'center' },
      2: { cellWidth: 18 },
      3: { cellWidth: 22 },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 26, halign: 'right' },
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didParseCell: (hookData) => {
      hookData.cell.styles.textColor = [0, 0, 0];
    },
  });

  // Total row
  const afterTable = (doc as any).lastAutoTable.finalY;
  doc.setFillColor(255, 215, 0);
  doc.rect(pageW - 70, afterTable, 60, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', pageW - 65, afterTable + 5);
  doc.text(formatCurrency(data.valorTotal), pageW - 12, afterTable + 5, { align: 'right' });

  doc.save(`medicao_${data.obraNome.replace(/\s+/g, '_')}_${data.numeroMedicao}.pdf`);
}
