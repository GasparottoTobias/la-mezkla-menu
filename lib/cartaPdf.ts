import { jsPDF } from 'jspdf';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

type CategoryWithProducts = {
  id: string;
  name: string;
  products: Product[];
};

type ProductPlan = {
  nameLines: string[];
  priceText: string;
  priceOnOwnLine: boolean;
  descLines: string[];
};

type MeasuredBlock =
  | { kind: 'category'; name: string; continued: boolean; height: number }
  | { kind: 'product'; product: Product; height: number; plan: ProductPlan };

export type CartaPdfResult = {
  blob: Blob;
  fileName: string;
  pageCount: number;
};

// ─── Paleta (igual al panel admin) ─────────────────────────────────────────

const COLOR_CANVAS: [number, number, number] = [14, 13, 11]; // #0e0d0b
const COLOR_GOLD: [number, number, number] = [197, 147, 79]; // #c5934f
const COLOR_TEXT: [number, number, number] = [245, 240, 232]; // #f5f0e8
const COLOR_TEXT_SECONDARY: [number, number, number] = [172, 166, 156];
const COLOR_BORDER: [number, number, number] = [58, 54, 48];

// ─── Layout base (mm) ───────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 12;
const MARGIN_BOTTOM = 11;
const COLUMN_GAP = 8;
const COLUMNS_PER_PAGE = 2;
const COLUMN_W = (PAGE_W - MARGIN_X * 2 - COLUMN_GAP) / COLUMNS_PER_PAGE;
const INNER_W = COLUMN_W - 2;

const HEADER_TOP_FIRST_PAGE = 34;
const HEADER_TOP_CONTINUATION_PAGE = 15;

const LOGO_RATIO = 578 / 1070;

const SZ = {
  categoryFont: 11.5,
  categoryBlockH: 6.4,
  categoryBaselineOffset: 4,
  categoryDividerOffset: 1.3,

  nameFont: 9.2,
  nameLineH: 3.55,
  priceLineH: 3.55,
  descFont: 7.5,
  descLineH: 3.05,
  gapAfterProduct: 1.9,

  baselineFactor: 0.74,
};

// ─── Medición y paginación ─────────────────────────────────────────────────

function planProduct(doc: jsPDF, product: Product): ProductPlan {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(SZ.nameFont);
  const priceText = '$' + product.price.toLocaleString('es-AR');
  const priceWidth = doc.getTextWidth(priceText);

  const firstLineMaxWidth = INNER_W - priceWidth - 2;
  const oneLineFits = doc.splitTextToSize(product.name, firstLineMaxWidth).length === 1;

  let nameLines: string[];
  let priceOnOwnLine: boolean;

  if (oneLineFits) {
    nameLines = [product.name];
    priceOnOwnLine = false;
  } else {
    nameLines = doc.splitTextToSize(product.name, INNER_W);
    priceOnOwnLine = true;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(SZ.descFont);
  const descLines: string[] = product.description
    ? doc.splitTextToSize(product.description, INNER_W)
    : [];

  return { nameLines, priceText, priceOnOwnLine, descLines };
}

function heightOfProduct(plan: ProductPlan): number {
  let height = plan.nameLines.length * SZ.nameLineH;
  if (plan.priceOnOwnLine) height += SZ.priceLineH;
  height += plan.descLines.length * SZ.descLineH;
  height += SZ.gapAfterProduct;
  return height;
}

function columnTop(columnIndex: number): number {
  const pageIndex = Math.floor(columnIndex / COLUMNS_PER_PAGE);
  return pageIndex === 0 ? HEADER_TOP_FIRST_PAGE : HEADER_TOP_CONTINUATION_PAGE;
}

function columnHeight(columnIndex: number): number {
  return PAGE_H - columnTop(columnIndex) - MARGIN_BOTTOM;
}

/**
 * Llena columnas en orden de lectura y agrega tantas páginas como sean
 * necesarias. Cuando una categoría continúa en otra columna, repite su título
 * para que ningún producto quede visualmente huérfano.
 */
function paginateIntoColumns(doc: jsPDF, menu: CategoryWithProducts[]): MeasuredBlock[][] {
  const columns: MeasuredBlock[][] = [[]];
  const usedHeights: number[] = [0];
  let columnIndex = 0;

  const advanceColumn = () => {
    columnIndex += 1;
    columns[columnIndex] = [];
    usedHeights[columnIndex] = 0;
  };

  const addBlock = (block: MeasuredBlock) => {
    columns[columnIndex].push(block);
    usedHeights[columnIndex] += block.height;
  };

  for (const category of menu) {
    if (category.products.length === 0) continue;

    const productBlocks: MeasuredBlock[] = category.products.map((product) => {
      const plan = planProduct(doc, product);
      return { kind: 'product', product, plan, height: heightOfProduct(plan) };
    });

    const categoryBlock: MeasuredBlock = {
      kind: 'category',
      name: category.name,
      continued: false,
      height: SZ.categoryBlockH,
    };

    const firstProduct = productBlocks[0];
    const remainingHeight = columnHeight(columnIndex) - usedHeights[columnIndex];

    // El encabezado siempre queda acompañado por al menos un producto.
    if (
      columns[columnIndex].length > 0 &&
      categoryBlock.height + firstProduct.height > remainingHeight
    ) {
      advanceColumn();
    }

    addBlock(categoryBlock);

    for (const productBlock of productBlocks) {
      if (usedHeights[columnIndex] + productBlock.height > columnHeight(columnIndex)) {
        advanceColumn();
        addBlock({
          kind: 'category',
          name: category.name,
          continued: true,
          height: SZ.categoryBlockH,
        });
      }

      addBlock(productBlock);
    }
  }

  return columns;
}

// ─── Dibujo ─────────────────────────────────────────────────────────────────

function drawPageBackground(doc: jsPDF) {
  doc.setFillColor(...COLOR_CANVAS);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function drawHeaderFirstPage(doc: jsPDF, logoDataUrl: string | null) {
  if (logoDataUrl) {
    const logoW = 42;
    const logoH = logoW * LOGO_RATIO;
    doc.addImage(logoDataUrl, 'PNG', (PAGE_W - logoW) / 2, 4, logoW, logoH);
  } else {
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(24);
    doc.setTextColor(...COLOR_TEXT);
    doc.text('La Mezkla', PAGE_W / 2, 17, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_GOLD);
  doc.text('C A R T A', PAGE_W / 2, 29, { align: 'center' });

  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W / 2 - 15, 31.5, PAGE_W / 2 + 15, 31.5);
}

function drawHeaderContinuationPage(doc: jsPDF) {
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_TEXT);
  doc.text('La Mezkla', PAGE_W / 2, 9, { align: 'center' });

  doc.setDrawColor(...COLOR_GOLD);
  doc.setLineWidth(0.25);
  doc.line(PAGE_W / 2 - 11, 11.5, PAGE_W / 2 + 11, 11.5);
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...COLOR_TEXT_SECONDARY);
  doc.text('La Mezkla Pub & Eventos', MARGIN_X, PAGE_H - 6);
  doc.text(pageNumber + '/' + totalPages, PAGE_W - MARGIN_X, PAGE_H - 6, { align: 'right' });
}

