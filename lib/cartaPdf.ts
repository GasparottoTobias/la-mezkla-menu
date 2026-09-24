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

export function cartaPdfFileName(fileDateSuffix: string) {
  return 'Carta-' + fileDateSuffix + '.pdf';
}

// ─── Paleta exclusiva del PDF: fondo blanco y bajo consumo de tinta ────────

const COLOR_CANVAS: [number, number, number] = [255, 255, 255]; // #ffffff
const COLOR_ACCENT: [number, number, number] = [47, 62, 80]; // #2f3e50 · azul tinta
const COLOR_TEXT: [number, number, number] = [22, 25, 29]; // #16191d
const COLOR_TEXT_SECONDARY: [number, number, number] = [79, 84, 91]; // #4f545b
const COLOR_BORDER: [number, number, number] = [216, 219, 223]; // #d8dbdf

// ─── Layout base (mm) ───────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 12;
// Keep a generous printable-area buffer above the footer. jsPDF's text
// metrics can differ slightly from the final PDF renderer, particularly on
// dense columns, so this prevents the last product from entering the footer.
const MARGIN_BOTTOM = 16;
const COLUMN_GAP = 8;
const COLUMNS_PER_PAGE = 2;
const TARGET_PAGE_COUNT = 2;
const MAX_COLUMNS = COLUMNS_PER_PAGE * TARGET_PAGE_COUNT;
const COLUMN_W = (PAGE_W - MARGIN_X * 2 - COLUMN_GAP) / COLUMNS_PER_PAGE;
const INNER_W = COLUMN_W - 2;

const HEADER_TOP_FIRST_PAGE = 34;
const HEADER_TOP_CONTINUATION_PAGE = 15;

const LOGO_RATIO = 578 / 1070;

const BASE_SZ = {
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

type LayoutMetrics = typeof BASE_SZ;

function scaleMetrics(scale: number): LayoutMetrics {
  return {
    categoryFont: BASE_SZ.categoryFont * scale,
    categoryBlockH: BASE_SZ.categoryBlockH * scale,
    categoryBaselineOffset: BASE_SZ.categoryBaselineOffset * scale,
    categoryDividerOffset: BASE_SZ.categoryDividerOffset * scale,
    nameFont: BASE_SZ.nameFont * scale,
    nameLineH: BASE_SZ.nameLineH * scale,
    priceLineH: BASE_SZ.priceLineH * scale,
    descFont: BASE_SZ.descFont * scale,
    descLineH: BASE_SZ.descLineH * scale,
    gapAfterProduct: BASE_SZ.gapAfterProduct * scale,
    baselineFactor: BASE_SZ.baselineFactor,
  };
}

// ─── Medición y paginación ─────────────────────────────────────────────────

function planProduct(doc: jsPDF, product: Product, sz: LayoutMetrics): ProductPlan {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(sz.nameFont);
  const priceText = product.price > 0 ? '$' + product.price.toLocaleString('es-AR') : 'Consultar';
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
  doc.setFontSize(sz.descFont);
  const descLines: string[] = product.description
    ? doc.splitTextToSize(product.description, INNER_W)
    : [];

  return { nameLines, priceText, priceOnOwnLine, descLines };
}

function heightOfProduct(plan: ProductPlan, sz: LayoutMetrics): number {
  let height = plan.nameLines.length * sz.nameLineH;
  if (plan.priceOnOwnLine) height += sz.priceLineH;
  height += plan.descLines.length * sz.descLineH;
  height += sz.gapAfterProduct;
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
function paginateIntoColumns(
  doc: jsPDF,
  menu: CategoryWithProducts[],
  sz: LayoutMetrics
): MeasuredBlock[][] {
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
      const plan = planProduct(doc, product, sz);
      return { kind: 'product', product, plan, height: heightOfProduct(plan, sz) };
    });

    const categoryBlock: MeasuredBlock = {
      kind: 'category',
      name: category.name,
      continued: false,
      height: sz.categoryBlockH,
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
          height: sz.categoryBlockH,
        });
      }

      addBlock(productBlock);
    }
  }

  return columns;
}

function fitMenuToTwoPages(doc: jsPDF, menu: CategoryWithProducts[]) {
  let fittingScale = 1;
  let metrics = scaleMetrics(fittingScale);
  let columns = paginateIntoColumns(doc, menu, metrics);

  // Reduce proportionally until all content fits on the front and back of one
  // A4 sheet. Then recover the largest fitting size with a binary search so
  // the menu remains as readable as the current catalog allows.
  while (columns.length > MAX_COLUMNS && fittingScale > 0.02) {
    fittingScale *= 0.9;
    metrics = scaleMetrics(fittingScale);
    columns = paginateIntoColumns(doc, menu, metrics);
  }

  if (columns.length > MAX_COLUMNS) {
    throw new Error('La carta es demasiado extensa para ajustarla a dos páginas.');
  }

  let low = fittingScale;
  let high = Math.min(1, fittingScale / 0.9);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = (low + high) / 2;
    const candidateMetrics = scaleMetrics(candidate);
    const candidateColumns = paginateIntoColumns(doc, menu, candidateMetrics);
    if (candidateColumns.length <= MAX_COLUMNS) {
      low = candidate;
      metrics = candidateMetrics;
      columns = candidateColumns;
    } else {
      high = candidate;
    }
  }

  return { columns, metrics };
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
  doc.setTextColor(...COLOR_ACCENT);
  doc.text('C A R T A', PAGE_W / 2, 29, { align: 'center' });

  doc.setDrawColor(...COLOR_ACCENT);
  doc.setLineWidth(0.3);
  doc.line(PAGE_W / 2 - 15, 31.5, PAGE_W / 2 + 15, 31.5);
}

