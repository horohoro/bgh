import fs from 'fs';
import path from 'path';
import { db } from './store.js';
import { CardSet, Card } from '../types/index.js';
import { RoomManager } from '../rooms/roomManager.js';

const BACKUP_FILE = path.resolve(process.cwd(), 'data', 'fdlm_backup_20210628.json');
const VANILLA_FILE = path.resolve(process.cwd(), 'data', 'fdlm_vanilla_20210622.json');

export async function seedDatabase() {
  await db.init();

  const existingSets = db.getSets();

  // Load vanilla base card IDs from 20210622(Vanilla).json
  const vanillaIds = new Set<string>();
  if (fs.existsSync(VANILLA_FILE)) {
    try {
      const vRaw = await fs.promises.readFile(VANILLA_FILE, 'utf-8');
      const vCards = JSON.parse(vRaw);
      vCards.forEach((c: any) => {
        if (c._id && c._id.$oid) vanillaIds.add(c._id.$oid);
      });
    } catch (e) {
      console.error('Failed to read vanilla cards:', e);
    }
  }

  // 1. Seed or update Fiesta de los Muertos Set
  const fdlmFields = [
    { key: 'title', label: 'Person Name', type: 'multilingual' as const, isDecked: false, isDisplay: true, isFilter: false, description: 'Names in English, French, Japanese, etc.' },
    { key: 'difficulty', label: 'Difficulty', type: 'select' as const, isDecked: true, isDisplay: true, isFilter: true, options: ['easy', 'medium', 'hard'], description: 'Card difficulty level' },
    { key: 'edition', label: 'Edition', type: 'select' as const, isDecked: true, isDisplay: true, isFilter: true, options: ['Base', 'Custom'], description: 'Base game, expansion, or custom card' },
    { key: 'imageUrl', label: 'Portrait Image', type: 'image' as const, isDecked: false, isDisplay: true, isFilter: false, description: 'Portrait thumbnail' },
    { key: 'wikipedia', label: 'Wikipedia Article', type: 'wikipedia' as const, isDecked: false, isDisplay: true, isFilter: false, description: 'Wikipedia reference links' }
  ];

  let fdlmSet = existingSets.find(s => s.id === 'fdlm');
  if (!fdlmSet) {
    fdlmSet = {
      id: 'fdlm',
      name: 'Fiesta de los Muertos',
      description: 'Cards of historical and famous deceased figures in multiple languages with Wikipedia links and images.',
      fields: fdlmFields,
      createdAt: Date.now()
    };
    await db.saveSet(fdlmSet);
    console.log('Seeded Fiesta de los Muertos set definition.');
  } else {
    fdlmSet.fields = fdlmFields;
    await db.saveSet(fdlmSet);
  }

  // Helper to determine if a FDLM card is from the base game
  const isFdlmBase = (cardId: string, titleObj: any): boolean => {
    if (vanillaIds.has(cardId)) return true;
    if (cardId === '60d011ea9a1c0148047eba56' || cardId === '60d0124c9a1c0148047eba62') return true;
    if (titleObj && typeof titleObj === 'object') {
      const en = (titleObj.en || '').toLowerCase();
      const fr = (titleObj.fr || '').toLowerCase();
      if (en.includes('don juan') || fr.includes('don juan') || en.includes('dom juan') || fr.includes('dom juan')) {
        return true;
      }
    }
    return false;
  };

  // Check if FDLM cards are populated
  const existingFdlmCards = db.getCards('fdlm');
  if (existingFdlmCards.length === 0 && fs.existsSync(BACKUP_FILE)) {
    try {
      const raw = await fs.promises.readFile(BACKUP_FILE, 'utf-8');
      const backupCards = JSON.parse(raw);
      const cardsToSave: Card[] = backupCards.map((b: any, index: number) => {
        const id = b._id && b._id.$oid ? b._id.$oid : `fdlm_${index + 1}`;

        // Clean wikipedia object: remove Mongo _id and keep only valid string URLs
        const cleanWiki: Record<string, string> = {};
        if (b.wikipedia && typeof b.wikipedia === 'object') {
          for (const [lang, url] of Object.entries(b.wikipedia)) {
            if (lang !== '_id' && typeof url === 'string' && url.startsWith('http')) {
              cleanWiki[lang] = url;
            }
          }
        }

        // Clean person/title object: remove Mongo _id
        const cleanTitle: Record<string, string> = {};
        if (b.person && typeof b.person === 'object') {
          for (const [lang, val] of Object.entries(b.person)) {
            if (lang !== '_id' && typeof val === 'string') {
              cleanTitle[lang] = val;
            }
          }
        }

        const title = Object.keys(cleanTitle).length > 0 ? cleanTitle : { en: 'Unknown' };
        const edition = isFdlmBase(id, title) ? 'Base' : 'Custom';

        return {
          id,
          setId: 'fdlm',
          data: {
            title,
            difficulty: b.difficulty || 'medium',
            edition,
            source: edition,
            imageUrl: typeof b.imageUrl === 'string' ? b.imageUrl : '',
            wikipedia: cleanWiki
          },
          createdAt: Date.now()
        };
      });

      await db.saveCards(cardsToSave);
      console.log(`Successfully migrated ${cardsToSave.length} cards into Fiesta de los Muertos!`);
    } catch (e) {
      console.error('Failed to import FDLM backup cards:', e);
    }
  } else if (existingFdlmCards.length > 0) {
    // Clean up any previously saved _id from existing cards and ensure edition field is accurate (Base vs Custom)
    let modified = false;
    for (const card of existingFdlmCards) {
      if (card.data.wikipedia && card.data.wikipedia._id) {
        delete card.data.wikipedia._id;
        modified = true;
      }
      if (card.data.title && card.data.title._id) {
        delete card.data.title._id;
        modified = true;
      }
      const accurateEdition = isFdlmBase(card.id, card.data.title) ? 'Base' : 'Custom';
      if (card.data.edition !== accurateEdition || card.data.source !== accurateEdition) {
        card.data.edition = accurateEdition;
        card.data.source = accurateEdition; // Alias for seamless backward-compatibility
        modified = true;
      }
    }
    if (modified) {
      await db.saveCards(existingFdlmCards);
      console.log('Classified FDLM cards into Base vs Custom editions accurately.');
    }
  }

  // 2. Seed Things in Rings Set if not present or update definition
  let ringsSet = existingSets.find(s => s.id === 'things-in-rings');
  const ringsFields = [
    { key: 'text', label: 'Rule Description', type: 'text' as const, isDecked: false, isDisplay: true, isFilter: false, description: 'The hidden rule for the ring' },
    { key: 'level', label: 'Difficulty Level', type: 'select' as const, isDecked: true, isDisplay: true, isFilter: true, options: ['1 star', '2 stars', '3 stars'], description: 'Star rating' },
    { key: 'category', label: 'Rule Category', type: 'select' as const, isDecked: true, isDisplay: true, isFilter: true, options: ['Attribute', 'Word', 'Context'], description: 'Rule category' },
    { key: 'edition', label: 'Edition', type: 'select' as const, isDecked: true, isDisplay: true, isFilter: true, options: ['Base', 'Custom'], description: 'Base game, expansion, or custom rule' }
  ];

  if (!ringsSet) {
    ringsSet = {
      id: 'things-in-rings',
      name: 'Things in Rings',
      description: 'Secret Venn diagram rules categorized by stars (1–3 stars), categories (Attribute, Word, Context), and edition (Base / Custom).',
      fields: ringsFields,
      createdAt: Date.now()
    };
    await db.saveSet(ringsSet);
    console.log('Seeded Things in Rings set definition.');
  } else {
    ringsSet.fields = ringsFields;
    ringsSet.description = 'Secret Venn diagram rules categorized by stars (1–3 stars), categories (Attribute, Word, Context), and edition (Base / Custom).';
    await db.saveSet(ringsSet);
  }

  // Things in Rings cards: All currently seeded rules are custom
  const existingRingsCards = db.getCards('things-in-rings');
  if (existingRingsCards.length > 0) {
    let modified = false;
    for (const card of existingRingsCards) {
      if (card.data.color !== undefined) {
        delete card.data.color;
        modified = true;
      }
      if (card.data.edition !== 'Custom' || card.data.source !== 'Custom') {
        card.data.edition = 'Custom';
        card.data.source = 'Custom';
        modified = true;
      }
    }
    if (modified) {
      await db.saveCards(existingRingsCards);
      console.log('Updated Things in Rings cards with edition=Custom.');
    }
  }

  // Update existing rooms in database: migrate 'source' -> 'edition', and select ALL decked keys by default
  for (const room of db.listRooms()) {
    const set = db.getSet(room.activeSetId);
    if (set) {
      const allDeckedKeys = set.fields.filter(f => f.isDecked || f.isFilter).map(f => f.key);
      let currentKeys = (room.deckGroupByKeys || []).map(k => k === 'source' ? 'edition' : k);
      // All decked metadata fields are selected by default for maximum deck splitting
      if (currentKeys.length === 0 || currentKeys.length < allDeckedKeys.length) {
        currentKeys = [...allDeckedKeys];
      }
      room.deckGroupByKeys = currentKeys;
      room.decks = RoomManager.generateDecks(room.activeSetId, room.deckGroupByKeys);
      await db.saveRoom(room);
    }
  }

  // Seed Things in Rings rules if none exist
  if (existingRingsCards.length === 0) {
    const rulesSeed = [
      // 1 Star - Attributes
      { text: 'Made primarily of metal', level: '1 star', category: 'Attribute' },
      { text: 'Made primarily of wood or paper', level: '1 star', category: 'Attribute' },
      { text: 'Made primarily of plastic or rubber', level: '1 star', category: 'Attribute' },
      { text: 'Smaller than a standard soccer ball', level: '1 star', category: 'Attribute' },
      { text: 'Larger than an adult human', level: '1 star', category: 'Attribute' },
      { text: 'Weighs less than 1 kilogram (2.2 lbs)', level: '1 star', category: 'Attribute' },
      { text: 'Weighs more than 20 kilograms (44 lbs)', level: '1 star', category: 'Attribute' },
      { text: 'Can easily fit in a standard shoe box', level: '1 star', category: 'Attribute' },
      { text: 'Typically black, white, or grey', level: '1 star', category: 'Attribute' },
      { text: 'Typically bright or colorful (red, yellow, blue, green)', level: '1 star', category: 'Attribute' },
      { text: 'Has sharp edges or pointed corners', level: '1 star', category: 'Attribute' },
      { text: 'Flexible, bendable, or foldable', level: '1 star', category: 'Attribute' },
      { text: 'Completely solid (cannot be compressed)', level: '1 star', category: 'Attribute' },
      { text: 'Liquid, gas, or contains liquid', level: '1 star', category: 'Attribute' },
      { text: 'Has wheels or rotates to function', level: '1 star', category: 'Attribute' },
      { text: 'Has moving mechanical or physical parts', level: '1 star', category: 'Attribute' },
      { text: 'Has electrical or electronic parts', level: '1 star', category: 'Attribute' },
      { text: 'Has a handle, strap, or grip', level: '1 star', category: 'Attribute' },

      // 1 Star - Words
      { text: 'Starts with a vowel (A, E, I, O, U)', level: '1 star', category: 'Word' },
      { text: 'Starts with a consonant', level: '1 star', category: 'Word' },
      { text: 'Name consists of exactly one single word', level: '1 star', category: 'Word' },
      { text: 'Short name (5 letters or fewer)', level: '1 star', category: 'Word' },
      { text: 'Long name (8 letters or more)', level: '1 star', category: 'Word' },
      { text: 'Starts with the letters A through M', level: '1 star', category: 'Word' },
      { text: 'Starts with the letters N through Z', level: '1 star', category: 'Word' },

      // 1 Star - Context
      { text: 'A living plant or animal', level: '1 star', category: 'Context' },
      { text: 'Found inside an ordinary house or apartment', level: '1 star', category: 'Context' },
      { text: 'Found outdoors in nature', level: '1 star', category: 'Context' },
      { text: 'Edible or meant to be consumed by humans', level: '1 star', category: 'Context' },
      { text: 'Worn on the human body (clothing, accessory, footwear)', level: '1 star', category: 'Context' },
      { text: 'Costs less than $10 USD in a regular store', level: '1 star', category: 'Context' },
      { text: 'Costs more than $500 USD to purchase brand new', level: '1 star', category: 'Context' },
      { text: 'Used as a tool, utensil, or instrument', level: '1 star', category: 'Context' },
      { text: 'Used for transportation of people or cargo', level: '1 star', category: 'Context' },

      // 2 Stars - Attributes
      { text: 'Naturally floats on water without sinking', level: '2 stars', category: 'Attribute' },
      { text: 'Emits light, glow, or fire when active', level: '2 stars', category: 'Attribute' },
      { text: 'Emits an audible sound, beep, or noise when in use', level: '2 stars', category: 'Attribute' },
      { text: 'Has a symmetrical shape (cylindrical, spherical, or bilateral)', level: '2 stars', category: 'Attribute' },
      { text: 'Made from multiple distinct materials combined together', level: '2 stars', category: 'Attribute' },
      { text: 'Has an opening, cavity, hollow interior, or lid', level: '2 stars', category: 'Attribute' },
      { text: 'Fragile: Breaks or shatters easily if dropped on concrete', level: '2 stars', category: 'Attribute' },

      // 2 Stars - Words
      { text: 'Name contains at least two distinct vowels', level: '2 stars', category: 'Word' },
      { text: 'Name contains double consecutive identical letters (e.g. "coffee", "apple")', level: '2 stars', category: 'Word' },
      { text: 'Ends with the letter "E", "S", or "Y"', level: '2 stars', category: 'Word' },
      { text: 'Compound word (two smaller words joined together, e.g. "sunflower")', level: '2 stars', category: 'Word' },
      { text: 'Starts and ends with the same type of letter (both vowels or both consonants)', level: '2 stars', category: 'Word' },
      { text: 'Contains the letter "R", "S", or "T"', level: '2 stars', category: 'Word' },

      // 2 Stars - Context
      { text: 'Found in a standard kitchen or dining area', level: '2 stars', category: 'Context' },
      { text: 'Found in a bathroom or hygiene setting', level: '2 stars', category: 'Context' },
      { text: 'Frequently used in an office, school, or study', level: '2 stars', category: 'Context' },
      { text: 'Requires batteries or a power cord to function', level: '2 stars', category: 'Context' },
      { text: 'Normally held or operated using two hands', level: '2 stars', category: 'Context' },
      { text: 'Associated with sports, fitness, or outdoor recreation', level: '2 stars', category: 'Context' },
      { text: 'Associated with a specific profession or occupation', level: '2 stars', category: 'Context' },
      { text: 'Can be legally carried on a commercial airplane carry-on bag', level: '2 stars', category: 'Context' },
      { text: 'Used primarily when cleaning or maintaining hygiene', level: '2 stars', category: 'Context' },
      { text: 'Manufactured/mass-produced rather than naturally occurring', level: '2 stars', category: 'Context' },

      // 3 Stars - Attributes & Abstract
      { text: 'Naturally biodegradable within less than a year', level: '3 stars', category: 'Attribute' },
      { text: 'Designed specifically to protect or shield something else', level: '3 stars', category: 'Attribute' },
      { text: 'Can be inflated, filled with air, or contains gas under pressure', level: '3 stars', category: 'Attribute' },
      { text: 'Temperature-sensitive: Damaged or altered significantly by mild heat (under 60°C/140°F)', level: '3 stars', category: 'Attribute' },

      // 3 Stars - Words
      { text: 'Name has an odd number of total letters', level: '3 stars', category: 'Word' },
      { text: 'Name has an even number of total letters', level: '3 stars', category: 'Word' },
      { text: 'Can function grammatically as both a noun and a verb in English', level: '3 stars', category: 'Word' },
      { text: 'Contains zero letters with descenders (no g, j, p, q, y)', level: '3 stars', category: 'Word' },

      // 3 Stars - Context & Conceptual
      { text: 'Invented or developed within the last 150 years (since 1875)', level: '3 stars', category: 'Context' },
      { text: 'Existed in prehistoric times or ancient civilizations', level: '3 stars', category: 'Context' },
      { text: 'Associated with cold weather, winter, or ice', level: '3 stars', category: 'Context' },
      { text: 'Associated with summer, beach, heat, or sun', level: '3 stars', category: 'Context' },
      { text: 'Often rented or borrowed rather than exclusively bought', level: '3 stars', category: 'Context' },
      { text: 'Associated with sleep, bedtime, or nighttime', level: '3 stars', category: 'Context' },
      { text: 'Primarily associated with childhood or toys', level: '3 stars', category: 'Context' },
      { text: 'Contains a warning label or safety precaution in commercial packaging', level: '3 stars', category: 'Context' },
      { text: 'Requires periodic maintenance, charging, or refilling to stay usable', level: '3 stars', category: 'Context' }
    ];

    const ringsCards: Card[] = rulesSeed.map((r, i) => ({
      id: `ring_rule_${i + 1}`,
      setId: 'things-in-rings',
      data: {
        text: r.text,
        level: r.level,
        category: r.category,
        edition: 'Custom'
      },
      createdAt: Date.now()
    }));

    await db.saveCards(ringsCards);
    console.log(`Successfully seeded ${ringsCards.length} rule cards for Things in Rings!`);
  }
}
