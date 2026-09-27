// Game state tracked by the companion: Queller's dice, the Hunt, Elven Rings and
// the Free Peoples' remaining dice. Everything on the map stays on the table —
// the app asks the player about it instead.

import type { DieFace, FactionFace, Need, ShadowFace, Strategy } from '../flow/types';

export type Rng = () => number;

export interface Die {
  id: string;
  face: DieFace;
  used: boolean;
  /** Muster die saved to recruit a minion as Queller's last action. */
  reserved: boolean;
}

export interface LogEntry {
  turn: number;
  text: string;
}

export type Phase = 'setup' | 'phases1to4' | 'roll' | 'phase5';

export interface Game {
  version: 1;
  wome: boolean;
  strategy: Strategy;
  turn: number;
  phase: Phase;
  minions: { saruman: boolean; witchKing: boolean; mouth: boolean };
  /** Dice rolled this turn (Eye results already moved to the Hunt Box). */
  dice: Die[];
  huntAllocated: number;
  huntEyes: number;
  /** Free Peoples' unused action dice this turn. */
  fpDice: number;
  /** Dice the Free Peoples put in the Hunt Box by moving the Fellowship this turn. */
  fpHuntThisTurn: number;
  fpHuntLastTurn: number;
  /** Elven Rings the Free Peoples have handed to Queller (Eye side up). */
  rings: number;
  ringUsedThisTurn: boolean;
  messengerUsedThisTurn: boolean;
  nextActor: 'fp' | 'shadow';
  nextDieId: number;
  log: LogEntry[];
}

export const SHADOW_FACES: ShadowFace[] = ['character', 'army', 'muster', 'event', 'musterArmy', 'eye'];
export const FACTION_FACES: FactionFace[] = ['playFaction', 'drawFaction', 'moveFaction', 'recruitFaction', 'wild'];

export const FACE_LABEL: Record<DieFace, string> = {
  character: 'Character',
  army: 'Army',
  muster: 'Muster',
  event: 'Event',
  musterArmy: 'Muster/Army',
  eye: 'Eye',
  playFaction: 'Play Faction Event',
  drawFaction: 'Draw Faction Event',
  moveFaction: 'Move Faction',
  recruitFaction: 'Recruit Faction',
  wild: 'Faction Wild',
};

export const NEED_LABEL: Record<Need, string> = {
  character: 'Character',
  army: 'Army',
  muster: 'Muster',
  event: 'Event',
  playFaction: 'Play Faction Event',
  drawFaction: 'Draw Faction Event',
  moveFaction: 'Move Faction',
  recruitFaction: 'Recruit Faction',
};

export const d6 = (rng: Rng = Math.random) => 1 + Math.floor(rng() * 6);

export const isFactionFace = (f: DieFace): f is FactionFace => (FACTION_FACES as string[]).includes(f);

export function newGame(opts: { wome: boolean; strategy: Strategy }): Game {
  return {
    version: 1,
    wome: opts.wome,
    strategy: opts.strategy,
    turn: 0,
    phase: 'setup',
    minions: { saruman: false, witchKing: false, mouth: false },
    dice: [],
    huntAllocated: 0,
    huntEyes: 0,
    fpDice: 0,
    fpHuntThisTurn: 0,
    fpHuntLastTurn: 0,
    rings: 0,
    ringUsedThisTurn: false,
    messengerUsedThisTurn: false,
    nextActor: 'fp',
    nextDieId: 1,
    log: [],
  };
}

const clone = <T>(v: T): T => structuredClone(v);

/** Queller starts with 7 dice and gains one for each minion in play (max 10). */
export function poolSize(game: Game): number {
  const m = game.minions;
  return Math.min(10, 7 + Number(m.saruman) + Number(m.witchKing) + Number(m.mouth));
}

export function addLog(game: Game, text: string): Game {
  const g = clone(game);
  g.log.push({ turn: g.turn, text });
  return g;
}

/** Phase 1: recover action dice and reset per-turn state. */
export function startTurn(game: Game): Game {
  const g = clone(game);
  g.turn += 1;
  g.phase = 'phases1to4';
  g.dice = [];
  g.huntAllocated = 0;
  g.huntEyes = 0;
  g.fpDice = 0;
  g.fpHuntLastTurn = g.fpHuntThisTurn;
  g.fpHuntThisTurn = 0;
  g.ringUsedThisTurn = false;
  g.messengerUsedThisTurn = false;
  g.nextActor = 'fp';
  return g;
}

/** Hunt allocation limits from the rulebook, applied on top of Queller's choice. */
export function huntLimits(game: Game, companions: number | null) {
  const min = game.fpHuntLastTurn > 0 ? 1 : 0;
  const max = Math.min(poolSize(game), Math.max(1, companions ?? poolSize(game)));
  return { min, max };
}

