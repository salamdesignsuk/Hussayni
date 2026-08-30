const EASTERN_ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toArabicNumerals(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => EASTERN_ARABIC_DIGITS[Number(d)]);
}

export function formatNumeral(input: string | number, useArabicNumerals?: boolean): string {
  return useArabicNumerals ? toArabicNumerals(input) : String(input);
}
