import { Formula } from '../logic/formula';
import { RuleId } from '../logic/rules';

/**
 * A step in a reference solution.
 *
 * `['Q ∧ P', 'andI', 2, 3]` is a line citing displayed line numbers; a
 * `{ assume, steps }` object opens a subproof, and later steps cite it by the
 * range it spans, e.g. `'2-4'`. Numbers stay stable because the builder assigns
 * them exactly the way the UI does.
 */
export type SolutionStep =
  | readonly [formula: string, rule: RuleId, ...refs: ReadonlyArray<number | string>]
  | { readonly assume: string; readonly steps: readonly SolutionStep[] };

export interface LevelDefinition {
  readonly id: string;
  readonly title: string;
  readonly premises: readonly string[];
  readonly goal: string;
  /** Rules unlocked here; cumulative across chapters. */
  readonly rules: readonly RuleId[];
  readonly hint: string;
  /** A proof that works. Every level is machine-verified against this. */
  readonly solution: readonly SolutionStep[];
}

export interface ChapterDefinition {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly levels: readonly LevelDefinition[];
}

/** A level with its formulas parsed and its position resolved. */
export interface Level extends Omit<LevelDefinition, 'premises' | 'goal'> {
  readonly premises: Formula[];
  readonly goal: Formula;
  readonly chapterId: string;
  readonly chapterTitle: string;
  /** 1-based position across the whole game. */
  readonly index: number;
}
