import fs from 'fs';
import path from 'path';
import { db } from './store.js';
import { CardSet, Card } from '../types/index.js';
import { RoomManager } from '../rooms/roomManager.js';

const BACKUP_FILE = path.resolve(process.cwd(), 'data', 'fdlm_backup_20210628.json');

// Official Base cards vs Custom additions for Fiesta de los Muertos
// Ground truth: All 120 Base cards verified against the official physical French edition (including 'Docteur Lenoir').
const FDLM_BASE_IDS = new Set<string>([
  '60cf5fbf0607fd44d8794729', // Sigmund Freud
  '60cf5fe80607fd44d879472e', // Marie Curie
  '60cf60350607fd44d8794733', // Friedrich Nietzsche
  '60cf60490607fd44d8794737', // Margaret Thatcher
  '60cf60600607fd44d879473c', // Karl Marx
  '60cf606e0607fd44d8794740', // Michael Jackson
  '60cf60770607fd44d8794744', // Mao Zedong
  '60cf60910607fd44d879474c', // Hamlet
  '60cf60a30607fd44d8794750', // Charles de Gaulle
  '60cf60aa0607fd44d8794754', // Joker (comics)
  '60cf773c4ffcc40ab01803b5', // Galilée (savant)
  '60cf788e8cc0e64588150489', // Archimède
  '60cf78af8cc0e6458815048d', // Martin Luther King
  '60cf78c08cc0e64588150491', // Christophe Colomb
  '60cf78ca8cc0e64588150495', // Héraclès
  '60cf78e18cc0e64588150499', // Professeur Moriarty
  '60cf78ee8cc0e6458815049d', // Al Capone
  '60cf78f98cc0e645881504a1', // Marie-Antoinette d'Autriche
  '60cf79178cc0e645881504a5', // Son Goku (Dragon Ball)
  '60cf79398cc0e645881504a9', // Auguste Rodin
  '60cf79778cc0e645881504ad', // Jules César
  '60cf79a18cc0e645881504b5', // Mohandas Karamchand Gandhi
  '60cf79d08cc0e645881504b9', // Mufasa
  '60cf79e28cc0e645881504bd', // Vincent van Gogh
  '60cf79ef8cc0e645881504c1', // Capitaine Crochet
  '60cf79fc8cc0e645881504c5', // Isaac Newton
  '60cf7a068cc0e645881504c9', // Diana Spencer
  '60cf7a178cc0e645881504cd', // Mère Teresa
  '60cf7a2b8cc0e645881504d1', // Barbe Noire
  '60cf7a398cc0e645881504d5', // Léonard de Vinci
  '60cf7a478cc0e645881504d9', // Jack Dawson
  '60cf7a638cc0e645881504dd', // Bob Marley
  '60cf7afe8cc0e645881504e1', // Sissi impératrice
  '60cf7b0d8cc0e645881504e5', // Marilyn Monroe
  '60cf7b178cc0e645881504e9', // Pythagore
  '60cf7b218cc0e645881504ed', // Platon
  '60cf7b2a8cc0e645881504f1', // Voldemort
  '60cf7b3c8cc0e645881504f5', // Pocahontas
  '60cf7b478cc0e645881504f9', // Albus Dumbledore
  '60cf7b518cc0e645881504fd', // Roi Arthur
  '60cf7b5d8cc0e64588150501', // D'Artagnan
  '60cf7b738cc0e64588150505', // Anakin Skywalker
  '60cf7b818cc0e64588150509', // J. R. R. Tolkien
  '60cf7bd98cc0e64588150511', // Nelson Mandela
  '60cf7be28cc0e64588150515', // Bruce Lee
  '60cf7bf58cc0e64588150519', // Pablo Picasso
  '60cf7c258cc0e6458815051d', // Andy Warhol
  '60cf7c2d8cc0e64588150521', // Gollum
  '60cf7c368cc0e64588150525', // Victor Hugo
  '60cf7c468cc0e64588150529', // Pablo Escobar
  '60cf7c568cc0e6458815052d', // Neil Armstrong
  '60cf7c8d8cc0e64588150535', // William Shakespeare
  '60d00d169a1c0148047eb9a2', // Coco Chanel
  '60d00d739a1c0148047eb9a6', // Superman
  '60d00d849a1c0148047eb9aa', // Napoléon Ier
  '60d00dad9a1c0148047eb9ae', // Yoda
  '60d00db79a1c0148047eb9b2', // Perceval
  '60d00dc09a1c0148047eb9b6', // Attila
  '60d00dcc9a1c0148047eb9ba', // Wolfgang Amadeus Mozart
  '60d00dd59a1c0148047eb9be', // Achille
  '60d00de69a1c0148047eb9c2', // La Petite Sirène
  '60d00dfc9a1c0148047eb9c6', // Spartacus
  '60d00e779a1c0148047eb9ca', // Steve Jobs
  '60d00eca9a1c0148047eb9d6', // Le Petit Prince
  '60d00ed49a1c0148047eb9da', // King Kong
  '60d00edf9a1c0148047eb9de', // Charlie Chaplin
  '60d00ef49a1c0148047eb9e2', // Ramsès II
  '60d00f019a1c0148047eb9e6', // Don Quichotte
  '60d00f469a1c0148047eb9ee', // Molière
  '60d00f619a1c0148047eb9f2', // Jeanne d'Arc
  '60d00f6b9a1c0148047eb9f6', // Godzilla
  '60d00fcb9a1c0148047eb9fa', // Louis XIV
  '60d00fe99a1c0148047eb9fe', // Gustave Eiffel
  '60d00fef9a1c0148047eba02', // Judas Iscariote
  '60d00fff9a1c0148047eba06', // Albert Einstein
  '60d010099a1c0148047eba0a', // La Barbe bleue
  '60d010b59a1c0148047eba0e', // T-800
  '60d010c79a1c0148047eba12', // Ulysse
  '60d010e09a1c0148047eba16', // Louis Pasteur
  '60d011249a1c0148047eba1e', // Mohamed Ali
  '60d0112f9a1c0148047eba22', // Jean Moulin
  '60d0114d9a1c0148047eba26', // Lucy (australopithèque)
  '60d011589a1c0148047eba2a', // Édith Piaf
  '60d0116e9a1c0148047eba2e', // Agatha Christie
  '60d0117d9a1c0148047eba32', // Che Guevara
  '60d011869a1c0148047eba36', // Louis de Funès
  '60d0118d9a1c0148047eba3a', // Crésus
  '60d011989a1c0148047eba3e', // Arthur Rimbaud
  '60d011a19a1c0148047eba42', // Casper le gentil fantôme
  '60d011ae9a1c0148047eba46', // Calamity Jane
  '60d011be9a1c0148047eba4a', // Minotaure
  '60d011e09a1c0148047eba52', // Frida Kahlo
  '60d012379a1c0148047eba5a', // Georges Brassens
  '60d012409a1c0148047eba5e', // Buffalo Bill
  '60d0124c9a1c0148047eba62', // Coluche
  '60d012759a1c0148047eba66', // Vercingétorix
  '60d0127f9a1c0148047eba6a', // Jacques-Yves Cousteau
  '60d012899a1c0148047eba6e', // Geronimo
  '60d012b39a1c0148047eba72', // La Petite Fille aux allumettes
  '60d012bd9a1c0148047eba76', // Simone Veil
  '60d012c89a1c0148047eba7a', // Alfred Hitchcock
  '60d012d39a1c0148047eba7e', // Jack l'Éventreur
  '60d012ee9a1c0148047eba82', // Abbé Pierre
  '60d1d5efb671bb27f82baa69', // Dracula (personnage)
  '60d1d628b671bb27f82baa6e', // Savinien de Cyrano de Bergerac
  '60d1e315b671bb27f82baa73', // Reine-sorcière
  '60d1e6a217db0527e4d8f999', // Jack Skellington
  '60d1e7825f2fb708a44653dd', // Juliette Capulet
  '60d1e98252148427a072d5f9', // Quasimodo (personnage)
  '60d1e9b352148427a072d5fe', // Gavroche
  '60d1eb8a51225328105bfe55', // Loup (personnage de conte)
  '60d1ebba51225328105bfe5a', // Cléopâtre VII
  '60d1ec1e51225328105bfe5f', // Eddard Stark
  '60d1ed0251225328105bfe67', // La Esmeralda (personnage)
  '60d1eda151225328105bfe6c', // Beatrix Kiddo
  '60d1edee51225328105bfe71', // Babar
  '60d1ee5c51225328105bfe76', // Bambi (personnage)
  '60d1eeb951225328105bfe7b', // Soldat inconnu
  '60d696626b4b1d0fc09e811a', // Don Juan
  '60d012ee9a1c0148047eb999'  // Docteur Lenoir (Cluedo)
]);

