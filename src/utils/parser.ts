import { Token, ValidationError, DocumentItem, BodyFooterPair } from './documentModel';

/**
 * Parses Hussayni markup lines into structured document items and validates formatting.
 */
export function parseMarkup(code: string): {
  tokens: Token[];
  errors: ValidationError[];
  documentItems: DocumentItem[];
} {
  const lines = code.split('\n');
  const tokens: Token[] = [];
  const errors: ValidationError[] = [];

  let activeToken: Token | null = null;

  for (let index = 0; index < lines.length; index++) {
    const lineText = lines[index];
    const lineNum = index + 1;
    const trimmed = lineText.trim();

    // Check if the line is exactly a manual page break mark (P)
    if (trimmed.toUpperCase() === 'P') {
      if (activeToken) {
        tokens.push({ ...activeToken, text: activeToken.text.trim() });
        activeToken = null;
      }
      tokens.push({ type: 'P', text: '', lineIndex: lineNum });
      continue;
    }

    // Check if the line starts with H, B, or F mark (e.g. H = ... or just standalone marks H, B, F)
    const markMatch = lineText.match(/^([HBF])\s*=\s*(.*)$/i);
    const isAloneMark = /^(H|B|F)$/i.test(trimmed);

    if (markMatch || isAloneMark) {
      if (activeToken) {
        tokens.push({ ...activeToken, text: activeToken.text.trim() });
      }

      const markType = (markMatch ? markMatch[1] : trimmed).toUpperCase() as 'H' | 'B' | 'F';
      const initialText = markMatch ? markMatch[2] : '';

      activeToken = {
        type: markType,
        text: initialText,
        lineIndex: lineNum
      };
    } else {
      // Regular line: either append to active token or treat as invalid content outside blocks
      if (activeToken) {
        if (activeToken.text === '') {
          activeToken.text = lineText;
        } else {
          activeToken.text += '\n' + lineText;
        }
      } else {
        if (trimmed !== '') {
          errors.push({
            line: lineNum,
            message: `Invalid markup: Text found outside of any H, B, or F blocks.`,
            severity: 'error'
          });
        }
      }
    }
  }

  if (activeToken) {
    tokens.push({ ...activeToken, text: activeToken.text.trim() });
  }

  // Group tokens into body-footer pairs and track manual breaks
  const documentItems: DocumentItem[] = [];
  
  let currentHeader = '';
  let activeBody: string | null = null;
  let activeBodyLine = -1;

  // Pushes a body-footer pair, warning (once per pair, like the empty-body/
  // empty-footer checks below) if no header is currently active for it.
  const pushPair = (id: string, body: string, bodyLineIndex: number, footer: string, footerLineIndex: number) => {
    if (currentHeader === '') {
      errors.push({
        line: bodyLineIndex,
        message: 'Header is missing for this section.',
        severity: 'warning'
      });
    }
    documentItems.push({
      type: 'pair',
      data: { id, body, bodyLineIndex, footer, footerLineIndex, activeHeader: currentHeader }
    });
  };

  tokens.forEach((token) => {
    if (token.type === 'H') {
      if (token.text === '') {
        errors.push({
          line: token.lineIndex,
          message: 'Header definition is empty.',
          severity: 'warning'
        });
      }
      currentHeader = token.text;
    } else if (token.type === 'B') {
      if (token.text === '') {
        errors.push({
          line: token.lineIndex,
          message: 'Body text is empty.',
          severity: 'warning'
        });
      }
      if (activeBody !== null) {
        errors.push({
          line: activeBodyLine,
          message: "Body without footer: Missing required 'F' tag after body text.",
          severity: 'error'
        });
        // Push the previous un-footered body anyway to preview it
        pushPair(`pair-${token.lineIndex}-unfootered`, activeBody, activeBodyLine, '', -1);
      }
      activeBody = token.text;
      activeBodyLine = token.lineIndex;
    } else if (token.type === 'F') {
      if (token.text === '') {
        errors.push({
          line: token.lineIndex,
          message: 'Footer text is empty.',
          severity: 'warning'
        });
      }
      if (activeBody === null) {
        errors.push({
          line: token.lineIndex,
          message: "Footer without body: Missing preceding 'B' tag.",
          severity: 'error'
        });
      } else {
        pushPair(`pair-${activeBodyLine}`, activeBody, activeBodyLine, token.text, token.lineIndex);
        activeBody = null;
        activeBodyLine = -1;
      }
    } else if (token.type === 'P') {
      if (activeBody !== null) {
        errors.push({
          line: activeBodyLine,
          message: "Body without footer before manual page break.",
          severity: 'error'
        });
        pushPair(`pair-${activeBodyLine}-break-unfootered`, activeBody, activeBodyLine, '', -1);
        activeBody = null;
        activeBodyLine = -1;
      }
      documentItems.push({ type: 'break', lineIndex: token.lineIndex });
    }
  });

  // Check end-of-file dangling body
  if (activeBody !== null) {
    errors.push({
      line: activeBodyLine,
      message: "Body without footer at the end of the document.",
      severity: 'error'
    });
    pushPair(`pair-${activeBodyLine}-eof-unfootered`, activeBody, activeBodyLine, '', -1);
  }

  return { tokens, errors, documentItems };
}
