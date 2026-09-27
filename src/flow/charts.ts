// The Queller Bot v3.2 flowcharts (pages 5-14 of the Queller document by Quitch),
// encoded as data. Adapted under CC BY-NC 4.0 — see README for attribution.
//
// Text in {curly braces} is filled in by the app, e.g. {preferred} becomes
// "Character" under the corruption strategy and "Army or Muster" under the
// military strategy.

import { action, call, callChain, cont, decision, goto, roll, special, step } from './build';
import type { Chart, FlowNode } from './types';

const BATTLE = [{ label: 'Resolve the battle', entry: 'battle' }];

const MUSTER_NOTES = [
  'Primary = the muster region closest to the target (or army). Secondary = the muster region closest to the Primary.',
  'If the specified unit cannot be mustered, rotate: Elite → Regular → Nazgûl → Elite.',
  'If Isengard is the source of the Primary and Saruman is in play, use Voice of Saruman: upgrade if Orthanc is under threat, otherwise muster if 3 Regulars are available. If there are not enough figures for either, muster as normal.',
];

const EVENT_PLAY_PRIORITY_PREFERRED = [
  'Full hand',
  '{preferred} Event card',
  '{preferred} Faction Event card (WoME)',
  'Ascending order of initiative',
];

const EVENT_DISCARD_PRIORITY = [
  'Not a {preferred} card',
  'Doesn\'t use the term "Fellowship revealed"',
  "Doesn't place a tile",
  'Descending order of initiative',
];

const FACTION_DISCARD_PRIORITY = [
  'No faction picture',
  'Faction not in play',
  'Not a {preferred} card',
  'Doesn\'t use the term "Fellowship revealed"',
  "Doesn't place a tile",
];

const CARD_NOTES = [
  'Do not play a card if any paragraph is ineligible, it would have no effect, it achieves the same thing the die would, or it requires a passive army to attack.',
  'Use cards "in play" at the first opportunity.',
];

const hunt = (id: string, n: number) =>
  action(id, `Assign ${n} ${n === 1 ? 'die' : 'dice'} to the Hunt Pool`, { hunt: n, die: null });

const huntMax = (id: string) =>
  action(id, 'Assign the maximum dice allowed to the Hunt Pool', { hunt: 'max', die: null });

// ---------------------------------------------------------------------------
// Page 5 — Corruption Strategy, Phases 1-4
// ---------------------------------------------------------------------------

const corruption14: Chart = {
  id: 'corruption14',
  title: 'Corruption Strategy — Phases 1-4',
  page: 5,
  entries: [
    { id: 'corruption-p1', label: 'Phase 1', chart: 'corruption14', start: 'c14-draw', die: null },
    {
      id: 'corruption-from-military',
      label: 'From Military Strategy',
      chart: 'corruption14',
      start: 'c14-hand6',
      die: null,
    },
  ],
  nodes: [
    step(
      'c14-draw',
      'Queller draws one card from each Shadow Event deck.',
      'c14-hand6',
      {
        notes: [
          'With WoME, Queller also draws a Faction Event card.',
          'Queller recovers its action dice automatically when the turn starts in this app.',
        ],
      },
    ),
    decision('c14-hand6', 'Is Queller holding more than 6 Event cards?', 'c14-strat', 'c14-fact4', {
      help: 'Count Character and Strategy Event cards. Faction Event cards are not counted here.',
    }),
    decision('c14-strat', 'Is Queller holding more than 1 Strategy card?', 'c14-discA', 'c14-discB'),
    step('c14-discA', 'Discard down to 6 Event cards', 'c14-fact4', {
      priorityTitle: 'Discard priority',
      priority: [
        'Doesn\'t use the term "Fellowship revealed"',
        "Doesn't place a tile",
        'Strategy card',
        'Character card',
        'Descending order of priority',
      ],
    }),
    step('c14-discB', 'Discard down to 6 Event cards', 'c14-fact4', {
      priorityTitle: 'Discard priority',
      priority: [
        'Doesn\'t use the term "Fellowship revealed"',
        "Doesn't place a tile",
        'Character card',
        'Strategy card',
        'Descending order of priority',
      ],
    }),
    decision('c14-fact4', 'Is Queller holding more than 4 Faction Event cards?', 'c14-discF', 'c14-p2', {
      wome: true,
    }),
    step('c14-discF', 'Discard down to 4 Faction Event cards', 'c14-p2', {
      wome: true,
      priorityTitle: 'Discard priority',
      priority: FACTION_DISCARD_PRIORITY,
    }),
    decision(
      'c14-p2',
      "Phase 2: are the Free Peoples' corruption points lower than the Shadow victory points?",
      'c14-switch',
      'c14-p3a',
    ),
    special('c14-switch', 'switchStrategy', 'military-p3', { strategy: 'military' }),
    decision(
      'c14-p3a',
      'Phase 3: is the Fellowship at its starting location with the Progress counter at 0?',
      'c14-roll',
      'c14-p3b',
    ),
    roll('c14-roll', 'Roll a die for the Hunt allocation', [
      { min: 1, max: 3, label: '1-3: assign 0 dice', next: 'c14-h0' },
      { min: 4, max: 6, label: '4-6: assign 1 die', next: 'c14-h1' },
    ]),
    decision('c14-p3b', 'Is the Fellowship on the Mordor Track?', 'c14-hmax', 'c14-p3c'),
    decision(
      'c14-p3c',
      'Is a mobile army adjacent to a target which would win the game, or does Queller only have 7 action dice?',
      'c14-h1',
      'c14-p3d',
    ),
    decision('c14-p3d', 'Is the Fellowship Progress counter greater than 4?', 'c14-h2', 'c14-p3e'),
    decision(
      'c14-p3e',
      "Does the Fellowship's shortest route lead via a Shadow Stronghold, and is the Fellowship within 2 Progress of it or past it?",
      'c14-h2b',
      'c14-h1b',
    ),
    hunt('c14-h0', 0),
    hunt('c14-h1', 1),
    hunt('c14-h1b', 1),
    hunt('c14-h2', 2),
    hunt('c14-h2b', 2),
    huntMax('c14-hmax'),
  ],
};

