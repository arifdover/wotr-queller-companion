// Walks the Queller flowcharts one node at a time.
//
// The engine answers everything it can from the tracked state (which dice are
// left, which die a chart is using, the battle round…) and stops whenever it
// needs the player to look at the board: a yes/no question, an instruction to
// carry out, or the final action Queller takes.

import { entry as getEntry, node as getNode } from '../flow';
import type { ActionNode, AutoCheck, DecisionNode, DieFace, FlowNode, Need, StepNode } from '../flow/types';
import {
  availableDice,
  canUseRing,
  d6,
  FACE_LABEL,
  findDie,
  NEED_LABEL,
  pickExpendable,
  reserveDie,
  spendDie,
  unusedDice,
  useRing,
  type Game,
  type Rng,
  type Via,
} from './game';

export type Mode = 'phase5' | 'phases1to4' | 'tool';

export interface SpentDie {
  need: Need;
  face: DieFace;
  via: Via;
}

export interface Frame {
  entry: string;
  die: Need | null;
  spent: SpentDie | null;
  /** Node to resume at when this chart says "continue from where you came". */
  returnTo: string | null;
}

export interface TrailItem {
  kind: 'answer' | 'auto' | 'info';
  text: string;
  answer?: boolean;
}

export interface Result {
  kind: 'action' | 'pass' | 'discard' | 'none' | 'hunt';
  node?: string;
  text: string;
  priorityTitle?: string;
  priority?: string[];
  notes?: string[];
  followUps?: { label: string; entry: string }[];
  secondArmyMove?: boolean;
  die: SpentDie | null;
  hunt?: number | 'max';
  /** State before the die was spent, for "Not possible" (General Rule 1). */
  before?: { game: Game; run: Run };
  alt?: string | null;
}

export type Pending =
  | { type: 'question'; node: string }
  | { type: 'step'; node: string }
  | { type: 'result'; result: Result };

export interface Run {
  mode: Mode;
  root: string;
  stack: Frame[];
  node: string;
  /** A bold (ring) condition was just met: an Elven Ring may supply a missing die. */
  ringEligible: boolean;
  /** "Phase 5 (use a ring for any condition possible)". */
  ringMode: boolean;
  round: number;
  trail: TrailItem[];
  pending: Pending | null;
}

export interface State {
  game: Game;
  run: Run;
}

const MAX_STEPS = 500;

const article = (word: string) => `${/^[AEIOU]/i.test(word) ? 'an' : 'a'} ${word}`;
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);

const top = (run: Run) => run.stack[run.stack.length - 1];

function info(run: Run, text: string) {
  run.trail.push({ kind: 'info', text });
}

/** Start a flowchart. Tools run without spending dice. */
export function start(game: Game, mode: Mode, entryId: string, rng: Rng = Math.random): State {
  const e = getEntry(entryId);
  const run: Run = {
    mode,
    root: entryId,
    stack: [{ entry: entryId, die: mode === 'tool' ? null : e.die, spent: null, returnTo: null }],
    node: e.start,
    ringEligible: false,
    ringMode: false,
    round: 1,
    trail: [],
    pending: null,
  };
  if (mode === 'phase5') {
    if (unusedDice(game).length === 0) {
      run.pending = { type: 'result', result: { kind: 'none', text: 'Queller has no action dice left.', die: null } };
      return { game, run };
    }
    if (availableDice(game).length === 0) {
      // Only the Muster die saved for a minion is left: it is used now.
      run.node = game.strategy === 'corruption' ? 'c5-setaside' : 'm5-setaside';
    }
  }
  return advance({ game, run }, rng);
}

export function phase5Entry(game: Game) {
  return game.strategy === 'corruption' ? 'corruption-p5' : 'military-p5';
}

export function phases14Entry(game: Game) {
  return game.strategy === 'corruption' ? 'corruption-p1' : 'military-p1';
}

function cloneState(s: State): State {
  return structuredClone(s);
}

/** Answer the current yes/no question. */
export function answer(state: State, yes: boolean, rng: Rng = Math.random): State {
  const s = cloneState(state);
  const p = s.run.pending;
  if (!p || p.type !== 'question') throw new Error('No question pending');
  const n = getNode(p.node) as DecisionNode;
  s.run.trail.push({ kind: 'answer', text: n.text, answer: yes });
  if (yes && n.ring) s.run.ringEligible = true;
  s.run.node = yes ? n.yes : n.no;
  s.run.pending = null;
  return advance(s, rng);
}

