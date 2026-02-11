import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NCForPDF {
  titulo: string;
  descricao: string;
  gravidade: string;
  status: string;
  data_ocorrencia: string;
  acao_corretiva: string | null;
  data_resolucao: string | null;
  funcionario?: { nome: string } | null;
  cliente?: { nome: string } | null;
  filial?: { nome: string } | null;
  obra?: { nome: string } | null;
  filiais?: { nome: string } | null;
  funcionarios?: { nome: string } | null;
  clientes?: { nome: string } | null;
  obras?: { nome: string } | null;
}

const gravidadeLabels: Record<string, string> = {
  leve: 'Leve',
  media: 'Média',
  grave: 'Grave',
  gravissima: 'Gravíssima',
  critica: 'Crítica',
};

const statusLabels: Record<string, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em Andamento',
  em_analise: 'Em Análise',
  resolvida: 'Resolvida',
  cancelada: 'Cancelada',
  fechada: 'Fechada',
};

export function exportNCsPDF(
  ncs: NCForPDF[],
  titulo: string,
  filtros?: { funcionario?: string; obra?: string; filial?: string }
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // Title
  doc.setFontSize(16);
  doc.text(titulo, 14, 18);

  // Subtitle with filters
  doc.setFontSize(10);
  const filterParts: string[] = [];
  if (filtros?.funcionario) filterParts.push(`Funcionário: ${filtros.funcionario}`);
  if (filtros?.obra) filterParts.push(`Obra: ${filtros.obra}`);
  if (filtros?.filial) filterParts.push(`Filial: ${filtros.filial}`);
  const subtitle = filterParts.length > 0
    ? filterParts.join(' | ')
    : 'Todas as NCs';
  doc.text(`${subtitle}  •  Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 25);

  doc.setFontSize(9);
  doc.text(`Total: ${ncs.length} registro(s)`, 14, 31);

  // Table
  const headers = ['Data', 'Título', 'Funcionário/Cliente', 'Obra', 'Filial', 'Gravidade', 'Status', 'Ação Corretiva'];

  const rows = ncs.map((nc) => {
    const pessoa = nc.funcionario?.nome || nc.funcionarios?.nome || nc.cliente?.nome || nc.clientes?.nome || '-';
    const obra = nc.obra?.nome || nc.obras?.nome || '-';
    const filial = nc.filial?.nome || nc.filiais?.nome || '-';
    return [
      format(new Date(nc.data_ocorrencia), 'dd/MM/yyyy', { locale: ptBR }),
      nc.titulo,
      pessoa,
      obra,
      filial,
      gravidadeLabels[nc.gravidade] || nc.gravidade,
      statusLabels[nc.status] || nc.status,
      nc.acao_corretiva || '-',
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 65, 122], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 40 },
      7: { cellWidth: 50 },
    },
  });

  const fileName = `ncs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
  doc.save(fileName);
}
