// Reference material adapted from the Queller Bot v3.2 document (pages 2-4),
// CC BY-NC 4.0, by Quitch.

import type { Game } from '../engine/game';

export interface Term {
  term: string;
  /** Words that point at this term inside flowchart questions. */
  match: RegExp;
  lines: string[];
}

export const GLOSSARY: Term[] = [
  {
    term: 'Aggressive',
    match: /\baggressive\b/i,
    lines: [
      "The army of an active nation whose value is at least the opposing army's value; or",
      'an army which has hit the stacking limit and contains the Witch-king or 5 leadership.',
    ],
  },
  {
    term: 'Exposed',
    match: /\bexposed\b/i,
    lines: ["An empty target where a Shadow army's shortest path to it is clear of enemy armies."],
  },
  {
    term: 'Full hand',
    match: /\bfull hand\b/i,
    lines: ['Holding the maximum number of cards allowed (6 Event cards; 4 Faction Event cards with WoME).'],
  },
  {
    term: 'Garrison',
    match: /\bgarrison\b/i,
    lines: ['An army inside a Stronghold or in a Stronghold region.'],
  },
  {
    term: 'Mobile',
    match: /\bmobile\b/i,
    lines: [
      'An army which can move towards its target without creating threat, and:',
      '• is aggressive against its closest target (or one within the same national border) and against all armies on the shortest route to it; or',
      '• would turn a passive siege aggressive at its closest target; or',
      '• has hit the stacking limit.',
      "Saruman is left out of the army's value when checking if it is mobile.",
    ],
  },
  {
    term: 'Passive',
    match: /\bpassive (army|siege)\b/i,
    lines: ['An army that is not aggressive.'],
  },
  {
    term: 'Preferred',
    match: /\bpreferred\b/i,
    lines: [
      'Corruption strategy: cards with a Character symbol.',
      'Military strategy: cards with an Army or Muster symbol.',
    ],
  },
  {
    term: 'Primary / Secondary',
    match: /\b(primary|secondary)\b/i,
    lines: [
      'Primary: the muster region closest to the defined target or army.',
      'Secondary: the muster region closest to the Primary.',
    ],
  },
  {
    term: 'Target',
    match: /\btargets?\b/i,
    lines: [
      'When tied for distance, the order of priority is:',
      '1. A conquered Shadow Stronghold.',
      "2. A Free Peoples' army creating threat.",
      '3. A Stronghold not currently under siege by a mobile Shadow army: at war, then active, then passive nation.',
      "4. An unconquered Free Peoples' City: at war, then active nation.",
      '5. The lowest value garrison.',
    ],
  },
  {
    term: 'Threat',
    match: /\bthreat(s|ened)?\b/i,
    lines: [
      "A region which contains an active nation's Free Peoples army within 2 regions of an unconquered Shadow Stronghold, with a higher value than the Shadow garrison (Free Peoples garrisons are excluded); or",
      'fewer than 4 hit points of Shadow units in the Orthanc garrison with Saruman, while the Ent faction is in play — or, without WoME, Gandalf the White is in play and a Companion is in Fangorn.',
    ],
  },
  {
    term: 'Value',
    match: /\bvalue\b/i,
    lines: [
      '+1 per hit point',
      '+1 per combat die, including Captain of the West cards (max 5)',
      '+1 per point of leadership (max 5, and no more than the number of units)',
      '+1 per Captain of the West',
      '+1 when defending in a fortification or City region',
      '×1.5 (round down) when defending in a Stronghold — only the five strongest units count; mobile and threat always use this, even with no siege',
      '×0.5 for sorties (round down)',
    ],
  },
];