// ---------------------------------------------------------------------------
// Page 7 — Military Strategy, Phases 1-4
// ---------------------------------------------------------------------------

const military14: Chart = {
  id: 'military14',
  title: 'Military Strategy — Phases 1-4',
  page: 7,
  entries: [
    { id: 'military-p1', label: 'Phase 1', chart: 'military14', start: 'm14-draw', die: null },
    { id: 'military-p3', label: 'From Corruption Strategy', chart: 'military14', start: 'm14-p3a', die: null },
  ],
  nodes: [
    step(
      'm14-draw',
      'Queller draws one card from each Shadow Event deck.',
      'm14-vp',
      {
        notes: [
          'With WoME, Queller also draws a Faction Event card.',
          'Queller recovers its action dice automatically when the turn starts in this app.',
        ],
      },
    ),
    decision(
      'm14-vp',
      "Are the Shadow victory points lower than the Free Peoples' corruption points?",
      'm14-switch',
      'm14-hand6',
    ),
    special('m14-switch', 'switchStrategy', 'corruption-from-military', { strategy: 'corruption' }),
    decision('m14-hand6', 'Is Queller holding more than 6 Event cards?', 'm14-disc', 'm14-fact4', {
      help: 'Count Character and Strategy Event cards. Faction Event cards are not counted here.',
    }),
    step('m14-disc', 'Discard down to 6 Event cards', 'm14-fact4', {
      priorityTitle: 'Discard priority',
      priority: [
        'Doesn\'t use the term "Fellowship revealed"',
        'Character card',
        'Strategy card',
        'Descending order of priority',
        "Doesn't place a tile",
      ],
    }),
    decision('m14-fact4', 'Is Queller holding more than 4 Faction Event cards?', 'm14-discF', 'm14-p3a', {
      wome: true,
    }),
    step('m14-discF', 'Discard down to 4 Faction Event cards', 'm14-p3a', {
      wome: true,
      priorityTitle: 'Discard priority',
      priority: FACTION_DISCARD_PRIORITY,
    }),
    decision('m14-p3a', 'Phase 3: is the Fellowship on the Mordor Track?', 'm14-hmax', 'm14-p3b'),
    decision('m14-p3b', 'Is the Fellowship Progress counter greater than 5?', 'm14-h2', 'm14-p3c'),
    decision(
      'm14-p3c',
      'Is the Fellowship at its starting location with the Progress counter at 0?',
      'm14-h0',
      'm14-h1',
    ),
    hunt('m14-h0', 0),
    hunt('m14-h1', 1),
    hunt('m14-h2', 2),
    huntMax('m14-hmax'),
  ],
};

// ---------------------------------------------------------------------------
// Pages 6 & 8 — Phase 5, shared threat column
// ---------------------------------------------------------------------------

function threatColumn(p: string, exit: string): FlowNode[] {
  return [
    decision(`${p}-threat`, 'Is the Shadow under threat, or are the Free Peoples exposed?', `${p}-t1`, exit, {
      ring: true,
      help: 'Free Peoples exposed = an exposed target exists.',
    }),
    decision(`${p}-t1`, 'Is a mobile army adjacent to the threat?', `${p}-atkC`, `${p}-t2`),
    action(`${p}-atkC`, 'Attack the threat with that mobile army', {
      die: 'character',
      fallback: `${p}-atkA`,
      followUps: BATTLE,
      notes: ['A Character die can only be used if the army contains a Leader. If not, tap "Not possible".'],
    }),
    action(`${p}-atkA`, 'Attack the threat with that mobile army', {
      die: 'army',
      fallback: `${p}-t2`,
      followUps: BATTLE,
    }),
    decision(`${p}-t2`, 'Can a move create a mobile army adjacent to the threat?', `${p}-mvC`, `${p}-t3`),
    decision(`${p}-t3`, 'Can a move increase troop numbers in the Stronghold under threat?', `${p}-mvC`, `${p}-t4`),
    decision(
      `${p}-t4`,
      "Does a mobile army's route to its closest target take it towards the threat?",
      `${p}-mvC`,
      `${p}-t5`,
    ),
    action(`${p}-mvC`, 'Make that move', {
      die: 'character',
      fallback: `${p}-army`,
      notes: ['A Character die moves one army that contains a Leader. If that is not possible, tap "Not possible".'],
    }),
    call(`${p}-army`, 'army', `${p}-t5`),
    decision(`${p}-t5`, 'Is the Stronghold under threat valid for mustering?', `${p}-mus`, `${p}-t6`),
    call(`${p}-mus`, 'muster', `${p}-t6`),
    decision(
      `${p}-t6`,
      'Is the threat sieging a Shadow Stronghold which can use more leadership?',
      `${p}-ch3`,
      `${p}-t7`,
    ),
    call(`${p}-ch3`, 'character3', `${p}-t7`),
    decision(`${p}-t7`, 'Can an army move towards an exposed target?', `${p}-army2`, exit),
    call(`${p}-army2`, 'army', exit),
  ];
}

// ---------------------------------------------------------------------------
// Page 6 — Corruption Strategy, Phase 5
// ---------------------------------------------------------------------------

