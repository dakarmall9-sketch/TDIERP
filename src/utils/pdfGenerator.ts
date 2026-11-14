import { jsPDF } from 'jspdf';
import { Invoice, Quote } from '../types';
import { CompanyTenant } from '../context/AppContext';

function formatMoney(amount: number, currency: string): string {
  const formatted = amount
    .toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[\u00A0\u202F]/g, ' ');
  return `${formatted} ${currency}`;
}

function safeText(text: string | undefined | null): string {
  if (!text) return '';
  return String(text).replace(/[\u00A0\u202F]/g, ' ');
}

interface PdfDocumentData {
  docKind: 'DEVIS' | 'FACTURE';
  docNumber: string;
  issueDate: string;
  secondaryDateLabel: string;
  secondaryDateValue: string;
  statusLabel: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  originAddress: string;
  destinationAddress: string;
  serviceType: string;
  volumeM3: number;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  fuelSurcharge: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount?: number;
  currency: string;
  terms: string;
  isSigned?: boolean;
}

function buildStandardPdf(data: PdfDocumentData, company: CompanyTenant): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Top accent bar
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFillColor(245, 158, 11); // Amber 500
  doc.rect(0, 8, pageWidth, 1.5, 'F');

  let y = 18;

  // Header Left: Company details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(180, 83, 9); // Amber 700
  doc.text(safeText(company.name.toUpperCase()), margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  const companyAddrLines = doc.splitTextToSize(safeText(company.address), 95);
  doc.text(companyAddrLines, margin, y + 5);
  const afterAddrY = y + 5 + companyAddrLines.length * 4;
  doc.text(`Tel : ${safeText(company.phone)}`, margin, afterAddrY);
  doc.text(`Email : ${safeText(company.email)}`, margin, afterAddrY + 4);
  doc.text(`N° Registre / TVA : ${safeText(company.taxNumber)}`, margin, afterAddrY + 8);

  // Header Right: Document Type & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(data.docKind === 'DEVIS' ? 'DEVIS OFFICIEL' : 'FACTURE', pageWidth - margin, y, { align: 'right' });

  doc.setFontSize(11);
  doc.setTextColor(217, 119, 6);
  doc.text(safeText(data.docNumber), pageWidth - margin, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date d'emission : ${safeText(data.issueDate)}`, pageWidth - margin, y + 12, { align: 'right' });
  doc.text(`${data.secondaryDateLabel} : ${safeText(data.secondaryDateValue)}`, pageWidth - margin, y + 16, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Statut : ${safeText(data.statusLabel)}`, pageWidth - margin, y + 20, { align: 'right' });

  y = Math.max(afterAddrY + 13, y + 25);

  // Separator line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Client & Mission boxes
  const boxGap = 6;
  const boxWidth = (contentWidth - boxGap) / 2;
  const boxHeight = 32;

  // Left box: Client
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DESTINATAIRE / CLIENT', margin + 4, y + 5.5);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(safeText(data.clientName), margin + 4, y + 11, { maxWidth: boxWidth - 8 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const clientAddrLines = doc.splitTextToSize(safeText(data.clientAddress), boxWidth - 8).slice(0, 2);
  doc.text(clientAddrLines, margin + 4, y + 16);
  doc.text(`Tel : ${safeText(data.clientPhone)}`, margin + 4, y + 24.5, { maxWidth: boxWidth - 8 });
  doc.text(`Email : ${safeText(data.clientEmail)}`, margin + 4, y + 28.5, { maxWidth: boxWidth - 8 });

  // Right box: Mission
  const rightBoxX = margin + boxWidth + boxGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, y, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DETAILS DE LA MISSION', rightBoxX + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const originLines = doc.splitTextToSize(`Depart : ${safeText(data.originAddress)}`, boxWidth - 8).slice(0, 2);
  doc.text(originLines, rightBoxX + 4, y + 11);
  const destLines = doc.splitTextToSize(`Arrivee : ${safeText(data.destinationAddress)}`, boxWidth - 8).slice(0, 2);
  doc.text(destLines, rightBoxX + 4, y + 19);
  doc.text(`Prestation : ${safeText(data.serviceType.toUpperCase())}`, rightBoxX + 4, y + 26.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text(`Volume pris en charge : ${data.volumeM3} m3`, rightBoxX + 4, y + 30.2);

  y += boxHeight + 8;

  // Table header
  const colDescX = margin + 3;
  const colQtyX = margin + 108;
  const colPuX = margin + 144;
  const colTotalX = pageWidth - margin - 3;

  const drawTableHeader = (posY: number) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, posY, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DESIGNATION DE LA PRESTATION', colDescX, posY + 5.3);
    doc.text('QTE', colQtyX, posY + 5.3, { align: 'center' });
    doc.text('P.U. HT', colPuX, posY + 5.3, { align: 'right' });
    doc.text('TOTAL HT', colTotalX, posY + 5.3, { align: 'right' });
    return posY + 8;
  };

  y = drawTableHeader(y);

  // Table rows
  data.items.forEach((item, index) => {
    const descLines = doc.splitTextToSize(safeText(item.description), 92);
    const rowHeight = Math.max(8, descLines.length * 4.2 + 3.5);

    if (y + rowHeight > pageHeight - 60) {
      doc.addPage();
      y = 18;
      y = drawTableHeader(y);
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines, colDescX, y + 5);
    doc.text(String(item.quantity), colQtyX, y + 5, { align: 'center' });
    doc.text(formatMoney(item.unitPrice, data.currency), colPuX, y + 5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatMoney(item.total, data.currency), colTotalX, y + 5, { align: 'right' });

    y += rowHeight;
  });

  y += 6;

  // Ensure summary & footer fit on page
  if (y + 68 > pageHeight - 15) {
    doc.addPage();
    y = 20;
  }

  // Summary totals (right aligned)
  const summaryWidth = 76;
  const summaryX = pageWidth - margin - summaryWidth;
  let sy = y;

  const drawSummaryRow = (label: string, value: string, bold = false, accentColor?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 8.5);
    if (accentColor) {
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    } else {
      doc.setTextColor(71, 85, 105);
    }
    doc.text(label, summaryX + 3, sy);
    doc.text(value, pageWidth - margin - 3, sy, { align: 'right' });
    sy += bold ? 6.5 : 5;
  };

  drawSummaryRow('Sous-total HT :', formatMoney(data.subtotal, data.currency));
  if (data.fuelSurcharge > 0) {
    drawSummaryRow('Frais carburant :', formatMoney(data.fuelSurcharge, data.currency));
  }
  if (data.discount > 0) {
    drawSummaryRow('Remise commerciale :', `-${formatMoney(data.discount, data.currency)}`, false, [190, 18, 60]);
  }
  drawSummaryRow(`TVA (${data.taxRate}%) :`, formatMoney(data.taxAmount, data.currency));

  doc.setDrawColor(203, 213, 225);
  doc.line(summaryX, sy - 2, pageWidth - margin, sy - 2);
  sy += 2;

  doc.setFillColor(254, 243, 199); // Amber 100
  doc.roundedRect(summaryX, sy - 4.5, summaryWidth, 8.5, 1.5, 1.5, 'F');
  drawSummaryRow('TOTAL TTC :', formatMoney(data.total, data.currency), true, [180, 83, 9]);

  if (data.docKind === 'FACTURE' && data.paidAmount !== undefined) {
    sy += 1;
    drawSummaryRow('Deja regle :', formatMoney(data.paidAmount, data.currency), false, [5, 150, 105]);
    const remaining = Math.max(0, data.total - data.paidAmount);
    drawSummaryRow('Reste a payer :', formatMoney(remaining, data.currency), true, remaining > 0 ? [190, 18, 60] : [5, 150, 105]);
  }

  // Left side next to totals: Terms & Signature block
  const leftColWidth = contentWidth - summaryWidth - 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Conditions particulieres & reglement :', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  const termsLines = doc.splitTextToSize(
    safeText(data.terms || 'Reglement selon conditions convenues. Assurance contractuelle incluse.'),
    leftColWidth
  );
  doc.text(termsLines, margin, y + 4.5);

  const sigBoxY = Math.max(sy + 4, y + 4.5 + termsLines.length * 4 + 4);
  if (data.docKind === 'DEVIS') {
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, sigBoxY, leftColWidth, 20, 2, 2, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Bon pour accord et commande', margin + 4, sigBoxY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Signature precedee de la mention "Lu et approuve"', margin + 4, sigBoxY + 9);
    if (data.isSigned) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(5, 150, 105);
      doc.text('SIGNE ELECTRONIQUEMENT & VALIDE', margin + 4, sigBoxY + 16);
    }
  }

  // Page footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${safeText(company.name)} • ${safeText(company.taxNumber)} • ${safeText(company.email)}`,
      margin,
      pageHeight - 9
    );
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  }

  return doc.output('blob');
}

