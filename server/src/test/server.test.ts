import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { seedDatabase } from '../db/seed.js';
import { db } from '../db/store.js';
import { RoomManager } from '../rooms/roomManager.js';
import { normalizeText } from '../utils/text.js';

describe('BGH (Board Game Helper) Backend Tests', () => {
  before(async () => {
    await seedDatabase();
  });

  test('Database seeds CardSets and initial cards', () => {
    const sets = db.getSets();
    assert.ok(sets.length >= 2, 'Should have at least FDLM and Things in Rings sets');

    const fdlm = sets.find(s => s.id === 'fdlm');
    assert.ok(fdlm, 'FDLM set must exist');
    assert.ok(fdlm.fields.some(f => f.key === 'edition' && f.isFilter), 'FDLM set must have filterable edition field');
    const fdlmCards = db.getCards('fdlm');
    assert.strictEqual(fdlmCards.length, 137, 'Should have exactly 137 FDLM cards (120 Base + 17 Custom deceased)');
    const fdlmBase = fdlmCards.filter(c => c.data.edition === 'Base');
    const fdlmCustom = fdlmCards.filter(c => c.data.edition === 'Custom');
    assert.strictEqual(fdlmBase.length, 120, 'Should have exactly 120 Base FDLM cards from official game');
    assert.strictEqual(fdlmCustom.length, 17, 'Should have exactly 17 Custom FDLM cards (100% deceased figures)');

    const rings = sets.find(s => s.id === 'things-in-rings');
    assert.ok(rings, 'Things in Rings set must exist');
    assert.ok(rings.fields.some(f => f.key === 'edition' && f.isFilter), 'Things in Rings set must have filterable edition field');
    const ringsCards = db.getCards('things-in-rings');
    assert.ok(ringsCards.length >= 81, 'Should have seeded Things in Rings rules');
    const ringsBase = ringsCards.filter(c => c.data.edition === 'Base');
    const ringsCustom = ringsCards.filter(c => c.data.edition === 'Custom');
    assert.strictEqual(ringsBase.length, 81, 'Should have exactly 81 Base Things in Rings cards from physical scans');
    assert.strictEqual(ringsCustom.length, 44, 'Should have 44 unique Custom Things in Rings rules (duplicates removed)');
    assert.ok(ringsCards.every(c => c.data.text && c.data.text.en && c.data.text.fr && c.data.text.ja), 'All Things in Rings cards must have EN, FR, and JA translations');
  });

  test('Dynamic Deck Partitioning by Metadata including Edition', () => {
    // Partition FDLM by difficulty: should yield easy, medium, hard decks
    const fdlmDecks = RoomManager.generateDecks('fdlm', ['difficulty']);
    assert.ok(fdlmDecks['easy'], 'Should have easy deck');
    assert.ok(fdlmDecks['medium'], 'Should have medium deck');
    assert.ok(fdlmDecks['hard'], 'Should have hard deck');
    const fdlmCards = db.getCards('fdlm');
    const totalFdlmInDecks = fdlmDecks['easy'].cardIds.length + fdlmDecks['medium'].cardIds.length + fdlmDecks['hard'].cardIds.length;
    assert.strictEqual(totalFdlmInDecks, fdlmCards.length, 'Sum of all difficulty decks must equal total FDLM cards');

    // Partition FDLM by difficulty AND edition
    const fdlmMultiDecks = RoomManager.generateDecks('fdlm', ['difficulty', 'edition']);
    const fdlmMultiKeys = Object.keys(fdlmMultiDecks);
    assert.ok(fdlmMultiKeys.some(k => k.includes('easy') && k.includes('base')), 'Should have easy base deck');
    assert.ok(fdlmMultiKeys.some(k => k.includes('medium') && k.includes('base')), 'Should have medium base deck');
    assert.ok(fdlmMultiKeys.some(k => k.includes('hard') && k.includes('base')), 'Should have hard base deck');
    assert.ok(fdlmMultiKeys.some(k => k.includes('medium') && k.includes('custom')), 'Should have medium custom deck');
    assert.ok(fdlmMultiKeys.some(k => k.includes('hard') && k.includes('custom')), 'Should have hard custom deck');

    // Partition Things in Rings by level: should yield 1 star, 2 stars, 3 stars
    const ringsDecks = RoomManager.generateDecks('things-in-rings', ['level']);
    const ringsKeys = Object.keys(ringsDecks);
    assert.ok(ringsKeys.some(k => k.includes('1_star')), 'Should have 1 star deck');
    assert.ok(ringsKeys.some(k => k.includes('2_star')), 'Should have 2 star deck');
    assert.ok(ringsKeys.some(k => k.includes('3_star')), 'Should have 3 star deck');

    // Partition Things in Rings by level, category, and edition (default max splitting)
    const ringsMaxDecks = RoomManager.generateDecks('things-in-rings', ['level', 'category', 'edition']);
    const maxKeys = Object.keys(ringsMaxDecks);
    assert.ok(maxKeys.length > 5, 'Should have multiple fine-grained sub-decks');
    assert.ok(maxKeys.some(k => k.includes('1_star') && k.includes('attribute') && k.includes('custom')));

    // Partition using legacy 'source' key alias: must resolve without generating Unknown
    const aliasDecks = RoomManager.generateDecks('fdlm', ['source']);
    const aliasKeys = Object.keys(aliasDecks);
    assert.ok(aliasKeys.includes('base') && aliasKeys.includes('custom'), 'Should resolve source alias to base and custom');
    assert.ok(!aliasKeys.some(k => k.includes('unknown')), 'Must NEVER produce an Unknown deck');
  });

  test('Deck Filtering by Metadata Tags', async () => {
    // 1. Filter FDLM cards to Base edition only
    const fdlmCards = db.getCards('fdlm');
    const fdlmBase = fdlmCards.filter(c => c.data.edition === 'Base');
    const fdlmCustom = fdlmCards.filter(c => c.data.edition === 'Custom');

    const baseOnlyDecks = RoomManager.generateDecks('fdlm', ['difficulty'], new Set(), { edition: ['Base'] });
    const totalBaseCards = Object.values(baseOnlyDecks).reduce((acc, d) => acc + d.cardIds.length, 0);
    assert.strictEqual(totalBaseCards, fdlmBase.length, 'Base edition only must contain all base cards');

    // 2. Filter FDLM cards to Custom edition only
    const customOnlyDecks = RoomManager.generateDecks('fdlm', ['difficulty'], new Set(), { edition: ['Custom'] });
    const totalCustomCards = Object.values(customOnlyDecks).reduce((acc, d) => acc + d.cardIds.length, 0);
    assert.strictEqual(totalCustomCards, fdlmCustom.length, 'Custom edition only must contain all custom cards');

    // 3. Filter Things in Rings to 1 star and 2 stars only
    const ringsLevelDecks = RoomManager.generateDecks('things-in-rings', ['level'], new Set(), { level: ['1 star', '2 stars'] });
    const ringsLevelKeys = Object.keys(ringsLevelDecks);
    assert.ok(ringsLevelKeys.some(k => k.includes('1_star')), 'Must have 1 star deck');
    assert.ok(ringsLevelKeys.some(k => k.includes('2_star')), 'Must have 2 star deck');
    assert.ok(!ringsLevelKeys.some(k => k.includes('3_star')), 'Must NOT have 3 star deck');

    // 4. Test room-level setDeckFilters and configureDeckSplitting with filters
    const { room } = await RoomManager.createRoom('HostFilter', 'fdlm');
    const totalInitial = Object.values(room.decks).reduce((acc, d) => acc + d.cardIds.length, 0);
    assert.strictEqual(totalInitial, fdlmCards.length, 'Initial room must have all cards');

    // Apply filter: Base edition only
    const rFiltered = await RoomManager.setDeckFilters(room.id, { edition: ['Base'] });
    assert.deepStrictEqual(rFiltered.deckFilters?.edition, ['Base']);
    const totalFiltered = Object.values(rFiltered.decks).reduce((acc, d) => acc + d.cardIds.length, 0);
    assert.strictEqual(totalFiltered, fdlmBase.length, 'Filtered room must have base cards in decks');

    // Reshuffle round: filter persists
    const rReset = await RoomManager.resetRound(room.id, true);
    const totalReset = Object.values(rReset.decks).reduce((acc, d) => acc + d.cardIds.length, 0);
    assert.strictEqual(totalReset, fdlmBase.length, 'Reset round must preserve deck filters');

    // Clear filters: resets back to total cards
    const rCleared = await RoomManager.setDeckFilters(room.id, {});
    const totalCleared = Object.values(rCleared.decks).reduce((acc, d) => acc + d.cardIds.length, 0);
    assert.strictEqual(totalCleared, fdlmCards.length, 'Clearing filters must restore all cards');
  });

  test('Accent-insensitive and case-insensitive text normalization and matching', () => {
    assert.strictEqual(normalizeText('Édouard Balladur'), 'edouard balladur');
    assert.strictEqual(normalizeText('Molière'), 'moliere');
    assert.strictEqual(normalizeText('Saint-Exupéry'), 'saint-exupery');
    assert.strictEqual(normalizeText('François'), 'francois');
    assert.strictEqual(normalizeText('ÉDOUARD'), 'edouard');
    assert.strictEqual(normalizeText('edouard'), 'edouard');
    assert.ok(normalizeText('Édouard Balladur').includes(normalizeText('edouard')));
    assert.ok(normalizeText('Édouard Balladur').includes(normalizeText('Édouard')));
    assert.ok(normalizeText('Édouard Balladur').includes(normalizeText('balladur')));
  });

  test('Lobby lifecycle, player join, and atomic card drawing', async () => {
    // 1. Create Room
    const { room, hostId } = await RoomManager.createRoom('Alice', 'fdlm');
    assert.ok(room.id && room.id.length === 4, 'Room code should be 4 characters');
    assert.strictEqual(room.players[hostId].name, 'Alice');
    assert.strictEqual(room.players[hostId].isHost, true);
    assert.deepStrictEqual(room.deckGroupByKeys, ['difficulty', 'edition'], 'All decked metadata fields must be selected by default for max decks');
    assert.ok(!Object.keys(room.decks).some(k => k.includes('unknown')), 'No deck should ever be named unknown');

    // 2. Second player joins
    const { room: r2, player: bob } = await RoomManager.joinRoom(room.id, 'Bob');
    assert.strictEqual(Object.keys(r2.players).length, 2);
    assert.strictEqual(bob.name, 'Bob');

    // 3. Configure decks by difficulty
    const r3 = await RoomManager.configureDeckSplitting(room.id, ['difficulty']);
    const initialEasyCount = r3.decks['easy'].cardIds.length;
    assert.ok(initialEasyCount > 0, 'Easy deck must have cards');

    // 4. Alice draws 1 card from Easy deck
    const r4 = await RoomManager.drawCards(room.id, hostId, 'easy', 1);
    assert.strictEqual(r4.decks['easy'].cardIds.length, initialEasyCount - 1, 'Deck count must decrement by 1');
    assert.strictEqual(r4.hands[hostId].length, 1, 'Alice should have 1 card in hand');
    const drawnCardId = r4.hands[hostId][0].cardId;

    // 5. Bob draws 1 card from Medium deck
    const initialMedCount = r4.decks['medium'].cardIds.length;
    const r5 = await RoomManager.drawCards(room.id, bob.id, 'medium', 1);
    assert.strictEqual(r5.decks['medium'].cardIds.length, initialMedCount - 1);
    assert.strictEqual(r5.hands[bob.id].length, 1);

    // 6. Test Discard and Return
    const r6 = await RoomManager.discardCard(room.id, bob.id, r5.hands[bob.id][0].cardId);
    assert.strictEqual(r6.hands[bob.id].length, 0);
    assert.strictEqual(r6.discards.length, 1);

    // 7. Alice submits her card to Table Pool face-down
    const r7 = await RoomManager.submitCardToPool(room.id, hostId, drawnCardId);
    assert.strictEqual(r7.hands[hostId].length, 0, 'Hand should now be empty');
    assert.strictEqual(r7.tablePool.cards.length, 1, 'Table pool should contain Alice card');
    assert.strictEqual(r7.tablePool.cards[0].isDummy, false);
    assert.strictEqual(r7.tablePool.isRevealed, false, 'Pool must start hidden');

    // 8. Add 3 dummy/noise cards from hard deck
    const initialHardCount = r7.decks['hard'].cardIds.length;
    const r8 = await RoomManager.addDummyCardsToPool(room.id, 'hard', 3);
    assert.strictEqual(r8.decks['hard'].cardIds.length, initialHardCount - 3);
    assert.strictEqual(r8.tablePool.cards.length, 4, 'Pool should have 1 player card + 3 dummy cards');
    assert.strictEqual(r8.tablePool.isRevealed, false);

    // 9. Reveal Table Pool
    const r9 = await RoomManager.revealTablePool(room.id);
    assert.strictEqual(r9.tablePool.isRevealed, true, 'Pool is now revealed');
    assert.strictEqual(r9.tablePool.revealedOrder.length, 4, 'Revealed order has all 4 cards');
  });

  test('Dummy card drawing from active deck and cross-deck purging', async () => {
    // 1. Create a room with FDLM
    const { room, hostId } = await RoomManager.createRoom('DummyTester', 'fdlm');
    const allCards = db.getCards('fdlm');
    const initialCardsInDecks = Object.values(room.decks).reduce((acc, d) => acc + d.cardIds.length, 0);
    assert.strictEqual(initialCardsInDecks, allCards.length);

    // 2. Add 2 dummy cards from a specific active deck split
    const splitKey = Object.keys(room.decks)[0];
    const initialSplitCount = room.decks[splitKey].cardIds.length;
    const r1 = await RoomManager.addDummyCardsToPool(room.id, splitKey, 2);
    assert.strictEqual(r1.tablePool.cards.length, 2, 'Pool should have 2 dummy cards');
    assert.ok(r1.tablePool.cards.every(c => c.isDummy), 'All cards should be marked as dummy');
    assert.strictEqual(r1.decks[splitKey].cardIds.length, initialSplitCount - 2, 'Drawn split deck count should be decremented');

    // Verify cross-deck purging: total cards in room.decks must be reduced by 2
    const cardsAfterDraw = Object.values(r1.decks).reduce((acc, d) => acc + d.cardIds.length, 0);
    assert.strictEqual(cardsAfterDraw, allCards.length - 2, 'Drawn dummy cards must be purged from all room decks');

    // 3. Add 1 more dummy card from another deck split
    const splitKey2 = Object.keys(r1.decks)[1] || splitKey;
    const countBefore2 = r1.decks[splitKey2].cardIds.length;
    const r2 = await RoomManager.addDummyCardsToPool(room.id, splitKey2, 1);
    assert.strictEqual(r2.tablePool.cards.length, 3, 'Pool should now have 3 dummy cards');
    assert.strictEqual(r2.decks[splitKey2].cardIds.length, countBefore2 - 1);

    // 4. Reveal pool and check revealedOrder
    const r3 = await RoomManager.revealTablePool(room.id);
    assert.strictEqual(r3.tablePool.isRevealed, true);
    assert.strictEqual(r3.tablePool.revealedOrder.length, 3);
  });

  test('Generic Score Matrix functionality', async () => {
    const { room, hostId } = await RoomManager.createRoom('Charlie');
    const { player: dave } = await RoomManager.joinRoom(room.id, 'Dave');

    // Add guest player
    const r1 = await RoomManager.addCustomScorePlayer(room.id, 'Eve (Guest)');
    const eveId = r1.scoreTable.customPlayers[0].id;

    // Add a new column
    const r2 = await RoomManager.addScoreColumn(room.id, 'Science');
    const colId = r2.scoreTable.columns[r2.scoreTable.columns.length - 1].id;

    // Update scores
    await RoomManager.updateScoreCell(room.id, hostId, colId, 15, true);
    await RoomManager.updateScoreCell(room.id, dave.id, colId, 25, true);
    await RoomManager.updateScoreCell(room.id, eveId, colId, 30, true);

    const updatedRoom = db.getRoom(room.id)!;
    assert.strictEqual(updatedRoom.scoreTable.scores[hostId][colId], 15);
    assert.strictEqual(updatedRoom.scoreTable.scores[dave.id][colId], 25);
    assert.strictEqual(updatedRoom.scoreTable.scores[eveId][colId], 30);

    // Remove guest player
    const r3 = await RoomManager.removeCustomScorePlayer(room.id, eveId);
    assert.strictEqual(r3.scoreTable.customPlayers.length, 0);
    assert.strictEqual(r3.scoreTable.scores[eveId], undefined);
    assert.strictEqual(r3.turnOrder.order.includes(eveId), false);
  });

  test('Turn Order Randomizer and Dice Roller', async () => {
    const { room, hostId } = await RoomManager.createRoom('Host');
    const { player: p2 } = await RoomManager.joinRoom(room.id, 'P2');
    const { player: p3 } = await RoomManager.joinRoom(room.id, 'P3');

    // Randomize turn order
    const r1 = await RoomManager.randomizeTurnOrder(room.id, 'clockwise');
    assert.strictEqual(r1.turnOrder.order.length, 3);
    assert.ok(r1.turnOrder.order.includes(hostId));
    assert.ok(r1.turnOrder.order.includes(p2.id));
    assert.ok(r1.turnOrder.order.includes(p3.id));

    // Roll 2d6 + 3
    const { room: r2, result } = await RoomManager.rollDice(room.id, hostId, [{ count: 2, sides: 6 }], 3);
    assert.strictEqual(result.rolls.length, 2);
    assert.ok(result.rolls[0] >= 1 && result.rolls[0] <= 6);
    assert.ok(result.rolls[1] >= 1 && result.rolls[1] <= 6);
    assert.strictEqual(result.total, result.rolls[0] + result.rolls[1] + 3);
    assert.strictEqual(r2.diceHistory[0].id, result.id);
  });

  test('Player leave and rejoin prevents duplicate player creation and supports player removal', async () => {
    // 1. Create room with Host Frank
    const { room, hostId } = await RoomManager.createRoom('Frank', 'fdlm');
    assert.strictEqual(Object.keys(room.players).length, 1);

    // Frank draws a card
    const firstDeckKey = Object.keys(room.decks)[0];
    const rWithCard = await RoomManager.drawCards(room.id, hostId, firstDeckKey, 1);
    assert.strictEqual(rWithCard.hands[hostId].length, 1);

    // Frank scores 42
    const colId = rWithCard.scoreTable.columns[0].id;
    await RoomManager.updateScoreCell(room.id, hostId, colId, 42, true);

    // 2. Frank leaves and comes back without sending playerId (e.g. storage cleared or new tab)
    const { room: rRejoined, player: frankRejoined } = await RoomManager.joinRoom(room.id, 'Frank');
    assert.strictEqual(frankRejoined.id, hostId, 'Rejoining with same name must reclaim the existing player ID');
    assert.strictEqual(Object.keys(rRejoined.players).length, 1, 'Must NOT create a second copy of Frank');
    assert.strictEqual(rRejoined.hands[hostId].length, 1, 'Frank hand must remain preserved');
    assert.strictEqual(rRejoined.scoreTable.scores[hostId][colId], 42, 'Frank score must remain preserved');
    assert.strictEqual(rRejoined.turnOrder.order.length, 1, 'Turn order must not contain duplicate entries');

    // 3. Grace joins the room
    const { room: rWithGrace, player: grace } = await RoomManager.joinRoom(room.id, 'Grace');
    assert.strictEqual(Object.keys(rWithGrace.players).length, 2);

    // Grace draws a card
    const rGraceCard = await RoomManager.drawCards(room.id, grace.id, firstDeckKey, 1);
    assert.strictEqual(rGraceCard.hands[grace.id].length, 1);
    const initialDiscards = rGraceCard.discards.length;

    // 4. Remove Grace from the room
    const rAfterRemove = await RoomManager.removePlayer(room.id, grace.id);
    assert.strictEqual(Object.keys(rAfterRemove.players).length, 1, 'Grace must be removed from players');
    assert.strictEqual(rAfterRemove.players[grace.id], undefined);
    assert.strictEqual(rAfterRemove.scoreTable.scores[grace.id], undefined, 'Grace must be removed from score table');
    assert.ok(!rAfterRemove.turnOrder.order.includes(grace.id), 'Grace must be removed from turn order');
    assert.strictEqual(rAfterRemove.discards.length, initialDiscards + 1, 'Grace hand must be returned to discard pile');

    // 5. Host transfer: when Host Frank leaves, Henry becomes the new host
    const { room: rWithHenry, player: henry } = await RoomManager.joinRoom(room.id, 'Henry');
    assert.strictEqual(henry.isHost, false, 'Henry starts as regular player');
    assert.strictEqual(rWithHenry.players[hostId].isHost, true, 'Frank is still host');

    const rAfterHostLeaves = await RoomManager.removePlayer(room.id, hostId);
    assert.strictEqual(rAfterHostLeaves.players[hostId], undefined, 'Host Frank is removed');
    assert.strictEqual(rAfterHostLeaves.players[henry.id].isHost, true, 'Henry becomes the new owner/host');

    // 6. Color collision prevention: when a player leaves and someone joins, colors never collide
    assert.strictEqual(rAfterHostLeaves.players[henry.id].color, '#ef4444', 'Henry has red color');
    const { room: rRejoined2, player: ian } = await RoomManager.joinRoom(room.id, 'Ian');
    assert.notStrictEqual(ian.color, rRejoined2.players[henry.id].color, 'Ian must not share Henry color');
    assert.strictEqual(ian.color, '#3b82f6', 'Ian should get the first available color (blue)');
  });
});