const corruption5: Chart = {
  id: 'corruption5',
  title: 'Corruption Strategy — Phase 5',
  page: 6,
  entries: [{ id: 'corruption-p5', label: 'Phase 5', chart: 'corruption5', start: 'c5-threat', die: null }],
  nodes: [
    ...threatColumn('c5', 'c5-c1'),
    decision(
      'c5-c1',
      'Is Queller holding Character cards, and is the Fellowship on the Mordor Track or revealed?',
      'c5-ev2c',
      'c5-c2',
      { ring: true },
    ),
    call('c5-ev2c', 'event2', 'c5-ev2', { die: 'character' }),
    call('c5-ev2', 'event2', 'c5-c2'),
    decision(
      'c5-c2',
      "Is the Fellowship in a region which Nazgûl can move to, and which contains no Nazgûl?",
      'c5-ch2a',
      'c5-c3',
    ),
    call('c5-ch2a', 'character2', 'c5-c3'),
    decision('c5-c3', 'Is the Witch-king in play and not in a mobile army?', 'c5-ch2b', 'c5-c4', { ring: true }),
    call('c5-ch2b', 'character2', 'c5-c4'),
    decision(
      'c5-c4',
      'Are the conditions to muster a minion met, or are the Southrons & Easterlings not at war, or has no faction been recruited?',
      'c5-mus2',
      'c5-c5',
      { ring: true, help: '"No faction recruited" only applies with WoME.' },
    ),
    call('c5-mus2', 'muster2', 'c5-c5'),
    decision('c5-c5', 'Is a mobile army adjacent to its target?', 'c5-c6', 'c5-pass'),
    decision(
      'c5-c6',
      'Is the Fellowship on the Mordor Track, or would the target win the game, or is the target not under siege and in a nation at war?',
      'c5-c6ch',
      'c5-pass',
      { ring: true },
    ),
    call('c5-c6ch', 'character', 'c5-c6ar'),
    call('c5-c6ar', 'army4', 'c5-pass'),
    special('c5-pass', 'pass', 'c5-p1'),
    decision('c5-p1', 'Is Queller holding playable Character cards?', 'c5-p1ec', 'c5-p2'),
    call('c5-p1ec', 'event', 'c5-p1e', { die: 'character' }),
    call('c5-p1e', 'event', 'c5-p2'),
    decision('c5-p2', 'Is a mobile army adjacent to a target that is not under siege?', 'c5-p2ch', 'c5-p3'),
    call('c5-p2ch', 'character', 'c5-p2ar'),
    call('c5-p2ar', 'army2', 'c5-p3'),
    decision('c5-p3', 'Are all factions in play?', 'c5-pfe', 'c5-rf', { wome: true, womeOff: 'yes' }),
    call('c5-rf', 'recruitFaction', 'c5-pfe', { wome: true }),
    call('c5-pfe', 'playFaction', 'c5-tail-0', { wome: true }),
    ...callChain(
      'c5-tail',
      [
        { entry: 'event' },
        { entry: 'army3' },
        { entry: 'character' },
        { entry: 'recruitFaction', wome: true },
        { entry: 'muster' },
        { entry: 'drawFaction', wome: true },
      ],
      'c5-ring',
    ),
    special('c5-ring', 'ringPass', 'c5-discard'),
    special('c5-discard', 'discardUnplayable', 'c5-setaside'),
    special('c5-setaside', 'useSetAsideMuster', 'c5-none'),
    special('c5-none', 'noAction', 'c5-none'),
  ],
};

// ---------------------------------------------------------------------------
// Page 8 — Military Strategy, Phase 5
// ---------------------------------------------------------------------------

const military5: Chart = {
  id: 'military5',
  title: 'Military Strategy — Phase 5',
  page: 8,
  entries: [{ id: 'military-p5', label: 'Phase 5', chart: 'military5', start: 'm5-threat', die: null }],
  nodes: [
    ...threatColumn('m5', 'm5-m1'),
    decision('m5-m1', 'Is the Witch-king in play and not in a mobile army?', 'm5-ch2', 'm5-m2', { ring: true }),
    call('m5-ch2', 'character2', 'm5-m2'),
    decision(
      'm5-m2',
      'Are the conditions to muster a minion met, or are the Southrons & Easterlings not at war, or has no faction been recruited?',
      'm5-mus2',
      'm5-m3',
      { ring: true, help: '"No faction recruited" only applies with WoME.' },
    ),
    call('m5-mus2', 'muster2', 'm5-m3'),
    decision(
      'm5-m3',
      'Is Queller holding Character cards, and is the Fellowship on the Mordor Track or revealed?',
      'm5-m3b',
      'm5-m4',
      { ring: true },
    ),
    decision('m5-m3b', 'Is Queller holding a "Fellowship revealed" Character card?', 'm5-playC', 'm5-m4'),
    action('m5-playC', 'Play that "Fellowship revealed" Character card', {
      die: 'character',
      fallback: 'm5-playE',
      notes: CARD_NOTES,
    }),
    action('m5-playE', 'Play that "Fellowship revealed" Character card', {
      die: 'event',
      fallback: 'm5-m4',
      notes: CARD_NOTES,
    }),
    decision(
      'm5-m4',
      'Is a mobile army adjacent to its target, or to an army which is blocking the route to its target?',
      'm5-m4b',
      'm5-m5',
      { ring: true },
    ),
    decision('m5-m4b', 'Is ANY of these true?', 'm5-m4c', 'm5-m5', {
      bullets: [
        'The target provides enough victory points to win',
        'The target is in a nation at war and not under siege',
        'The Fellowship is in Mordor',
      ],
    }),
    call('m5-m4c', 'army4', 'm5-m4a', { die: 'character' }),
    call('m5-m4a', 'army4', 'm5-m5'),
    decision('m5-m5', 'Is Queller holding playable Muster Strategy cards?', 'm5-mus3', 'm5-pass'),
    call('m5-mus3', 'muster3', 'm5-pass'),
    special('m5-pass', 'pass', 'm5-pfe'),
    call('m5-pfe', 'playFaction', 'm5-ev', { wome: true }),
    call('m5-ev', 'event', 'm5-m6'),
    decision('m5-m6', 'Is a mobile army adjacent to its target?', 'm5-m6c', 'm5-tail-0'),
    call('m5-m6c', 'army4', 'm5-m6a', { die: 'character' }),
    call('m5-m6a', 'army4', 'm5-tail-0'),
    ...callChain(
      'm5-tail',
      [
        { entry: 'army3' },
        { entry: 'character' },
        { entry: 'recruitFaction', wome: true },
        { entry: 'muster' },
        { entry: 'drawFaction', wome: true },
      ],
      'm5-discard',
    ),
    special('m5-discard', 'discardUnplayable', 'm5-setaside'),
    special('m5-setaside', 'useSetAsideMuster', 'm5-none'),
    special('m5-none', 'noAction', 'm5-none'),
  ],
};