function drawColumn(doc: jsPDF, items: MeasuredBlock[], x: number, topY: number) {
  let y = topY;

  for (const item of items) {
    if (item.kind === 'category') {
      const baselineY = y + SZ.categoryBaselineOffset;
      const label = item.continued ? item.name + ' · continuación' : item.name;

      doc.setFont('times', 'bold');
      doc.setFontSize(item.continued ? SZ.categoryFont - 1 : SZ.categoryFont);
      doc.setTextColor(...COLOR_GOLD);
      doc.text(label, x, baselineY);

      doc.setDrawColor(...COLOR_BORDER);
      doc.setLineWidth(0.2);
      doc.line(x, baselineY + SZ.categoryDividerOffset, x + INNER_W, baselineY + SZ.categoryDividerOffset);

      y += item.height;
      continue;
    }

    const { plan } = item;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(SZ.nameFont);

    let cursorY = y;

    plan.nameLines.forEach((line, index) => {
      const baseline = cursorY + SZ.nameLineH * SZ.baselineFactor;
      doc.setTextColor(...COLOR_TEXT);
      doc.text(line, x, baseline);
      if (index === 0 && !plan.priceOnOwnLine) {
        doc.setTextColor(...COLOR_GOLD);
        doc.text(plan.priceText, x + INNER_W, baseline, { align: 'right' });
      }
      cursorY += SZ.nameLineH;
    });

    if (plan.priceOnOwnLine) {
      const baseline = cursorY + SZ.priceLineH * SZ.baselineFactor;
      doc.setTextColor(...COLOR_GOLD);
      doc.text(plan.priceText, x + INNER_W, baseline, { align: 'right' });
      cursorY += SZ.priceLineH;
    }

    if (plan.descLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(SZ.descFont);
      doc.setTextColor(...COLOR_TEXT_SECONDARY);
      for (const line of plan.descLines) {
        const baseline = cursorY + SZ.descLineH * SZ.baselineFactor;
        doc.text(line, x, baseline);
        cursorY += SZ.descLineH;
      }
    }

    y += item.height;
  }
}

// ─── Logo y función principal ───────────────────────────────────────────────

async function loadLogoAsDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function createCartaPdf(
  menu: CategoryWithProducts[],
  fileDateSuffix: string,
  logoDataUrlOverride?: string | null
): Promise<CartaPdfResult> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoDataUrl = logoDataUrlOverride === undefined
    ? await loadLogoAsDataUrl()
    : logoDataUrlOverride;
  const columns = paginateIntoColumns(doc, menu);
  const pageCount = Math.max(1, Math.ceil(columns.length / COLUMNS_PER_PAGE));
  const columnX = [0, 1].map((index) => MARGIN_X + index * (COLUMN_W + COLUMN_GAP));

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) doc.addPage();

    drawPageBackground(doc);
    if (pageIndex === 0) drawHeaderFirstPage(doc, logoDataUrl);
    else drawHeaderContinuationPage(doc);

    for (let pageColumn = 0; pageColumn < COLUMNS_PER_PAGE; pageColumn += 1) {
      const columnIndex = pageIndex * COLUMNS_PER_PAGE + pageColumn;
      drawColumn(doc, columns[columnIndex] ?? [], columnX[pageColumn], columnTop(columnIndex));
    }

    drawFooter(doc, pageIndex + 1, pageCount);
  }

  return {
    blob: doc.output('blob'),
    fileName: 'carta-' + fileDateSuffix + '.pdf',
    pageCount,
  };
}
