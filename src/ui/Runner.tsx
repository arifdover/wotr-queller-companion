import { useState } from 'react';
import { CHART_BY_ID, NODES } from '../flow';
import type { DecisionNode, StepNode } from '../flow/types';
import { FACE_LABEL, NEED_LABEL } from '../engine/game';
import type { Result, State } from '../engine/runner';
import { fill, termsIn } from './referenceData';
import type { Session } from './store';

export interface RunnerProps {
  session: Session;
  onAnswer: (yes: boolean) => void;
  onAcknowledge: () => void;
  onNotPossible: () => void;
  onBack: () => void;
  /** Finish with the result. `then` opens a follow-up flowchart afterwards. */
  onDone: (result: Result, then?: { entry: string; title: string }) => void;
  onCancel: () => void;
  doneLabel?: string;
  /** Extra controls shown with a result (e.g. Hunt allocation input). */
  resultExtra?: React.ReactNode;
}

function chartOf(nodeId: string) {
  const n = NODES[nodeId];
  const chart = CHART_BY_ID[n.chart];
  return `${chart.title} · p.${chart.page}`;
}

function Terms({ text }: { text: string }) {
  const terms = termsIn(text);
  const [open, setOpen] = useState<string | null>(null);
  if (terms.length === 0) return null;
  return (
    <div className="terms">
      <div className="terms-row">
        {terms.map((t) => (
          <button
            key={t.term}
            type="button"
            className={`term-chip${open === t.term ? ' on' : ''}`}
            onClick={() => setOpen(open === t.term ? null : t.term)}
            aria-expanded={open === t.term}
          >
            {t.term}
          </button>
        ))}
      </div>
      {terms
        .filter((t) => t.term === open)
        .map((t) => (
          <div className="term-body" key={t.term}>
            {t.lines.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
        ))}
    </div>
  );
}

function Priority({ title, items, strategy }: { title?: string; items?: string[]; strategy: State['game'] }) {
  if (!items?.length) return null;
  return (
    <div className="priority">
      <div className="priority-title">{title ?? 'Priority'}</div>
      <ol>
        {items.map((p, i) => (
          <li key={i}>{fill(p, strategy)}</li>
        ))}
      </ol>
    </div>
  );
}

function Notes({ notes, game }: { notes?: string[]; game: State['game'] }) {
  if (!notes?.length) return null;
  return (
    <ul className="notes">
      {notes.map((n, i) => (
        <li key={i}>{fill(n, game)}</li>
      ))}
    </ul>
  );
}

function dieText(r: Result) {
  if (!r.die) return null;
  const via =
    r.die.via === 'musterArmy'
      ? ' (Muster/Army die)'
      : r.die.via === 'messenger'
        ? ' (Muster die via Messenger of the Dark Tower)'
        : r.die.via === 'wild'
          ? ' (Faction Wild die)'
          : '';
  return r.kind === 'discard' ? `${FACE_LABEL[r.die.face]} die` : `${NEED_LABEL[r.die.need]} action${via}`;
}

export function Runner(props: RunnerProps) {
  const { session, onAnswer, onAcknowledge, onNotPossible, onBack, onDone, onCancel } = props;
  const state = session.current;
  const { game, run } = state;
  const p = run.pending;
  const [showTrail, setShowTrail] = useState(false);

  return (
    <section className="runner card">
      <header className="runner-head">
        <div>
          <div className="eyebrow">{session.title}</div>
          {p && p.type !== 'result' && <div className="chart-name">{chartOf(p.node)}</div>}
        </div>
        <div className="runner-actions">
          <button type="button" className="ghost" onClick={onBack} disabled={session.history.length === 0}>
            ← Back
          </button>
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </header>

      {run.trail.length > 0 && (
        <div className="trail">
          <button type="button" className="link" onClick={() => setShowTrail(!showTrail)}>
            {showTrail ? 'Hide' : 'Show'} path so far ({run.trail.length})
          </button>
          {showTrail && (
            <ol className="trail-list">
              {run.trail.map((t, i) => (
                <li key={i} className={`trail-${t.kind}`}>
                  {t.kind === 'info' ? (
                    fill(t.text, game)
                  ) : (
                    <>
                      <span>{fill(t.text, game)}</span>{' '}
                      <b className={t.answer ? 'yes' : 'no'}>{t.answer ? 'Yes' : 'No'}</b>
                      {t.kind === 'auto' && <i className="muted"> (auto)</i>}
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {p?.type === 'question' && <Question node={NODES[p.node] as DecisionNode} game={game} ring={run.ringMode} onAnswer={onAnswer} />}

      {p?.type === 'step' && (
        <StepView node={NODES[p.node] as StepNode} game={game} onAcknowledge={onAcknowledge} />
      )}

      {p?.type === 'result' && (
        <ResultView
          result={p.result}
          game={game}
          doneLabel={props.doneLabel}
          extra={props.resultExtra}
          onDone={onDone}
          onNotPossible={onNotPossible}
        />
      )}
    </section>
  );
}

function Question({
  node,
  game,
  ring,
  onAnswer,
}: {
  node: DecisionNode;
  game: State['game'];
  ring: boolean;
  onAnswer: (yes: boolean) => void;
}) {
  const text = fill(node.text, game);
  return (
    <div className="question">
      {(node.ring || ring) && game.rings > 0 && !game.ringUsedThisTurn && (
        <div className="badge ring">Elven Ring condition</div>
      )}
      <h2>{text}</h2>
      {node.bullets && (
        <ul className="bullets">
          {node.bullets.map((b, i) => (
            <li key={i}>{fill(b, game)}</li>
          ))}
        </ul>
      )}
      {node.help && <p className="help">{fill(node.help, game)}</p>}
      <Terms text={text + ' ' + (node.bullets ?? []).join(' ')} />
      <div className="answers">
        <button type="button" className="answer yes" onClick={() => onAnswer(true)}>
          Yes
        </button>
        <button type="button" className="answer no" onClick={() => onAnswer(false)}>
          No
        </button>
      </div>
    </div>
  );
}

function StepView({ node, game, onAcknowledge }: { node: StepNode; game: State['game']; onAcknowledge: () => void }) {
  return (
    <div className="step">
      <div className="badge todo">Do this</div>
      <h2>{fill(node.text, game)}</h2>
      <Priority title={node.priorityTitle} items={node.priority} strategy={game} />
      <Notes notes={node.notes} game={game} />
      <Terms text={[node.text, ...(node.priority ?? [])].join(' ')} />
      <div className="answers">
        <button type="button" className="primary" onClick={onAcknowledge}>
          Done — continue
        </button>
      </div>
    </div>
  );
}

function ResultView({
  result,
  game,
  doneLabel,
  extra,
  onDone,
  onNotPossible,
}: {
  result: Result;
  game: State['game'];
  doneLabel?: string;
  extra?: React.ReactNode;
  onDone: RunnerProps['onDone'];
  onNotPossible: () => void;
}) {
  const die = dieText(result);
  return (
    <div className={`result result-${result.kind}`}>
      <div className="badge act">{result.kind === 'none' ? 'Nothing to do' : 'Queller does'}</div>
      <h2>{fill(result.text, game)}</h2>
      {die && (
        <p className="die-used">
          Uses: <b>{die}</b>
        </p>
      )}
      <Priority title={result.priorityTitle} items={result.priority} strategy={game} />
      <Notes notes={result.notes} game={game} />
      <Terms text={[result.text, ...(result.priority ?? [])].join(' ')} />
      {extra}
      <div className="answers wrap">
        <button type="button" className="primary" onClick={() => onDone(result)}>
          {doneLabel ?? 'Done'}
        </button>
        {result.followUps?.map((f) => (
          <button
            type="button"
            key={f.entry}
            onClick={() => onDone(result, { entry: f.entry, title: f.label })}
          >
            {f.label} →
          </button>
        ))}
        {result.secondArmyMove && (
          <button type="button" onClick={() => onDone(result, { entry: 'army', title: 'Second army move' })}>
            Second army move →
          </button>
        )}
        {result.before && (
          <button type="button" className="ghost danger" onClick={onNotPossible}>
            Not possible
          </button>
        )}
      </div>
      {result.before && (
        <p className="muted small">
          "Not possible" if the game rules don't allow this action — Queller then carries on down the flowchart.
        </p>
      )}
    </div>
  );
}
