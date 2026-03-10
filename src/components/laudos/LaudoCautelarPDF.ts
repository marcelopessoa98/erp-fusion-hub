import jsPDF from 'jspdf';
import type { LaudoCautelar, LaudoFoto } from '@/hooks/useLaudosCautelares';

// ─── Dimensions in mm (A4) ───
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 25;
const MARGIN_R = 15;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const MARGIN_T = 28; // content starts after header
const MARGIN_B = 42; // space reserved for footer

// Fixed image sizes from template
const FOTO_W = 140; // 14cm
const FOTO_H = 105; // 10.5cm
const MAPS_W = 164.7; // 16.47cm
const MAPS_H = 105; // 10.5cm
const FLUXO_W = 134.4; // 13.44cm
const FLUXO_H = 53.7; // 5.37cm

// Colors
const RED: [number, number, number] = [180, 0, 0];
const BLACK: [number, number, number] = [30, 30, 30];
const GRAY: [number, number, number] = [100, 100, 100];

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

// ─── Page decoration helpers ───

function addLateral(doc: jsPDF, lateralBase64: string) {
  try {
    doc.addImage(lateralBase64, 'JPEG', 0, 0, 18, PAGE_H);
  } catch {
    doc.setFillColor(...RED);
    doc.rect(0, 0, 8, PAGE_H, 'F');
  }
}

function addHeader(doc: jsPDF, logoBase64: string) {
  // Light gray background bar
  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN_L - 2, 3, CONTENT_W + 4, 18, 'F');

  // Red bottom border
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_L - 2, 21, MARGIN_L + CONTENT_W + 2, 21);

  // Logo
  try {
    doc.addImage(logoBase64, 'PNG', MARGIN_L, 5, 32, 14);
  } catch { /* skip */ }

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text('LAUDO CAUTELAR DE VIZINHANÇA', MARGIN_L + CONTENT_W / 2, 14, { align: 'center' });
}

function addFooter(doc: jsPDF, page: number, totalPages: number, rodapeBase64: string) {
  const footerY = PAGE_H - MARGIN_B + 2;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, footerY, MARGIN_L + CONTENT_W, footerY);

  // Disclaimer
  doc.setFont('times', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  const disclaimer = 'Todo o resultado prescrito do presente relatório restringe-se às amostras ensaiadas. A reprodução do documento ou reprodução parcial está sendo proibido.';
  doc.text(disclaimer, PAGE_W / 2, footerY + 4, { align: 'center', maxWidth: CONTENT_W });

  // Company info
  doc.setFont('times', 'bold');
  doc.setFontSize(7);
  doc.text('Concrefuji – CNPJ: 32.721.991/0001-98', PAGE_W / 2, footerY + 10, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.text('Rua Nunes Valente 3840, Fortaleza – CE / Brasil- CEP 60120-295 | Fone: (85) 9 9118-0009', PAGE_W / 2, footerY + 14, { align: 'center' });
  doc.text('Email: concrefuji@gmail.com', PAGE_W / 2, footerY + 18, { align: 'center' });

  // Page number
  doc.setFontSize(8);
  doc.text(`Página ${page} de ${totalPages}`, PAGE_W - MARGIN_R, footerY + 10, { align: 'right' });

  // City silhouette at very bottom
  try {
    doc.addImage(rodapeBase64, 'PNG', 0, PAGE_H - 12, PAGE_W, 12);
  } catch { /* skip */ }
}

// ─── Content helpers (from cautelar-flow) ───

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN_B) {
    doc.addPage();
    return MARGIN_T + 5;
  }
  return y;
}

function sectionTitle(doc: jsPDF, number: string, text: string, y: number): number {
  y = checkPage(doc, y, 14);
  doc.setFontSize(12);
  doc.setFont('times', 'bold');
  doc.setTextColor(...BLACK);
  const fullText = `${number}    ${text}`;
  doc.text(fullText, MARGIN_L, y);
  // Underline
  const textW = doc.getTextWidth(fullText);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, y + 1.5, MARGIN_L + Math.min(textW, CONTENT_W), y + 1.5);
  return y + 10;
}

