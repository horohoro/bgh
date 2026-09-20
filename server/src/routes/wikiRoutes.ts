import { Router } from 'express';

const wikiRouter = Router();

const SUPPORTED_LANGS = ['en', 'fr', 'ja'];

interface WikiEnrichResult {
  title: Record<string, string>;
  wikipedia: Record<string, string>;
  imageUrl?: string;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'BGH/1.0 (https://github.com/horohoro/bgh; bgh@example.com)'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} from ${url}`);
  }
  return await res.json();
}

// Search & Enrich from Wikipedia
wikiRouter.get('/enrich', async (req, res) => {
  const query = (req.query.query as string)?.trim();
  const primaryLang = ((req.query.lang as string) || 'en').toLowerCase();

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  const lang = SUPPORTED_LANGS.includes(primaryLang) ? primaryLang : 'en';

  try {
    // 1. Search for closest page title in the primary language
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&utf8=1`;
    const searchData = await fetchJson(searchUrl);

    const searchResults = searchData?.query?.search;
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ error: `No Wikipedia article found for "${query}" in ${lang}` });
    }

    const matchedTitle = searchResults[0].title;

    // 2. Fetch page details (info, image, langlinks)
    const detailUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(matchedTitle)}&prop=info|pageimages|langlinks&inprop=url&lllimit=500&piprop=thumbnail&pithumbsize=800&format=json&utf8=1`;
    const detailData = await fetchJson(detailUrl);

    const pages = detailData?.query?.pages;
    if (!pages) {
      return res.status(404).json({ error: 'Page details not found' });
    }

    const pageId = Object.keys(pages)[0];
    const page = pages[pageId];

    const result: WikiEnrichResult = {
      title: { [lang]: page.title },
      wikipedia: { [lang]: page.canonicalurl || page.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title)}` },
      imageUrl: page.thumbnail?.source || ''
    };

    // Extract langlinks
    if (Array.isArray(page.langlinks)) {
      for (const link of page.langlinks) {
        if (SUPPORTED_LANGS.includes(link.lang)) {
          result.title[link.lang] = link['*'];
          result.wikipedia[link.lang] = `https://${link.lang}.wikipedia.org/wiki/${encodeURIComponent(link['*'])}`;
        }
      }
    }

    // 3. If primary page had no thumbnail, try fetching from English (or French)
    if (!result.imageUrl) {
      const fallbackLang = lang === 'en' ? 'fr' : 'en';
      const fallbackTitle = result.title[fallbackLang];
      if (fallbackTitle) {
        try {
          const fallbackUrl = `https://${fallbackLang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(fallbackTitle)}&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&utf8=1`;
          const fallbackData = await fetchJson(fallbackUrl);
          const fbPages = fallbackData?.query?.pages;
          if (fbPages) {
            const fbId = Object.keys(fbPages)[0];
            if (fbPages[fbId]?.thumbnail?.source) {
              result.imageUrl = fbPages[fbId].thumbnail.source;
            }
          }
        } catch {
          // ignore fallback failure
        }
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error('Wikipedia enrich error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch from Wikipedia' });
  }
});

export { wikiRouter };
