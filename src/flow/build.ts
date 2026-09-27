// Small constructors so the chart files read close to the original flowcharts.
import type {
  ActionNode,
  CallNode,
  DecisionNode,
  FlowNode,
  GotoNode,
  RollNode,
  SpecialNode,
  StepNode,
} from './types';

type Opt<T> = Partial<Omit<T, 'id' | 'kind'>>;

export const decision = (
  id: string,
  text: string,
  yes: string,
  no: string,
  opt: Opt<DecisionNode> = {},
): DecisionNode => ({ kind: 'decision', id, text, yes, no, ...opt });

export const action = (id: string, text: string, opt: Opt<ActionNode> = {}): ActionNode => ({
  kind: 'action',
  id,
  text,
  ...opt,
});

export const step = (id: string, text: string, next: string, opt: Opt<StepNode> = {}): StepNode => ({
  kind: 'step',
  id,
  text,
  next,
  ...opt,
});

export const call = (id: string, entry: string, next: string, opt: Opt<CallNode> = {}): CallNode => ({
  kind: 'call',
  id,
  entry,
  next,
  ...opt,
});

export const goto = (id: string, entry: string, opt: Opt<GotoNode> = {}): GotoNode => ({
  kind: 'goto',
  id,
  entry,
  ...opt,
});

export const cont = (id: string): FlowNode => ({ kind: 'continue', id });

export const roll = (id: string, text: string, outcomes: RollNode['outcomes']): RollNode => ({
  kind: 'roll',
  id,
  text,
  outcomes,
});

export const special = (
  id: string,
  kind: SpecialNode['special'],
  next: string,
  opt: Opt<SpecialNode> = {},
): SpecialNode => ({ kind: 'special', id, special: kind, next, ...opt });

/** A linear run of grey boxes: each calls a chart and falls through to the next. */
export function callChain(
  prefix: string,
  calls: { entry: string; die?: CallNode['die']; wome?: boolean }[],
  exit: string,
): CallNode[] {
  return calls.map((c, i) =>
    call(`${prefix}-${i}`, c.entry, i + 1 < calls.length ? `${prefix}-${i + 1}` : exit, {
      die: c.die,
      wome: c.wome,
    }),
  );
}
