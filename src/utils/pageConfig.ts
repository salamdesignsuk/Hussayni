// Page and Printable Area Configuration
// Single source of truth for page dimensions and margins

export const PAGE = {
  width: "210mm",
  height: "297mm",
  marginTop: "12.7mm",      // Narrow margin (0.5 in)
  marginRight: "12.7mm",
  marginBottom: "12.7mm",
  marginLeft: "12.7mm"
};

// Numeric values in mm for computing printable dimensions
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;
export const MARGIN_TOP_MM = 12.7;
export const MARGIN_RIGHT_MM = 12.7;
export const MARGIN_BOTTOM_MM = 12.7;
export const MARGIN_LEFT_MM = 12.7;

// Computed printable dimensions in mm
export const PRINTABLE_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM; // 184.6mm
export const PRINTABLE_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM; // 271.6mm

// CSS values
export const PAGE_WIDTH_CSS = PAGE.width;
export const PAGE_HEIGHT_CSS = PAGE.height;
export const PRINTABLE_WIDTH_CSS = `calc(${PAGE_WIDTH_CSS} - ${PAGE.marginLeft} - ${PAGE.marginRight})`; // calc(210mm - 25.4mm)
export const PRINTABLE_HEIGHT_CSS = `calc(${PAGE_HEIGHT_CSS} - ${PAGE.marginTop} - ${PAGE.marginBottom})`; // calc(297mm - 25.4mm)
export const PRINTABLE_MARGIN_CSS = `${PAGE.marginTop} ${PAGE.marginRight} ${PAGE.marginBottom} ${PAGE.marginLeft}`;
