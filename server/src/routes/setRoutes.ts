import { Router } from 'express';
import { db } from '../db/store.js';
import { CardSet, Card } from '../types/index.js';

const setRouter = Router();

// List all sets
setRouter.get('/sets', (req, res) => {
  const sets = db.getSets();
  res.json(sets);
});

// Get single set
setRouter.get('/sets/:id', (req, res) => {
  const set = db.getSet(req.params.id);
  if (!set) return res.status(404).json({ error: 'Set not found' });
  res.json(set);
});

// Create set
setRouter.post('/sets', async (req, res) => {
  const { name, description, fields, id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const setId = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (db.getSet(setId)) {
    return res.status(400).json({ error: 'Set with this ID already exists' });
  }

  const newSet: CardSet = {
    id: setId,
    name: name.trim(),
    description: description?.trim() || '',
    fields: Array.isArray(fields) ? fields : [],
    createdAt: Date.now()
  };

  await db.saveSet(newSet);
  res.status(201).json(newSet);
});

// Update set
setRouter.put('/sets/:id', async (req, res) => {
  const existing = db.getSet(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Set not found' });

  const updated: CardSet = {
    ...existing,
    name: req.body.name?.trim() || existing.name,
    description: req.body.description !== undefined ? req.body.description : existing.description,
    fields: Array.isArray(req.body.fields) ? req.body.fields : existing.fields
  };

  await db.saveSet(updated);
  res.json(updated);
});

// Delete set
setRouter.delete('/sets/:id', async (req, res) => {
  const deleted = await db.deleteSet(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Set not found' });
  res.json({ success: true });
});

// --- Cards in a Set ---

// Get cards for a set
setRouter.get('/sets/:id/cards', (req, res) => {
  const set = db.getSet(req.params.id);
  if (!set) return res.status(404).json({ error: 'Set not found' });

  let cards = db.getCards(req.params.id);

  // Optional query filter: e.g. ?level=1 star or ?difficulty=easy
  const filters = req.query;
  if (Object.keys(filters).length > 0) {
    cards = cards.filter(card => {
      for (const [k, v] of Object.entries(filters)) {
        if (card.data[k] !== undefined && String(card.data[k]) !== String(v)) {
          return false;
        }
      }
      return true;
    });
  }

  res.json(cards);
});

// Create single card in a set
setRouter.post('/sets/:id/cards', async (req, res) => {
  const set = db.getSet(req.params.id);
  if (!set) return res.status(404).json({ error: 'Set not found' });

  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Card data object is required' });
  }

  const cardId = `c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const card: Card = {
    id: cardId,
    setId: req.params.id,
    data,
    createdAt: Date.now()
  };

  await db.saveCard(card);
  res.status(201).json(card);
});

// Batch create cards in a set
setRouter.post('/sets/:id/cards/batch', async (req, res) => {
  const set = db.getSet(req.params.id);
  if (!set) return res.status(404).json({ error: 'Set not found' });

  const { cards } = req.body;
  if (!Array.isArray(cards)) {
    return res.status(400).json({ error: 'cards array is required' });
  }

  const createdCards: Card[] = [];
  for (let i = 0; i < cards.length; i++) {
    const item = cards[i];
    const cardId = item.id || `c_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
    createdCards.push({
      id: cardId,
      setId: req.params.id,
      data: item.data || item,
      createdAt: Date.now()
    });
  }

  await db.saveCards(createdCards);
  res.status(201).json(createdCards);
});

// Update card
setRouter.put('/cards/:id', async (req, res) => {
  const existing = db.getCard(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Card not found' });

  const updated: Card = {
    ...existing,
    data: {
      ...existing.data,
      ...(req.body.data || {})
    }
  };

  await db.saveCard(updated);
  res.json(updated);
});

// Delete card
setRouter.delete('/cards/:id', async (req, res) => {
  const deleted = await db.deleteCard(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Card not found' });
  res.json({ success: true });
});

export { setRouter };
