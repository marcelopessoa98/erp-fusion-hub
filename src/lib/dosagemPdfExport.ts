import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaterialLaudo {
  nome: string;
  massa: number;
  tipo: 'cimento' | 'areia' | 'brita' | 'agua' | 'aditivo';
  descricaoCimento?: string; // e.g. "MIZU CP III 32 RS"
  volumePadiola?: string; // e.g. "2 padiolas 45x35x14 cm³"
}

interface ResponsavelTecnico {
  nome: string;
  cargo: string;
  crea: string;
  carimboUrl: string | null;
}

interface DosagemLaudoParams {
  cliente: string;
  obra: string;
  dataEnsaio: string;
  responsavel: ResponsavelTecnico;
  fck: number;
  slump: string;
  relacaoAC: number;
  tracoUnitario: string;
  teorArgamassa: number;
  materiais: MaterialLaudo[];
  agua: number;
  volumePadiolas?: { material: string; descricao: string }[];
}

export async function gerarLaudoDosagemPDF(params: DosagemLaudoParams) {
  const {
    cliente, obra, dataEnsaio, responsavel,
    fck, slump, relacaoAC, tracoUnitario,
    teorArgamassa, materiais, agua, volumePadiolas,
  } = params;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // --- LOGO ---
  // Try to load logo from assets
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    // Use a data URL or public path for the logo
    logoImg.src = '/logo-concrefuji.png';
    // We'll add it if loaded, otherwise skip
  } catch { /* skip logo */ }

  // --- HEADER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(200, 30, 30);
  doc.text('CONCRE FUJI', margin, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const dataFormatada = format(new Date(dataEnsaio + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const cidadeData = `Fortaleza, ${dataFormatada}`;
  doc.text(cidadeData, margin, y); y += 5;
  doc.text(`A ${cliente}`, margin, y); y += 5;
  doc.text(`Obra: ${obra}`, margin, y); y += 10;

  // --- TÍTULO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Estudo de Dosagem para o Concreto - Fck = ${fck} MPa e abatimento de ${slump}`, margin, y);
  y += 10;

  // --- TRAÇO EM PESO ---
  doc.setFontSize(11);
  doc.text('Traço em peso:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`  ${tracoUnitario}`, margin + 35, y);
  y += 10;

  // --- TRAÇO EM VOLUME PARA 1 SACO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Traço em volume para 1 saco de cimento', margin, y);
  y += 6;

  const cimento = materiais.find(m => m.tipo === 'cimento');
  const areias = materiais.filter(m => m.tipo === 'areia');
  const britas = materiais.filter(m => m.tipo === 'brita');
  const aditivos = materiais.filter(m => m.tipo === 'aditivo');

  const volumeRows: string[][] = [];
  volumeRows.push(['Cimento', `01 saco de 50 kg${cimento?.descricaoCimento ? ` – ${cimento.descricaoCimento}` : ''}`]);
  
  for (const adit of aditivos) {
    volumeRows.push(['Aditivo', adit.volumePadiola || '']);
  }
  if (aditivos.length === 0) {
    volumeRows.push(['Aditivo', '']);
  }

  // Calculate padiola volumes based on cement ratio
  const massaCimento = cimento?.massa || 50;
  for (const areia of areias) {
    const ratio = areia.massa / massaCimento;
    const padiolaDesc = volumePadiolas?.find(p => p.material === areia.nome)?.descricao || 
      areia.volumePadiola || '';
    volumeRows.push([areia.nome, padiolaDesc]);
  }
  for (const brita of britas) {
    const padiolaDesc = volumePadiolas?.find(p => p.material === brita.nome)?.descricao ||
      brita.volumePadiola || '';
    volumeRows.push([brita.nome, padiolaDesc]);
  }

  autoTable(doc, {
    startY: y,
    head: [],
    body: volumeRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', halign: 'center' },
      1: { cellWidth: contentWidth - 40 },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // --- TEOR DE ARGAMASSA ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Teor de Argamassa:`, margin, y);
  doc.text(`${teorArgamassa.toFixed(2)}%`, margin + 60, y);
  y += 10;

  // --- CONSUMO POR M³ ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CONSUMO DOS MATERIAIS POR M3', margin, y);
  y += 2;

  const consumoRows: string[][] = [];
  for (const mat of materiais) {
    if (mat.tipo === 'agua') continue;
    consumoRows.push([mat.nome, mat.massa.toString(), '']);
  }
  consumoRows.push(['Água', '', agua.toFixed(1)]);

  autoTable(doc, {
    startY: y,
    head: [['Material', 'Em peso (kg)', 'Em volume (l)']],
    body: consumoRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 40, halign: 'center' },
      2: { cellWidth: 40, halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // --- TABELA DE CORREÇÃO DE ÁGUA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TABELA DE CORREÇÃO DE ÁGUA PARA UM TRAÇO DE UM SACO DE CIMENTO', margin, y);
  y += 2;

  // Calculate water correction table
  const aguaPorSaco = (agua / massaCimento) * 50;
  const totalAreiasMassa = areias.reduce((s, a) => s + a.massa, 0);
  const areiaPorSaco = (totalAreiasMassa / massaCimento) * 50;
  
  const correcaoRows: string[][] = [];
  for (let umidade = 0; umidade <= 7; umidade++) {
    const correcao = areiaPorSaco * (umidade / 100);
    const aguaCorrigida = aguaPorSaco - correcao;
    correcaoRows.push([umidade.toString(), aguaCorrigida.toFixed(1)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Umidade %', 'Água (litro)']],
    body: correcaoRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 35, halign: 'center' },
      1: { cellWidth: 35, halign: 'center' },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // --- ASSINATURA ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Atc,', margin, y);
  y += 8;

  // Try to load and add stamp image
  if (responsavel.carimboUrl) {
    try {
      const img = await loadImageAsBase64(responsavel.carimboUrl);
      if (img) {
        doc.addImage(img, 'PNG', margin, y, 50, 25);
        y += 28;
      }
    } catch {
      // Fallback to text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('CONCREFUJI TECNOLOGIA', margin, y); y += 4;
      doc.text(responsavel.nome.toUpperCase(), margin, y); y += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(responsavel.cargo, margin, y); y += 4;
      if (responsavel.crea) {
        doc.text(`CREA n° ${responsavel.crea}`, margin, y);
      }
    }
  } else {
    // Text-only signature
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('CONCREFUJI TECNOLOGIA', margin, y); y += 4;
    doc.text(responsavel.nome.toUpperCase(), margin, y); y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(responsavel.cargo, margin, y); y += 4;
    if (responsavel.crea) {
      doc.text(`CREA n° ${responsavel.crea}`, margin, y);
    }
  }

  // Save
  const fileName = `Dosagem_fck_${fck}_MPa_${obra.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
