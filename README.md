# Queller Companion

A web app that runs the **Queller Bot** (v3.2, by Quitch) so you can play *War of the Ring* (2nd edition) solo against a Shadow AI, with optional *Warriors of Middle-earth* support.

Queller is a set of printed flowcharts. Normally you trace them by hand for every Shadow action. The app does the walking for you:

- It asks you **yes/no questions** about the board ("Is a mobile army adjacent to its target?"), since it can't see the map.
- It gives Queller's **action** at the end, with the priority lists from the flowcharts. You then move the pieces.
- It **tracks Queller's dice** (rolled or entered by hand), the Hunt Box, Elven Rings, minions and the Free Peoples' remaining dice.
- It **picks the die** for each action under Queller's rules: Muster/Army dice, Messenger of the Dark Tower, Faction Wild dice and Elven Rings for bold conditions.
- It **skips questions** that can't matter because Queller has no die for the "yes" branch.
- **Back** undoes any answer. **Not possible** gives the die back when the game rules block an action, and Queller carries on down the flowchart (General Rule 1).
- **Tools** for battles, discards, card-driven moves and musters, minion placement, random tie-breaks and "Fly, You Fools".
- A **reference** tab with the glossary, general rules and cheat sheet.
- Works offline and can be installed to a phone's home screen. The game is saved in the browser.

## Playing a turn

1. **New game:** choose whether you play with Warriors of Middle-earth, then roll for Queller's strategy (1-3 corruption, 4-6 military).
2. **Phases 1-4:** answer the questions. Queller discards if needed, may switch strategy, and decides its Hunt allocation.
3. **Phase 4:** roll Queller's dice in the app (or enter your physical roll). Enter how many dice the Free Peoples rolled. With WoME, add Faction dice by hand.
4. **Phase 5:** after each of your actions, tap *I took an action* (or *I moved the Fellowship*). On Queller's turn, tap *Take Queller's action* and follow the questions.
5. When both sides are out of dice, check victory and start the next turn.

## Development

```bash
npm install
npm run dev       # local dev server
npm test          # flowchart integrity + engine tests
npm run build     # production build in dist/
```

Project layout:

| Path | What it is |
| --- | --- |
| `src/flow/charts.ts` | All ten Queller flowchart pages encoded as data (decisions, actions, calls between charts) |
| `src/engine/game.ts` | Dice pool, Hunt, Elven Rings, die selection rules |
| `src/engine/runner.ts` | Walks the flowcharts: auto-answers what it can, stops for the player |
| `src/ui/` | React interface |

### Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes the app on every push to `main`. To turn it on once, go to **Settings → Pages** and set **Source** to **GitHub Actions**. The app will be served at `https://<user>.github.io/wotr-queller-companion/`.

## Credits and licence

- **Queller Bot for War of the Ring** v3.2 by **Quitch**, [on BoardGameGeek](https://boardgamegeek.com/filepage/141333/queller-bot-solo-play). Licensed [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). This app adapts its flowcharts, glossary, general rules and cheat sheet into an interactive form.
- *War of the Ring* is published by Ares Games. This is an unofficial fan project that is not affiliated with or endorsed by Ares Games. You need the game and its rulebook to play.

Because it adapts Queller, this project is also released under **CC BY-NC 4.0** (non-commercial). See [LICENSE](LICENSE).