function drawHeaderContinuationPage(doc: jsPDF) {
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(12);
  doc.setTextColor(...COLOR_TEXT);
  doc.text('La Mezkla', PAGE_W / 2, 9, { align: 'center' });

  doc.setDrawColor(...COLOR_ACCENT);
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

function drawColumn(
  doc: jsPDF,
  items: MeasuredBlock[],
  x: number,
  topY: number,
  sz: LayoutMetrics
) {
  let y = topY;

  for (const item of items) {
    if (item.kind === 'category') {
      const baselineY = y + sz.categoryBaselineOffset;
      const label = item.continued ? item.name + ' · continuación' : item.name;

      doc.setFont('times', 'bold');
      doc.setFontSize(item.continued ? sz.categoryFont - 1 * sz.nameFont / BASE_SZ.nameFont : sz.categoryFont);
      doc.setTextColor(...COLOR_ACCENT);
      doc.text(label, x, baselineY);

      doc.setDrawColor(...COLOR_BORDER);
      doc.setLineWidth(0.2);
      doc.line(x, baselineY + sz.categoryDividerOffset, x + INNER_W, baselineY + sz.categoryDividerOffset);

      y += item.height;
      continue;
    }

    const { plan } = item;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sz.nameFont);

    let cursorY = y;

    plan.nameLines.forEach((line, index) => {
      const baseline = cursorY + sz.nameLineH * sz.baselineFactor;
      doc.setTextColor(...COLOR_TEXT);
      doc.text(line, x, baseline);
      if (index === 0 && !plan.priceOnOwnLine) {
        doc.setTextColor(...COLOR_ACCENT);
        doc.text(plan.priceText, x + INNER_W, baseline, { align: 'right' });
      }
      cursorY += sz.nameLineH;
    });

    if (plan.priceOnOwnLine) {
      const baseline = cursorY + sz.priceLineH * sz.baselineFactor;
      doc.setTextColor(...COLOR_ACCENT);
      doc.text(plan.priceText, x + INNER_W, baseline, { align: 'right' });
      cursorY += sz.priceLineH;
    }

    if (plan.descLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(sz.descFont);
      doc.setTextColor(...COLOR_TEXT_SECONDARY);
      for (const line of plan.descLines) {
        const baseline = cursorY + sz.descLineH * sz.baselineFactor;
        doc.text(line, x, baseline);
        cursorY += sz.descLineH;
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
    const objectUrl = URL.createObjectURL(blob);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const loadedImage = new Image();
        loadedImage.onload = () => resolve(loadedImage);
        loadedImage.onerror = reject;
        loadedImage.src = objectUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return null;

      // El logo original está preparado para fondo oscuro: el dibujo es blanco
      // y también contiene píxeles negros. Conservamos la luminosidad del dibujo
      // como transparencia y lo teñimos de azul tinta para el fondo blanco.
      context.drawImage(image, 0, 0);
      const logoPixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < logoPixels.data.length; index += 4) {
        const luminance =
          logoPixels.data[index] * 0.2126 +
          logoPixels.data[index + 1] * 0.7152 +
          logoPixels.data[index + 2] * 0.0722;
        logoPixels.data[index] = COLOR_ACCENT[0];
        logoPixels.data[index + 1] = COLOR_ACCENT[1];
        logoPixels.data[index + 2] = COLOR_ACCENT[2];
        logoPixels.data[index + 3] = Math.round(
          logoPixels.data[index + 3] * (luminance / 255)
        );
      }
      context.putImageData(logoPixels, 0, 0);

      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
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
  const { columns, metrics } = fitMenuToTwoPages(doc, menu);
  const pageCount = TARGET_PAGE_COUNT;
  const columnX = [0, 1].map((index) => MARGIN_X + index * (COLUMN_W + COLUMN_GAP));

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) doc.addPage();

    drawPageBackground(doc);
    if (pageIndex === 0) drawHeaderFirstPage(doc, logoDataUrl);
    else drawHeaderContinuationPage(doc);

    for (let pageColumn = 0; pageColumn < COLUMNS_PER_PAGE; pageColumn += 1) {
      const columnIndex = pageIndex * COLUMNS_PER_PAGE + pageColumn;
      drawColumn(doc, columns[columnIndex] ?? [], columnX[pageColumn], columnTop(columnIndex), metrics);
    }

    drawFooter(doc, pageIndex + 1, pageCount);
  }

  return {
    blob: doc.output('blob'),
    fileName: cartaPdfFileName(fileDateSuffix),
    pageCount,
  };
}
