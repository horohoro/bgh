import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { io as Client } from 'socket.io-client';
import { createAppServer } from '../index.js';
import { seedDatabase } from '../db/seed.js';

describe('End-to-End Real-Time Multi-Client Suite', () => {
  let serverInstance: any;
  let testPort: number;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await seedDatabase();
    const { server } = createAppServer();
    serverInstance = server;
    await new Promise<void>(resolve => {
      server.listen(0, () => {
        const addr = server.address();
        testPort = typeof addr === 'object' && addr ? addr.port : 3001;
        resolve();
      });
    });
  });

  after(() => {
    serverInstance?.close();
  });

  test('Two clients join room, draw cards, submit to pool, reveal, update scores, and roll dice', async () => {
    const hostSocket = Client(`http://localhost:${testPort}`, { transports: ['websocket', 'polling'] });
    const playerSocket = Client(`http://localhost:${testPort}`, { transports: ['websocket', 'polling'] });

    await Promise.all([
      new Promise<void>(res => hostSocket.on('connect', () => res())),
      new Promise<void>(res => playerSocket.on('connect', () => res()))
    ]);

    // 1. Host creates room
    const hostRes: any = await new Promise(res => {
      hostSocket.emit('room:create', { hostName: 'HostPlayer', preferredSetId: 'fdlm' }, res);
    });
    assert.ok(hostRes?.success);
    const roomId = hostRes.room.id;
    const hostId = hostRes.hostId;

    // 2. Player joins room
    const joinRes: any = await new Promise(res => {
      playerSocket.emit('room:join', { roomId, playerName: 'GuestPlayer' }, res);
    });
    assert.ok(joinRes?.success);
    const playerId = joinRes.player.id;

    // 3. Configure decks by difficulty
    const configRes: any = await new Promise(res => {
      hostSocket.emit('decks:configure', { roomId, groupByKeys: ['difficulty'] }, res);
    });
    assert.ok(configRes?.success);

    // 4. Host draws 1 card from easy deck
    const drawRes: any = await new Promise(res => {
      hostSocket.emit('deck:draw', { roomId, playerId: hostId, deckId: 'easy', count: 1 }, res);
    });
    assert.ok(drawRes?.success);
    const hostCard = drawRes.room.hands[hostId][0];
    assert.ok(hostCard, 'Host card should exist in returned room');

    // 5. Host submits card to Table Pool
    const submitRes: any = await new Promise(res => {
      hostSocket.emit('pool:submit', { roomId, playerId: hostId, cardId: hostCard.cardId }, res);
    });
    assert.ok(submitRes?.success);
    assert.strictEqual(submitRes.room.hands[hostId].length, 0, 'Host hand must now be empty');
    assert.strictEqual(submitRes.room.tablePool.cards.length, 1, 'Pool must contain 1 card');

    // 6. Player adds 2 dummy cards
    const dummyRes: any = await new Promise(res => {
      playerSocket.emit('pool:addDummy', { roomId, deckId: 'hard', count: 2 }, res);
    });
    assert.ok(dummyRes?.success);
    assert.strictEqual(dummyRes.room.tablePool.cards.length, 3, 'Pool must have 3 cards');

    // 7. Reveal Table Pool
    const revealRes: any = await new Promise(res => {
      hostSocket.emit('pool:reveal', { roomId }, res);
    });
    assert.ok(revealRes?.success);
    assert.strictEqual(revealRes.room.tablePool.isRevealed, true);
    assert.strictEqual(revealRes.room.tablePool.revealedOrder.length, 3);

    // 8. Update Score
    const colId = revealRes.room.scoreTable.columns[0].id;
    const scoreRes: any = await new Promise(res => {
      playerSocket.emit('score:update', { roomId, playerId, columnId: colId, deltaOrValue: 42, isAbsolute: true }, res);
    });
    assert.ok(scoreRes?.success);
    assert.strictEqual(scoreRes.room.scoreTable.scores[playerId][colId], 42);

    // 9. Roll Dice
    const rollEventPromise = new Promise<any>(res => {
      hostSocket.once('dice:rolled', res);
    });

    const diceRes: any = await new Promise(res => {
      playerSocket.emit('dice:roll', { roomId, playerId, dice: [{ count: 2, sides: 6 }], modifier: 5 }, res);
    });
    assert.ok(diceRes?.success);

    const receivedRoll = await rollEventPromise;
    assert.strictEqual(receivedRoll.rolls.length, 2);
    assert.strictEqual(receivedRoll.total, receivedRoll.rolls[0] + receivedRoll.rolls[1] + 5);

    hostSocket.disconnect();
    playerSocket.disconnect();
  });
});
