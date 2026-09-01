/**
 * Turns a level's reference solution into a real `Proof`.
 *
 * Used by the test suite to prove every level is solvable with the rules it
 * offers, and by the in-game solution viewer.
 */

import { mustParse } from '../logic/parser';
import { Line, Proof, ProofItem, Subproof, makeLine, nextId } from '../logic/proof';
import { SolutionStep } from './types';

export function buildSolution(premises: readonly string[], steps: readonly SolutionStep[]): Proof {
  const lineIdByNumber = new Map<number, string>();
  const subproofIdByRange = new Map<string, string>();
  let lineNumber = 0;

  const resolve = (ref: number | string): string => {
    if (typeof ref === 'number') {
      const id = lineIdByNumber.get(ref);
      if (!id) throw new Error(`Solution cites line ${ref}, which does not exist yet.`);
      return id;
    }
    const id = subproofIdByRange.get(ref);
    if (!id) throw new Error(`Solution cites subproof ${ref}, which does not exist yet.`);
    return id;
  };

  const addLine = (formula: string, rule: Line['rule'], refs: ReadonlyArray<number | string>, locked = false): Line => {
    const line = makeLine(mustParse(formula), rule, [], locked);
    lineNumber += 1;
    lineIdByNumber.set(lineNumber, line.id);
    // Resolved after registering, so a rule may never cite its own line.
    line.refs = refs.map(resolve);
    return line;
  };

  const build = (input: readonly SolutionStep[]): ProofItem[] =>
    input.map((step) => {
      if (Array.isArray(step)) {
        const [formula, rule, ...refs] = step as readonly [string, Line['rule'], ...Array<number | string>];
        return addLine(formula, rule, refs);
      }

      const block = step as { assume: string; steps: readonly SolutionStep[] };
      const first = lineNumber + 1;
      const subproof: Subproof = { type: 'subproof', id: nextId('s'), items: [] };
      subproof.items.push(addLine(block.assume, 'assumption', []));
      subproof.items.push(...build(block.steps));
      subproofIdByRange.set(`${first}-${lineNumber}`, subproof.id);
      return subproof;
    });

  const premiseLines = premises.map((premise) => addLine(premise, 'premise', [], true));
  return { items: [...premiseLines, ...build(steps)] };
}
