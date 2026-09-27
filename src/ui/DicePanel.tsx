import type { DieFace } from '../flow/types';
import { FACE_LABEL, poolSize, unusedDice, type Die, type Game } from '../engine/game';

export const FACE_ICON: Record<DieFace, string> = {
  character: '♞',
  army: '⚔',
  muster: '⚑',
  event: '✦',
  musterArmy: '⚑⚔',
  eye: '👁',
  playFaction: 'F▶',
  drawFaction: 'F+',
  moveFaction: 'F→',
  recruitFaction: 'F⚑',
  wild: 'F★',
};

export function DieChip({ die, onRemove }: { die: Die; onRemove?: () => void }) {
  const cls = ['die', `face-${die.face}`, die.used ? 'used' : '', die.reserved ? 'reserved' : ''].join(' ');
  return (
    <span className={cls} title={`${FACE_LABEL[die.face]}${die.used ? ' (used)' : ''}${die.reserved ? ' (set aside for a minion)' : ''}`}>
      <span className="die-icon" aria-hidden>
        {FACE_ICON[die.face]}
      </span>
      <span className="die-label">{FACE_LABEL[die.face]}</span>
      {onRemove && (
        <button type="button" className="die-x" onClick={onRemove} aria-label={`Remove ${FACE_LABEL[die.face]} die`}>
          ×
        </button>
      )}
    </span>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}>
        −
      </button>
      <b>{value}</b>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  );
}

export function DicePanel({ game, onChange }: { game: Game; onChange: (g: Game) => void }) {
  const unused = unusedDice(game).length;
  const set = (patch: Partial<Game>) => onChange({ ...game, ...patch });
  const minion = (k: keyof Game['minions']) => () =>
    onChange({ ...game, minions: { ...game.minions, [k]: !game.minions[k] } });

  return (
    <section className="card dice-panel">
      <div className="panel-row">
        <h3>
          Queller's dice <span className="muted">({unused} left · pool {poolSize(game)})</span>
        </h3>
      </div>
      <div className="dice-row">
        {game.dice.length === 0 && <span className="muted">No dice rolled yet.</span>}
        {game.dice.map((d) => (
          <DieChip key={d.id} die={d} />
        ))}
      </div>
      <div className="panel-grid">
        <div className="stat">
          <span className="stat-label">Hunt Box</span>
          <b>
            {game.huntAllocated} allocated + {game.huntEyes} Eye{game.huntEyes === 1 ? '' : 's'}
            {game.fpHuntThisTurn > 0 && ` + ${game.fpHuntThisTurn} FP`}
          </b>
        </div>
        <Stepper label="Free Peoples dice left" value={game.fpDice} onChange={(v) => set({ fpDice: v })} />
        <Stepper label="Elven Rings held by Queller" value={game.rings} max={3} onChange={(v) => set({ rings: v })} />
      </div>
      <div className="minions">
        <span className="stat-label">Minions in play (each adds a die next turn):</span>
        <label>
          <input type="checkbox" checked={game.minions.saruman} onChange={minion('saruman')} /> Saruman
        </label>
        <label>
          <input type="checkbox" checked={game.minions.witchKing} onChange={minion('witchKing')} /> Witch-king
        </label>
        <label>
          <input type="checkbox" checked={game.minions.mouth} onChange={minion('mouth')} /> Mouth of Sauron
        </label>
      </div>
      {game.ringUsedThisTurn && <p className="muted small">An Elven Ring has already been used this turn.</p>}
    </section>
  );
}