// Verified deceased Custom cards for Fiesta de los Muertos
// Exactly 17 custom cards: 12 historical deceased figures + 5 canonically deceased fictional characters.
const FDLM_CUSTOM_DECEASED_IDS = new Set<string>([
  '60d00e8a9a1c0148047eb9ce', // Oda Nobunaga (1534–1582)
  '60d1b01c08ed0935a0e88b76', // Nikola Tesla (1856–1943)
  '60d1b08808ed0935a0e88b7b', // Thomas Edison (1847–1931)
  '60d1d5bbb671bb27f82baa64', // Captain America (The Death of Captain America / Endgame shield passing)
  '60d1fa0019909b1bc8a65f7f', // Spider-Man (Peter Parker - canonically died in Ultimate Comics / Spider-Verse, inspiring Miles Morales)
  '60d1fbbc19909b1bc8a65fb5', // Alan Turing (1912–1954)
  '60d5502098d24c31d054a156', // Iron Man (Tony Stark - canonically deceased)
  '60d5b50e98d24c31d054a1b0', // Thanos (canonically deceased)
  '60d5b52a98d24c31d054a1b5', // Freddie Mercury (1946–1991)
  '60d5c152b1663a293c35fdc3', // Akira Kurosawa (1910–1998)
  '60d5c1b3b1663a293c35fdcd', // Hokusai (1760–1849)
  '60d6b4386b4b1d0fc09e811f', // Kurt Cobain (1967–1994)
  '60d89e3cbcf3682f3cb2e445', // Eren Jäger (canonically deceased)
  '60d8a36fbcf3682f3cb2e452', // Jean-Paul II (1920–2005)
  '60d8a45fbcf3682f3cb2e45c', // Joël Robuchon (1945–2018)
  '60d8a52cbcf3682f3cb2e461', // Paul Bocuse (1926–2018)
  '60d8a627bcf3682f3cb2e47b', // James Watt (1736–1819)
]);