/** Confirm that an instruction box (orange) has been carried out. */
export function acknowledge(state: State, rng: Rng = Math.random): State {
  const s = cloneState(state);
  const p = s.run.pending;
  if (!p || p.type !== 'step') throw new Error('No step pending');
  const n = getNode(p.node) as StepNode;
  s.run.trail.push({ kind: 'info', text: `Done: ${n.text}` });
  s.run.node = n.next;
  s.run.pending = null;
  return advance(s, rng);
}

/**
 * The action cannot be carried out under the game rules (General Rule 1):
 * give the die back and carry on as if the action did not exist.
 */
export function notPossible(state: State, rng: Rng = Math.random): State {
  const p = state.run.pending;
  if (!p || p.type !== 'result' || !p.result.before) throw new Error('Nothing to revert');
  const s = cloneState(p.result.before);
  info(s.run, `Not possible: ${p.result.text}`);
  s.run.pending = null;
  if (p.result.alt) {
    s.run.node = p.result.alt;
    return advance(s, rng);
  }
  return advance(popFrame(s), rng);
}

function popFrame(s: State): State {
  const frame = s.run.stack.pop();
  if (!frame || frame.returnTo === null || s.run.stack.length === 0) {
    s.run.stack = frame ? [frame] : s.run.stack;
    s.run.pending = {
      type: 'result',
      result: { kind: 'none', text: 'This flowchart gives Queller nothing to do here.', die: null },
    };
    return s;
  }
  s.run.node = frame.returnTo;
  return s;
}

function evalAuto(s: State, key: AutoCheck): boolean | undefined {
  const frame = top(s.run);
  switch (key) {
    case 'usingEventDie':
      return frame.die === 'event';
    case 'usingPlayFactionDie':
      return frame.die === 'playFaction';
    case 'dieHasBeenUsed':
      return frame.spent !== null;
    case 'musteredWitchKing':
      return frame.entry === 'muster-witch-king';
    case 'firstRoundOfCombat':
      return s.run.round === 1;
    case 'militaryStrategy':
      return s.game.strategy === 'military' ? true : undefined;
  }
}

const needsDice = (run: Run) => run.mode === 'phase5';

function callNeed(n: FlowNode): Need | null {
  if (n.kind !== 'call') return null;
  return n.die ?? getEntry(n.entry).die;
}

function haveDie(game: Game, need: Need | null) {
  return need === null || findDie(game, need) !== null;
}

/**
 * Could walking from `id` lead to Queller doing anything before reaching `stop`?
 * Only calls and dice actions Queller has no die for count as "nothing".
 */
function canAct(s: State, id: string, stop: string, depth = 0): boolean {
  if (id === stop) return false;
  if (depth > 12) return true;
  const n = getNode(id);
  if (n.wome && !s.game.wome) {
    if (n.kind === 'call') return canAct(s, n.next, stop, depth + 1);
    if (n.kind === 'decision') return canAct(s, n.womeOff === 'yes' ? n.yes : n.no, stop, depth + 1);
    return true;
  }
  switch (n.kind) {
    case 'call':
      return haveDie(s.game, callNeed(n)) || canAct(s, n.next, stop, depth + 1);
    case 'action':
      if (!n.die || !n.fallback) return true;
      return haveDie(s.game, n.die) || canAct(s, n.fallback, stop, depth + 1);
    case 'decision':
      return canAct(s, n.yes, stop, depth + 1) || canAct(s, n.no, stop, depth + 1);
    default:
      return true;
  }
}

/**
 * A question is pointless if every way through "yes" only reaches flowcharts
 * and actions Queller has no die for, and ends up where "no" goes. Skip it.
 */
function pointless(s: State, n: DecisionNode): boolean {
  if (!needsDice(s.run)) return false;
  if (canUseRing(s.game) && (n.ring || s.run.ringMode)) return false;
  return !canAct(s, n.yes, n.no);
}

/** Try to get a die for `need`, using an Elven Ring when Queller's rules allow it. */
function obtainDie(s: State, need: Need, rng: Rng): boolean {
  if (findDie(s.game, need)) return true;
  if ((s.run.ringEligible || s.run.ringMode) && canUseRing(s.game)) {
    const r = useRing(s.game, need, rng);
    if (r) {
      s.game = r.game;
      info(s.run, `Queller uses an Elven Ring: ${article(FACE_LABEL[r.from])} die becomes ${NEED_LABEL[need]}.`);
      s.game.log.push({
        turn: s.game.turn,
        text: `Used an Elven Ring to turn ${article(FACE_LABEL[r.from])} die into ${NEED_LABEL[need]}.`,
      });
      return true;
    }
  }
  return false;
}

