import jsPDF from 'jspdf';
import { Recibo } from '@/hooks/useRecibos';
import reciboLogoUrl from '@/assets/recibo-logo.jpg';
import reciboAssinaturaUrl from '@/assets/recibo-assinatura.jpg';
import reciboQrcodeUrl from '@/assets/recibo-qrcode.png';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function gerarReciboPDF(recibo: Recibo) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;

  // Load images
  const [logoImg, assinaturaImg, qrcodeImg] = await Promise.all([
    loadImage(reciboLogoUrl),
    loadImage(reciboAssinaturaUrl),
    loadImage(reciboQrcodeUrl),
  ]);

  // ─── RED CORNER DECORATIONS ───
  const RED: [number, number, number] = [196, 30, 30];
  
  // Top-left corner decoration
  doc.setFillColor(...RED);
  doc.triangle(0, 0, 40, 0, 0, 40, 'F');
  
  // Bottom-left corner decoration
  doc.triangle(0, pageHeight, 50, pageHeight, 0, pageHeight - 50, 'F');

  // ─── LOGO ───
  const logoW = 70;
  const logoH = 30;
  doc.addImage(logoImg, 'JPEG', (pageWidth - logoW) / 2, 12, logoW, logoH);

  // ─── RED LINE UNDER LOGO ───
  let y = 48;
  doc.setDrawColor(...RED);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // ─── TITLE ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text('RECIBO', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // ─── BODY TEXT ───
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  const dataFormatada = formatDate(recibo.data_recibo);
  
  // Build the body text with bold segments
  const bodyText = `A empresa Rafaela Fujita Lima (ConcreFuji Tecnologia), inscrito(a) sob nº de CNPJ: 32.721.991/0001-98, recebeu de ${recibo.cliente_nome.toUpperCase()}, inscrito sob nº de CNPJ ${recibo.cliente_cnpj}, a importância de R$ ${Number(recibo.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${recibo.valor_extenso}), referente a ${recibo.descricao_servico}.`;

  // Use splitTextToSize for wrapping
  const lines = doc.splitTextToSize(bodyText, contentWidth);
  doc.text(lines, margin, y, { align: 'justify', maxWidth: contentWidth });
  y += lines.length * 6 + 8;

  // ─── DATE ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Data: `, margin, y);
  const dateXOffset = doc.getTextWidth('Data: ');
  doc.setFont('helvetica', 'normal');
  doc.text(dataFormatada + '.', margin + dateXOffset, y);

  // ─── SIGNATURE (positioned near bottom center) ───
  const sigY = 195;
  const sigW = 55;
  const sigH = 25;
  doc.addImage(assinaturaImg, 'JPEG', (pageWidth - sigW) / 2, sigY, sigW, sigH);

  // Line under signature
  const lineY = sigY + sigH + 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 40, lineY, pageWidth / 2 + 40, lineY);

  // Signature text
  let sigTextY = lineY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CONCREFUJI TECNOLOGIA', pageWidth / 2, sigTextY, { align: 'center' });
  sigTextY += 5;
  doc.text('RAFAELA FUJITA LIMA', pageWidth / 2, sigTextY, { align: 'center' });
  sigTextY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Engenheira Responsável', pageWidth / 2, sigTextY, { align: 'center' });
  sigTextY += 5;
  doc.text('CREA n° 12.208-D', pageWidth / 2, sigTextY, { align: 'center' });

  // ─── QR CODE (bottom-left) ───
  const qrW = 28;
  const qrH = 32;
  doc.addImage(qrcodeImg, 'PNG', 15, pageHeight - 65, qrW, qrH);

  // ─── PAGE NUMBER ───
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Página 1 de 1', pageWidth - margin, pageHeight - 28, { align: 'right' });

  // ─── FOOTER ───
  const footerY = pageHeight - 22;
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  
  doc.setFont('helvetica', 'bold');
  const footerLine1 = 'Concrefuji';
  doc.text(footerLine1, pageWidth / 2, footerY, { align: 'center' });
  const w1 = doc.getTextWidth(footerLine1);
  doc.setFont('helvetica', 'normal');
  doc.text(` – CNPJ: 32.721.991/0001-98`, pageWidth / 2 + w1 / 2, footerY);

  doc.text(
    'Rua Nunes Valente 3840, Fortaleza – CE / Brasil- CEP 60120-295',
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );
  doc.text(
    'Fone: (85) 3016-1557 / (85) 9 88620675',
    pageWidth / 2,
    footerY + 8,
    { align: 'center' }
  );
  doc.text(
    'Email: concrefuji@gmail.com',
    pageWidth / 2,
    footerY + 12,
    { align: 'center' }
  );

  doc.save(`Recibo_${recibo.cliente_nome.replace(/\s+/g, '_')}.pdf`);
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}
