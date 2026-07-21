import { DocumentItem, ParsedPage, BodyFooterPair, UserPreferences, DEFAULT_PREFERENCES, ValidationError } from './documentModel';
import { PAGE } from './pageConfig';

export interface PaginationResult {
  pages: ParsedPage[];
  warnings: ValidationError[];
}

/**
 * Paginate the document items based on actual browser rendering measurements.
 * It searches for the largest consistent font size S (from maxFontSize down to minFontSize)
 * and the optimal line break size L for each page to fit the content onto A4 pages.
 */
export async function paginateDocument(
  documentItems: DocumentItem[],
  preferences: UserPreferences = DEFAULT_PREFERENCES
): Promise<PaginationResult> {
  if (documentItems.length === 0) return { pages: [], warnings: [] };

  // 1. Wait for fonts to load to ensure accurate measurements
  if (typeof document !== 'undefined' && document.fonts) {
    await document.fonts.ready;
  }

  // 2. Create offscreen measurement container
  const measureContainer = document.createElement('div');
  measureContainer.id = 'hussayni-measure-container';
  Object.assign(measureContainer.style, {
    position: 'fixed',
    left: '-9999px',
    top: '-9999px',
    width: PAGE.width,
    height: PAGE.height,
    boxSizing: 'border-box',
    fontFamily: 'Arial, sans-serif',
    direction: 'rtl',
    textAlign: 'center',
    background: 'white',
    visibility: 'hidden',
  });
  document.body.appendChild(measureContainer);

  const pageEl = document.createElement('div');
  pageEl.className = 'page';
  Object.assign(pageEl.style, {
    width: PAGE.width,
    height: PAGE.height,
    boxSizing: 'border-box',
    position: 'relative',
    background: 'white',
  });

  const printableAreaEl = document.createElement('div');
  printableAreaEl.className = 'printable-area';
  Object.assign(printableAreaEl.style, {
    width: `calc(${PAGE.width} - ${PAGE.marginLeft} - ${PAGE.marginRight})`,
    height: `calc(${PAGE.height} - ${PAGE.marginTop} - ${PAGE.marginBottom})`,
    margin: `${PAGE.marginTop} ${PAGE.marginRight} ${PAGE.marginBottom} ${PAGE.marginLeft}`,
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  });

  pageEl.appendChild(printableAreaEl);
  measureContainer.appendChild(pageEl);

  // Measure the precise dimensions of PrintableArea directly
  const PRINTABLE_WIDTH = printableAreaEl.clientWidth;
  const PRINTABLE_HEIGHT = printableAreaEl.clientHeight;
  const printableAreaRect = printableAreaEl.getBoundingClientRect();

  // Spacing multiplier based on paragraph spacing setting
  let spacingMultiplier = 1.0;
  if (preferences.paragraphSpacing === 'compact') {
    spacingMultiplier = 0.7;
  } else if (preferences.paragraphSpacing === 'relaxed') {
    spacingMultiplier = 1.3;
  }

  // Helper to build and render candidate HTML into the measure container
  const checkPageFits = (
    headerText: string,
    pairs: BodyFooterPair[],
    fontSize: number,
    lineBreakSize: number
  ): { fits: boolean; hasHorizontalOverflow: boolean; hasVerticalOverflow: boolean; overflowingLines: number[] } => {
    let contentHtml = '';
    const breakSizePt = Math.round(lineBreakSize * spacingMultiplier);

    const renderLinesHtml = (text: string, isBold: boolean, lineIndex: number, color: string): string => {
      const lines = text.split('\n');
      return lines.map((lineText, idx) => {
        const currentLineNum = lineIndex + idx;
        return `
          <p class="hussayni-para" data-line="${currentLineNum}" style="font-family: Arial, sans-serif; font-size: ${fontSize}pt; line-height: 1.3; font-weight: ${isBold ? 'bold' : 'normal'}; margin: 0; padding: 0; text-align: center; color: ${color}; direction: rtl; white-space: nowrap; overflow: visible; width: 100%;">
            <span class="hussayni-line-span" style="display: inline-block; white-space: nowrap;">${lineText}</span>
          </p>
        `;
      }).join('');
    };

    // Header
    if (headerText) {
      const headerLine = pairs[0] ? pairs[0].bodyLineIndex || 1 : 1;
      contentHtml += renderLinesHtml(headerText, true, headerLine, '#000000');
      contentHtml += `
        <p style="font-family: Arial, sans-serif; font-size: ${breakSizePt}pt; line-height: 1.3; margin: 0; padding: 0; text-align: center;">&nbsp;</p>
      `;
    }

    // Pairs
    pairs.forEach((pair, idx) => {
      if (idx > 0) {
        // Gap spacer between pairs
        contentHtml += `<p style="font-family: Arial, sans-serif; font-size: ${breakSizePt}pt; line-height: 1.3; margin: 0; padding: 0; text-align: center;">&nbsp;</p>`;
      }

      // Body text
      contentHtml += renderLinesHtml(pair.body, false, pair.bodyLineIndex, '#1e293b');

      if (pair.footer) {
        // Spacer between body and footer
        contentHtml += `<p style="font-family: Arial, sans-serif; font-size: ${breakSizePt}pt; line-height: 1.3; margin: 0; padding: 0; text-align: center;">&nbsp;</p>`;

        // Footer text
        contentHtml += renderLinesHtml(pair.footer, true, pair.footerLineIndex, '#0f172a');
      }
    });

    // Build complete page mockup including page footer representation inside printableAreaEl
    printableAreaEl.innerHTML = `
      <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; width: 100%; box-sizing: border-box;">
        <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; gap: 0; padding: 0;">
          ${contentHtml}
        </div>
        <footer style="margin-top: 12px; padding-top: 12px; text-align: center; shrink-0;">
          <p style="font-size: 10px; color: #64748b; margin: 0; padding: 0;">صفحة 99 من 99</p>
          <p style="font-size: 8px; color: #cbd5e1; margin: 4px 0 0 0; padding: 0; font-family: monospace; direction: ltr;">Hussayni Document Compiler v1.1.0</p>
        </footer>
      </div>
    `;

    // Force layout recalculation
    const _forceRepaint = printableAreaEl.offsetHeight;

    // Check vertical overflow: scrollHeight must be <= clientHeight
    const hasVerticalOverflow = printableAreaEl.scrollHeight > PRINTABLE_HEIGHT;

    // Check horizontal overflow
    let hasHorizontalOverflow = false;
    const overflowingLines: number[] = [];
    const spans = printableAreaEl.querySelectorAll('.hussayni-line-span');
    for (let i = 0; i < spans.length; i++) {
      const span = spans[i] as HTMLElement;
      let overflows = false;
      
      const spanWidth = span.getBoundingClientRect().width;
      if (spanWidth > PRINTABLE_WIDTH + 0.1) {
        overflows = true;
      } else {
        const rect = span.getBoundingClientRect();
        if (rect.right > printableAreaRect.right + 0.5 || rect.left < printableAreaRect.left - 0.5) {
          overflows = true;
        }
      }

      if (overflows) {
        hasHorizontalOverflow = true;
        const p = span.closest('.hussayni-para');
        if (p) {
          const lineAttr = p.getAttribute('data-line');
          if (lineAttr) {
            const lineNum = parseInt(lineAttr, 10);
            if (!overflowingLines.includes(lineNum)) {
              overflowingLines.push(lineNum);
            }
          }
        }
      }
    }

    const fits = !hasVerticalOverflow && !hasHorizontalOverflow;
    return {
      fits,
      hasHorizontalOverflow,
      hasVerticalOverflow,
      overflowingLines
    };
  };

  // Helper to optimize the line break size L from S down to minL
  const getOptimalLineBreakSize = (
    headerText: string,
    pairs: BodyFooterPair[],
    S: number
  ): number => {
    const minL = Math.min(20, S);
    for (let L = S; L >= minL; L--) {
      if (checkPageFits(headerText, pairs, S, L).fits) {
        return L;
      }
    }
    return minL;
  };

  // Try to distribute pages with a candidate font size S
  const tryPaginateWithFontSize = (S: number, forceAccept: boolean): ParsedPage[] | null => {
    const pagesAttempt: ParsedPage[] = [];
    let i = 0;
    let pageNumber = 1;

    while (i < documentItems.length) {
      if (documentItems[i].type === 'break') {
        i++;
        continue;
      }

      const item1 = documentItems[i] as { type: 'pair'; data: BodyFooterPair };
      const pair1 = item1.data;
      const activeHeader = pair1.activeHeader || "بسم الله الرحمن الرحيم";

      let canPair = false;
      let pair2: BodyFooterPair | null = null;
      const nextIndex = i + 1;

      // Look-ahead to see if we can pair
      if (nextIndex < documentItems.length) {
        const nextItem = documentItems[nextIndex];
        if (nextItem.type === 'pair') {
          canPair = true;
          pair2 = nextItem.data;
        }
      }

      if (canPair && pair2) {
        // Try to pack BOTH pair1 and pair2 on this page using the minimum line break size L = Math.min(20, S)
        const minL = Math.min(20, S);
        if (checkPageFits(activeHeader, [pair1, pair2], S, minL).fits) {
          const optimalL = getOptimalLineBreakSize(activeHeader, [pair1, pair2], S);
          pagesAttempt.push({
            pageNumber,
            headerText: activeHeader,
            fontSize: S,
            lineBreakSize: optimalL,
            pairs: [pair1, pair2]
          });
          i += 2; // consume both pairs
          pageNumber++;
          continue;
        }
      }

      // Otherwise, place only pair1 on this page
      const minL = Math.min(20, S);
      if (checkPageFits(activeHeader, [pair1], S, minL).fits || forceAccept) {
        const optimalL = getOptimalLineBreakSize(activeHeader, [pair1], S);
        pagesAttempt.push({
          pageNumber,
          headerText: activeHeader,
          fontSize: S,
          lineBreakSize: optimalL,
          pairs: [pair1]
        });
        i += 1;
        pageNumber++;
      } else {
        // If even a single pair does not fit at S, and we are not forcing, this S is invalid
        return null;
      }
    }
    return pagesAttempt;
  };

  // Find the largest consistent font size S (from maxFontSize down to minFontSize) that fits all pages
  let pages: ParsedPage[] = [];
  const startS = preferences.maxFontSize;
  const endS = preferences.minFontSize;

  for (let S = startS; S >= endS; S -= 1) {
    const attempt = tryPaginateWithFontSize(S, false);
    if (attempt !== null) {
      pages = attempt;
      break;
    }
  }

  // Fallback to endS if no attempt was accepted
  if (pages.length === 0) {
    pages = tryPaginateWithFontSize(endS, true) || [];
  }

  // Generate warnings for any horizontal overflows that persist at the final selected font size
  const warnings: ValidationError[] = [];
  if (pages.length > 0) {
    const finalS = pages[0].fontSize;
    pages.forEach((page) => {
      const minL = page.lineBreakSize;
      const fitResult = checkPageFits(page.headerText, page.pairs, finalS, minL);
      if (fitResult.hasHorizontalOverflow && fitResult.overflowingLines) {
        fitResult.overflowingLines.forEach((lineNum) => {
          if (!warnings.some((w) => w.line === lineNum)) {
            warnings.push({
              line: lineNum,
              message: `Line exceeds the printable area width at the minimum allowed font size (${preferences.minFontSize} pt).`,
              severity: 'warning'
            });
          }
        });
      }
    });
  }

  // 6. Clean up offscreen container
  document.body.removeChild(measureContainer);

  return { pages, warnings };
}
