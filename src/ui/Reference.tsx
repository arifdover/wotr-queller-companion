import { useState } from 'react';
import { CHEAT_SHEET, GENERAL_RULES, GLOSSARY } from './referenceData';

type Tab = 'glossary' | 'rules' | 'cheat' | 'about';

export function Reference() {
  const [tab, setTab] = useState<Tab>('glossary');
  return (
    <section className="card reference">
      <div className="tabs" role="tablist">
        {(
          [
            ['glossary', 'Glossary'],
            ['rules', 'General rules'],
            ['cheat', 'Cheat sheet'],
            ['about', 'About'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'glossary' && (
        <dl className="glossary">
          {GLOSSARY.map((t) => (
            <div key={t.term}>
              <dt>{t.term}</dt>
              <dd>
                {t.lines.map((l, i) => (
                  <p key={i}>{l}</p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {tab === 'rules' && (
        <div className="rules">
          {GENERAL_RULES.map((g) => (
            <div key={g.title}>
              <h3>{g.title}</h3>
              <ul>
                {g.rules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === 'cheat' && (
        <div className="cheat">
          <p className="muted">{CHEAT_SHEET.note}</p>
          <h3>Targets</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Target</th>
                  <th>Value for mobile army</th>
                  <th>Closest for</th>
                  <th>Mobile army</th>
                </tr>
              </thead>
              <tbody>
                {CHEAT_SHEET.targets.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) => (
                      <td key={i}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Initial formation of mobile armies</h3>
          <p className="muted small">Assumes no army movement via Character dice.</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Army die</th>
                  <th>Source</th>
                  <th>Destination</th>
                  <th>Mobile army – target</th>
                </tr>
              </thead>
              <tbody>
                {CHEAT_SHEET.firstArmies.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, i) => (
                      <td key={i}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Threat &amp; exposed</h3>
          <ul>
            {CHEAT_SHEET.threat.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'about' && (
        <div className="about">
          <p>
            This companion runs the <b>Queller Bot v3.2</b> by Quitch — a non-cheating Shadow bot for solo play of{' '}
            <i>War of the Ring</i> (2nd edition), with optional support for <i>Warriors of Middle-earth</i>.
          </p>
          <p>
            The Queller flowcharts are licensed under{' '}
            <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer">
              CC BY-NC 4.0
            </a>
            . The original document is on{' '}
            <a href="https://boardgamegeek.com/filepage/141333/queller-bot-solo-play" target="_blank" rel="noreferrer">
              BoardGameGeek
            </a>
            . This app adapts them into an interactive walkthrough; it is a fan project, not affiliated with Ares Games.
          </p>
          <h3>How the app reads the flowcharts</h3>
          <ul>
            <li>Grey boxes run another flowchart. If it gives Queller nothing to do, the app carries on from where it came.</li>
            <li>
              The app chooses the die for each action (General Rules 22-25) and skips questions whose "yes" would need a
              die Queller doesn't have.
            </li>
            <li>
              Bold conditions use an Elven Ring when the needed die is missing, if Queller holds one and hasn't used one
              this turn.
            </li>
            <li>
              If the game rules don't allow an action, tap <b>Not possible</b>: the die is given back and Queller carries
              on (General Rule 1).
            </li>
            <li>Warriors of Middle-earth Faction dice are entered by hand — roll them yourself.</li>
          </ul>
        </div>
      )}
    </section>
  );
}
