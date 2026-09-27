import { describe, expect, it } from 'vitest';
import { CHARTS, ENTRIES, NODES } from './index';
import type { FlowNode } from './types';

function targets(n: FlowNode): string[] {
  switch (n.kind) {
    case 'decision':
      return [n.yes, n.no];
    case 'step':
    case 'call':
      return [n.next];
    case 'special':
      return n.special === 'switchStrategy' ? [] : [n.next];
    case 'action':
      return n.fallback ? [n.fallback] : [];
    case 'roll':
      return n.outcomes.map((o) => o.next);
    default:
      return [];
  }
}

describe('Queller flowcharts', () => {
  it('only link to nodes that exist', () => {
    for (const n of Object.values(NODES)) {
      for (const t of targets(n)) expect(NODES[t], `${n.id} -> ${t}`).toBeDefined();
    }
  });

  it('only call entries that exist', () => {
    for (const n of Object.values(NODES)) {
      if (n.kind === 'call' || n.kind === 'goto') expect(ENTRIES[n.entry], n.id).toBeDefined();
      if (n.kind === 'special' && n.special === 'switchStrategy') expect(ENTRIES[n.next], n.id).toBeDefined();
    }
    for (const e of Object.values(ENTRIES)) expect(NODES[e.start], e.id).toBeDefined();
  });

  it('have every node reachable from an entry', () => {
    const seen = new Set<string>();
    const queue = Object.values(ENTRIES).map((e) => e.start);
    while (queue.length) {
      const id = queue.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      queue.push(...targets(NODES[id]));
    }
    const unreachable = Object.keys(NODES).filter((id) => !seen.has(id));
    expect(unreachable).toEqual([]);
  });

  it('cover all ten flowchart pages', () => {
    expect(CHARTS.map((c) => c.page).sort((a, b) => a - b)).toEqual([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });
});
