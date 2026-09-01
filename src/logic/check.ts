/**
 * Validation of a whole proof.
 *
 * Every line is checked independently: citations must be in scope and of the
 * right shape, then the rule itself gets to pass judgement. A line is never
 * blamed for a mistake further up — an unfinished line above yields
 * "waiting on line 3", not a cascade of red.
 */

import { Formula, equals, format } from './formula';
import {
  Layout,
  Line,
  Proof,
  Subproof,
  assumptionOf,
  lastLineOf,
  layout,
  scopeFor,
} from './proof';
import { RULES, RuleId, SubproofShape } from './rules';

export type LineStatus = 'ok' | 'error' | 'incomplete';

export interface LineResult {
  status: LineStatus;
  /** Present when `status` is `error` or `incomplete`. */
  message?: string;
}

export interface CheckResult {
  results: Map<string, LineResult>;
  layout: Layout;
  /** True when every line checks out and the goal stands at the top level. */
  solved: boolean;
  /** Id of the top-level line that discharges the goal, if there is one. */
  goalLineId: string | null;
}

export interface CheckOptions {
  goal: Formula;
  /** When set, any rule outside this list is rejected as not yet unlocked. */
  allowedRules?: RuleId[];
}

export function checkProof(proof: Proof, options: CheckOptions): CheckResult {
  const view = layout(proof);
  const results = new Map<string, LineResult>();

  for (const { line } of view.lines) {
    results.set(line.id, checkLine(proof, view, line, options));
  }

  // The goal has to be reached at depth 0: a line inside a subproof rests on an
  // assumption that was never discharged, so it proves nothing on its own.
  const goalEntry = view.lines.find(
    (entry) =>
      entry.depth === 0 &&
      entry.line.formula !== null &&
      equals(entry.line.formula, options.goal) &&
      results.get(entry.line.id)?.status === 'ok',
  );

  const allValid = view.lines.every((entry) => results.get(entry.line.id)?.status === 'ok');

  return {
    results,
    layout: view,
    solved: allValid && goalEntry !== undefined,
    goalLineId: goalEntry?.line.id ?? null,
  };
}

function checkLine(proof: Proof, view: Layout, line: Line, options: CheckOptions): LineResult {
  if (line.formula === null) {
    return { status: 'incomplete', message: 'This line still needs a formula.' };
  }

  const spec = RULES[line.rule];
  if (!spec) {
    return { status: 'error', message: `Unknown rule “${line.rule}”.` };
  }

  if (
    options.allowedRules &&
    !options.allowedRules.includes(line.rule) &&
    line.rule !== 'premise' &&
    line.rule !== 'assumption'
  ) {
    return { status: 'error', message: `${spec.name} is not available in this level.` };
  }

  if (line.rule === 'premise' || line.rule === 'assumption') {
    return { status: 'ok' };
  }

  const scope = scopeFor(proof, line.id);
  if (!scope) {
    return { status: 'error', message: 'This line is not part of the proof.' };
  }

  const expected = spec.lineCount + spec.subproofCount;
  if (line.refs.length !== expected) {
    return { status: 'incomplete', message: citationCountMessage(spec.label, spec.lineCount, spec.subproofCount, line.refs.length) };
  }

  const citedLines: Formula[] = [];
  const citedSubproofs: SubproofShape[] = [];

  for (let i = 0; i < line.refs.length; i += 1) {
    const ref = line.refs[i];
    const wantsLine = i < spec.lineCount;

    if (wantsLine) {
      const cited = scope.lines.find((candidate) => candidate.id === ref);
      if (!cited) {
        return { status: 'error', message: outOfScopeMessage(view, ref, 'line') };
      }
      if (cited.formula === null) {
        return { status: 'incomplete', message: `Line ${numberOf(view, ref)} is still empty.` };
      }
      citedLines.push(cited.formula);
    } else {
      const cited = scope.subproofs.find((candidate) => candidate.id === ref);
      if (!cited) {
        return { status: 'error', message: outOfScopeMessage(view, ref, 'subproof') };
      }
      const shape = shapeOf(cited);
      if (!shape) {
        return {
          status: 'incomplete',
          message: `The subproof on lines ${rangeOf(view, ref)} is not finished yet.`,
        };
      }
      citedSubproofs.push(shape);
    }
  }

  const failure = spec.check(line.formula, citedLines, citedSubproofs);
  return failure ? { status: 'error', message: failure } : { status: 'ok' };
}

/** Reduces a subproof to the assumption/conclusion pair discharging rules need. */
function shapeOf(subproof: Subproof): SubproofShape | null {
  const assumption = assumptionOf(subproof);
  const conclusion = lastLineOf(subproof);
  if (!assumption?.formula || !conclusion?.formula) return null;
  return { assumption: assumption.formula, conclusion: conclusion.formula };
}

function citationCountMessage(
  label: string,
  lineCount: number,
  subproofCount: number,
  got: number,
): string {
  const parts: string[] = [];
  if (lineCount > 0) parts.push(`${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`);
  if (subproofCount > 0) parts.push(`${subproofCount} ${subproofCount === 1 ? 'subproof' : 'subproofs'}`);
  return `${label} cites ${parts.join(' and ')} — you have picked ${got}.`;
}

function outOfScopeMessage(view: Layout, ref: string, kind: 'line' | 'subproof'): string {
  const line = view.lineById.get(ref);
  if (line && kind === 'subproof') {
    return `Line ${line.number} is a line, but a subproof is needed here.`;
  }
  const subproof = view.subproofById.get(ref);
  if (subproof && kind === 'line') {
    return `Lines ${subproof.first}–${subproof.last} are a subproof, but a single line is needed here.`;
  }
  if (line) {
    return `Line ${line.number} sits inside a closed subproof, so it cannot be cited from here.`;
  }
  if (subproof) {
    return `The subproof on lines ${subproof.first}–${subproof.last} cannot be cited from here.`;
  }
  return 'That citation no longer exists.';
}

function numberOf(view: Layout, id: string): string {
  return view.lineById.get(id) ? String(view.lineById.get(id)!.number) : '?';
}

function rangeOf(view: Layout, id: string): string {
  const entry = view.subproofById.get(id);
  return entry ? `${entry.first}–${entry.last}` : '?';
}

/** Human-readable citation for the justification column, e.g. `1, 3–5`. */
export function formatCitations(view: Layout, refs: string[]): string {
  return refs
    .map((ref) => {
      const line = view.lineById.get(ref);
      if (line) return String(line.number);
      const subproof = view.subproofById.get(ref);
      if (subproof) return `${subproof.first}–${subproof.last}`;
      return '?';
    })
    .join(', ');
}

/** `P, Q ⊢ R`, for level cards and the proof header. */
export function sequent(premises: Formula[], goal: Formula): string {
  const left = premises.map(format).join(', ');
  return left ? `${left} ⊢ ${format(goal)}` : `⊢ ${format(goal)}`;
}