function spend(s: State, need: Need): SpentDie {
  const match = findDie(s.game, need)!;
  s.game = spendDie(s.game, match);
  return { need, face: match.die.face, via: match.via };
}

function skipWome(s: State, n: FlowNode): boolean {
  if (!n.wome || s.game.wome) return false;
  switch (n.kind) {
    case 'decision':
      s.run.node = n.womeOff === 'yes' ? n.yes : n.no;
      return true;
    case 'call':
    case 'step':
    case 'special':
      s.run.node = n.next;
      return true;
    default: {
      const popped = popFrame(s);
      s.run = popped.run;
      return true;
    }
  }
}

function resolveAction(s: State, n: ActionNode, rng: Rng): void {
  const frame = top(s.run);
  const alt = n.fallback ?? null;
  const impossible = (why: string) => {
    info(s.run, why);
    s.run.ringEligible = false;
    if (alt) s.run.node = alt;
    else s.run = popFrame(s).run;
  };

  if (n.onlyWithDie && frame.die !== null && frame.die !== n.onlyWithDie) {
    impossible(`${n.text}: needs ${article(NEED_LABEL[n.onlyWithDie])} die.`);
    return;
  }

  let need: Need | null = n.die === undefined ? (frame.spent ? null : frame.die) : n.die;
  if (!needsDice(s.run)) need = null;

  const before = structuredClone({ game: s.game, run: { ...s.run, pending: null } });
  if (need && !obtainDie(s, need, rng)) {
    impossible(`No ${NEED_LABEL[need]} die for: ${n.text}`);
    return;
  }

  const die = need ? spend(s, need) : frame.spent;
  s.run.ringEligible = false;
  s.run.pending = {
    type: 'result',
    result: {
      kind: n.hunt !== undefined ? 'hunt' : 'action',
      node: n.id,
      text: n.text,
      priorityTitle: n.priorityTitle,
      priority: n.priority,
      notes: n.notes,
      followUps: n.followUps,
      secondArmyMove: !!n.secondArmyMove && die?.need === 'army',
      die,
      hunt: n.hunt,
      before: n.hunt !== undefined ? undefined : before,
      alt,
    },
  };
}

function resolveSpecial(s: State, n: Extract<FlowNode, { kind: 'special' }>, rng: Rng): void {
  const run = s.run;
  switch (n.special) {
    case 'pass': {
      const mine = unusedDice(s.game).length;
      if (mine < s.game.fpDice) {
        run.pending = {
          type: 'result',
          result: {
            kind: 'pass',
            text: 'Queller passes',
            notes: [`Queller has fewer unused dice (${mine}) than the Free Peoples (${s.game.fpDice}).`],
            die: null,
          },
        };
      } else {
        run.node = n.next;
      }
      return;
    }
    case 'ringPass': {
      if (!run.ringMode && canUseRing(s.game)) {
        info(run, 'Going through Phase 5 again, using an Elven Ring for any condition possible.');
        run.ringMode = true;
        run.stack = [run.stack[0]];
        run.node = getEntry(run.root).start;
      } else {
        run.node = n.next;
      }
      return;
    }
    case 'discardUnplayable': {
      const die = pickExpendable(s.game, availableDice(s.game), rng);
      if (!die) {
        run.node = n.next;
        return;
      }
      const before = structuredClone({ game: s.game, run: { ...run, pending: null } });
      s.game = spendDie(s.game, { die, via: 'exact' });
      run.pending = {
        type: 'result',
        result: {
          kind: 'discard',
          text: `Discard ${article(FACE_LABEL[die.face])} die without effect`,
          notes: ['None of the flowcharts found a use for Queller\'s remaining dice.'],
          die: { need: 'event', face: die.face, via: 'exact' },
          before,
          alt: n.next,
        },
      };
      return;
    }
    case 'useSetAsideMuster': {
      const die = unusedDice(s.game).find((d) => d.reserved);
      if (!die) {
        run.node = n.next;
        return;
      }
      s.game = spendDie(s.game, { die, via: 'exact' });
      run.pending = {
        type: 'result',
        result: {
          kind: 'action',
          text: 'Use the Muster die set aside earlier to recruit a minion',
          priorityTitle: 'Priority',
          priority: ['Saruman', 'Witch-king', 'Mouth of Sauron'],
          notes: ["Mark the minion as in play in the Dice panel so Queller's dice pool grows next turn."],
          followUps: [
            { label: 'Place the Witch-king', entry: 'muster-witch-king' },
            { label: 'Place the Mouth of Sauron', entry: 'muster-mouth' },
          ],
          die: { need: 'muster', face: die.face, via: 'exact' },
        },
      };
      return;
    }
    case 'setAsideMuster': {
      const match = findDie(s.game, 'muster');
      if (match) {
        s.game = reserveDie(s.game, match.die.id);
        info(run, `${cap(article(FACE_LABEL[match.die.face]))} die is set aside to recruit a minion as Queller's last action.`);
      }
      run.node = n.next;
      return;
    }
    case 'switchStrategy': {
      const strategy = n.strategy!;
      s.game = { ...s.game, strategy, log: [...s.game.log, { turn: s.game.turn, text: `Switched to the ${strategy} strategy.` }] };
      info(run, `Queller switches to the ${strategy} strategy.`);
      const e = getEntry(n.next);
      run.root = e.id;
      run.stack = [{ entry: e.id, die: null, spent: null, returnTo: null }];
      run.node = e.start;
      return;
    }
    case 'nextRound': {
      run.round += 1;
      info(run, `Next round of battle (round ${run.round}).`);
      run.node = n.next;
      return;
    }
    case 'noAction': {
      run.pending = {
        type: 'result',
        result: { kind: 'none', text: 'Queller has no usable action with its remaining dice.', die: null },
      };
      return;
    }
  }
}