export function generateQuotePdfBlob(quote: Quote, company: CompanyTenant): Blob {
  const quoteStatusLabels: Record<Quote['status'], string> = {
    brouillon: 'Brouillon',
    envoye: 'Envoye au client',
    en_attente: 'En attente de signature',
    accepte: 'Accepte & Valide',
    refuse: 'Refuse',
    expire: 'Expire',
  };

  return buildStandardPdf(
    {
      docKind: 'DEVIS',
      docNumber: quote.number,
      issueDate: quote.createdAt.split('T')[0],
      secondaryDateLabel: 'Validite jusqu\'au',
      secondaryDateValue: quote.validityDate,
      statusLabel: quoteStatusLabels[quote.status] || quote.status,
      clientName: quote.clientName,
      clientAddress: quote.clientAddress,
      clientPhone: quote.clientPhone,
      clientEmail: quote.clientEmail,
      originAddress: quote.originAddress,
      destinationAddress: quote.destinationAddress,
      serviceType: quote.serviceType,
      volumeM3: quote.volumeM3,
      items: quote.items,
      subtotal: quote.subtotal,
      fuelSurcharge: quote.fuelSurcharge,
      discount: quote.discount,
      taxRate: quote.taxRate,
      taxAmount: quote.taxAmount,
      total: quote.total,
      currency: quote.currency,
      terms: quote.specialTerms,
      isSigned: quote.status === 'accepte',
    },
    company
  );
}

