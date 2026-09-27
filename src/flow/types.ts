// Data model for the Queller Bot flowcharts.
//
// Each flowchart page from the Queller document is encoded as a set of nodes.
// Grey "go to another flowchart" boxes become `call` nodes (a subroutine that
// may come back via "Phase 5 - continue from where you came"), green start
// ellipses become entries, and red ellipses become terminal `action` nodes.

/** Faces of the red Shadow action dice. */
export type ShadowFace = 'character' | 'army' | 'muster' | 'event' | 'musterArmy' | 'eye';

/** Results of the Warriors of Middle-earth Faction die, entered by the player. */
export type FactionFace = 'playFaction' | 'drawFaction' | 'moveFaction' | 'recruitFaction' | 'wild';

export type DieFace = ShadowFace | FactionFace;

/** The kind of die an action needs. */
export type Need =
  | 'character'
  | 'army'
  | 'muster'
  | 'event'
  | 'playFaction'
  | 'drawFaction'
  | 'moveFaction'
  | 'recruitFaction';

export type Strategy = 'corruption' | 'military';

/** Conditions the engine can answer on its own from the tracked game state. */
export type AutoCheck =
  | 'usingEventDie'
  | 'usingPlayFactionDie'
  | 'dieHasBeenUsed'
  | 'musteredWitchKing'
  | 'firstRoundOfCombat'
  | 'militaryStrategy';

interface NodeBase {
  id: string;
  /** Only relevant with the Warriors of Middle-earth expansion. */
  wome?: boolean;
}

export interface DecisionNode extends NodeBase {
  kind: 'decision';
  text: string;
  /** Extra guidance shown under the question. */
  help?: string;
  /** Bold on the Queller chart: use an Elven Ring if the condition is met but the die is missing. */
  ring?: boolean;
  auto?: AutoCheck;
  /** Answer to use when the WoME expansion is off (default: "no"). */
  womeOff?: 'yes' | 'no';
  /** Optional bullet list, e.g. for "ANY condition true" boxes. */
  bullets?: string[];
  yes: string;
  no: string;
}

export interface ActionNode extends NodeBase {
  kind: 'action';
  text: string;
  priorityTitle?: string;
  priority?: string[];
  notes?: string[];
  /**
   * Die this action needs. `undefined` = the die of the flowchart being run,
   * `null` = no die (e.g. the die was already spent earlier in the chart).
   */
  die?: Need | null;
  /** Where to go if the needed die is not available. */
  fallback?: string;
  /** Army die actions may move a second army (navigate the chart twice). */
  secondArmyMove?: boolean;
  /** Offer to open a follow-up flowchart, e.g. the battle chart after an attack. */
  followUps?: { label: string; entry: string }[];
  /** Only possible with this die type (e.g. drawing cards needs an Event die). */
  onlyWithDie?: Need;
  /** Hunt allocation performed by Phases 1-4. */
  hunt?: number | 'max';
}

/** Orange boxes: do something, then continue. */
export interface StepNode extends NodeBase {
  kind: 'step';
  text: string;
  priorityTitle?: string;
  priority?: string[];
  notes?: string[];
  /** Spend the flowchart's die now (character die minion moves). */
  spendsDie?: boolean;
  next: string;
}

/** Grey box: run another flowchart and come back here if it did nothing. */
export interface CallNode extends NodeBase {
  kind: 'call';
  entry: string;
  /** Die override, e.g. "Army 4 (use character die)". */
  die?: Need;
  next: string;
}

/** Grey box that hands over to another flowchart without coming back. */
export interface GotoNode extends NodeBase {
  kind: 'goto';
  entry: string;
  die?: Need;
}

/** "Phase 5 - continue from where you came". */
export interface ContinueNode extends NodeBase {
  kind: 'continue';
}

export interface RollNode extends NodeBase {
  kind: 'roll';
  text: string;
  outcomes: { min: number; max: number; label: string; next: string }[];
}

/** Queller's special engine steps. */
export interface SpecialNode extends NodeBase {
  kind: 'special';
  special:
    | 'pass'
    | 'ringPass'
    | 'discardUnplayable'
    | 'useSetAsideMuster'
    | 'setAsideMuster'
    | 'switchStrategy'
    | 'nextRound'
    | 'noAction';
  /** For switchStrategy: which strategy to adopt. */
  strategy?: Strategy;
  /** Next node, or the entry to jump to for switchStrategy. */
  next: string;
}

export type FlowNode =
  | DecisionNode
  | ActionNode
  | StepNode
  | CallNode
  | GotoNode
  | ContinueNode
  | RollNode
  | SpecialNode;

export interface Entry {
  id: string;
  label: string;
  chart: string;
  start: string;
  /** Die used by this flowchart when entered normally. */
  die: Need | null;
  wome?: boolean;
}

export interface Chart {
  id: string;
  title: string;
  /** Page in the Queller v3.2 document. */
  page: number;
  nodes: FlowNode[];
  entries: Entry[];
}