// ---------------------------------------------------------------------------
// Page 9 — Character
// ---------------------------------------------------------------------------

const character: Chart = {
  id: 'character',
  title: 'Character',
  page: 9,
  entries: [
    { id: 'character', label: 'Character', chart: 'character', start: 'ch-1', die: 'character' },
    { id: 'character2', label: 'Character 2', chart: 'character', start: 'ch-3', die: 'character' },
    { id: 'character3', label: 'Character 3', chart: 'character', start: 'ch-wkp', die: 'character' },
    { id: 'muster-witch-king', label: 'Muster Witch-king', chart: 'character', start: 'ch-wkp', die: null },
  ],
  nodes: [
    decision(
      'ch-1',
      'Is an army aggressive against an adjacent target, and does it contain the Witch-king or the maximum possible leadership?',
      'ch-atk',
      'ch-2',
    ),
    action('ch-atk', 'Attack the target with that army', { followUps: BATTLE }),
    decision(
      'ch-2',
      'Does a mobile army with leadership have a valid move or attack towards the nearest available target?',
      'ch-ar4',
      'ch-3',
    ),
    goto('ch-ar4', 'army4'),
    decision('ch-3', 'Are any Nazgûl or the Witch-king in play?', 'ch-wk1', 'ch-ev'),
    goto('ch-ev', 'event'),
    decision(
      'ch-wk1',
      'Is the Witch-king not in a mobile army, and able to join or create one?',
      'ch-wkp',
      'ch-nz1',
    ),
    step('ch-wkp', 'Move (or place) the Witch-king', 'ch-wkm', {
      spendsDie: true,
      priorityTitle: 'Witch-king placement priority',
      priority: [
        'Adjacent to a sieging threat',
        'Army is mobile',
        'Target nation is at war',
        'Army becomes mobile when the Witch-king is added',
        'Opposing army does not contain Gandalf the White',
        'Opposing army does not contain hobbits',
        'Adjacent to threat',
        'Sieging',
        'Adjacent to target',
        'Highest value Shadow army',
      ],
    }),
    decision('ch-wkm', 'Was the Witch-king just mustered?', 'ch-end', 'ch-nzp', { auto: 'musteredWitchKing' }),
    decision(
      'ch-nz1',
      "Are there Nazgûl outside the Fellowship's region which are able to move there?",
      'ch-nzp',
      'ch-nz2',
    ),
    decision(
      'ch-nz2',
      'Are there Nazgûl not in a mobile army which are able to join or create one?',
      'ch-nzp',
      'ch-ms',
    ),
    step('ch-nzp', 'Move the Nazgûl', 'ch-ms', {
      spendsDie: true,
      priorityTitle: 'Nazgûl placement priority',
      notes: ['Gather all Nazgûl prior to placement.'],
      priority: [
        'One in the region which contains the Fellowship',
        'Adjacent to a sieging threat',
        'Leadership value less than the number of army units and 5',
        'Contains the Witch-king',
        'Shadow Stronghold under siege',
        'Mobile army',
        'Adjacent to threat',
        'Target nation is active',
        'Army becomes mobile with Nazgûl',
        'Not sieging',
        'Adjacent to target',
        'Highest value Shadow army',
      ],
    }),
    decision('ch-ms', 'Is the Mouth of Sauron in play and not in a mobile army?', 'ch-msp', 'ch-used'),
    step('ch-msp', 'Move the Mouth of Sauron towards an army (up to 3 regions)', 'ch-used', {
      spendsDie: true,
      priorityTitle: 'Mouth of Sauron movement priority',
      priority: [
        'Leadership value less than the number of army units and 5',
        'Mobile army',
        'Army adjacent to target',
        'Can be reached on this die',
        'Closest army',
      ],
    }),
    decision('ch-used', 'Has the die been used?', 'ch-end', 'ch-ev', { auto: 'dieHasBeenUsed' }),
    action('ch-end', 'End of action', { die: null }),
  ],
};

// ---------------------------------------------------------------------------
// Page 10 — Army
// ---------------------------------------------------------------------------