export function allocateHunt(game: Game, wanted: number | 'max', companions: number | null): Game {
  const { min, max } = huntLimits(game, companions);
  const n = wanted === 'max' ? max : Math.max(min, Math.min(max, wanted));
  const g = clone(game);
  g.huntAllocated = n;
  g.phase = 'roll';
  return g;
}

function makeDice(game: Game, faces: DieFace[]): Die[] {
  return faces.map((face) => ({ id: `d${game.nextDieId++}`, face, used: false, reserved: false }));
}

/** Phase 4: roll the dice not allocated to the Hunt; Eyes go to the Hunt Box. */
export function rollActionDice(game: Game, rng: Rng = Math.random): Game {
  const count = Math.max(0, poolSize(game) - game.huntAllocated);
  const faces = Array.from({ length: count }, () => SHADOW_FACES[d6(rng) - 1]);
  return setRolledDice(game, faces);
}

export function setRolledDice(game: Game, faces: DieFace[]): Game {
  const g = clone(game);
  const factionDice = g.dice.filter((d) => isFactionFace(d.face));
  g.huntEyes = faces.filter((f) => f === 'eye').length;
  g.dice = [...makeDice(g, faces.filter((f) => f !== 'eye')), ...factionDice];
  return g;
}

export function addDie(game: Game, face: DieFace): Game {
  const g = clone(game);
  g.dice.push(...makeDice(g, [face]));
  return g;
}

export function removeDie(game: Game, id: string): Game {
  const g = clone(game);
  g.dice = g.dice.filter((d) => d.id !== id);
  return g;
}

export const unusedDice = (game: Game) => game.dice.filter((d) => !d.used);
export const availableDice = (game: Game) => game.dice.filter((d) => !d.used && !d.reserved);

export type Via = 'exact' | 'musterArmy' | 'messenger' | 'wild';

export interface DieMatch {
  die: Die;
  via: Via;
}

/**
 * Pick a die that can take an action of the given type (General Rules 24-25):
 * the exact face first, then Muster/Army, then Messenger of the Dark Tower
 * (a Muster result used as an Army result), then a Faction die Wild result.
 */
export function findDie(game: Game, need: Need): DieMatch | null {
  const dice = availableDice(game);
  const face = (f: DieFace) => dice.find((d) => d.face === f);
  const exact = face(need);
  if (exact) return { die: exact, via: 'exact' };
  if (need === 'army' || need === 'muster') {
    const ma = face('musterArmy');
    if (ma) return { die: ma, via: 'musterArmy' };
  }
  if (need === 'army' && game.minions.mouth && !game.messengerUsedThisTurn) {
    const m = face('muster');
    if (m) return { die: m, via: 'messenger' };
  }
  if (need === 'character' || need === 'army' || need === 'muster' || need === 'event') {
    const wild = face('wild');
    if (wild) return { die: wild, via: 'wild' };
  }
  return null;
}

export function spendDie(game: Game, match: DieMatch): Game {
  const g = clone(game);
  const d = g.dice.find((x) => x.id === match.die.id);
  if (!d) throw new Error('Die not found');
  d.used = true;
  d.reserved = false;
  if (match.via === 'messenger') g.messengerUsedThisTurn = true;
  return g;
}

export const canUseRing = (game: Game) => game.rings > 0 && !game.ringUsedThisTurn;

/** Faces Queller would rather keep: those matching its strategy's preferred cards. */
export function preferredFaces(strategy: Strategy): DieFace[] {
  return strategy === 'corruption' ? ['character'] : ['army', 'muster', 'musterArmy'];
}

/** Choose at random, preferring dice that don't match the preferred type (General Rule 23). */
export function pickExpendable(game: Game, dice: Die[], rng: Rng = Math.random): Die | null {
  if (dice.length === 0) return null;
  const pref = preferredFaces(game.strategy);
  const pool = dice.filter((d) => !pref.includes(d.face));
  const from = pool.length ? pool : dice;
  return from[Math.floor(rng() * from.length)];
}

/** Use an Elven Ring to turn one of Queller's dice into the needed result. */
export function useRing(
  game: Game,
  need: Need,
  rng: Rng = Math.random,
): { game: Game; from: DieFace } | null {
  if (!canUseRing(game)) return null;
  if (!['character', 'army', 'muster', 'event'].includes(need)) return null;
  const candidates = availableDice(game).filter((d) => !isFactionFace(d.face));
  const die = pickExpendable(game, candidates, rng);
  if (!die) return null;
  const g = clone(game);
  const d = g.dice.find((x) => x.id === die.id)!;
  const from = d.face;
  d.face = need as ShadowFace;
  g.rings -= 1;
  g.ringUsedThisTurn = true;
  return { game: g, from };
}

export function reserveDie(game: Game, id: string): Game {
  const g = clone(game);
  const d = g.dice.find((x) => x.id === id);
  if (d) d.reserved = true;
  return g;
}