export const GENERAL_RULES: { title: string; rules: string[] }[] = [
  {
    title: 'Actions',
    rules: [
      "Game rules override Queller's actions — e.g. it won't carry out an action it doesn't have a die for. (Use \"Not possible\" in the app.)",
      'Never carry out an action that would make Queller lose, or miss an immediate win.',
      'When several options are equally valid, roll a die to pick one at random.',
    ],
  },
  {
    title: 'Armies',
    rules: [
      'Never move in a way that creates a threat unless the move decreases the distance to it. Split an army to avoid this if the split force still has enough value for the action.',
      'Sieging armies count as adjacent to garrisons and Strongholds as well as to surrounding regions.',
      'When moving out of the Fellowship\'s region, leave a Nazgûl, a Regular and a Faction figure behind if there are Eyes in the Hunt Pool, Fellowship Progress puts it outside Mordor, and the move criteria are still met. Ignore this when attacking.',
      'When the distance to the closest target must not increase, the target may still change.',
      'Move Faction figures with their armies.',
      'Consider both moves of an Army die: if two moves combined meet a condition, the condition is true.',
    ],
  },
  {
    title: 'Battles',
    rules: [
      'Remove Shadow units to support card play until the army would become passive.',
      'The player selects and plays their card before Queller.',
    ],
  },
  {
    title: 'Cards',
    rules: [
      'Use the matching flowchart for card choices: Phase 3 hunt allocation for Eyes, Army for attacks, Event/Faction for discards, etc.',
      'Only aggressive armies may attack.',
      'If a card tells Queller to remove enemy armies from a region, pick the region by going through the Army chart as though it were a mobile army.',
      "If a card blocks an action Queller tries to take, it carries out the card's requirements to remove it, if possible.",
      'Use cards "in play" at the first opportunity.',
      'Do not play a card if any paragraph is ineligible, it would have no effect, it achieves the same as the die used, or it needs a passive army to attack.',
      '"Fly, You Fools": roll a die — Queller loses on a 1.',
      'Call to Battle cards: ignore initiative and pick one at random from the valid options.',
    ],
  },
  {
    title: 'Characters',
    rules: [
      '"Nazgûl" never includes the Witch-king in these flowcharts.',
      "Do not use a character's ability if it would have no effect.",
    ],
  },
  {
    title: 'Dice',
    rules: [
      'Use a die matching the name of the flowchart unless told otherwise.',
      "If Queller must discard dice, discard at random from those that don't match its preferred type.",
      'Use a Muster/Army die when no Army or Muster die is available; if none, use Messenger of the Dark Tower (Mouth of Sauron) if possible.',
      'Use a Faction die Wild result when the needed Shadow Action die is not available.',
    ],
  },
  {
    title: 'Muster',
    rules: [
      'If the specified unit cannot be mustered, rotate: Elite → Regular → Nazgûl → Elite.',
      'If Isengard is the source of the Primary and Saruman is in play, use Voice of Saruman: upgrade if Orthanc is under threat, otherwise muster if 3 Regulars are available. If there are not enough figures for either, muster as normal.',
    ],
  },
];

export const CHEAT_SHEET = {
  note: 'True at the start of the game, to save working out initial targets, mobile armies and threat.',
  /** Target, value for a mobile army, closest for, mobile army. */
  targets: [
    ['Rivendell', '10', 'Mount Gundabad, North Dunland', '—'],
    ['Lórien', '13', 'Dol Guldur, Moria, North Dunland', '—'],
    ['Woodland Realm', '9', 'Dol Guldur, Mount Gundabad, North Rhûn', 'Dol Guldur (13)'],
    ['Erebor', '13', 'Easterlings', '—'],
    ["Helm's Deep", '3', 'Orthanc, South Dunland', 'Orthanc (11)'],
    ['Grey Havens', '9', '—', '—'],
    ['Minas Tirith', '15', 'Mordor, Southrons', '—'],
    ['Dol Amroth', '9', '—', '—'],
  ],
  /** Army die, source, destination, mobile army – target. Assumes no army moves via Character dice. */
  firstArmies: [
    ['1', 'Barad-dûr, Núrn', 'Gorgoroth', 'Yes — Minas Tirith'],
    ['2', 'Gorgoroth', 'Minas Morgul, Morannon', 'Yes — Minas Tirith'],
    ['3', 'Far Harad, Umbar (1 left behind)', 'Near Harad', 'Yes — Minas Tirith (not Pelargir, because Gondor is not active)'],
  ],
  threat: [
    'No Shadow Stronghold starts under threat. Lórien does not threaten Moria because it is a target region.',
    'No target starts exposed.',
  ],
};

/** Fill the {placeholders} used in the chart text. */
export function fill(text: string, game: Pick<Game, 'strategy'>): string {
  const corruption = game.strategy === 'corruption';
  return text
    .replaceAll('{preferredLong}', corruption ? 'cards with a Character symbol' : 'cards with an Army or Muster symbol')
    .replaceAll('{preferred}', corruption ? 'Character' : 'Army or Muster');
}

/** Glossary terms that appear in a piece of text. */
export function termsIn(text: string): Term[] {
  return GLOSSARY.filter((t) => t.match.test(text));
}