const army: Chart = {
  id: 'army',
  title: 'Army',
  page: 10,
  entries: [
    { id: 'army', label: 'Army', chart: 'army', start: 'ar-threat', die: 'army' },
    { id: 'army2', label: 'Army 2', chart: 'army', start: 'ar-b1', die: 'army' },
    { id: 'army3', label: 'Army 3', chart: 'army', start: 'ar-c1', die: 'army' },
    { id: 'army-event', label: 'Army Event card', chart: 'army', start: 'ar-d1', die: null },
    { id: 'army4', label: 'Army 4', chart: 'army', start: 'ar-f1', die: 'army' },
  ],
  nodes: [
    decision('ar-threat', 'Does a threat exist?', 'ar-a2', 'ar-exp'),
    decision('ar-a2', 'Is a mobile army adjacent to the threat?', 'ar-atk', 'ar-a3'),
    action('ar-atk', 'Attack the threat with that mobile army', { followUps: BATTLE }),
    decision('ar-a3', 'Is it possible to form a mobile army adjacent to the threat?', 'ar-mvT', 'ar-a4'),
    decision(
      'ar-a4',
      'Is it possible to move an army to increase the value at the threatened Stronghold?',
      'ar-mvT',
      'ar-a5',
    ),
    decision(
      'ar-a5',
      "Does a mobile army's closest target take it towards the cause of the threat?",
      'ar-mvT',
      'ar-exp',
    ),
    action('ar-mvT', 'Make that move', { secondArmyMove: true }),
    decision('ar-exp', 'Does an exposed target exist?', 'ar-mvE', 'ar-b1'),
    action('ar-mvE', 'Move the nearest army towards the exposed target', { secondArmyMove: true }),
    decision('ar-b1', 'Is a mobile army adjacent to its target?', 'ar-b2', 'ar-c1'),
    decision('ar-b2', 'Is the target not under siege?', 'ar-batk', 'ar-c1'),
    action('ar-batk', 'Attack the target', {
      followUps: BATTLE,
      priorityTitle: 'Priority',
      priority: [
        'Target is a nation at war',
        'Attack would not move a nation to war',
        'Target in an active nation',
        'Highest value Shadow army',
      ],
    }),
    decision(
      'ar-c1',
      "Can an army move into the Fellowship's region without increasing its distance to its target?",
      'ar-c2',
      'ar-d1',
    ),
    decision(
      'ar-c2',
      'Are there dice in the Hunt Pool, does Fellowship Progress put it outside Mordor, and is there no army in that region?',
      'ar-mvF',
      'ar-d1',
    ),
    action('ar-mvF', "Move that army into the Fellowship's region", { secondArmyMove: true }),
    decision('ar-d1', 'Can an army move into an empty Settlement of a nation at war?', 'ar-d2', 'ar-m1'),
    decision("ar-d2", "Would that move increase the army's distance to its target?", 'ar-mv1', 'ar-mvS'),
    action('ar-mv1', 'Move 1 unit into that Settlement', { secondArmyMove: true }),
    action('ar-mvS', 'Move the army into that Settlement', { secondArmyMove: true }),
    decision(
      'ar-m1',
      'Are two Shadow armies able to merge, with at least one of them not mobile?',
      'ar-m2',
      'ar-f1',
    ),
    decision(
      'ar-m2',
      'Would merging increase the number of mobile armies, or make one of higher value than either currently is?',
      'ar-mvM',
      'ar-f1',
    ),
    action('ar-mvM', 'Move to merge the armies', {
      secondArmyMove: true,
      priorityTitle: 'Priority',
      priority: [
        'Decrease distance to target',
        'Creates the highest value army possible',
        'Moves the furthest army from its closest target',
        'Least left-over units',
        'Destination contains a Stronghold',
      ],
    }),
    decision('ar-f1', 'Can a mobile army move or attack towards its closest target?', 'ar-mvA', 'ar-g1'),
    action('ar-mvA', 'Move or attack towards the closest target', {
      secondArmyMove: true,
      followUps: BATTLE,
      priorityTitle: 'Priority',
      priority: [
        'Shadow army adjacent to its target',
        'Target nation at war',
        "Doesn't make a passive nation active",
        "Doesn't change a nation to at war",
        'By order of target priority',
        'Highest value Shadow army',
        "Doesn't block another mobile army's shortest route to its closest target",
        'Region contains the Fellowship',
      ],
    }),
    decision('ar-g1', 'Does Queller have an army on the board?', 'ar-mvG', 'ar-cont'),
    action('ar-mvG', 'Move an army', {
      secondArmyMove: true,
      priorityTitle: 'Priority',
      priority: [
        "Doesn't change a nation to at war",
        'Create the highest army value possible',
        'Closest target has a passive army adjacent',
        'Movement ends adjacent to another Shadow army',
        'Decreases distance to closest target',
        'Highest value Shadow army',
      ],
    }),
    cont('ar-cont'),
  ],
};

// ---------------------------------------------------------------------------
// Page 11 — Muster
// ---------------------------------------------------------------------------