/** Run automatic nodes until the player is needed. */
export function advance(state: State, rng: Rng = Math.random): State {
  let s = state;
  for (let i = 0; i < MAX_STEPS && !s.run.pending; i++) {
    const n = getNode(s.run.node);
    if (skipWome(s, n)) continue;

    switch (n.kind) {
      case 'decision': {
        if (n.auto) {
          const v = evalAuto(s, n.auto);
          if (v !== undefined) {
            s.run.trail.push({ kind: 'auto', text: n.text, answer: v });
            s.run.node = v ? n.yes : n.no;
            break;
          }
        }
        if (pointless(s, n)) {
          s.run.node = n.no;
          break;
        }
        s.run.pending = { type: 'question', node: n.id };
        break;
      }
      case 'step': {
        if (n.spendsDie && needsDice(s.run)) {
          const frame = top(s.run);
          if (frame.die && !frame.spent && findDie(s.game, frame.die)) {
            frame.spent = spend(s, frame.die);
          }
        }
        s.run.pending = { type: 'step', node: n.id };
        break;
      }
      case 'call': {
        const need = callNeed(n);
        const label = getEntry(n.entry).label;
        if (needsDice(s.run) && need && !obtainDie(s, need, rng)) {
          s.run.ringEligible = false;
          s.run.node = n.next;
          break;
        }
        s.run.ringEligible = false;
        s.run.trail.push({ kind: 'info', text: `→ ${label}${n.die ? ` (using ${article(NEED_LABEL[n.die])} die)` : ''}` });
        s.run.stack.push({ entry: n.entry, die: needsDice(s.run) ? need : null, spent: null, returnTo: n.next });
        s.run.node = getEntry(n.entry).start;
        break;
      }
      case 'goto': {
        const e = getEntry(n.entry);
        const frame = top(s.run);
        if (n.die && needsDice(s.run)) {
          if (!obtainDie(s, n.die, rng)) {
            s = popFrame(s);
            break;
          }
          frame.die = n.die;
        }
        s.run.trail.push({ kind: 'info', text: `→ ${e.label}` });
        frame.entry = e.id;
        s.run.node = e.start;
        break;
      }
      case 'continue':
        s = popFrame(s);
        break;
      case 'roll': {
        const r = d6(rng);
        const o = n.outcomes.find((x) => r >= x.min && r <= x.max)!;
        s.run.trail.push({ kind: 'info', text: `${n.text}: rolled ${r} (${o.label})` });
        s.run.node = o.next;
        break;
      }
      case 'action':
        resolveAction(s, n, rng);
        break;
      case 'special':
        resolveSpecial(s, n, rng);
        break;
    }
  }
  if (!s.run.pending) throw new Error(`Flowchart did not settle (stuck near ${s.run.node})`);
  return s;
}
