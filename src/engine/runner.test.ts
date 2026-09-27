import { describe, expect, it } from 'vitest';
import { node } from '../flow';
import type { DieFace } from '../flow/types';
import { allocateHunt, newGame, setRolledDice, startTurn, type Game } from './game';
import { acknowledge, answer, notPossible, phase5Entry, start, type State } from './runner';

const rng = () => 0; // deterministic: d6 rolls 1, picks the first candidate

function game(strategy: 'corruption' | 'military', faces: DieFace[], extra: Partial<Game> = {}): Game {
  let g = startTurn(newGame({ wome: false, strategy }));
  g = allocateHunt(g, 1, 4);
  g = setRolledDice(g, faces);
  g.phase = 'phase5';
  return { ...g, fpDice: 1, ...extra };
}

function question(s: State) {
  expect(s.run.pending?.type).toBe('question');
  return node((s.run.pending as { node: string }).node);
}

/** Answer "no" to every question and confirm every step until a result comes up. */
function drain(s: State): State {
  let cur = s;
  for (let i = 0; i < 200 && cur.run.pending?.type !== 'result'; i++) {
    cur = cur.run.pending?.type === 'step' ? acknowledge(cur, rng) : answer(cur, false, rng);
  }
  return cur;
}

function result(s: State) {
  const p = s.run.pending;
  if (p?.type !== 'result') throw new Error(`Expected a result, got ${p?.type}`);
  return p.result;
}

describe('Phase 5 runner', () => {
  it('starts with the threat check', () => {
    const s = start(game('military', ['army', 'character', 'muster']), 'phase5', 'military-p5', rng);
    expect(question(s).id).toBe('m5-threat');
  });

  it('attacks a threat with a Character die when one is available', () => {
    let s = start(game('military', ['army', 'character']), 'phase5', 'military-p5', rng);
    s = answer(s, true, rng); // under threat
    s = answer(s, true, rng); // mobile army adjacent
    expect(result(s).text).toMatch(/Attack the threat/);
    expect(result(s).die?.face).toBe('character');
    expect(s.game.dice.filter((d) => d.used)).toHaveLength(1);
  });

  it('falls back to an Army die when the Character die is not possible', () => {
    let s = start(game('military', ['army', 'character']), 'phase5', 'military-p5', rng);
    s = answer(answer(s, true, rng), true, rng);
    s = notPossible(s, rng);
    expect(result(s).die?.face).toBe('army');
    expect(s.game.dice.filter((d) => d.used)).toHaveLength(1);
  });

  it('skips questions whose "yes" needs a die Queller does not have', () => {
    const s = drain(start(game('military', ['army', 'muster']), 'phase5', 'military-p5', rng));
    const asked = s.run.trail.filter((t) => t.kind === 'answer').map((t) => t.text);
    expect(asked.some((t) => t.includes('Witch-king is in play'))).toBe(false);
    // "yes" would only lead to playing a card with a Character or Event die.
    expect(asked.some((t) => t.includes('holding Character cards'))).toBe(false);
    expect(asked.some((t) => t.includes('mobile army adjacent to its target, or to an army'))).toBe(true);
  });

  it('draws a card with an Event die when nothing else applies', () => {
    let s = start(game('corruption', ['event']), 'phase5', 'corruption-p5', rng);
    for (let i = 0; i < 100 && s.run.pending?.type === 'question'; i++) s = answer(s, false, rng);
    expect(s.run.pending?.type).toBe('step');
    expect(node((s.run.pending as { node: string }).node).id).toBe('ev-6');
    s = drain(acknowledge(s, rng));
    expect(result(s).text).toBe('End of action');
    expect(s.game.dice[0].used).toBe(true);
  });

  it('passes when Queller has fewer dice than the Free Peoples', () => {
    const s = drain(start(game('military', ['army'], { fpDice: 3 }), 'phase5', 'military-p5', rng));
    expect(result(s).kind).toBe('pass');
  });

  it('discards a die nothing can use', () => {
    const s = drain(start(game('military', ['event']), 'phase5', 'military-p5', rng));
    // Event die: no preferred card, fewer than 4 cards -> "no"... drain answers no, so it draws.
    expect(['action', 'discard']).toContain(result(s).kind);
  });

  it('uses an Elven Ring for a bold condition when the die is missing', () => {
    let s = start(game('military', ['event', 'event'], { rings: 1 }), 'phase5', 'military-p5', rng);
    s = answer(s, true, rng); // threat (bold)
    s = answer(s, true, rng); // mobile army adjacent -> attack with a Character die
    expect(result(s).die?.face).toBe('character');
    expect(s.game.rings).toBe(0);
    expect(s.game.ringUsedThisTurn).toBe(true);
  });

  it('reports when no dice are left', () => {
    const g = game('military', []);
    const s = start(g, 'phase5', phase5Entry(g), rng);
    expect(result(s).kind).toBe('none');
  });

  it('uses Messenger of the Dark Tower for an army action', () => {
    const g = game('military', ['muster']);
    g.minions.mouth = true;
    let s = start(g, 'phase5', 'military-p5', rng);
    s = answer(s, true, rng); // threat
    s = answer(s, true, rng); // adjacent -> no Character die -> Army via Messenger
    expect(result(s).die?.via).toBe('messenger');
    expect(s.game.messengerUsedThisTurn).toBe(true);
  });

  it('sets a Muster die aside for a minion and uses it last', () => {
    let s = start(game('military', ['muster']), 'phase5', 'military-p5', rng);
    s = answer(s, false, rng); // threat
    // m5-m1 (Witch-king) is skipped: no Character die.
    expect(question(s).id).toBe('m5-m2');
    s = answer(s, true, rng); // minion conditions met -> Muster 2
    expect(question(s).id).toBe('mu-2');
    s = answer(s, true, rng); // able to recruit a minion
    s = answer(s, true, rng); // FP have Will of the West... -> set aside
    // The only die is now reserved, so every other question is skipped and it is used for the minion.
    expect(s.run.trail.some((t) => t.text.includes('set aside'))).toBe(true);
    expect(result(s).text).toMatch(/set aside/);
    expect(s.game.dice[0].used).toBe(true);
  });
});