const muster: Chart = {
  id: 'muster',
  title: 'Muster',
  page: 11,
  entries: [
    { id: 'muster', label: 'Muster', chart: 'muster', start: 'mu-1', die: 'muster' },
    { id: 'muster2', label: 'Muster 2', chart: 'muster', start: 'mu-2', die: 'muster' },
    { id: 'muster3', label: 'Muster 3', chart: 'muster', start: 'mu-4', die: 'muster' },
    { id: 'muster-event', label: 'Muster Event card', chart: 'muster', start: 'mu-4', die: null },
    { id: 'muster-mouth', label: 'Muster Mouth of Sauron', chart: 'muster', start: 'mu-mos', die: null },
  ],
  nodes: [
    decision('mu-1', 'Is a Stronghold under threat and able to muster?', 'mu-1m', 'mu-2'),
    action('mu-1m', 'Muster — Primary: Elite, Secondary: Regular', { notes: MUSTER_NOTES }),
    decision('mu-2', 'Is Queller able to recruit a minion?', 'mu-2b', 'mu-3'),
    decision(
      'mu-2b',
      'Do the Free Peoples have a Will of the West die, with Gandalf the White not yet recruited and no minions recruited?',
      'mu-save',
      'mu-2m',
    ),
    special('mu-save', 'setAsideMuster', 'mu-cont'),
    action('mu-2m', 'Recruit a minion', {
      priorityTitle: 'Priority',
      priority: ['Saruman', 'Witch-king', 'Mouth of Sauron'],
      notes: [
        "Mark the minion as in play in the Dice panel so Queller's dice pool grows next turn.",
      ],
      followUps: [
        { label: 'Place the Witch-king', entry: 'muster-witch-king' },
        { label: 'Place the Mouth of Sauron', entry: 'muster-mouth' },
      ],
    }),
    decision('mu-3', 'Is a Shadow nation not at war, or (WoME) is no faction in play?', 'mu-3p', 'mu-4'),
    step('mu-3p', 'Pick the nation (or faction) to advance', 'mu-3b', {
      priorityTitle: 'Priority',
      priority: ['Isengard', 'Faction (WoME)', 'Sauron', 'Southrons and Easterlings'],
    }),
    decision('mu-3b', 'Was a faction the highest priority?', 'mu-rf', 'mu-3m', { wome: true }),
    goto('mu-rf', 'recruitFaction', { wome: true }),
    action('mu-3m', 'Move that nation one step down the Political Track'),
    decision('mu-4', 'Is Queller holding a playable Muster card?', 'mu-4b', 'mu-5'),
    decision('mu-4b', 'Does the card allow a choice of muster location?', 'mu-6', 'mu-4m'),
    action('mu-4m', 'Play the Muster card', { notes: CARD_NOTES }),
    decision('mu-5', 'Is the Shadow able to muster?', 'mu-6', 'mu-cont'),
    decision('mu-6', 'Is Queller able to create an exposed target?', 'mu-6m', 'mu-7'),
    action('mu-6m', 'Muster — Primary: Elite, Secondary: Regular', {
      notes: ['Muster to create the exposed target.', ...MUSTER_NOTES],
    }),
    decision(
      'mu-7',
      'Is the Fellowship adjacent to a Shadow Settlement, does Fellowship Progress put it outside Mordor, and is no army in or adjacent to its region?',
      'mu-7m',
      'mu-8',
    ),
    action('mu-7m', 'Muster — Primary: Regular, Secondary: Nazgûl', {
      notes: ['Muster in the Settlement adjacent to the Fellowship.', ...MUSTER_NOTES],
    }),
    decision('mu-8', 'Is a muster possible in a region containing a Shadow army?', 'mu-8m', 'mu-9'),
    action('mu-8m', 'Muster — Primary: Elite, Secondary: Regular', {
      priorityTitle: 'Region priority',
      priority: ['Conducting a siege', 'Mobile army', 'Would become mobile', 'Contains Saruman', 'Highest value'],
      notes: MUSTER_NOTES,
    }),
    decision('mu-9', 'Are fewer than six Nazgûl in play?', 'mu-9n', 'mu-9e'),
    action('mu-9n', 'Muster — Primary: Nazgûl, Secondary: Nazgûl', {
      priorityTitle: 'Settlement closest to',
      priority: ['Target in a nation at war', 'Target in an active nation', 'Mobile army', 'Target in a passive nation'],
      notes: MUSTER_NOTES,
    }),
    action('mu-9e', 'Muster — Primary: Elite, Secondary: Nazgûl', {
      priorityTitle: 'Settlement closest to',
      priority: ['Target in a nation at war', 'Target in an active nation', 'Mobile army', 'Target in a passive nation'],
      notes: MUSTER_NOTES,
    }),
    cont('mu-cont'),
    decision('mu-mos', 'Can the Mouth of Sauron be placed in a region containing a Shadow army?', 'mu-mosA', 'mu-mosS'),
    action('mu-mosA', 'Place the Mouth of Sauron with a Shadow army', {
      die: null,
      priorityTitle: 'Priority',
      priority: ['Conducting a siege', 'Mobile army', 'Would become mobile', 'Contains Saruman', 'Highest value'],
    }),
    action('mu-mosS', 'Place the Mouth of Sauron in the Settlement closest to…', {
      die: null,
      priorityTitle: 'Settlement closest to',
      priority: ['Target in a nation at war', 'Target in an active nation', 'Mobile army', 'Target in a passive nation'],
    }),
  ],
};

// ---------------------------------------------------------------------------
// Page 12 — Event
// ---------------------------------------------------------------------------

