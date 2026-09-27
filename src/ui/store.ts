import type { Game } from '../engine/game';
import type { State } from '../engine/runner';

/** One walk through a flowchart, with every previous state kept for "Back". */
export interface Session {
  title: string;
  history: State[];
  current: State;
}

export interface AppState {
  game: Game | null;
  /** Phases 1-4 or one of Queller's Phase 5 actions. */
  main: Session | null;
  /** A reference flowchart opened from the Tools menu or as a follow-up (battle, 2nd move…). */
  tool: Session | null;
}

const KEY = 'queller-companion:v1';

export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && (parsed.game === null || parsed.game?.version === 1)) return parsed;
    }
  } catch {
    // Storage can be unavailable (private mode) or hold something unreadable: start fresh.
  }
  return { game: null, main: null, tool: null };
}

export function save(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Not fatal: the game simply won't survive a reload.
  }
}

export function session(title: string, state: State): Session {
  return { title, history: [], current: state };
}

export function push(s: Session, next: State): Session {
  return { ...s, history: [...s.history, s.current], current: next };
}

export function back(s: Session): Session {
  if (s.history.length === 0) return s;
  return { ...s, history: s.history.slice(0, -1), current: s.history[s.history.length - 1] };
}
