import { Document, Packer, Paragraph, TextRun, AlignmentType, Footer, TabStopType, PageNumber } from "docx";
import { ParsedPage } from "./documentModel";

/**
 * Generates a Microsoft Word (.docx) document containing the exact paginated
 * document structure matching the on-screen rendering.
 */
export async function generateDocxBlob(
  pages: ParsedPage[],
  leftFooterText: string = '',
  rightFooterText: string = '',
  showPageNumber: boolean = true,
  footerFontSizePx: number = 14
): Promise<Blob> {
  const footerFontSizePt = Math.round(footerFontSizePx * 0.75) || 10;
  const children: any[] = [];
  
  pages.forEach((page, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const S = page.fontSize; // Font size in pt
    const bSize = page.lineBreakSize; // Break size in pt
    
    // Convert to half-points for docx TextRun size
    const fontSizeHalfPoints = S * 2;
    const breakSpacingDxa = Math.round(bSize * 20); // 1 pt = 20 dxa

    // 1. Render Header Text
    if (page.headerText) {
      const headerLines = page.headerText.split('\n');
      headerLines.forEach((line, idx) => {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            // Insert page break on the very first element of a subsequent page
            pageBreakBefore: !isFirstPage && idx === 0,
            spacing: {
              before: 0,
              after: idx === headerLines.length - 1 ? breakSpacingDxa : 0,
              line: 260, // 1.3 line height (1.3 * 200 = 260)
            },
            children: [
              new TextRun({
                text: line,
                bold: true,
                size: fontSizeHalfPoints,
                font: "Arial",
                color: "000000",
              }),
            ],
          })
        );
      });
    }
    
    // 2. Render Pairs
    page.pairs.forEach((pair, pairIdx) => {
      const isFirstElementOnPage = pairIdx === 0 && !page.headerText;
      const bodyLines = pair.body.split('\n');
      
      bodyLines.forEach((line, idx) => {
        const isFirstLineOfPair = idx === 0;
        
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            pageBreakBefore: !isFirstPage && isFirstElementOnPage && isFirstLineOfPair,
            spacing: {
              before: (pairIdx > 0 && isFirstLineOfPair) ? breakSpacingDxa : 0,
              after: (idx === bodyLines.length - 1 && pair.footer) ? breakSpacingDxa : 0,
              line: 260, // 1.3 line height
            },
            children: [
              new TextRun({
                text: line,
                bold: false,
                size: fontSizeHalfPoints,
                font: "Arial",
                color: "000000",
              }),
            ],
          })
        );
      });
      
      if (pair.footer) {
        const footerLines = pair.footer.split('\n');
        footerLines.forEach((line, idx) => {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: {
                before: 0,
                after: 0,
                line: 260,
              },
              children: [
                new TextRun({
                  text: line,
                  bold: true,
                  size: fontSizeHalfPoints,
                  font: "Arial",
                  color: "000000",
                }),
              ],
            })
          );
        });
      }
    });
  });
  
  const footerChildren: any[] = [];
  
  // Tabbed paragraph for running footer (RTL direction)
  // Page printable width is A4 width 21cm (11906 dxa) minus left/right margins 1.27cm (720 dxa * 2 = 1440 dxa) -> 10466 dxa
  // Center is at 5233 dxa, Right-aligned tab stop is at 10466 dxa
  footerChildren.push(
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.START, // Text starts on right in RTL
      tabStops: [
        {
          type: TabStopType.CENTER,
          position: 5233,
        },
        {
          type: TabStopType.RIGHT,
          position: 10466,
        }
      ],
      children: [
        // Word is RTL so rightmost text (rightFooterText) appears first, then TAB, then Center, then TAB, then Left
        new TextRun({
          text: rightFooterText || " ",
          font: "Arial",
          size: footerFontSizePt * 2,
          color: "64748b",
        }),
        new TextRun({
          text: "\t",
        }),
        ...(showPageNumber
          ? [
              new TextRun({
                text: "صفحة ",
                font: "Arial",
                size: footerFontSizePt * 2,
                color: "64748b",
              }),
              new TextRun({
                children: [PageNumber.CURRENT],
                font: "Arial",
                size: footerFontSizePt * 2,
                color: "64748b",
              }),
              new TextRun({
                text: " من ",
                font: "Arial",
                size: footerFontSizePt * 2,
                color: "64748b",
              }),
              new TextRun({
                children: [PageNumber.TOTAL_PAGES],
                font: "Arial",
                size: footerFontSizePt * 2,
                color: "64748b",
              }),
            ]
          : [new TextRun({ text: " " })]),
        new TextRun({
          text: "\t",
        }),
        new TextRun({
          text: leftFooterText || " ",
          font: "Arial",
          size: footerFontSizePt * 2,
          color: "64748b",
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inches (1.27 cm)
              bottom: 720, // 0.5 inches (1.27 cm)
              left: 720,   // 0.5 inches (1.27 cm)
              right: 720,  // 0.5 inches (1.27 cm)
            },
          },
        },
        footers: {
          default: new Footer({
            children: footerChildren,
          }),
        },
        children: children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