const event: Chart = {
  id: 'event',
  title: 'Event',
  page: 12,
  entries: [
    { id: 'event', label: 'Event', chart: 'event', start: 'ev-1', die: 'event' },
    { id: 'event2', label: 'Event 2', chart: 'event', start: 'ev2-1', die: 'event' },
    { id: 'event-discard', label: 'Event card discard', chart: 'event', start: 'ev-disc', die: null },
  ],
  nodes: [
    decision('ev-1', 'Is Queller holding a playable {preferred} card?', 'ev-play1', 'ev-2', {
      help: 'Preferred cards: {preferredLong}. A card is only playable with the die being used.',
    }),
    action('ev-play1', 'Play an Event / Faction Event card', {
      priorityTitle: 'Priority',
      priority: EVENT_PLAY_PRIORITY_PREFERRED,
      notes: CARD_NOTES,
    }),
    decision('ev-2', 'Is Queller using an Event die?', 'ev-3', 'ev-cont', { auto: 'usingEventDie' }),
    decision(
      'ev-3',
      'Is Queller holding fewer than 4 Event cards (excluding Faction Event cards)?',
      'ev-draw',
      'ev-4',
    ),
    action('ev-draw', 'Draw a {preferred} Event card'),
    decision('ev-4', 'Is Queller holding fewer than 3 Faction Event cards?', 'ev-drawF', 'ev-5', { wome: true }),
    action('ev-drawF', 'Draw a Faction Event card', { wome: true }),
    decision('ev-5', 'Is Queller holding a playable Event or Faction Event card?', 'ev-play2', 'ev-6'),
    action('ev-play2', 'Play an Event / Faction Event card', {
      priorityTitle: 'Priority',
      priority: ['Full hand', 'Event card', 'Faction Event card (WoME)', 'Ascending order of initiative'],
      notes: CARD_NOTES,
    }),
    step('ev-6', 'Draw a {preferred} Event card', 'ev-7', { spendsDie: true }),
    decision('ev-7', 'Is Queller now above a full hand?', 'ev-disc', 'ev-end'),
    action('ev-disc', 'Discard an Event card', {
      priorityTitle: 'Discard priority',
      priority: EVENT_DISCARD_PRIORITY,
    }),
    action('ev-end', 'End of action', { die: null }),
    cont('ev-cont'),
    decision('ev2-1', 'Is Queller holding a playable "if the Fellowship is revealed" card?', 'ev2-play', 'ev2-2'),
    action('ev2-play', 'Play that Event / Faction Event card', { notes: CARD_NOTES }),
    decision(
      'ev2-2',
      'Is Queller holding a card which can add corruption to the Fellowship or adds a Hunt tile?',
      'ev2-play2',
      'ev2-3',
    ),
    action('ev2-play2', 'Play that Event / Faction Event card', { notes: CARD_NOTES }),
    decision(
      'ev2-3',
      'Is Queller holding fewer than 4 Event cards (excluding Faction Event cards)?',
      'ev2-draw',
      'ev2-cont',
    ),
    action('ev2-draw', 'Draw a Character Event card', { onlyWithDie: 'event' }),
    cont('ev2-cont'),
  ],
};

// ---------------------------------------------------------------------------
// Page 13 — Move / Recruit / Play / Draw Faction (WoME only)
// ---------------------------------------------------------------------------

const faction: Chart = {
  id: 'faction',
  title: 'Move / Recruit / Play / Draw Faction',
  page: 13,
  entries: [
    { id: 'playFaction', label: 'Play Faction Event', chart: 'faction', start: 'fa-p1', die: 'playFaction', wome: true },
    { id: 'drawFaction', label: 'Draw Faction Event', chart: 'faction', start: 'fa-d1', die: 'drawFaction', wome: true },
    { id: 'moveFaction', label: 'Move Faction', chart: 'faction', start: 'fa-m1', die: 'moveFaction', wome: true },
    {
      id: 'recruitFaction',
      label: 'Recruit Faction',
      chart: 'faction',
      start: 'fa-r1',
      die: 'recruitFaction',
      wome: true,
    },
    { id: 'faction-discard', label: 'Faction Event card discard', chart: 'faction', start: 'fa-disc', die: null, wome: true },
  ],
  nodes: [
    decision('fa-p1', 'Is Queller holding a playable Faction Event card?', 'fa-play', 'fa-todraw'),
    action('fa-play', 'Play a Faction Event card', {
      priorityTitle: 'Priority',
      priority: ['{preferred} card', 'Mobile army attacks target', 'Moves mobile army', 'Muster'],
      notes: CARD_NOTES,
    }),
    goto('fa-todraw', 'drawFaction'),
    decision('fa-d1', 'Is Black Sails on the table, with the Corsairs in play?', 'fa-d2', 'fa-d3'),
    decision('fa-d2', 'Could one or more Corsairs move to a siege?', 'fa-mvC', 'fa-d3'),
    action('fa-mvC', 'Move the Corsairs', {
      priorityTitle: 'Priority',
      priority: ['Siege', 'Highest value army'],
    }),
    decision('fa-d3', 'Is Queller using a Play Faction Event die?', 'fa-cont', 'fa-draw', {
      auto: 'usingPlayFactionDie',
    }),
    step('fa-draw', 'Draw a Faction Event card', 'fa-d5', { spendsDie: true }),
    decision('fa-d5', 'Is Queller now above a full hand?', 'fa-disc', 'fa-end'),
    action('fa-disc', 'Discard a Faction Event card', {
      priorityTitle: 'Discard priority',
      priority: FACTION_DISCARD_PRIORITY,
    }),
    action('fa-end', 'End of action', { die: null }),
    cont('fa-cont'),
    decision("fa-m1", "Is a Faction figure in the Fellowship's region?", 'fa-m1m', 'fa-m2'),
    action('fa-m1m', 'Move Faction figures', {
      priorityTitle: 'Destination priority',
      priority: ['Nearest mobile army', 'Highest value army'],
    }),
    decision('fa-m2', 'Is the Fellowship in a Stronghold or out to sea?', 'fa-m2m', 'fa-m3m'),
    action('fa-m2m', 'Move Faction figures', {
      priorityTitle: 'Destination priority',
      priority: [
        'Fellowship Progress region (nearest Faction figure only)',
        'Nearest mobile army',
        'Highest value army',
      ],
    }),
    action('fa-m3m', 'Move Faction figures', {
      priorityTitle: 'Destination priority',
      priority: [
        'Fellowship (nearest Faction figure only — two if one will be discarded)',
        'Nearest mobile army',
        'Highest value army',
      ],
    }),
    step('fa-r1', 'Choose the faction', 'fa-r2', {
      priorityTitle: 'Priority',
      priority: [
        'Faction with the most {preferred} Faction Event cards in hand and in play',
        'Faction with the most Faction Event cards in hand and in play',
      ],
    }),
    decision('fa-r2', 'Is that faction eligible to be brought into play?', 'fa-r2y', 'fa-r2n'),
    action('fa-r2y', 'Bring the faction into play'),
    action('fa-r2n', 'Muster faction figures', { notes: MUSTER_NOTES }),
  ],
};

