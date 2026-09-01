/**
 * Fitch-style proof structure.
 *
 * A proof is an ordered list of items; an item is either a line or a subproof,
 * and a subproof is itself a list of items whose first entry is its assumption.
 * Nesting the structure this way means scope is positional — a line can only
 * cite what sits above it at its own level or an enclosing one — so the checker
 * never has to track discharge bookkeeping separately.
 */

import { Formula } from './formula';
import { RuleId } from './rules';

export interface Line {
  type: 'line';
  id: string;
  /** `null` while the player is still composing the formula. */
  formula: Formula | null;
  rule: RuleId;
  /** Ids of the lines and subproofs cited, in the order the rule expects. */
  refs: string[];
  /** Premises are supplied by the level and cannot be edited or deleted. */
  locked?: boolean;
}

export interface Subproof {
  type: 'subproof';
  id: string;
  /** `items[0]` is always the assumption line. */
  items: ProofItem[];
}

export type ProofItem = Line | Subproof;

export interface Proof {
  items: ProofItem[];
}

/** A line paired with everything the renderer needs to draw it. */
export interface NumberedLine {
  line: Line;
  /** 1-based number shown in the gutter. */
  number: number;
  /** How many subproofs enclose this line; 0 at the top level. */
  depth: number;
  /** Id of the innermost enclosing subproof, if any. */
  parentId: string | null;
}

/** A subproof paired with the line range it spans, e.g. `2-5`. */
export interface NumberedSubproof {
  subproof: Subproof;
  first: number;
  last: number;
  depth: number;
}

export interface Layout {
  lines: NumberedLine[];
  subproofs: NumberedSubproof[];
  lineById: Map<string, NumberedLine>;
  subproofById: Map<string, NumberedSubproof>;
}

let counter = 0;

/** Ids only need to be unique within one proof; a session counter suffices. */
export function nextId(prefix = 'i'): string {
  counter += 1;
  return `${prefix}${counter}`;
}

export function makeLine(formula: Formula | null, rule: RuleId, refs: string[] = [], locked = false): Line {
  return { type: 'line', id: nextId('l'), formula, rule, refs, locked };
}

export function makeSubproof(assumption: Formula | null): Subproof {
  return { type: 'subproof', id: nextId('s'), items: [makeLine(assumption, 'assumption')] };
}

/**
 * Walks the proof once, assigning display numbers and recording depth.
 * Everything the UI and the checker need about position comes from here.
 */
export function layout(proof: Proof): Layout {
  const lines: NumberedLine[] = [];
  const subproofs: NumberedSubproof[] = [];
  let number = 0;

  const walk = (items: ProofItem[], depth: number, parentId: string | null): void => {
    for (const item of items) {
      if (item.type === 'line') {
        number += 1;
        lines.push({ line: item, number, depth, parentId });
      } else {
        const first = number + 1;
        walk(item.items, depth + 1, item.id);
        subproofs.push({ subproof: item, first, last: number, depth });
      }
    }
  };

  walk(proof.items, 0, null);

  return {
    lines,
    subproofs,
    lineById: new Map(lines.map((entry) => [entry.line.id, entry])),
    subproofById: new Map(subproofs.map((entry) => [entry.subproof.id, entry])),
  };
}

/**
 * What a given item is allowed to cite.
 *
 * Reading upward from the target: every line at the target's own level that
 * precedes it, plus everything preceding at each enclosing level. Lines *inside*
 * an earlier sibling subproof are deliberately absent — that subproof's
 * assumption has been discharged, so only the subproof as a whole is citable.
 */
export interface Scope {
  lines: Line[];
  subproofs: Subproof[];
}

export function scopeFor(proof: Proof, targetId: string): Scope | null {
  const scope: Scope = { lines: [], subproofs: [] };

  const descend = (items: ProofItem[]): boolean => {
    for (const item of items) {
      if (item.id === targetId) return true;

      if (item.type === 'subproof' && contains(item, targetId)) {
        // Step inside: everything gathered so far stays visible.
        return descend(item.items);
      }

      if (item.type === 'line') scope.lines.push(item);
      else scope.subproofs.push(item);
    }
    return false;
  };

  return descend(proof.items) ? scope : null;
}

function contains(item: ProofItem, id: string): boolean {
  if (item.id === id) return true;
  if (item.type === 'line') return false;
  return item.items.some((child) => contains(child, id));
}

/** Finds an item anywhere in the tree. */
export function findItem(items: ProofItem[], id: string): ProofItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.type === 'subproof') {
      const found = findItem(item.items, id);
      if (found) return found;
    }
  }
  return null;
}

/** The container holding `id`, plus its index within it. */
export function locate(
  proof: Proof,
  id: string,
): { siblings: ProofItem[]; index: number; parent: Subproof | null } | null {
  const search = (
    items: ProofItem[],
    parent: Subproof | null,
  ): { siblings: ProofItem[]; index: number; parent: Subproof | null } | null => {
    const index = items.findIndex((item) => item.id === id);
    if (index >= 0) return { siblings: items, index, parent };
    for (const item of items) {
      if (item.type === 'subproof') {
        const found = search(item.items, item);
        if (found) return found;
      }
    }
    return null;
  };
  return search(proof.items, null);
}

/**
 * A subproof's conclusion: its last line *at its own level*. Lines buried in a
 * nested subproof are discharged along with it, so they can never serve as the
 * conclusion of the enclosing block.
 */
export function lastLineOf(subproof: Subproof): Line | null {
  for (let i = subproof.items.length - 1; i >= 0; i -= 1) {
    const item = subproof.items[i];
    if (item.type === 'line') return item;
  }
  return null;
}

/** The assumption a subproof opens with. */
export function assumptionOf(subproof: Subproof): Line | null {
  const first = subproof.items[0];
  return first && first.type === 'line' ? first : null;
}

/** Deep clone, so reducers can mutate a copy without touching rendered state. */
export function cloneProof(proof: Proof): Proof {
  const cloneItem = (item: ProofItem): ProofItem =>
    item.type === 'line'
      ? { ...item, refs: [...item.refs] }
      : { ...item, items: item.items.map(cloneItem) };
  return { items: proof.items.map(cloneItem) };
}
