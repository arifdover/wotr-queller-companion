import { useState } from 'react';
import type { DieFace, Strategy } from '../flow/types';
import {
  addDie,
  d6,
  FACTION_FACES,
  poolSize,
  removeDie,
  rollActionDice,
  setRolledDice,
  SHADOW_FACES,
  unusedDice,
  type Game,
} from '../engine/game';
import { DieChip, FACE_ICON } from './DicePanel';
import { FACE_LABEL } from '../engine/game';

// ---------------------------------------------------------------------------
// Start of game
// ---------------------------------------------------------------------------

export function Setup({ onStart }: { onStart: (opts: { wome: boolean; strategy: Strategy; roll: number | null }) => void }) {
  const [wome, setWome] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);

  const doRoll = () => {
    const r = d6();
    setRoll(r);
    setStrategy(r <= 3 ? 'corruption' : 'military');
  };

  return (
    <section className="card setup">
      <h2>New game</h2>
      <p>
        Queller plays the <b>Shadow</b>. You play the Free Peoples and move Queller's pieces on the board. The app
        walks you through Queller's flowcharts, asks you what it can't see, and keeps track of its dice.
      </p>
      <ol className="setup-steps">
        <li>Set up the board as usual (rulebook, Chapter III). Give Queller its 7 Shadow action dice.</li>
        <li>
          <label className="toggle">
            <input type="checkbox" checked={wome} onChange={(e) => setWome(e.target.checked)} />
            Playing with the <b>Warriors of Middle-earth</b> expansion
          </label>
        </li>
        <li>
          Queller picks a strategy by rolling a die: 1-3 corruption, 4-6 military.
          <div className="answers wrap">
            <button type="button" onClick={doRoll}>
              🎲 Roll for strategy
            </button>
            <button type="button" className={strategy === 'corruption' ? 'on' : ''} onClick={() => setStrategy('corruption')}>
              Corruption
            </button>
            <button type="button" className={strategy === 'military' ? 'on' : ''} onClick={() => setStrategy('military')}>
              Military
            </button>
          </div>
          {roll !== null && (
            <p>
              Rolled <b>{roll}</b> → <b>{strategy}</b> strategy.
            </p>
          )}
        </li>
      </ol>
      <button
        type="button"
        className="primary big"
        disabled={!strategy}
        onClick={() => strategy && onStart({ wome, strategy, roll })}
      >
        Start turn 1
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Hunt allocation input shown with the Phases 1-4 result
// ---------------------------------------------------------------------------

export function HuntInput({
  wanted,
  game,
  companions,
  setCompanions,
}: {
  wanted: number | 'max';
  game: Game;
  companions: number;
  setCompanions: (n: number) => void;
}) {
  const min = game.fpHuntLastTurn > 0 ? 1 : 0;
  return (
    <div className="hunt-input">
      {wanted === 'max' && (
        <label>
          Companions in the Fellowship (not counting the Ring-bearers):{' '}
          <input
            type="number"
            min={0}
            max={8}
            value={companions}
            onChange={(e) => setCompanions(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      )}
      {min > 0 && (
        <p className="muted small">
          The Free Peoples recovered dice from the Hunt Box this turn, so Queller must allocate at least 1.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 4: Action roll
// ---------------------------------------------------------------------------

export function RollPhase({ game, onChange, onBegin }: { game: Game; onChange: (g: Game) => void; onBegin: () => void }) {
  const [manual, setManual] = useState(false);
  const toRoll = Math.max(0, poolSize(game) - game.huntAllocated);
  const shadowDice = game.dice.filter((d) => !FACTION_FACES.includes(d.face as never));
  const rolled = shadowDice.length + game.huntEyes > 0;

  const manualFaces = (face: DieFace) => {
    const faces: DieFace[] = [...shadowDice.map((d) => d.face), ...Array(game.huntEyes).fill('eye')];
    if (faces.length >= toRoll) return;
    onChange(setRolledDice(game, [...faces, face]));
  };

  return (
    <section className="card roll">
      <h2>Phase 4 — Action roll</h2>
      <p>
        Queller put <b>{game.huntAllocated}</b> {game.huntAllocated === 1 ? 'die' : 'dice'} in the Hunt Box and rolls
        the other <b>{toRoll}</b>. Eye results go straight to the Hunt Box.
      </p>
      <div className="answers wrap">
        <button type="button" className="primary" onClick={() => onChange(rollActionDice(game))}>
          🎲 {rolled ? 'Re-roll' : 'Roll'} Queller's {toRoll} dice
        </button>
        <button type="button" className={manual ? 'on' : ''} onClick={() => setManual(!manual)}>
          I rolled real dice
        </button>
      </div>

      {manual && (
        <div className="manual">
          <p className="muted small">
            Tap each face you rolled ({shadowDice.length + game.huntEyes}/{toRoll}).
          </p>
          <div className="face-buttons">
            {SHADOW_FACES.map((f) => (
              <button type="button" key={f} onClick={() => manualFaces(f)} disabled={shadowDice.length + game.huntEyes >= toRoll}>
                <span aria-hidden>{FACE_ICON[f]}</span> {FACE_LABEL[f]}
              </button>
            ))}
            <button type="button" className="ghost" onClick={() => onChange(setRolledDice(game, []))}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="dice-row">
        {game.dice.map((d) => (
          <DieChip key={d.id} die={d} onRemove={manual || FACTION_FACES.includes(d.face as never) ? () => onChange(removeDie(game, d.id)) : undefined} />
        ))}
        {game.huntEyes > 0 && (
          <span className="muted">
            + {game.huntEyes} Eye{game.huntEyes > 1 ? 's' : ''} to the Hunt Box
          </span>
        )}
      </div>

      {game.wome && (
        <div className="manual">
          <p className="muted small">Faction dice (WoME): roll them yourself and add each result.</p>
          <div className="face-buttons">
            {FACTION_FACES.map((f) => (
              <button type="button" key={f} onClick={() => onChange(addDie(game, f))}>
                <span aria-hidden>{FACE_ICON[f]}</span> {FACE_LABEL[f]}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="fp-dice">
        Free Peoples action dice rolled this turn:{' '}
        <input
          type="number"
          min={0}
          max={6}
          value={game.fpDice}
          onChange={(e) => onChange({ ...game, fpDice: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })}
        />
      </label>

      <button type="button" className="primary big" disabled={!rolled || game.fpDice === 0} onClick={onBegin}>
        Start Phase 5 — Action resolution
      </button>
      {(!rolled || game.fpDice === 0) && (
        <p className="muted small">Roll Queller's dice and enter how many dice the Free Peoples rolled.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Phase 5 hub
// ---------------------------------------------------------------------------

export function Phase5({
  game,
  onFp,
  onQueller,
  onEndTurn,
}: {
  game: Game;
  onFp: (kind: 'action' | 'fellowship' | 'pass') => void;
  onQueller: () => void;
  onEndTurn: () => void;
}) {
  const shadow = unusedDice(game).length;
  const fp = game.fpDice;
  const over = shadow === 0 && fp === 0;
  const actor = shadow === 0 ? 'fp' : fp === 0 ? 'shadow' : game.nextActor;

  if (over) {
    return (
      <section className="card phase5">
        <h2>Phase 6 — Victory check</h2>
        <p>
          Both sides have used all their dice. Check the military victory conditions: the Shadow wins with 10 victory
          points, the Free Peoples with 4.
        </p>
        <button type="button" className="primary big" onClick={onEndTurn}>
          Start turn {game.turn + 1}
        </button>
      </section>
    );
  }

  return (
    <section className="card phase5">
      <h2>Phase 5 — Action resolution</h2>
      <p className="muted">The Free Peoples act first, then the players alternate. When a side runs out of dice, the other takes its remaining actions.</p>
      <div className="sides">
        <div className={`side fp${actor === 'fp' ? ' active' : ''}`}>
          <h3>Free Peoples · {fp} left</h3>
          {actor === 'fp' && <div className="badge">Your turn</div>}
          <div className="answers wrap">
            <button type="button" disabled={fp === 0} onClick={() => onFp('action')}>
              I took an action
            </button>
            <button type="button" disabled={fp === 0} onClick={() => onFp('fellowship')}>
              I moved the Fellowship
            </button>
            <button type="button" className="ghost" disabled={fp === 0 || fp >= shadow} onClick={() => onFp('pass')}>
              Pass
            </button>
          </div>
          <p className="muted small">Moving the Fellowship puts your die in the Hunt Box.</p>
        </div>
        <div className={`side shadow${actor === 'shadow' ? ' active' : ''}`}>
          <h3>Queller · {shadow} left</h3>
          {actor === 'shadow' && <div className="badge">Queller's turn</div>}
          <button type="button" className="primary big" disabled={shadow === 0} onClick={onQueller}>
            Take Queller's action
          </button>
        </div>
      </div>
    </section>
  );
}
