export interface HeaderExportOptions {
  headers: string[];
  fontSize: number;
  lineSpacing: number;
  theme: 'dark' | 'light';
  format: 'png' | 'jpg';
  docName: string;
}

/**
 * Renders a 1920x1080 landscape slide to an HTML5 Canvas context.
 * Supports multiline header text, exact font sizes, line spacing, blank line preserves, and light/dark themes.
 */
export function generateHeaderCanvas(
  headerText: string,
  fontSize: number,
  lineSpacing: number,
  theme: 'dark' | 'light'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const isLight = theme === 'light';

  // Background
  ctx.fillStyle = isLight ? '#ffffff' : '#000000';
  ctx.fillRect(0, 0, 1920, 1080);

  // Text Styling
  ctx.font = `800 ${fontSize}px Arial, "Traditional Arabic", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isLight ? '#000000' : '#ffffff';

  const lines = headerText.split('\n');
  const lineH = fontSize * lineSpacing;
  const totalH = lines.length * lineH;
  // Calculate starting vertical position to center all lines vertically
  const startY = (1080 - totalH) / 2 + lineH / 2;

  lines.forEach((line, i) => {
    const textToDraw = line.trim();
    if (textToDraw !== '') {
      ctx.fillText(textToDraw, 1920 / 2, startY + i * lineH);
    }
  });

  return canvas;
}

/**
 * Converts canvas to a PNG or JPG Blob.
 */
export function canvasToBlob(canvas: HTMLCanvasElement, format: 'png' | 'jpg'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpg' ? 0.95 : undefined;
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, mimeType, quality);
  });
}

/**
 * Exports a single header slide directly as PNG or JPG.
 */
export async function exportSingleHeaderImage(
  headerText: string,
  slideIndex: number,
  options: HeaderExportOptions
) {
  const canvas = generateHeaderCanvas(
    headerText,
    options.fontSize,
    options.lineSpacing,
    options.theme
  );
  const blob = await canvasToBlob(canvas, options.format);
  const ext = options.format;
  const sanitized = (options.docName || 'Header_Slide').replace(/\s+/g, '_');
  const filename = `${sanitized}_Slide_${slideIndex + 1}.${ext}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports all header slides as individual PNG or JPG image downloads.
 */
export async function exportAllHeaderImages(options: HeaderExportOptions) {
  const displayHeaders = options.headers.length > 0 ? options.headers : (options.docName ? [options.docName] : []);

  for (let i = 0; i < displayHeaders.length; i++) {
    await exportSingleHeaderImage(displayHeaders[i], i, options);
    if (i < displayHeaders.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}