export function generateInvoicePdfBlob(
  quote: Quote,
  linkedInvoice: Invoice | undefined,
  company: CompanyTenant
): Blob {
  const invoiceStatusLabels: Record<Invoice['status'], string> = {
    brouillon: 'Brouillon',
    emise: 'Emise - En attente de paiement',
    payee_partielle: 'Payee partiellement',
    payee: 'Acquittee / Payee',
    en_retard: 'En retard de paiement',
    annulee: 'Annulee',
  };

  const invoiceNumber =
    linkedInvoice?.number || quote.number.replace(/^DEV-/i, 'FAC-');
  const issueDate =
    linkedInvoice?.issueDate || new Date().toISOString().split('T')[0];
  const dueDate =
    linkedInvoice?.dueDate ||
    new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];

  const statusLabel = linkedInvoice
    ? invoiceStatusLabels[linkedInvoice.status] || linkedInvoice.status
    : quote.status === 'accepte'
    ? 'Facture proforma validee'
    : 'Facture proforma';

  const items = linkedInvoice ? linkedInvoice.items : quote.items;
  const subtotal = linkedInvoice ? linkedInvoice.subtotal : quote.subtotal;
  const taxAmount = linkedInvoice ? linkedInvoice.taxAmount : quote.taxAmount;
  const total = linkedInvoice ? linkedInvoice.totalAmount : quote.total;
  const fuelSurcharge = linkedInvoice ? 0 : quote.fuelSurcharge;
  const discount = linkedInvoice ? 0 : quote.discount;
  const paidAmount = linkedInvoice ? linkedInvoice.paidAmount : 0;

  return buildStandardPdf(
    {
      docKind: 'FACTURE',
      docNumber: invoiceNumber,
      issueDate,
      secondaryDateLabel: 'Date d\'echeance',
      secondaryDateValue: dueDate,
      statusLabel,
      clientName: linkedInvoice?.clientName || quote.clientName,
      clientAddress: linkedInvoice?.clientAddress || quote.clientAddress,
      clientPhone: linkedInvoice?.clientPhone || quote.clientPhone,
      clientEmail: linkedInvoice?.clientEmail || quote.clientEmail,
      originAddress: quote.originAddress,
      destinationAddress: quote.destinationAddress,
      serviceType: quote.serviceType,
      volumeM3: quote.volumeM3,
      items,
      subtotal,
      fuelSurcharge,
      discount,
      taxRate: quote.taxRate,
      taxAmount,
      total,
      paidAmount,
      currency: linkedInvoice?.currency || quote.currency,
      terms:
        quote.specialTerms ||
        'Paiement a reception par virement bancaire, cheque ou Mobile Money. Reference facture obligatoire.',
    },
    company
  );
}
