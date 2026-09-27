import { CHARTS } from './charts';
import type { Chart, Entry, FlowNode } from './types';

export * from './types';
export { CHARTS };

export const NODES: Record<string, FlowNode & { chart: string }> = {};
export const ENTRIES: Record<string, Entry> = {};
export const CHART_BY_ID: Record<string, Chart> = {};

for (const chart of CHARTS) {
  CHART_BY_ID[chart.id] = chart;
  for (const node of chart.nodes) {
    if (NODES[node.id]) throw new Error(`Duplicate node id ${node.id}`);
    NODES[node.id] = { ...node, chart: chart.id };
  }
  for (const entry of chart.entries) {
    if (ENTRIES[entry.id]) throw new Error(`Duplicate entry id ${entry.id}`);
    ENTRIES[entry.id] = entry;
  }
}

export function node(id: string) {
  const n = NODES[id];
  if (!n) throw new Error(`Unknown flowchart node "${id}"`);
  return n;
}

export function entry(id: string) {
  const e = ENTRIES[id];
  if (!e) throw new Error(`Unknown flowchart entry "${id}"`);
  return e;
}