function bulletItem(doc: jsPDF, label: string, value: string, y: number): number {
  y = checkPage(doc, y, 10);
  doc.setFontSize(10);

  // Bullet arrow
  doc.setFont('times', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('➤', MARGIN_L + 5, y);

  // Label bold
  const bulletOffset = 12;
  doc.text(`${label}: `, MARGIN_L + bulletOffset, y);
  const labelW = doc.getTextWidth(`${label}: `);

  // Value normal
  doc.setFont('times', 'normal');
  const maxW = CONTENT_W - bulletOffset - labelW;
  const lines = doc.splitTextToSize(value || '—', maxW);
  doc.text(lines, MARGIN_L + bulletOffset + labelW, y);
  return y + lines.length * 5 + 3;
}

function paragraph(doc: jsPDF, text: string, y: number, indent: number = 0): number {
  doc.setFontSize(10);
  doc.setFont('times', 'normal');
  doc.setTextColor(...BLACK);
  const lines = doc.splitTextToSize(text || '—', CONTENT_W - indent);
  for (const line of lines) {
    y = checkPage(doc, y, 6);
    doc.text(line, MARGIN_L + indent, y);
    y += 5;
  }
  return y + 2;
}

// ─── Main generator ───

export async function gerarLaudoCautelarPDF(data: PDFData) {
  const { laudo, fotos, equipe, logoBase64, lateralBase64, rodapeBase64 } = data;
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('times', 'normal');

  // Preload images
  const fotoImages: Record<number, string> = {};
  for (const foto of fotos) {
    try {
      fotoImages[foto.numero] = await loadImageAsBase64(foto.foto_url);
    } catch { /* skip */ }
  }

  let mapsBase64 = '';
  let fluxoBase64 = '';
  if (laudo.imagem_google_maps) {
    try { mapsBase64 = await loadImageAsBase64(laudo.imagem_google_maps); } catch {}
  }
  if (laudo.imagem_fluxograma) {
    try { fluxoBase64 = await loadImageAsBase64(laudo.imagem_fluxograma); } catch {}
  }

  // Track which pages are covers (no header/footer)
  const coverPages: number[] = [];
  let pageNum = 1;

  const newPage = () => {
    doc.addPage();
    pageNum++;
    return MARGIN_T + 5;
  };

  // ═══════════════════════════════════════
  // PAGE 1: COVER (no header/footer)
  // ═══════════════════════════════════════
  coverPages.push(1);
  let y = 60;

  // Logo centered
  try {
    doc.addImage(logoBase64, 'PNG', (PAGE_W - 80) / 2, 40, 80, 24);
  } catch {}

  y = 90;
  doc.setFontSize(28);
  doc.setFont('times', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('LAUDO CAUTELAR DE', PAGE_W / 2, y, { align: 'center' });
  y += 14;
  doc.text('VIZINHANÇA', PAGE_W / 2, y, { align: 'center' });

  y += 30;
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.setTextColor(...RED);
  const obraNome = laudo.obras?.nome?.toUpperCase() || 'OBRA';
  const obraNomeLines = doc.splitTextToSize(obraNome, CONTENT_W);
  doc.text(obraNomeLines, MARGIN_L, y);
  y += obraNomeLines.length * 7;

  doc.setFontSize(11);
  const endLines = doc.splitTextToSize(laudo.endereco_vistoriado || '', CONTENT_W);
  doc.text(endLines, MARGIN_L, y);
  y += endLines.length * 6;

  y += 30;
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.setFont('times', 'bold');
  doc.text('Empresa contratante: ', MARGIN_L, y);
  doc.setFont('times', 'normal');
  doc.setTextColor(...RED);
  doc.text(laudo.clientes?.nome || '—', MARGIN_L + doc.getTextWidth('Empresa contratante: '), y);

  y += 8;
  doc.setTextColor(...BLACK);
  doc.setFont('times', 'bold');
  doc.text('Responsável: ', MARGIN_L, y);
  doc.setFont('times', 'normal');
  doc.setTextColor(...RED);
  const resp = equipe.find(e => e.numero_crea) || equipe[0];
  doc.text(resp?.nome || '—', MARGIN_L + doc.getTextWidth('Responsável: '), y);

  // ═══════════════════════════════════════
  // PAGE 2: EQUIPE TÉCNICA
  // ═══════════════════════════════════════
  y = newPage();
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Equipe Técnica', MARGIN_L, y);
  y += 12;

  for (const member of equipe) {
    y = checkPage(doc, y, 30);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.setTextColor(...BLACK);
    doc.text(member.nome, MARGIN_L, y);
    y += 5;
    doc.setFont('times', 'normal');
    if (member.cargo) { doc.text(member.cargo, MARGIN_L, y); y += 5; }
    if (member.formacao) { doc.text(member.formacao, MARGIN_L, y); y += 5; }
    if (member.numero_crea) { doc.text(`CREA-CE ${member.numero_crea}`, MARGIN_L, y); y += 5; }
    y += 6;
  }

  // ═══════════════════════════════════════
  // PAGE 3: NOTA PRÉVIA
  // ═══════════════════════════════════════
  y = newPage();
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('Nota Prévia', MARGIN_L, y);
  y += 10;

  const notaPrevia = laudo.texto_nota_previa ||
    `O documento apresenta o Laudo Cautelar de Vizinhança realizado nos confrontantes do lote do ${laudo.obras?.nome || 'Obra'} (${laudo.clientes?.nome || 'Cliente'}), Região do ${laudo.bairro || 'Bairro'}, ${laudo.cidade || 'Fortaleza-CE'}.`;
  y = paragraph(doc, notaPrevia, y, 5);

  // ═══════════════════════════════════════
  // PAGE 4: SUMÁRIO
  // ═══════════════════════════════════════
  y = newPage();
  doc.setFontSize(14);
  doc.setFont('times', 'bold');
  doc.setTextColor(...BLACK);
  doc.text('SUMÁRIO', MARGIN_L, y);
  y += 12;

  const sumarioItems = [
    '1. OBJETIVO',
    '2. IDENTIFICAÇÃO DO IMÓVEL VISTORIADO',
    '3. IDENTIFICAÇÃO DO IMÓVEL A SER CONSTRUÍDO',
    '4. METODOLOGIA',
    '5. CARACTERÍSTICAS DO IMÓVEL VISTORIADO',
    '6. MEMORIAL FOTOGRÁFICO',
    '7. AVALIAÇÃO FINAL',
  ];
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.setTextColor(...BLACK);
  for (const item of sumarioItems) {
    doc.text(item, MARGIN_L, y);
    y += 8;
  }

  // ═══════════════════════════════════════
  // PAGE 5: OBJETIVO + IDENTIFICAÇÕES
  // ═══════════════════════════════════════
  y = newPage();

  y = sectionTitle(doc, '1.', 'OBJETIVO', y);
  y = paragraph(doc, laudo.texto_objetivo || '', y, 5);
  y += 4;

  y = sectionTitle(doc, '2.', 'IDENTIFICAÇÃO DO IMÓVEL VISTORIADO', y);
  y = paragraph(doc, 'Segue as informações coletadas:', y, 5);
  y += 2;
  y = bulletItem(doc, 'Solicitante', laudo.clientes?.nome || '—', y);
  y = bulletItem(doc, 'Objeto', laudo.tipo_imovel, y);
  y = bulletItem(doc, 'Objetivo', laudo.objetivo || '—', y);
  y = bulletItem(doc, 'Endereço', laudo.endereco_vistoriado, y);
  y += 4;

  y = sectionTitle(doc, '3.', 'IDENTIFICAÇÃO DO IMÓVEL A SER CONSTRUÍDO', y);
  y = paragraph(doc, 'Segue as informações coletadas:', y, 5);
  y += 2;
  y = bulletItem(doc, 'Proprietário', laudo.clientes?.nome || '—', y);
  y = bulletItem(doc, 'Tipo de ocupação', laudo.tipo_ocupacao || '—', y);
  y = bulletItem(doc, 'Características da edificação', laudo.caracteristicas_edificacao || '—', y);
  y = bulletItem(doc, 'Vias de acesso', `A principal via de acesso é: ${laudo.vias_acesso || '—'}`, y);
  y = bulletItem(doc, 'Endereço', laudo.obras?.endereco || '—', y);

  // ═══════════════════════════════════════
  // PAGE 6: FIGURA LOCALIZAÇÃO + METODOLOGIA
  // ═══════════════════════════════════════
  y = newPage();

  if (mapsBase64) {
    // "Figura 1" label
    doc.setFontSize(9);
    doc.setFont('times', 'italic');
    doc.setTextColor(...RED);
    doc.text('Figura 1', PAGE_W / 2, y, { align: 'center' });
    y += 4;

    const availW = Math.min(MAPS_W, CONTENT_W);
    const imgH = availW * (MAPS_H / MAPS_W);
    const mapsX = MARGIN_L + (CONTENT_W - availW) / 2;
    doc.addImage(mapsBase64, 'JPEG', mapsX, y, availW, imgH);
    y += imgH + 4;

    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.setTextColor(...BLACK);
    doc.text('Fonte: Adaptada Google Earth', PAGE_W / 2, y, { align: 'center' });
    y += 10;
  }

  y = checkPage(doc, y, 40);
  y = sectionTitle(doc, '4.', 'METODOLOGIA', y);
  y = paragraph(doc, laudo.texto_metodologia || '', y, 5);

  // ═══════════════════════════════════════
  // PAGE 7: FLUXOGRAMA + CARACTERÍSTICAS
  // ═══════════════════════════════════════
  y = newPage();

  if (fluxoBase64) {
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.setTextColor(...BLACK);
    doc.text('A Figura 2 a seguir exemplifica o fluxograma considerado para a avaliação.', MARGIN_L, y, { maxWidth: CONTENT_W });
    y += 10;

    doc.setFontSize(9);
    doc.setFont('times', 'italic');
    doc.setTextColor(...RED);
    doc.text('Figura 2 - Fluxograma de vistoria', PAGE_W / 2, y, { align: 'center' });
    y += 4;

    const fluxoX = MARGIN_L + (CONTENT_W - FLUXO_W) / 2;
    try {
      doc.addImage(fluxoBase64, 'PNG', Math.max(fluxoX, MARGIN_L), y, FLUXO_W, FLUXO_H);
    } catch {}
    y += FLUXO_H + 4;

    doc.setFontSize(8);
    doc.setFont('times', 'italic');
    doc.setTextColor(...BLACK);
    doc.text('Fonte: Adaptada de Burin et al. (2009)', PAGE_W / 2, y, { align: 'center' });
    y += 10;
  }

  y = checkPage(doc, y, 60);
  y = sectionTitle(doc, '5.', 'CARACTERÍSTICAS DO IMÓVEL VISTORIADO', y);
  y += 2;
  y = bulletItem(doc, 'Padrão construtivo', laudo.padrao_construtivo || '—', y);
  y = bulletItem(doc, 'Quantidade de pavimentos', String(laudo.qtd_pavimentos || 1), y);
  y = bulletItem(doc, 'Estruturas', laudo.estruturas || '—', y);
  y = bulletItem(doc, 'Vedação', laudo.vedacao || '—', y);
  y = bulletItem(doc, 'Acabamento de piso', laudo.acabamento_piso || '—', y);
  y = bulletItem(doc, 'Acabamento de paredes', laudo.acabamento_paredes || '—', y);
  y = bulletItem(doc, 'Cobertura', laudo.cobertura || '—', y);
  y += 4;
  y = paragraph(doc, 'O proprietário autorizou a entrada no imóvel e permitiu o registro fotográfico dos cômodos de sua residência. Ele está ciente da garantia pela qual o laudo representa.', y, 5);

  // ═══════════════════════════════════════
  // MEMORIAL FOTOGRÁFICO
  // ═══════════════════════════════════════
  const sortedFotos = [...fotos].sort((a, b) => a.numero - b.numero);

  if (sortedFotos.length > 0) {
    y = newPage();

    y = sectionTitle(doc, '6.', 'MEMORIAL FOTOGRÁFICO', y);
    y = paragraph(doc, 'Segue imagens para constatação do estado atual do imóvel.', y, 5);
    y += 4;

    for (let i = 0; i < sortedFotos.length; i++) {
      const foto = sortedFotos[i];
      const imgData = fotoImages[foto.numero];
      if (!imgData) continue;

      // Check if we need a new page (label + photo + caption)
      const neededH = FOTO_H + 14;
      y = checkPage(doc, y, neededH);

      // "Imagem X" label in italic red centered
      doc.setFontSize(10);
      doc.setFont('times', 'italic');
      doc.setTextColor(...RED);
      const labelText = `Imagem ${foto.numero}`;
      doc.text(labelText, PAGE_W / 2, y, { align: 'center' });
      y += 4;

      // Center the photo
      const fotoX = MARGIN_L + (CONTENT_W - FOTO_W) / 2;
      try {
        doc.addImage(imgData, 'JPEG', Math.max(fotoX, MARGIN_L), y, FOTO_W, FOTO_H, undefined, 'MEDIUM');
      } catch { /* skip */ }
      y += FOTO_H + 2;

      // Caption below photo
      if (foto.descricao && foto.descricao !== `Imagem ${foto.numero}`) {
        doc.setFontSize(8);
        doc.setFont('times', 'normal');
        doc.setTextColor(...GRAY);
        doc.text(foto.descricao, PAGE_W / 2, y, { align: 'center', maxWidth: CONTENT_W });
        y += 5;
      }

      y += 4;
    }
  }

  // ═══════════════════════════════════════
  // AVALIAÇÃO FINAL + ASSINATURAS
  // ═══════════════════════════════════════
  y = newPage();

  y = sectionTitle(doc, '7.', 'AVALIAÇÃO FINAL', y);
  y = paragraph(doc, laudo.texto_avaliacao_final || '', y, 5);

  // Signatures
  y += 20;
  y = checkPage(doc, y, 30);
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  const sigW = 65;
  const sig1X = MARGIN_L + 5;
  const sig2X = MARGIN_L + CONTENT_W - sigW - 5;
  doc.line(sig1X, y, sig1X + sigW, y);
  doc.line(sig2X, y, sig2X + sigW, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.setTextColor(...BLACK);
  doc.text('Proprietário do imóvel vistoriado', sig1X + sigW / 2, y, { align: 'center' });
  doc.text('Contratante', sig2X + sigW / 2, y, { align: 'center' });

  // ═══════════════════════════════════════
  // ADD DECORATIONS TO ALL PAGES
  // ═══════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Lateral image on every page
    addLateral(doc, lateralBase64);

    if (coverPages.includes(i)) {
      // Cover: only lateral + rodape image at bottom
      try {
        doc.addImage(rodapeBase64, 'PNG', 0, PAGE_H - 12, PAGE_W, 12);
      } catch {}
    } else {
      addHeader(doc, logoBase64);
      addFooter(doc, i, totalPages, rodapeBase64);
    }
  }

  doc.save(`Laudo_Cautelar_${laudo.clientes?.nome?.replace(/\s+/g, '_') || 'laudo'}.pdf`);
}
