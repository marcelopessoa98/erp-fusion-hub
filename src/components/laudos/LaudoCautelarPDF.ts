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
const MARGIN_L = 25; // left margin after lateral image
const MARGIN_R = 15;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const RED: [number, number, number] = [196, 30, 30];
const GRAY: [number, number, number] = [128, 128, 128];
const BLACK: [number, number, number] = [0, 0, 0];
const DARK_GRAY: [number, number, number] = [80, 80, 80];

// Footer area starts here - leave space for footer content
const FOOTER_TEXT_Y = 258;
const FOOTER_IMG_Y = PAGE_H - 12;

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

/** Add the lateral image (vertical strip on the left side of every page) */
function addLateral(doc: jsPDF, lateralBase64: string) {
  try {
    // The lateral image runs the full height on the left side
    doc.addImage(lateralBase64, 'JPEG', 0, 0, 18, PAGE_H);
  } catch {
    // Fallback: red bar
    doc.setFillColor(...RED);
    doc.rect(0, 0, 8, PAGE_H, 'F');
  }
}

/** Add header: logo left + title right */
function addHeader(doc: jsPDF, logoBase64: string) {
  try {
    doc.addImage(logoBase64, 'PNG', MARGIN_L, 8, 38, 12);
  } catch { /* skip */ }

  doc.setFont('times', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...DARK_GRAY);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', PAGE_W - MARGIN_R, 16, { align: 'right' });

  // Thin line under header
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, 23, PAGE_W - MARGIN_R, 23);
}

/** Add footer: disclaimer text + company info + city silhouette image at very bottom + page number */
function addFooter(doc: jsPDF, page: number, totalPages: number, rodapeBase64: string) {
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, FOOTER_TEXT_Y - 3, PAGE_W - MARGIN_R, FOOTER_TEXT_Y - 3);

  doc.setFont('times', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);

  const disclaimer = 'Todo o resultado prescrito do presente relatório restringe-se às amostras ensaiadas. A reprodução do documento ou reprodução parcial está sendo proibido.';
  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_W);
  doc.text(disclaimerLines, PAGE_W / 2, FOOTER_TEXT_Y, { align: 'center', maxWidth: CONTENT_W });

  doc.setFontSize(7);
  doc.setFont('times', 'bold');
  doc.text('Concrefuji – CNPJ: 32.721.991/0001-98', PAGE_W / 2, FOOTER_TEXT_Y + 8, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.text('Rua Nunes Valente 3840, Fortaleza – CE / Brasil- CEP 60120-295 | Fone: (85) 9 9118-0009', PAGE_W / 2, FOOTER_TEXT_Y + 12, { align: 'center' });
  doc.text('Email: concrefuji@gmail.com', PAGE_W / 2, FOOTER_TEXT_Y + 16, { align: 'center' });

  // Page number
  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.text(`Página ${page} de ${totalPages}`, PAGE_W - MARGIN_R, FOOTER_TEXT_Y + 12, { align: 'right' });

  // City silhouette image at the very bottom
  try {
    doc.addImage(rodapeBase64, 'PNG', 0, FOOTER_IMG_Y, PAGE_W, 12);
  } catch { /* skip */ }
}

/** Maximum Y before footer area */
const MAX_CONTENT_Y = FOOTER_TEXT_Y - 8;
const HEADER_Y = 28; // Content starts after header

