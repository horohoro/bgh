/**
 * Normalizes text for search and filtering:
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

/**
 * Extracts all searchable text values from card data (titles, rules, names, descriptions),
 * flattening multilingual objects into a unified string while omitting media URLs.
 */
export function extractCardSearchableText(data: Record<string, any> | undefined | null): string {
  if (!data) return '';
  const parts: string[] = [];

  for (const [key, val] of Object.entries(data)) {
    // Skip image URLs, icons, and Wikipedia URLs so URL slugs don't pollute keyword search
    if (key === 'imageUrl' || key === 'image' || key === 'icon' || key === 'wikipedia') {
      continue;
    }

    if (typeof val === 'string') {
      parts.push(val);
    } else if (val && typeof val === 'object') {
      for (const subVal of Object.values(val)) {
        if (typeof subVal === 'string') {
          parts.push(subVal);
        }
      }
    }
  }

  return parts.join(' ');
}

/**
 * Checks if card data matches a search query:
 * - Accent-insensitive / diacritic-insensitive ("edouard" matches "Édouard")
 * - Case-insensitive ("EDOUARD" matches "Édouard")
 * - Multi-term matching ("edouard balladur" matches any order)
 */
export function matchesSearchQuery(data: Record<string, any> | undefined | null, query: string): boolean {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const cardContent = normalizeText(extractCardSearchableText(data));

  return searchTerms.every(term => cardContent.includes(term));
}
