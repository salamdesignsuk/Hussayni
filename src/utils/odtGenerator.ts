import JSZip from 'jszip';
import { ParsedPage } from './documentModel';

/**
 * Generates an OpenDocument Text (.odt) container containing the exact paginated
 * document structure matching the on-screen rendering.
 */
export async function generateOdtBlob(
  pages: ParsedPage[],
  leftFooterText: string = '',
  rightFooterText: string = '',
  showPageNumber: boolean = true,
  footerFontSizePx: number = 14
): Promise<Blob> {
  const zip = new JSZip();
  const footerFontSizePt = Math.round(footerFontSizePx * 0.75) || 10;

  // 1. Mimetype (must be uncompressed, but standard jszip defaults are fine)
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });

  // 2. META-INF/manifest.xml
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;
  zip.file('META-INF/manifest.xml', manifestXml);

  // 3. meta.xml
  const metaXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  office:version="1.2">
  <office:meta>
    <meta:generator>Hussayni Document Compiler v1.1.0</meta:generator>
    <meta:title>Hussayni Document</meta:title>
    <meta:creation-date>${new Date().toISOString()}</meta:creation-date>
  </office:meta>
</office:document-meta>`;
  zip.file('meta.xml', metaXml);

  // Collect unique font sizes and break sizes to generate appropriate style definitions
  const uniqueFontSizes = Array.from(new Set(pages.map(p => p.fontSize)));
  const uniqueBreakSizes = Array.from(new Set(pages.map(p => p.lineBreakSize)));

  // 4. styles.xml
  const pageNumText = showPageNumber 
    ? `صفحة <text:page-number text:select-page="current"/> من <text:page-count/>` 
    : ' ';

  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:style style:name="Standard" style:family="paragraph" style:class="text"/>
    <style:style style:name="HussayniPageFooter" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:text-align="start" fo:margin-top="0.2cm" style:writing-mode="rl-tb">
        <style:tab-stops>
          <style:tab-stop style:position="9.23cm" style:type="center"/>
          <style:tab-stop style:position="18.46cm" style:type="right"/>
        </style:tab-stops>
      </style:paragraph-properties>
      <style:text-properties style:font-name="Arial" fo:font-size="${footerFontSizePt}pt" fo:color="#64748b"/>
    </style:style>
  </office:styles>
  <office:automatic-styles>
    <style:page-layout style:name="pm1">
      <style:page-layout-properties
        fo:page-width="21cm"
        fo:page-height="29.7cm"
        fo:margin-top="1.27cm"
        fo:margin-bottom="1.27cm"
        fo:margin-left="1.27cm"
        fo:margin-right="1.27cm"
        style:writing-mode="rl-tb"/>
      <style:footer-style>
        <style:header-footer-properties
          fo:min-height="0.6cm"
          fo:margin-top="0.3cm"
          style:dynamic-spacing="true"/>
      </style:footer-style>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="pm1">
      <style:footer>
        <text:p text:style-name="HussayniPageFooter">${escapeXml(rightFooterText)}<text:tab/>${pageNumText}<text:tab/>${escapeXml(leftFooterText)}</text:p>
      </style:footer>
    </style:master-page>
  </office:master-styles>
</office:document-styles>`;
  zip.file('styles.xml', stylesXml);

  // Generate Automatic style definitions for content.xml
  let automaticStyles = '';

  // Page break style helper
  automaticStyles += `
    <style:style style:name="PageBreakPara" style:family="paragraph" style:parent-style-name="Standard">
      <style:paragraph-properties fo:break-before="page"/>
    </style:style>
  `;

  // Dynamic header, body, footer styles
  uniqueFontSizes.forEach(size => {
    // Basic body style with no margins
    automaticStyles += `
      <style:style style:name="HussayniBody_${size}" style:family="paragraph" style:parent-style-name="Standard">
        <style:paragraph-properties fo:text-align="center" fo:margin-top="0cm" fo:margin-bottom="0cm" fo:line-height="130%"/>
        <style:text-properties style:font-name="Arial" fo:font-size="${size}pt" fo:font-weight="normal" fo:color="#1e293b"/>
      </style:style>
    `;

    // Margin-based styles for spacing combinations
    uniqueBreakSizes.forEach(bSize => {
      const marginMm = (bSize * 0.3527).toFixed(3); // convert pt to mm (1pt = 0.3527mm)
      
      // Header style with bottom margin spacer
      automaticStyles += `
        <style:style style:name="HussayniHeader_${size}_break_${bSize}" style:family="paragraph" style:parent-style-name="Standard">
          <style:paragraph-properties fo:text-align="center" fo:margin-top="0cm" fo:margin-bottom="${marginMm}mm"/>
          <style:text-properties style:font-name="Arial" fo:font-size="${size}pt" fo:font-weight="bold" fo:color="#000000"/>
        </style:style>
      `;

      // Body start style (used for first line of subsequent pairs) with top margin spacer
      automaticStyles += `
        <style:style style:name="HussayniBodyStart_${size}_break_${bSize}" style:family="paragraph" style:parent-style-name="Standard">
          <style:paragraph-properties fo:text-align="center" fo:margin-top="${marginMm}mm" fo:margin-bottom="0cm" fo:line-height="130%"/>
          <style:text-properties style:font-name="Arial" fo:font-size="${size}pt" fo:font-weight="normal" fo:color="#1e293b"/>
        </style:style>
      `;

      // Footer style with top margin spacer
      automaticStyles += `
        <style:style style:name="HussayniFooter_${size}_break_${bSize}" style:family="paragraph" style:parent-style-name="Standard">
          <style:paragraph-properties fo:text-align="center" fo:margin-top="${marginMm}mm" fo:margin-bottom="0cm"/>
          <style:text-properties style:font-name="Arial" fo:font-size="${size}pt" fo:font-weight="bold" fo:color="#0f172a"/>
        </style:style>
      `;
    });
  });

  // Create content XML
  let contentBodyXml = '';

  pages.forEach((page, pageIdx) => {
    const isFirstPage = pageIdx === 0;
    const size = page.fontSize;
    const bSize = page.lineBreakSize;

    if (!isFirstPage) {
      // Force page break
      contentBodyXml += `<text:p text:style-name="PageBreakPara"/>`;
    }

    // Render page header
    if (page.headerText) {
      const headerEscaped = escapeXml(page.headerText).replace(/\n/g, '<text:line-break/>');
      contentBodyXml += `<text:p text:style-name="HussayniHeader_${size}_break_${bSize}">${headerEscaped}</text:p>`;
    }

    // Render pairs
    page.pairs.forEach((pair, pairIdx) => {
      // Body text split by line
      const bodyLines = pair.body.split('\n');
      bodyLines.forEach((line, lineIdx) => {
        const lineEscaped = escapeXml(line);
        const isFirstLineOfPair = lineIdx === 0;
        
        if (pairIdx > 0 && isFirstLineOfPair) {
          // Spacer between pairs is integrated into the margin-top of the first body line of pair 2+
          contentBodyXml += `<text:p text:style-name="HussayniBodyStart_${size}_break_${bSize}">${lineEscaped}</text:p>`;
        } else {
          contentBodyXml += `<text:p text:style-name="HussayniBody_${size}">${lineEscaped}</text:p>`;
        }
      });

      if (pair.footer) {
        // Footer text with margin-top spacer
        const footerEscaped = escapeXml(pair.footer).replace(/\n/g, '<text:line-break/>');
        contentBodyXml += `<text:p text:style-name="HussayniFooter_${size}_break_${bSize}">${footerEscaped}</text:p>`;
      }
    });
  });

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
  xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyle:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"
  xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0"
  xmlns:math="http://www.w3.org/1998/Math/MathML"
  xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0"
  xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0"
  office:version="1.2">
  <office:font-face-decls>
    <style:font-face style:name="Arial" svg:font-family="Arial" style:font-family-generic="swiss" style:font-pitch="variable"/>
  </office:font-face-decls>
  <office:automatic-styles>
    ${automaticStyles}
  </office:automatic-styles>
  <office:body>
    <office:text>
      ${contentBodyXml}
    </office:text>
  </office:body>
</office:document-content>`;

  zip.file('content.xml', contentXml);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.oasis.opendocument.text' });
}

// Utility to safely escape XML characters
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
