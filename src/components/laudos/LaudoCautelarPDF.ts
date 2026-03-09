import jsPDF from 'jspdf';
import type { LaudoCautelar, LaudoFoto } from '@/hooks/useLaudosCautelares';

// Image dimensions in mm
const FOTO_W = 140; // 14cm
const FOTO_H = 105; // 10.5cm
const MAPS_W = 164.7; // 16.47cm
const MAPS_H = 105; // 10.5cm
const FLUXO_W = 134.4; // 13.44cm
const FLUXO_H = 53.7; // 5.37cm

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 25; // left margin (space for red sidebar)
const MARGIN_R = 15;
const MARGIN_T = 30;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const RED: [number, number, number] = [196, 30, 30];
const GRAY: [number, number, number] = [128, 128, 128];
const BLACK: [number, number, number] = [0, 0, 0];

interface EquipeMember {
  nome: string;
  cargo?: string | null;
  formacao?: string | null;
  numero_crea?: string | null;
}

interface PDFData {
  laudo: LaudoCautelar;
  fotos: LaudoFoto[];
  equipe: EquipeMember[];
  logoBase64: string;
  lateralBase64: string;
  rodapeBase64: string;
}

function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function addRedSidebar(doc: jsPDF) {
  doc.setFillColor(...RED);
  doc.rect(0, 0, 8, PAGE_H, 'F');
}

function addHeader(doc: jsPDF, logoBase64: string) {
  // Logo top-left area
  try {
    doc.addImage(logoBase64, 'PNG', MARGIN_L, 8, 40, 12);
  } catch { /* skip if can't load */ }
  
  // Title right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', PAGE_W - MARGIN_R, 16, { align: 'right' });
}

function addFooter(doc: jsPDF, page: number, totalPages: number, rodapeBase64: string) {
  const footerY = PAGE_H - 30;
  
  // Rodape image (city silhouette)
  try {
    doc.addImage(rodapeBase64, 'PNG', 0, PAGE_H - 15, PAGE_W, 10);
  } catch { /* skip */ }
  
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text('Todo o resultado prescrito do presente relatório restringe-se às amostras ensaiadas. A reprodução do documento ou reprodução parcial está sendo proibido.', PAGE_W / 2, footerY, { align: 'center', maxWidth: CONTENT_W });
  doc.text('Concrefuji – CNPJ: 32.721.991/0001-98', PAGE_W / 2, footerY + 6, { align: 'center' });
  doc.text('Rua Nunes Valente 3840, Fortaleza – CE / Brasil- CEP 60120-295 | Fone: (85) 9 9118-0009', PAGE_W / 2, footerY + 10, { align: 'center' });
  doc.text('Email: concrefuji@gmail.com', PAGE_W / 2, footerY + 14, { align: 'center' });
  
  // Page number
  doc.setFontSize(8);
  doc.text(`Página ${page} de ${totalPages}`, PAGE_W - MARGIN_R, footerY + 18, { align: 'right' });
}

function addPageDecorations(doc: jsPDF, logoBase64: string, rodapeBase64: string, page: number, totalPages: number, skipHeader = false) {
  addRedSidebar(doc);
  if (!skipHeader) addHeader(doc, logoBase64);
  addFooter(doc, page, totalPages, rodapeBase64);
}

function newPage(doc: jsPDF): number {
  doc.addPage();
  return MARGIN_T;
}

