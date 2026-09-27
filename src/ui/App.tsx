import { useEffect, useState } from 'react';
import {
  addLog,
  allocateHunt,
  d6,
  FACE_LABEL,
  NEED_LABEL,
  newGame,
  startTurn,
  unusedDice,
  type Game,
} from '../engine/game';
import {
  acknowledge,
  answer,
  notPossible,
  phase5Entry,
  phases14Entry,
  start,
  type Result,
} from '../engine/runner';
import { DicePanel } from './DicePanel';
import { Reference } from './Reference';
import { fill } from './referenceData';
import { Runner } from './Runner';
import { HuntInput, Phase5, RollPhase, Setup } from './Screens';
import { back, load, push, save, session, type AppState, type Session } from './store';

type View = 'play' | 'reference' | 'log';

const TOOLS: { entry: string; label: string; wome?: boolean }[] = [
  { entry: 'battle', label: 'Battle (Queller attacks or is attacked)' },
  { entry: 'event-discard', label: 'Discard an Event card' },
  { entry: 'faction-discard', label: 'Discard a Faction Event card', wome: true },
  { entry: 'army-event', label: 'Event card moves a Queller army' },
  { entry: 'muster-event', label: 'Event card musters for Queller' },
  { entry: 'muster-witch-king', label: 'Place the Witch-king' },
  { entry: 'muster-mouth', label: 'Place the Mouth of Sauron' },
  { entry: 'moveFaction', label: 'Move Faction figures', wome: true },
];

function describe(result: Result, game: Game) {
  const text = fill(result.text, game);
  if (!result.die) return text;
  const die = result.kind === 'discard' ? FACE_LABEL[result.die.face] : NEED_LABEL[result.die.need];
  return `${text} (${die} die)`;
}

