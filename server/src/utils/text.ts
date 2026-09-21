/**
 * Normalizes text for search and metadata filtering:
 * - Strips combining diacritics / accents (e.g. "Édouard" -> "edouard", "Molière" -> "moliere")
 * - Converts to lower case
 * - Normalizes Unicode using NFKD
 * - Trims leading/trailing whitespace
 */
export function normalizeText(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