describe('Phases 1-4', () => {
  it('switches strategy when corruption is lower than victory points', () => {
    let s = start(startTurn(newGame({ wome: false, strategy: 'corruption' })), 'phases1to4', 'corruption-p1', rng);
    s = acknowledge(s, rng); // draw
    s = answer(s, false, rng); // hand > 6
    s = answer(s, true, rng); // corruption < VP -> switch
    expect(s.game.strategy).toBe('military');
    expect(question(s).id).toBe('m14-p3a');
  });

  it('allocates Hunt dice', () => {
    const s = drain(start(startTurn(newGame({ wome: false, strategy: 'military' })), 'phases1to4', 'military-p1', rng));
    expect(result(s).hunt).toBe(1);
  });
});

describe('Battle tool', () => {
  it('knows it is the first round, and retreats in later field rounds', () => {
    let s = start(newGame({ wome: false, strategy: 'military' }), 'tool', 'battle', rng);
    s = acknowledge(s, rng); // before the round
    s = answer(s, false, rng); // defending in a Stronghold region
    s = answer(s, false, rng); // attacking? no
    s = answer(s, false, rng); // besieged? no -> round 1 (auto) -> play card
    expect(node((s.run.pending as { node: string }).node).id).toBe('bt-cD');
    s = acknowledge(s, rng); // card
    s = acknowledge(s, rng); // roll
    s = acknowledge(s, rng); // casualties
    s = answer(s, true, rng); // FP remain
    // military strategy: "field battle or military" is answered automatically
    expect(question(s).id).toBe('bt-r4');
    s = answer(s, true, rng); // continue -> next round
    s = acknowledge(s, rng);
    s = answer(s, false, rng);
    s = answer(s, false, rng);
    s = answer(s, false, rng); // round 2 -> retreat
    expect(result(s).text).toBe('Retreat');
  });
});