export function App() {
  const [app, setApp] = useState<AppState>(load);
  const [view, setView] = useState<View>('play');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [companions, setCompanions] = useState(4);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => save(app), [app]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const { game, main, tool } = app;

  const setGame = (g: Game) => setApp((a) => ({ ...a, game: g }));

  // --- session helpers -----------------------------------------------------

  const update = (which: 'main' | 'tool', f: (s: Session) => Session) =>
    setApp((a) => {
      const s = a[which];
      return s ? { ...a, [which]: f(s) } : a;
    });

  const openTool = (entry: string, title: string, g: Game) => {
    setToolsOpen(false);
    setApp((a) => ({ ...a, tool: session(title, start(g, 'tool', entry)) }));
  };

  const runnerFor = (which: 'main' | 'tool', s: Session, onDone: (r: Result, then?: { entry: string; title: string }) => void, extra?: React.ReactNode, doneLabel?: string) => (
    <Runner
      session={s}
      onAnswer={(yes) => update(which, (x) => push(x, answer(x.current, yes)))}
      onAcknowledge={() => update(which, (x) => push(x, acknowledge(x.current)))}
      onNotPossible={() => update(which, (x) => push(x, notPossible(x.current)))}
      onBack={() => update(which, back)}
      onCancel={() => setApp((a) => ({ ...a, [which]: null }))}
      onDone={onDone}
      resultExtra={extra}
      doneLabel={doneLabel}
    />
  );

  // --- game flow -----------------------------------------------------------

  const startGame = (opts: { wome: boolean; strategy: Game['strategy']; roll: number | null }) => {
    let g = newGame(opts);
    g = addLog(g, `Queller plays the ${opts.strategy} strategy${opts.roll ? ` (rolled ${opts.roll})` : ''}.`);
    beginTurn(g);
  };

  const beginTurn = (g0: Game) => {
    const g = startTurn(g0);
    setApp({ game: g, main: session(`Turn ${g.turn} · Phases 1-4`, start(g, 'phases1to4', phases14Entry(g))), tool: null });
  };

  const finishPhases14 = (r: Result) => {
    if (!main) return;
    const g = allocateHunt(main.current.game, r.hunt ?? 0, r.hunt === 'max' ? companions : null);
    setApp((a) => ({ ...a, game: addLog(g, `Hunt allocation: ${g.huntAllocated} ${g.huntAllocated === 1 ? 'die' : 'dice'}.`), main: null }));
  };

  const quellerAction = () => {
    if (!game) return;
    setApp((a) => ({ ...a, main: session(`Turn ${game.turn} · Queller's action`, start(game, 'phase5', phase5Entry(game))) }));
  };

  const finishAction = (r: Result, then?: { entry: string; title: string }) => {
    if (!main) return;
    let g = main.current.game;
    const acted = r.kind !== 'none' || unusedDice(g).length < unusedDice(game!).length;
    if (r.kind !== 'none') {
      g = addLog(g, describe(r, g));
      setToast(`Queller: ${describe(r, g)}`);
    }
    if (acted) g = { ...g, nextActor: 'fp' };
    setApp((a) => ({ ...a, game: g, main: null }));
    if (then) openTool(then.entry, then.title, g);
  };

  const fpAction = (kind: 'action' | 'fellowship' | 'pass') => {
    if (!game) return;
    const g: Game = {
      ...game,
      fpDice: kind === 'pass' ? game.fpDice : game.fpDice - 1,
      fpHuntThisTurn: game.fpHuntThisTurn + (kind === 'fellowship' ? 1 : 0),
      nextActor: 'shadow',
    };
    setGame(kind === 'pass' ? addLog(g, 'Free Peoples passed.') : g);
  };

  const newGameClick = () => {
    if (game && !confirm('Abandon the current game and start a new one?')) return;
    setApp({ game: null, main: null, tool: null });
    setView('play');
  };

  // --- render --------------------------------------------------------------

  const huntResult =
    main?.current.run.pending?.type === 'result' && main.current.run.pending.result.kind === 'hunt'
      ? main.current.run.pending.result
      : null;

  let body: React.ReactNode;
  if (!game) {
    body = <Setup onStart={startGame} />;
  } else if (main) {
    body = huntResult
      ? runnerFor(
          'main',
          main,
          finishPhases14,
          <HuntInput wanted={huntResult.hunt!} game={main.current.game} companions={companions} setCompanions={setCompanions} />,
          'Allocate & go to Phase 4',
        )
      : runnerFor('main', main, main.current.run.mode === 'phases1to4' ? finishPhases14 : finishAction);
  } else if (game.phase === 'phases1to4') {
    body = (
      <section className="card">
        <p>Phases 1-4 were cancelled.</p>
        <button type="button" className="primary" onClick={() => setApp((a) => ({ ...a, main: session(`Turn ${game.turn} · Phases 1-4`, start(game, 'phases1to4', phases14Entry(game))) }))}>
          Restart Phases 1-4
        </button>
      </section>
    );
  } else if (game.phase === 'roll') {
    body = <RollPhase game={game} onChange={setGame} onBegin={() => setGame({ ...game, phase: 'phase5', nextActor: 'fp' })} />;
  } else {
    body = <Phase5 game={game} onFp={fpAction} onQueller={quellerAction} onEndTurn={() => beginTurn(game)} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="eye" aria-hidden>
            👁
          </span>
          <div>
            <h1>Queller Companion</h1>
            {game && (
              <div className="sub">
                Turn {game.turn} · <span className={`strategy ${game.strategy}`}>{game.strategy} strategy</span>
                {game.wome && ' · WoME'}
              </div>
            )}
          </div>
        </div>
        <nav className="nav">
          <button type="button" className={view === 'play' ? 'on' : ''} onClick={() => setView('play')}>
            Play
          </button>
          <button type="button" className={view === 'reference' ? 'on' : ''} onClick={() => setView('reference')}>
            Reference
          </button>
          {game && (
            <button type="button" className={view === 'log' ? 'on' : ''} onClick={() => setView('log')}>
              Log
            </button>
          )}
        </nav>
      </header>

      <main className="content">
        {view === 'reference' && <Reference />}

        {view === 'log' && game && (
          <section className="card log">
            <h2>Game log</h2>
            {game.log.length === 0 && <p className="muted">Nothing yet.</p>}
            <ol reversed>
              {[...game.log].reverse().map((l, i) => (
                <li key={i}>
                  <span className="muted">T{l.turn}</span> {l.text}
                </li>
              ))}
            </ol>
          </section>
        )}

        {view === 'play' && (
          <>
            {tool && (
              <div className="overlay" role="dialog" aria-modal="true" aria-label={tool.title}>
                <div className="overlay-inner">
                  {runnerFor(
                    'tool',
                    tool,
                    (_r, then) => {
                      setApp((a) => ({ ...a, tool: null }));
                      if (then && game) openTool(then.entry, then.title, game);
                    },
                    undefined,
                    'Close',
                  )}
                </div>
              </div>
            )}

            {body}

            {game && game.phase !== 'setup' && (
              <>
                <DicePanel game={main ? main.current.game : game} onChange={main ? () => undefined : setGame} />
                <section className="card tools">
                  <div className="panel-row">
                    <h3>Tools</h3>
                    <button type="button" className="ghost" onClick={() => setToolsOpen(!toolsOpen)}>
                      {toolsOpen ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {toolsOpen && (
                    <div className="tool-grid">
                      {TOOLS.filter((t) => !t.wome || game.wome).map((t) => (
                        <button type="button" key={t.entry} onClick={() => openTool(t.entry, t.label, game)}>
                          {t.label}
                        </button>
                      ))}
                      <button type="button" onClick={() => setToast(`Random pick: rolled ${d6()}`)}>
                        🎲 Roll a die (random tie-break)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const r = d6();
                          setToast(r === 1 ? `"Fly, You Fools": rolled 1 — Queller loses!` : `"Fly, You Fools": rolled ${r} — no effect.`);
                        }}
                      >
                        🎲 "Fly, You Fools"
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}

            {game && (
              <p className="footer-actions">
                <button type="button" className="link" onClick={newGameClick}>
                  Start a new game
                </button>
              </p>
            )}
          </>
        )}
      </main>

      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  );
}