export async function gerarLaudoCautelarPDF(data: PDFData) {
  const { laudo, fotos, equipe, logoBase64, lateralBase64, rodapeBase64 } = data;
  const doc = new jsPDF('p', 'mm', 'a4');

  // Set default font to Times
  doc.setFont('times', 'normal');

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

  // Track pages for final decoration pass
  let pageCount = 0;
  const pages: { isCover?: boolean }[] = [];

  const startPage = () => {
    if (pageCount > 0) doc.addPage();
    pageCount++;
    pages.push({});
    return HEADER_Y;
  };

  const startCoverPage = () => {
    if (pageCount > 0) doc.addPage();
    pageCount++;
    pages.push({ isCover: true });
    return 20;
  };

  // Helper: section title in red
  const sectionTitle = (title: string, y: number, fontSize = 12): number => {
    doc.setFont('times', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(...RED);
    doc.text(title, MARGIN_L, y);
    return y + 8;
  };

  // Helper: page header subtitle
  const pageSubtitle = (y: number): number => {
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK_GRAY);
    doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L, y);
    return y + 10;
  };

  // Helper: normal body text
  const bodyText = (text: string, y: number, fontSize = 10): number => {
    doc.setFont('times', 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    doc.text(lines, MARGIN_L, y);
    return y + lines.length * (fontSize * 0.45) + 4;
  };

  // Helper: label + value inline
  const labelValue = (label: string, value: string, y: number): number => {
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    const labelW = doc.getTextWidth(label + ' ');
    doc.text(label, MARGIN_L, y);
    doc.setFont('times', 'normal');
    const valLines = doc.splitTextToSize(value, CONTENT_W - labelW - 2);
    doc.text(valLines, MARGIN_L + labelW, y);
    return y + Math.max(valLines.length * 5, 6);
  };

  // ═══════════ PAGE 1: COVER ═══════════
  let y = startCoverPage();

  // Cover: Logo centered large
  try {
    doc.addImage(logoBase64, 'PNG', (PAGE_W - 80) / 2, 50, 80, 24);
  } catch {}

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...RED);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', PAGE_W / 2, 100, { align: 'center' });

  // Obra name
  doc.setFontSize(16);
  doc.setTextColor(...BLACK);
  const obraNome = laudo.obras?.nome?.toUpperCase() || '';
  const obraNomeLines = doc.splitTextToSize(obraNome, CONTENT_W);
  doc.text(obraNomeLines, PAGE_W / 2, 118, { align: 'center' });

  // Address
  doc.setFontSize(13);
  const endLines = doc.splitTextToSize(laudo.endereco_vistoriado.toUpperCase(), CONTENT_W);
  doc.text(endLines, PAGE_W / 2, 135, { align: 'center' });

  // Company info
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  y = 165;
  doc.text(`Empresa contratante: ${laudo.clientes?.nome || ''}`, PAGE_W / 2, y, { align: 'center' });
  y += 8;
  const resp = equipe.find(e => e.numero_crea) || equipe[0];
  doc.text(`Responsável: ${resp?.nome || ''}`, PAGE_W / 2, y, { align: 'center' });

  // ═══════════ PAGE 2: EQUIPE TÉCNICA ═══════════
  y = startPage();
  y = pageSubtitle(y);
  y = sectionTitle('Equipe Técnica', y, 14);
  y += 4;

  doc.setTextColor(...BLACK);
  doc.setFontSize(10);

  for (const member of equipe) {
    doc.setFont('times', 'bold');
    doc.text(member.nome, MARGIN_L, y);
    y += 5;
    doc.setFont('times', 'normal');
    if (member.cargo) { doc.text(member.cargo, MARGIN_L + 5, y); y += 5; }
    if (member.formacao) { doc.text(member.formacao, MARGIN_L + 5, y); y += 5; }
    if (member.numero_crea) { doc.text(`CREA-CE ${member.numero_crea}`, MARGIN_L + 5, y); y += 5; }
    y += 4;
  }

  // ═══════════ PAGE 3: NOTA PRÉVIA ═══════════
  y = startPage();
  y = pageSubtitle(y);
  y = sectionTitle('Nota Prévia', y, 14);

  const notaPrevia = laudo.texto_nota_previa ||
    `O documento apresenta o Laudo Cautelar de Vizinhança realizado nos confrontantes do lote do ${laudo.obras?.nome || ''} (${laudo.clientes?.nome || ''}), Região do ${laudo.bairro || ''}, ${laudo.cidade || 'Fortaleza-CE'}.`;

  y = bodyText(notaPrevia, y);

  // ═══════════ PAGE 4: SUMÁRIO ═══════════
  y = startPage();
  y = pageSubtitle(y);
  y = sectionTitle('SUMÁRIO', y, 14);
  y += 4;

  doc.setTextColor(...BLACK);
  doc.setFontSize(11);
  doc.setFont('times', 'normal');

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
    y += 8;
  }

  // ═══════════ PAGE 5: SECTIONS 1, 2, 3 ═══════════
  y = startPage();
  y = pageSubtitle(y);

  // Section 1
  y = sectionTitle('1. OBJETIVO', y);
  y = bodyText(laudo.texto_objetivo || '', y);
  y += 4;

  // Section 2
  y = sectionTitle('2. IDENTIFICAÇÃO DO IMÓVEL VISTORIADO', y);
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text('Segue as informações coletadas:', MARGIN_L, y); y += 7;

  y = labelValue('Solicitante:', laudo.clientes?.nome || '', y);
  y = labelValue('Objeto:', laudo.tipo_imovel, y);
  y = labelValue('Objetivo:', laudo.objetivo || '', y);
  y = labelValue('Endereço:', laudo.endereco_vistoriado, y);
  y += 6;

  // Section 3
  y = sectionTitle('3. IDENTIFICAÇÃO DO IMÓVEL A SER CONSTRUÍDO', y);
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.text('Segue as informações coletadas:', MARGIN_L, y); y += 7;

  y = labelValue('Proprietário:', laudo.clientes?.nome || '', y);
  y = labelValue('Tipo de ocupação:', laudo.tipo_ocupacao || '', y);
  y = labelValue('Características:', laudo.caracteristicas_edificacao || '', y);
  y = labelValue('Vias de acesso:', laudo.vias_acesso || '', y);
  y = labelValue('Endereço:', laudo.obras?.endereco || '', y);

  // ═══════════ PAGE 6: METODOLOGIA + MAPS ═══════════
  y = startPage();
  y = pageSubtitle(y);

  y = sectionTitle('4. METODOLOGIA', y);
  y = bodyText(laudo.texto_metodologia || '', y);
  y += 6;

  // Google Maps image
  if (mapsBase64) {
    const availW = Math.min(MAPS_W, CONTENT_W);
    const imgH = availW * (MAPS_H / MAPS_W);
    const mapsX = MARGIN_L + (CONTENT_W - availW) / 2;
    doc.addImage(mapsBase64, 'JPEG', mapsX, y, availW, imgH);
    y += imgH + 4;
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Fonte: Adaptada Google Earth', MARGIN_L + CONTENT_W / 2, y, { align: 'center' });
  }

  // ═══════════ PAGE 7: CARACTERÍSTICAS + FLUXOGRAMA ═══════════
  y = startPage();
  y = pageSubtitle(y);

  y = sectionTitle('5. CARACTERÍSTICAS DO IMÓVEL VISTORIADO', y);
  y += 2;

  const caracData = [
    ['Padrão construtivo:', laudo.padrao_construtivo || ''],
    ['Quantidade de pavimentos:', String(laudo.qtd_pavimentos || 1)],
    ['Estruturas:', laudo.estruturas || ''],
    ['Vedação:', laudo.vedacao || ''],
    ['Acabamento de piso:', laudo.acabamento_piso || ''],
    ['Acabamento de paredes:', laudo.acabamento_paredes || ''],
    ['Cobertura:', laudo.cobertura || ''],
  ];

  doc.setFontSize(10);
  for (const [label, value] of caracData) {
    y = labelValue(label, value, y);
    y += 1;
  }

  y += 6;
  const autoriz = 'O proprietário autorizou a entrada no imóvel e permitiu o registro fotográfico dos cômodos de sua residência. Ele está ciente da garantia pela qual o laudo representa.';
  y = bodyText(autoriz, y, 9);
  y += 6;

  // Fluxograma
  if (fluxoBase64) {
    const fluxoX = MARGIN_L + (CONTENT_W - FLUXO_W) / 2;
    try {
      doc.addImage(fluxoBase64, 'PNG', Math.max(fluxoX, MARGIN_L), y, FLUXO_W, FLUXO_H);
    } catch {}
  }

  // ═══════════ PAGES 8+: MEMORIAL FOTOGRÁFICO ═══════════
  const sortedFotos = [...fotos].sort((a, b) => a.numero - b.numero);

  if (sortedFotos.length > 0) {
    y = startPage();
    y = pageSubtitle(y);
    y = sectionTitle('6. MEMORIAL FOTOGRÁFICO', y);

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
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
        y = pageSubtitle(y);
        fotosOnPage = 0;
      }

      // Photo label
      doc.setFont('times', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
      const label = `Imagem ${foto.numero}`;
      doc.text(label, MARGIN_L, y);
      if (foto.descricao && foto.descricao !== `Imagem ${foto.numero}`) {
        doc.setFont('times', 'normal');
        doc.text(` - ${foto.descricao}`, MARGIN_L + doc.getTextWidth(label + ' '), y);
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
  y = pageSubtitle(y);

  y = sectionTitle('7. AVALIAÇÃO FINAL', y);
  y = bodyText(laudo.texto_avaliacao_final || '', y);
  y += 20;

  // Signatures
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const sigW = 70;
  const sig1X = MARGIN_L + 10;
  const sig2X = MARGIN_L + CONTENT_W - sigW - 10;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(sig1X, y, sig1X + sigW, y);
  doc.line(sig2X, y, sig2X + sigW, y);
  y += 5;
  doc.text('Proprietário do imóvel vistoriado', sig1X, y);
  doc.text('Contratante', sig2X, y);

  // ═══════════ ADD DECORATIONS TO ALL PAGES ═══════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Lateral image on every page
    addLateral(doc, lateralBase64);

    if (pages[i - 1]?.isCover) {
      // Cover: no standard header, just rodape image at bottom
      try {
        doc.addImage(rodapeBase64, 'PNG', 0, FOOTER_IMG_Y, PAGE_W, 12);
      } catch {}
    } else {
      addHeader(doc, logoBase64);
      addFooter(doc, i, totalPages, rodapeBase64);
    }
  }

  doc.save(`Laudo_Cautelar_${laudo.clientes?.nome?.replace(/\s+/g, '_') || 'laudo'}.pdf`);
}