export async function gerarLaudoCautelarPDF(data: PDFData) {
  const { laudo, fotos, equipe, logoBase64, lateralBase64, rodapeBase64 } = data;
  const doc = new jsPDF('p', 'mm', 'a4');

  // Preload photo images
  const fotoImages: Record<number, string> = {};
  for (const foto of fotos) {
    try {
      fotoImages[foto.numero] = await loadImageAsBase64(foto.foto_url);
    } catch { /* skip failed */ }
  }

  let mapsBase64 = '';
  let fluxoBase64 = '';
  if (laudo.imagem_google_maps) {
    try { mapsBase64 = await loadImageAsBase64(laudo.imagem_google_maps); } catch {}
  }
  if (laudo.imagem_fluxograma) {
    try { fluxoBase64 = await loadImageAsBase64(laudo.imagem_fluxograma); } catch {}
  }

  // We'll track pages, then add decorations at the end
  let pageCount = 0;
  const pages: { skipHeader?: boolean }[] = [];

  const startPage = () => {
    if (pageCount > 0) doc.addPage();
    pageCount++;
    pages.push({});
    return MARGIN_T;
  };

  const startPageNoHeader = () => {
    if (pageCount > 0) doc.addPage();
    pageCount++;
    pages.push({ skipHeader: true });
    return 20;
  };

  // ═══════════ PAGE 1: COVER ═══════════
  let y = startPageNoHeader();
  
  // Cover is special - large centered layout
  addRedSidebar(doc);
  
  // Logo centered
  try {
    doc.addImage(logoBase64, 'PNG', (PAGE_W - 80) / 2, 40, 80, 24);
  } catch {}
  
  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', PAGE_W / 2, 90, { align: 'center' });
  
  // Subtitle - obra name
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  doc.text(laudo.clientes?.nome?.toUpperCase() || '', PAGE_W / 2, 110, { align: 'center', maxWidth: CONTENT_W });
  
  // Address
  doc.setFontSize(12);
  doc.text(laudo.endereco_vistoriado.toUpperCase(), PAGE_W / 2, 125, { align: 'center', maxWidth: CONTENT_W });
  
  // Company info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  y = 160;
  doc.text(`Empresa contratante: ${laudo.clientes?.nome || ''}`, PAGE_W / 2, y, { align: 'center' });
  y += 8;
  const resp = equipe.find(e => e.numero_crea) || equipe[0];
  doc.text(`Responsável: ${resp?.nome || ''}`, PAGE_W / 2, y, { align: 'center' });

  // ═══════════ PAGE 2: EQUIPE TÉCNICA ═══════════
  y = startPage();
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
  y += 10;
  
  doc.setFontSize(13);
  doc.text('Equipe Técnica', MARGIN_L, y);
  y += 10;
  
  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  for (const member of equipe) {
    doc.setFont('helvetica', 'bold');
    doc.text(member.nome, MARGIN_L, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    if (member.cargo) { doc.text(member.cargo, MARGIN_L + 5, y); y += 5; }
    if (member.formacao) { doc.text(member.formacao, MARGIN_L + 5, y); y += 5; }
    if (member.numero_crea) { doc.text(`CREA-CE ${member.numero_crea}`, MARGIN_L + 5, y); y += 5; }
    y += 3;
  }

  // ═══════════ PAGE 3: NOTA PRÉVIA ═══════════
  y = startPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
  y += 10;

  doc.setFontSize(13);
  doc.text('Nota Prévia', MARGIN_L, y);
  y += 10;

  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const notaPrevia = laudo.texto_nota_previa || 
    `O documento apresenta o Laudo Cautelar de Vizinhança realizado nos confrontantes do lote do ${laudo.obras?.nome || ''} (${laudo.clientes?.nome || ''}), Região do ${laudo.bairro || ''}, ${laudo.cidade || 'Fortaleza-CE'}.`;
  
  const notaLines = doc.splitTextToSize(notaPrevia, CONTENT_W);
  doc.text(notaLines, MARGIN_L, y);

  // ═══════════ PAGE 4: SUMÁRIO ═══════════
  y = startPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
  y += 10;

  doc.setFontSize(13);
  doc.text('SUMÁRIO', MARGIN_L, y);
  y += 12;

  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const sumarioItems = [
    '1. OBJETIVO',
    '2. IDENTIFICAÇÃO DO IMÓVEL VISTORIADO',
    '3. IDENTIFICAÇÃO DO IMÓVEL A SER CONSTRUÍDO',
    '4. METODOLOGIA',
    '5. CARACTERÍSTICAS DO IMÓVEL VISTORIADO',
    '6. MEMORIAL FOTOGRÁFICO',
    '7. AVALIAÇÃO FINAL',
  ];
  
  for (const item of sumarioItems) {
    doc.text(item, MARGIN_L, y);
    y += 7;
  }

  // ═══════════ PAGE 5: SECTIONS 1, 2, 3 ═══════════
  y = startPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
  y += 10;

  // Section 1
  doc.setFontSize(12);
  doc.text('1. OBJETIVO', MARGIN_L, y);
  y += 8;
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const objLines = doc.splitTextToSize(laudo.texto_objetivo || '', CONTENT_W);
  doc.text(objLines, MARGIN_L, y);
  y += objLines.length * 5 + 8;

  // Section 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...RED);
  doc.text('2. IDENTIFICAÇÃO DO IMÓVEL VISTORIADO', MARGIN_L, y);
  y += 8;
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Segue as informações coletadas:', MARGIN_L, y); y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text(`Solicitante: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.text(laudo.clientes?.nome || '', MARGIN_L + 25, y); y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Objeto: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.text(laudo.tipo_imovel, MARGIN_L + 18, y); y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Objetivo: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.text(laudo.objetivo || '', MARGIN_L + 22, y); y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Endereço: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.text(laudo.endereco_vistoriado, MARGIN_L + 22, y); y += 10;

  // Section 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...RED);
  doc.text('3. IDENTIFICAÇÃO DO IMÓVEL A SER CONSTRUÍDO', MARGIN_L, y);
  y += 8;
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Segue as informações coletadas:', MARGIN_L, y); y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text(`Proprietário: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.text(laudo.clientes?.nome || '', MARGIN_L + 28, y); y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Tipo de ocupação: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.text(laudo.tipo_ocupacao || '', MARGIN_L + 38, y); y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Características: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  const caracLines = doc.splitTextToSize(laudo.caracteristicas_edificacao || '', CONTENT_W - 35);
  doc.text(caracLines, MARGIN_L + 35, y); y += caracLines.length * 5 + 2;
  doc.setFont('helvetica', 'bold');
  doc.text(`Vias de acesso: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.text(laudo.vias_acesso || '', MARGIN_L + 35, y); y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(`Endereço: `, MARGIN_L, y);
  doc.setFont('helvetica', 'normal');
  doc.text(laudo.obras?.endereco || '', MARGIN_L + 22, y);

  // ═══════════ PAGE 6: METODOLOGIA + MAPS ═══════════
  y = startPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('4. METODOLOGIA', MARGIN_L, y);
  y += 8;
  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const metLines = doc.splitTextToSize(laudo.texto_metodologia || '', CONTENT_W);
  doc.text(metLines, MARGIN_L, y);
  y += metLines.length * 5 + 10;

  // Google Maps image
  if (mapsBase64) {
    const mapsX = MARGIN_L + (CONTENT_W - MAPS_W) / 2;
    if (mapsX >= MARGIN_L) {
      doc.addImage(mapsBase64, 'JPEG', mapsX, y, MAPS_W, MAPS_H);
    } else {
      doc.addImage(mapsBase64, 'JPEG', MARGIN_L, y, CONTENT_W, CONTENT_W * (MAPS_H / MAPS_W));
    }
    y += MAPS_H + 5;
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Fonte: Adaptada Google Earth', MARGIN_L + CONTENT_W / 2, y, { align: 'center' });
  }

  // ═══════════ PAGE 7: CARACTERÍSTICAS + FLUXOGRAMA ═══════════
  y = startPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('5. CARACTERÍSTICAS DO IMÓVEL VISTORIADO', MARGIN_L, y);
  y += 10;

  doc.setTextColor(...BLACK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const caracData = [
    ['Padrão construtivo:', laudo.padrao_construtivo || ''],
    ['Quantidade de pavimentos:', String(laudo.qtd_pavimentos || 1)],
    ['Estruturas:', laudo.estruturas || ''],
    ['Vedação:', laudo.vedacao || ''],
    ['Acabamento de piso:', laudo.acabamento_piso || ''],
    ['Acabamento de paredes:', laudo.acabamento_paredes || ''],
    ['Cobertura:', laudo.cobertura || ''],
  ];

  for (const [label, value] of caracData) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, MARGIN_L, y);
    doc.setFont('helvetica', 'normal');
    const valLines = doc.splitTextToSize(value, CONTENT_W - 55);
    doc.text(valLines, MARGIN_L + 52, y);
    y += Math.max(valLines.length * 5, 6) + 1;
  }

  y += 5;
  doc.setFontSize(9);
  const autoriz = 'O proprietário autorizou a entrada no imóvel e permitiu o registro fotográfico dos cômodos de sua residência. Ele está ciente da garantia pela qual o laudo representa.';
  const autorizLines = doc.splitTextToSize(autoriz, CONTENT_W);
  doc.text(autorizLines, MARGIN_L, y);
  y += autorizLines.length * 5 + 8;

  // Fluxograma
  if (fluxoBase64) {
    const fluxoX = MARGIN_L + (CONTENT_W - FLUXO_W) / 2;
    doc.addImage(fluxoBase64, 'PNG', Math.max(fluxoX, MARGIN_L), y, FLUXO_W, FLUXO_H);
  }

  // ═══════════ PAGES 8+: MEMORIAL FOTOGRÁFICO ═══════════
  // 2 photos per page, centered
  const sortedFotos = [...fotos].sort((a, b) => a.numero - b.numero);
  
  if (sortedFotos.length > 0) {
    y = startPage();
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...RED);
    doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
    y += 10;
    doc.setFontSize(12);
    doc.text('6. MEMORIAL FOTOGRÁFICO', MARGIN_L, y);
    y += 8;
    doc.setTextColor(...BLACK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Segue imagens para constatação do estado atual do imóvel.', MARGIN_L, y);
    y += 8;
    
    let fotosOnPage = 0;
    
    for (let i = 0; i < sortedFotos.length; i++) {
      const foto = sortedFotos[i];
      const imgData = fotoImages[foto.numero];
      if (!imgData) continue;
      
      // Check if need new page (each page fits 2 photos)
      if (fotosOnPage >= 2) {
        y = startPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...RED);
        doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
        y += 12;
        doc.setTextColor(...BLACK);
        fotosOnPage = 0;
      }

      // Photo label
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BLACK);
      doc.text(`Imagem ${foto.numero}`, MARGIN_L, y);
      if (foto.descricao && foto.descricao !== `Imagem ${foto.numero}`) {
        doc.setFont('helvetica', 'normal');
        doc.text(` - ${foto.descricao}`, MARGIN_L + 22, y);
      }
      y += 4;

      // Center the photo
      const fotoX = MARGIN_L + (CONTENT_W - FOTO_W) / 2;
      try {
        doc.addImage(imgData, 'JPEG', Math.max(fotoX, MARGIN_L), y, FOTO_W, FOTO_H);
      } catch { /* skip */ }
      y += FOTO_H + 6;
      fotosOnPage++;
    }
  }

  // ═══════════ LAST PAGE: AVALIAÇÃO FINAL ═══════════
  y = startPage();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('7. AVALIAÇÃO FINAL', MARGIN_L, y);
  y += 10;

  doc.setTextColor(...BLACK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const avalLines = doc.splitTextToSize(laudo.texto_avaliacao_final || '', CONTENT_W);
  doc.text(avalLines, MARGIN_L, y);
  y += avalLines.length * 5 + 20;

  // Signatures
  doc.setFontSize(9);
  const sigW = 70;
  const sig1X = MARGIN_L + 10;
  const sig2X = MARGIN_L + CONTENT_W - sigW - 10;
  
  doc.line(sig1X, y, sig1X + sigW, y);
  doc.line(sig2X, y, sig2X + sigW, y);
  y += 5;
  doc.text('Proprietário do imóvel vistoriado', sig1X, y);
  doc.text('Contratante', sig2X, y);

  // ═══════════ ADD DECORATIONS TO ALL PAGES ═══════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addRedSidebar(doc);
    
    if (i > 1) { // Skip header on cover
      addHeader(doc, logoBase64);
    }
    
    if (i > 1) { // Cover has its own footer style
      addFooter(doc, i, totalPages, rodapeBase64);
    } else {
      // Cover footer - just the rodape image
      try {
        doc.addImage(rodapeBase64, 'PNG', 0, PAGE_H - 15, PAGE_W, 10);
      } catch {}
    }
  }

  doc.save(`Laudo_Cautelar_${laudo.clientes?.nome?.replace(/\s+/g, '_') || 'laudo'}.pdf`);
}