// Known legacy custom cards of living people and mascots to prune to preserve the Day of the Dead game theme
const FDLM_PRUNED_LIVING_IDS = new Set<string>([
  '60d00eba9a1c0148047eb9d2', // Détective Conan
  '60d00f3b9a1c0148047eb9ea', // Pikachu
  '60d011149a1c0148047eba1a', // Sacha
  '60d09407574da32a68377d00', // Shigeru Miyamoto
  '60d099ec1814852f5cc86e76', // Batman
  '60d09a4c1814852f5cc86e7a', // Link
  '60d0b7bf04e6a40e70432791', // Yoshihide Suga
  '60d1f47451225328105bff11', // Emmanuel Macron
  '60d1f4c151225328105bff16', // Psy
  '60d1f70419909b1bc8a65f75', // Kim Ji-soo
  '60d1f95119909b1bc8a65f7a', // D.O.
  '60d1fa8e19909b1bc8a65f84', // Lisa
  '60d1fa9019909b1bc8a65f89', // Chibi Maruko-chan
  '60d1fab019909b1bc8a65fa5', // Doraemon
  '60d1fac719909b1bc8a65fab', // Anpanman
  '60d1fb6319909b1bc8a65fb0', // Hayao Miyazaki
  '60d1fc6e986ec80cb84f7858', // Elsa
  '60d29de9b5439b3724cf12e9', // Lady Gaga
  '60d29e0bb5439b3724cf12ee', // Arnold Schwarzenegger
  '60d29e32b5439b3724cf12f3', // Katy Perry
  '60d29e5eb5439b3724cf12f8', // Mario
  '60d29ebfb5439b3724cf12fd', // Sonic
  '60d29ef0b5439b3724cf1302', // Homer Simpson
  '60d2b1f4b5439b3724cf1307', // Jean Dujardin
  '60d32260dccf3b425cb9b785', // Bill Gates
  '60d54eee98d24c31d054a14c', // Princesse Zelda
  '60d550b398d24c31d054a15b', // Bugs Bunny
  '60d5c0bab1663a293c35fdbe', // Tueur du Zodiaque
  '60d5c173b1663a293c35fdc8', // Marie Kondo
  '60d6bcba6b4b1d0fc09e81b0', // Jack Sparrow
  '60d8638aa02ea4452c4033fe', // Takeshi Kitano
  '60d8a2e9bcf3682f3cb2e44d', // Samus Aran
  '60d8a3cfbcf3682f3cb2e457', // Mickey Mouse
  '60d9a8a0a7df16434c7c37f7', // Yoshi
  'c_1789996085615_5ajsw',     // Édouard Balladur
]);