// ---------------------------------------------------------------------------
// Page 14 — Battle
// ---------------------------------------------------------------------------

const battle: Chart = {
  id: 'battle',
  title: 'Battle',
  page: 14,
  entries: [{ id: 'battle', label: 'Battle', chart: 'battle', start: 'bt-0', die: null }],
  nodes: [
    step('bt-0', 'Before the round', 'bt-1', {
      notes: [
        'Downgrade Elites to continue a siege if necessary.',
        'Troops from nations not at war form the rear-guard.',
        'The player selects and plays their combat card before Queller.',
      ],
    }),
    decision('bt-1', 'Is the Shadow army defending in a Stronghold region and not under siege?', 'bt-2', 'bt-3'),
    decision(
      'bt-2',
      "Is the army's value lower than or equal to the enemy's, with fewer than 8 Army units?",
      'bt-ret',
      'bt-3',
    ),
    action('bt-ret', 'Retreat into the Stronghold', { die: null }),
    decision('bt-3', 'Is the Shadow army attacking?', 'bt-s1', 'bt-4'),
    decision('bt-4', 'Is the Shadow army besieged, or fighting in a Stronghold region?', 'bt-cD', 'bt-5'),
    decision('bt-5', 'Is this round 1 of combat?', 'bt-cD', 'bt-retR', { auto: 'firstRoundOfCombat' }),
    action('bt-retR', 'Retreat', {
      die: null,
      priorityTitle: 'Region priority',
      priority: [
        "Doesn't create threat",
        'Reduces distance to closest target or exposed',
        'Region which increases the number of mobile armies',
        'Region which increases the number of aggressive armies',
        'Settlement',
        'Region containing the highest value Shadow army possible',
        'Region adjacent to the highest value Shadow army possible',
      ],
    }),
    step('bt-cD', 'Play a combat card', 'bt-roll', {
      priorityTitle: 'Card priority',
      priority: [
        'Strategy card which cancels the Free Peoples card',
        'Doesn\'t use the term "Fellowship revealed"',
        "Doesn't place a tile or add corruption",
        'Ascending order of initiative on Character cards',
      ],
      notes: ['Remove Shadow units to support card play until the army would become passive.'],
    }),
    decision('bt-s1', 'Is the army making a sortie?', 'bt-s2', 'bt-s3'),
    decision('bt-s2', 'Is Queller holding a playable Character card?', 'bt-cS', 'bt-roll'),
    step('bt-cS', 'Play a combat card', 'bt-roll', {
      priorityTitle: 'Card priority',
      priority: [
        'Doesn\'t use the term "Fellowship revealed"',
        "Doesn't place a tile or add corruption",
        'Ascending order of initiative',
      ],
    }),
    decision('bt-s3', 'Does the army include the Witch-king, and is this the first round of battle?', 'bt-cW', 'bt-s4'),
    step('bt-cW', 'Play a combat card', 'bt-roll', {
      priorityTitle: 'Card priority',
      priority: [
        'Strategy card',
        "Durin's Bane",
        'Character card',
        'Doesn\'t use the term "Fellowship revealed"',
        "Doesn't place a tile or add corruption",
        'Ascending order of initiative',
      ],
      notes: ['Remove Shadow units to support card play until the army would become passive.'],
    }),
    decision('bt-s4', 'Is the Shadow laying siege?', 'bt-cG', 'bt-s5'),
    decision(
      'bt-s5',
      'Is Queller holding more than four Event cards (excluding Faction Event cards)?',
      'bt-cG',
      'bt-s6',
    ),
    decision('bt-s6', 'Is Queller holding a playable Call to Battle card?', 'bt-cG', 'bt-roll', { wome: true }),
    step('bt-cG', 'Play a combat card', 'bt-roll', {
      priorityTitle: 'Card priority',
      priority: [
        "Durin's Bane",
        'Call to Battle card (WoME)',
        'Strategy card',
        'Character card',
        'Doesn\'t use the term "Fellowship revealed"',
        "Doesn't place a tile or add corruption",
        'Ascending order of initiative',
      ],
      notes: [
        'Remove Shadow units to support card play until the army would become passive.',
        'Call to Battle cards: ignore initiative and pick one at random from the valid options.',
      ],
    }),
    step('bt-roll', 'Roll the combat dice, then re-roll misses (leader re-roll)', 'bt-cas'),
    step('bt-cas', 'Remove casualties', 'bt-r1', {
      priorityTitle: 'Casualty priority',
      priority: [
        'Maximise the effects of any cards played',
        'Maintain the highest army value with the lowest number of army units',
        'Keep at least one unit of each nation',
      ],
    }),
    decision('bt-r1', 'Do any Free Peoples units remain in the battle?', 'bt-r3', 'bt-r2'),
    decision('bt-r2', 'Would moving into the region do ANY of these?', 'bt-move', 'bt-end', {
      bullets: ['Win the game', 'Decrease the distance to the closest target', 'Negate a threat'],
    }),
    action('bt-move', 'Move the maximum value into the region', { die: null }),
    decision(
      'bt-r3',
      'Is this a field battle, or is the Fellowship on the Mordor Track?',
      'bt-r4',
      'bt-end',
      { auto: 'militaryStrategy', help: 'Under the military strategy this is always "yes".' },
    ),
    decision(
      'bt-r4',
      'Would the Shadow army be aggressive if the battle continues, or is it defending, or is the Fellowship on the Mordor Track?',
      'bt-next',
      'bt-end',
    ),
    special('bt-next', 'nextRound', 'bt-0'),
    action('bt-end', 'End the battle', { die: null }),
  ],
};

export const CHARTS: Chart[] = [
  corruption14,
  corruption5,
  military14,
  military5,
  character,
  army,
  muster,
  event,
  faction,
  battle,
];
