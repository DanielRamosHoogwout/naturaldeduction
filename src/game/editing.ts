/**
 * Structural edits to a proof.
 *
 * Kept pure and separate from the screen so the fiddly parts — where a new line
 * lands relative to the current subproof, and what happens to citations when
 * their target is deleted — can be tested directly.
 *
 * Position is modelled with a single `insertAfter` id, which may name a line or
 * a whole subproof. That one field expresses both "add another step here" and
 * "close this subproof and carry on outside it".
 */

import { Formula } from '../logic/formula';
import {
  Layout,
  Line,
  Proof,
  ProofItem,
  Subproof,
  cloneProof,
  findItem,
  locate,
  makeLine,
  makeSubproof,
} from '../logic/proof';
import { RULES, RuleId } from '../logic/rules';

export interface EditResult {
  proof: Proof;
  /** The line the UI should select next. */
  focusId: string;
}

/** Inserts `item` directly after `insertAfter`, or at the end of the proof. */
function insert(proof: Proof, insertAfter: string | null, item: ProofItem): Proof {
  const next = cloneProof(proof);
  if (insertAfter === null) {
    next.items.push(item);
    return next;
  }
  const position = locate(next, insertAfter);
  if (!position) {
    next.items.push(item);
    return next;
  }
  position.siblings.splice(position.index + 1, 0, item);
  return next;
}

export function addLine(proof: Proof, insertAfter: string | null, rule: RuleId = 'andI'): EditResult {
  const line = makeLine(null, rule);
  return { proof: insert(proof, insertAfter, line), focusId: line.id };
}

export function addSubproof(proof: Proof, insertAfter: string | null): EditResult {
  const subproof = makeSubproof(null);
  const assumption = subproof.items[0];
  return { proof: insert(proof, insertAfter, subproof), focusId: assumption.id };
}

export function setFormula(proof: Proof, id: string, formula: Formula | null): Proof {
  const next = cloneProof(proof);
  const item = findItem(next.items, id);
  if (item?.type === 'line' && !item.locked) item.formula = formula;
  return next;
}

/** Changing the rule always drops the old citations — they rarely still fit. */
export function setRule(proof: Proof, id: string, rule: RuleId): Proof {
  const next = cloneProof(proof);
  const item = findItem(next.items, id);
  if (item?.type === 'line' && !item.locked) {
    item.rule = rule;
    item.refs = [];
  }
  return next;
}

/**
 * Adds or removes a citation.
 *
 * Citations are stored as lines first, then subproofs, because that is the
 * order the rule's `check` expects them in. When a slot group is already full
 * the oldest entry drops out, so tapping a third line replaces the first rather
 * than doing nothing — a dead-end is worse than a wrong guess here.
 */
export function toggleRef(proof: Proof, view: Layout, id: string, refId: string): Proof {
  const next = cloneProof(proof);
  const item = findItem(next.items, id);
  if (item?.type !== 'line') return next;

  const spec = RULES[item.rule];
  const isLineRef = view.lineById.has(refId);
  const cap = isLineRef ? spec.lineCount : spec.subproofCount;
  if (cap === 0) return next;

  const lineRefs = item.refs.filter((ref) => view.lineById.has(ref));
  const subproofRefs = item.refs.filter((ref) => view.subproofById.has(ref));
  const group = isLineRef ? lineRefs : subproofRefs;

  const existing = group.indexOf(refId);
  if (existing >= 0) group.splice(existing, 1);
  else {
    group.push(refId);
    while (group.length > cap) group.shift();
  }

  item.refs = [...lineRefs, ...subproofRefs];
  return next;
}

/**
 * Removes a line or subproof, along with every citation that pointed at it —
 * leaving dangling references would show the player errors they cannot see the
 * cause of.
 */
export function remove(proof: Proof, id: string): Proof {
  const target = findItem(proof.items, id);
  if (!target) return proof;
  if (target.type === 'line' && target.locked) return proof;

  const next = cloneProof(proof);
  const position = locate(next, id);
  if (!position) return next;

  // An assumption is not deletable on its own; drop the subproof it opens.
  if (target.type === 'line' && target.rule === 'assumption') {
    return position.parent ? remove(proof, position.parent.id) : next;
  }

  position.siblings.splice(position.index, 1);
  const orphaned = idsWithin(target);
  stripRefs(next.items, orphaned);
  return next;
}

function idsWithin(item: ProofItem): Set<string> {
  const ids = new Set<string>([item.id]);
  if (item.type === 'subproof') {
    for (const child of item.items) idsWithin(child).forEach((id) => ids.add(id));
  }
  return ids;
}

function stripRefs(items: ProofItem[], removed: Set<string>): void {
  for (const item of items) {
    if (item.type === 'line') item.refs = item.refs.filter((ref) => !removed.has(ref));
    else stripRefs(item.items, removed);
  }
}

/**
 * Where the insertion point should go after selecting `id`: normally just after
 * it, but selecting a subproof means "continue after the whole block".
 */
export function insertionAfterSelecting(id: string): string {
  return id;
}

/** The subproof enclosing `id`, if any — used to offer "end this subproof". */
export function enclosingSubproof(proof: Proof, id: string): Subproof | null {
  return locate(proof, id)?.parent ?? null;
}

/** A fresh proof holding just the level's premises. */
export function initialProof(premises: Formula[]): Proof {
  return { items: premises.map((premise) => makeLine(premise, 'premise', [], true)) };
}

/** Total number of lines, used for the "shortest proof" record. */
export function countLines(proof: Proof): number {
  const count = (items: ProofItem[]): number =>
    items.reduce((total, item) => total + (item.type === 'line' ? 1 : count(item.items)), 0);
  return count(proof.items);
}

export type { Line };