export async function seedDatabase() {
  await db.init();

  const existingSets = db.getSets();

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

  // Helper to determine if a FDLM card is from the official base game
  const isFdlmBase = (cardId: string): boolean => {
    return FDLM_BASE_IDS.has(cardId);
  };

  // Check if FDLM cards are populated
  const existingFdlmCards = db.getCards('fdlm');
  if (existingFdlmCards.length === 0 && fs.existsSync(BACKUP_FILE)) {
    try {
      const raw = await fs.promises.readFile(BACKUP_FILE, 'utf-8');
      const backupCards = JSON.parse(raw);
      const cardsToSave: Card[] = [];
      for (let index = 0; index < backupCards.length; index++) {
        const b = backupCards[index];
        const id = b._id && b._id.$oid ? b._id.$oid : `fdlm_${index + 1}`;

        // Skip living figures and mascots who haven't died
        if (FDLM_PRUNED_LIVING_IDS.has(id)) {
          continue;
        }
        if (!FDLM_BASE_IDS.has(id) && !FDLM_CUSTOM_DECEASED_IDS.has(id)) {
          continue;
        }

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
        const edition = isFdlmBase(id) ? 'Base' : 'Custom';

        cardsToSave.push({
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
        });
      }

      // Ensure Docteur Lenoir (official card omitted from legacy mongo backup) is included
      const hasLenoir = cardsToSave.some(c => c.id === '60d012ee9a1c0148047eb999' || c.data.title?.fr?.toLowerCase().includes('lenoir'));
      if (!hasLenoir) {
        cardsToSave.push({
          id: '60d012ee9a1c0148047eb999',
          setId: 'fdlm',
          data: {
            title: {
              fr: 'Docteur Lenoir',
              en: 'Mr. Boddy (Dr. Black)',
              ja: 'ボディ氏 (ドクター・ブラック)'
            },
            difficulty: 'easy',
            imageUrl: 'https://upload.wikimedia.org/wikipedia/en/6/61/Cluedo_1956_Small_Red_Box_Edition.jpg',
            wikipedia: {
              fr: 'https://fr.wikipedia.org/wiki/Cluedo#Personnages',
              en: 'https://en.wikipedia.org/wiki/List_of_Cluedo_characters#Dr._Black_/_Mr._Boddy',
              ja: 'https://ja.wikipedia.org/wiki/%E3%82%AF%E3%83%AB%E3%83%BC%E3%83%89'
            },
            edition: 'Base',
            source: 'Base'
          },
          createdAt: 1789901251455
        });
      }

      await db.saveCards(cardsToSave);
      console.log(`Successfully migrated ${cardsToSave.length} cards into Fiesta de los Muertos!`);
    } catch (e) {
      console.error('Failed to import FDLM backup cards:', e);
    }
  } else if (existingFdlmCards.length > 0) {
    // Clean up any previously saved _id from existing cards, remove pruned living cards, and ensure edition is accurate
    const cardsToKeep: Card[] = [];
    let modified = false;
    for (const card of existingFdlmCards) {
      if (FDLM_PRUNED_LIVING_IDS.has(card.id)) {
        await db.deleteCard(card.id);
        modified = true;
        continue;
      }
      if (card.data.wikipedia && card.data.wikipedia._id) {
        delete card.data.wikipedia._id;
        modified = true;
      }
      if (card.data.title && card.data.title._id) {
        delete card.data.title._id;
        modified = true;
      }
      const accurateEdition = isFdlmBase(card.id) ? 'Base' : 'Custom';
      if (card.data.edition !== accurateEdition || card.data.source !== accurateEdition) {
        card.data.edition = accurateEdition;
        card.data.source = accurateEdition; // Alias for seamless backward-compatibility
        modified = true;
      }
      cardsToKeep.push(card);
    }

    // Ensure Docteur Lenoir exists
    const hasLenoir = cardsToKeep.some(c => c.id === '60d012ee9a1c0148047eb999' || c.data.title?.fr?.toLowerCase().includes('lenoir'));
    if (!hasLenoir) {
      cardsToKeep.push({
        id: '60d012ee9a1c0148047eb999',
        setId: 'fdlm',
        data: {
          title: {
            fr: 'Docteur Lenoir',
            en: 'Mr. Boddy (Dr. Black)',
            ja: 'ボディ氏 (ドクター・ブラック)'
          },
          difficulty: 'easy',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/en/6/61/Cluedo_1956_Small_Red_Box_Edition.jpg',
          wikipedia: {
            fr: 'https://fr.wikipedia.org/wiki/Cluedo#Personnages',
            en: 'https://en.wikipedia.org/wiki/List_of_Cluedo_characters#Dr._Black_/_Mr._Boddy',
            ja: 'https://ja.wikipedia.org/wiki/%E3%82%AF%E3%83%AB%E3%83%BC%E3%83%89'
          },
          edition: 'Base',
          source: 'Base'
        },
        createdAt: 1789901251455
      });
      modified = true;
    }

    if (modified) {
      await db.saveCards(cardsToKeep);
      console.log('Sanitized and classified FDLM cards into Base vs Custom editions accurately (120 Base + 17 Custom deceased).');
    }
  }

  // 2. Seed Things in Rings Set if not present or update definition
  let ringsSet = existingSets.find(s => s.id === 'things-in-rings');
  const ringsFields = [
    { key: 'text', label: 'Rule Description', type: 'multilingual' as const, isDecked: false, isDisplay: true, isFilter: false, description: 'The hidden rule for the ring' },
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
      if (card.data.text && typeof card.data.text === 'object' && typeof card.data.text.en === 'string') {
        if (card.data.text.en !== card.data.text.en.toUpperCase()) {
          card.data.text.en = card.data.text.en.toUpperCase();
          modified = true;
        }
      }
      if (card.data.color !== undefined) {
        delete card.data.color;
        modified = true;
      }
      if (card.data.edition === 'Base') {
        if (card.data.source !== 'Base') {
          card.data.source = 'Base';
          modified = true;
        }
      } else if (card.data.edition !== 'Custom' || card.data.source !== 'Custom') {
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
      { id: "ring_rule_1", text: { en: "MADE PRIMARILY OF METAL", fr: "PRINCIPALEMENT EN MÉTAL", ja: "主に金属でできている" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_4", text: { en: "SMALLER THAN A STANDARD SOCCER BALL", fr: "PLUS PETIT QU'UN BALLON DE FOOTBALL STANDARD", ja: "一般的なサッカーボールより小さい" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_6", text: { en: "WEIGHS LESS THAN 1 KILOGRAM (2.2 LBS)", fr: "PÈSE MOINS DE 1 KILOGRAMME (1 KG)", ja: "重さが1kg未満" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_8", text: { en: "CAN EASILY FIT IN A STANDARD SHOE BOX", fr: "RENTRE FACILEMENT DANS UNE BOÎTE À CHAUSSURES STANDARD", ja: "靴箱に簡単に入る" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_9", text: { en: "TYPICALLY BLACK, WHITE, OR GREY", fr: "GÉNÉRALEMENT NOIR, BLANC OU GRIS", ja: "一般的に黒、白、または灰色" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_10", text: { en: "TYPICALLY BRIGHT OR COLORFUL (RED, YELLOW, BLUE, GREEN)", fr: "GÉNÉRALEMENT VIF OU COLORÉ (ROUGE, JAUNE, BLEU, VERT)", ja: "一般的に鮮やか、またはカラフル" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_12", text: { en: "FLEXIBLE, BENDABLE, OR FOLDABLE", fr: "FLEXIBLE, PLIABLE OU SE TORD FACILEMENT", ja: "柔軟性がある、曲げられる、または折れる" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_13", text: { en: "COMPLETELY SOLID (CANNOT BE COMPRESSED)", fr: "TOTALEMENT SOLIDE (INCOMPRESSIBLE)", ja: "完全に固体 (圧縮できない)" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_15", text: { en: "HAS WHEELS OR ROTATES TO FUNCTION", fr: "POSSÈDE DES ROUES OU TOURNE SUR LUI-MÊME POUR FONCTIONNER", ja: "車輪がある、または回転して機能する" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_16", text: { en: "HAS MOVING MECHANICAL OR PHYSICAL PARTS", fr: "COMPORTE DES PIÈCES MÉCANIQUES OU MOBILES", ja: "動く機械的または物理的な部品がある" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_18", text: { en: "HAS A HANDLE, STRAP, OR GRIP", fr: "POSSÈDE UNE POIGNÉE, UNE SANGLE OU UN MANCHE", ja: "取っ手、ストラップ、またはグリップがある" }, level: "1 star", category: "Attribute" },
      { id: "ring_rule_21", text: { en: "NAME CONSISTS OF EXACTLY ONE SINGLE WORD", fr: "LE NOM EST COMPOSÉ D'UN SEUL MOT UNIQUE", ja: "名称が単一の単語で構成されている" }, level: "1 star", category: "Word" },
      { id: "ring_rule_25", text: { en: "STARTS WITH THE LETTERS N THROUGH Z", fr: "COMMENCE PAR UNE LETTRE DE « N » À « Z »", ja: "読み仮名が「な行」〜「わ行」で始まる" }, level: "1 star", category: "Word" },
      { id: "ring_rule_29", text: { en: "EDIBLE OR MEANT TO BE CONSUMED BY HUMANS", fr: "COMESTIBLE OU DESTINÉ À LA CONSOMMATION HUMAINE", ja: "食用、または人間が口にするもの" }, level: "1 star", category: "Context" },
      { id: "ring_rule_30", text: { en: "WORN ON THE HUMAN BODY (CLOTHING, ACCESSORY, FOOTWEAR)", fr: "SE PORTE SUR LE CORPS (VÊTEMENT, ACCESSOIRE, CHAUSSURE)", ja: "身につけるもの (衣服、装飾品、履物)" }, level: "1 star", category: "Context" },
      { id: "ring_rule_31", text: { en: "COSTS LESS THAN $10 USD IN A REGULAR STORE", fr: "COÛTE MOINS DE 10 € DANS UN MAGASIN ORDINAIRE", ja: "一般の店で1500円未満で買える" }, level: "1 star", category: "Context" },
      { id: "ring_rule_33", text: { en: "USED AS A TOOL, UTENSIL, OR INSTRUMENT", fr: "UTILISÉ COMME OUTIL, USTENSILE OU INSTRUMENT", ja: "道具、器具、または楽器として使われる" }, level: "1 star", category: "Context" },
      { id: "ring_rule_34", text: { en: "USED FOR TRANSPORTATION OF PEOPLE OR CARGO", fr: "UTILISÉ POUR LE TRANSPORT DE PERSONNES OU DE MARCHANDISES", ja: "人や荷物の移動・運搬に使われる" }, level: "1 star", category: "Context" },
      { id: "ring_rule_36", text: { en: "EMITS LIGHT, GLOW, OR FIRE WHEN ACTIVE", fr: "ÉMET DE LA LUMIÈRE, UNE LUEUR OU DU FEU EN FONCTIONNEMENT", ja: "作動時に光、輝き、または火を発する" }, level: "2 stars", category: "Attribute" },
      { id: "ring_rule_38", text: { en: "HAS A SYMMETRICAL SHAPE (CYLINDRICAL, SPHERICAL, OR BILATERAL)", fr: "A UNE FORME SYMÉTRIQUE (CYLINDRIQUE, SPHÉRIQUE OU BILATÉRALE)", ja: "対称的な形状をしている (円筒形、球形、または左右対称)" }, level: "2 stars", category: "Attribute" },
      { id: "ring_rule_44", text: { en: "ENDS WITH THE LETTER \"E\", \"S\", OR \"Y\"", fr: "SE TERMINE PAR LA LETTRE « E », « S » OU « Y »", ja: "読み仮名の末尾が「え段」「す」「い」" }, level: "2 stars", category: "Word" },
      { id: "ring_rule_46", text: { en: "STARTS AND ENDS WITH THE SAME TYPE OF LETTER (BOTH VOWELS OR BOTH CONSONANTS)", fr: "COMMENCE ET SE TERMINE PAR LE MÊME TYPE DE LETTRE (DEUX VOYELLES OU DEUX CONSONNES)", ja: "先頭と末尾が同じ種類の文字" }, level: "2 stars", category: "Word" },
      { id: "ring_rule_47", text: { en: "CONTAINS THE LETTER \"R\", \"S\", OR \"T\"", fr: "CONTIENT LA LETTRE « R », « S » OU « T »", ja: "表記に特定の母音や文字を含む" }, level: "2 stars", category: "Word" },
      { id: "ring_rule_48", text: { en: "FOUND IN A STANDARD KITCHEN OR DINING AREA", fr: "SE TROUVE DANS UNE CUISINE OU UNE SALLE À MANGER STANDARD", ja: "一般的なキッチンやダイニングにある" }, level: "2 stars", category: "Context" },
      { id: "ring_rule_49", text: { en: "FOUND IN A BATHROOM OR HYGIENE SETTING", fr: "SE TROUVE DANS UNE SALLE DE BAINS OU UN ESPACE D'HYGIÈNE", ja: "浴室や衛生環境にある" }, level: "2 stars", category: "Context" },
      { id: "ring_rule_52", text: { en: "NORMALLY HELD OR OPERATED USING TWO HANDS", fr: "SE TIENT OU S'UTILISE NORMALEMENT À DEUX MAINS", ja: "通常、両手で持つか操作する" }, level: "2 stars", category: "Context" },
      { id: "ring_rule_53", text: { en: "ASSOCIATED WITH SPORTS, FITNESS, OR OUTDOOR RECREATION", fr: "ASSOCIÉ AU SPORT, AU FITNESS OU AUX LOISIRS DE PLEIN AIR", ja: "スポーツ、フィットネス、またはアウトドアに関連する" }, level: "2 stars", category: "Context" },
      { id: "ring_rule_54", text: { en: "ASSOCIATED WITH A SPECIFIC PROFESSION OR OCCUPATION", fr: "ASSOCIÉ À UNE PROFESSION OU UN MÉTIER SPÉCIFIQUE", ja: "特定の職業や専門職に関連する" }, level: "2 stars", category: "Context" },
      { id: "ring_rule_56", text: { en: "USED PRIMARILY WHEN CLEANING OR MAINTAINING HYGIENE", fr: "UTILISÉ PRINCIPALEMENT POUR LE MÉNAGE OU L'HYGIÈNE", ja: "主に掃除や衛生維持に使われる" }, level: "2 stars", category: "Context" },
      { id: "ring_rule_58", text: { en: "NATURALLY BIODEGRADABLE WITHIN LESS THAN A YEAR", fr: "NATURELLEMENT BIODÉGRADABLE EN MOINS D'UN AN", ja: "1年未満で自然に生分解される" }, level: "3 stars", category: "Attribute" },
      { id: "ring_rule_59", text: { en: "DESIGNED SPECIFICALLY TO PROTECT OR SHIELD SOMETHING ELSE", fr: "CONÇU SPÉCIFIQUEMENT POUR PROTÉGER OU COUVRIR QUELQUE CHOSE", ja: "他のものを保護・防御するために特別に設計されている" }, level: "3 stars", category: "Attribute" },
      { id: "ring_rule_60", text: { en: "CAN BE INFLATED, FILLED WITH AIR, OR CONTAINS GAS UNDER PRESSURE", fr: "PEUT ÊTRE GONFLÉ, REMPLI D'AIR OU CONTIENT DU GAZ SOUS PRESSION", ja: "膨らませることができる、空気を入れる、または高圧ガスを含む" }, level: "3 stars", category: "Attribute" },
      { id: "ring_rule_61", text: { en: "TEMPERATURE-SENSITIVE: DAMAGED OR ALTERED SIGNIFICANTLY BY MILD HEAT (UNDER 60°C/140°F)", fr: "SENSIBLE À LA CHALEUR: ENDOMMAGÉ OU ALTÉRÉ PAR UNE CHALEUR MODÉRÉE (< 60 °C)", ja: "熱に弱い: ぬるい熱 (60℃未満) で破損・著しく変質する" }, level: "3 stars", category: "Attribute" },
      { id: "ring_rule_62", text: { en: "NAME HAS AN ODD NUMBER OF TOTAL LETTERS", fr: "LE NOM COMPORTE UN NOMBRE IMPAIR DE LETTRES", ja: "名称の文字数が奇数" }, level: "3 stars", category: "Word" },
      { id: "ring_rule_63", text: { en: "NAME HAS AN EVEN NUMBER OF TOTAL LETTERS", fr: "LE NOM COMPORTE UN NOMBRE PAIR DE LETTRES", ja: "名称の文字数が偶数" }, level: "3 stars", category: "Word" },
      { id: "ring_rule_65", text: { en: "CONTAINS ZERO LETTERS WITH DESCENDERS (NO G, J, P, Q, Y)", fr: "NE CONTIENT AUCUNE LETTRE AVEC JAMBAGE INFÉRIEUR (PAS DE G, J, P, Q, Y)", ja: "下に突き出る文字を含まない" }, level: "3 stars", category: "Word" },
      { id: "ring_rule_66", text: { en: "INVENTED OR DEVELOPED WITHIN THE LAST 150 YEARS (SINCE 1875)", fr: "INVENTÉ OU DÉVELOPPÉ AU COURS DES 150 DERNIÈRES ANNÉES (DEPUIS 1875)", ja: "過去150年以内 (1875年以降) に発明・開発された" }, level: "3 stars", category: "Context" },
      { id: "ring_rule_68", text: { en: "ASSOCIATED WITH COLD WEATHER, WINTER, OR ICE", fr: "ASSOCIÉ AU TEMPS FROID, À L'HIVER OU À LA GLACE", ja: "寒い気候、冬、または氷に関連する" }, level: "3 stars", category: "Context" },
      { id: "ring_rule_69", text: { en: "ASSOCIATED WITH SUMMER, BEACH, HEAT, OR SUN", fr: "ASSOCIÉ À L'ÉTÉ, À LA PLAGE, À LA CHALEUR OU AU SOLEIL", ja: "夏、ビーチ、暑さ、または太陽に関連する" }, level: "3 stars", category: "Context" },
      { id: "ring_rule_70", text: { en: "OFTEN RENTED OR BORROWED RATHER THAN EXCLUSIVELY BOUGHT", fr: "SOUVENT LOUÉ OU EMPRUNTÉ PLUTÔT QU'ACHETÉ EXCLUSIVEMENT", ja: "購入するだけでなく、レンタルや借りることが多い" }, level: "3 stars", category: "Context" },
      { id: "ring_rule_71", text: { en: "ASSOCIATED WITH SLEEP, BEDTIME, OR NIGHTTIME", fr: "ASSOCIÉ AU SOMMEIL, AU COUCHER OU À LA NUIT", ja: "睡眠、就寝時、または夜に関連する" }, level: "3 stars", category: "Context" },
      { id: "ring_rule_72", text: { en: "PRIMARILY ASSOCIATED WITH CHILDHOOD OR TOYS", fr: "ASSOCIÉ PRINCIPALEMENT À L'ENFANCE OU AUX JOUETS", ja: "主に子供時代やおもちゃに関連する" }, level: "3 stars", category: "Context" },
      { id: "ring_rule_73", text: { en: "CONTAINS A WARNING LABEL OR SAFETY PRECAUTION IN COMMERCIAL PACKAGING", fr: "COMPORTE UN AVERTISSEMENT OU UNE CONSIGNE DE SÉCURITÉ SUR L'EMBALLAGE", ja: "市販パッケージに警告ラベルや安全上の注意が記載されている" }, level: "3 stars", category: "Context" },
      { id: "ring_rule_74", text: { en: "REQUIRES PERIODIC MAINTENANCE, CHARGING, OR REFILLING TO STAY USABLE", fr: "NÉCESSITE UN ENTRETIEN, UNE RECHARGE OU UN REMPLISSAGE PÉRIODIQUE", ja: "使い続けるために定期的なメンテナンス、充電、または補充が必要" }, level: "3 stars", category: "Context" }
    ];

    const ringsCards: Card[] = rulesSeed.map((r, i) => ({
      id: (r as any).id || `ring_rule_${i + 1}`,
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
