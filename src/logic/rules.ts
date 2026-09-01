/**
 * The inference rules of natural deduction.
 *
 * Each rule declares how many lines and subproofs it cites, and a `check` that
 * either accepts the conclusion or explains, in words a learner can act on, why
 * the step does not go through. Those messages are the teaching surface of the
 * whole app, so they name the formula that *would* have worked wherever it can.
 */

import { Formula, SYMBOL, and, bottom, equals, format, iff, implies, not, or } from './formula';

export type RuleId =
  | 'premise'
  | 'assumption'
  | 'reit'
  | 'andI'
  | 'andE'
  | 'orI'
  | 'orE'
  | 'impI'
  | 'impE'
  | 'notI'
  | 'notE'
  | 'botE'
  | 'iffI'
  | 'iffE'
  | 'raa'
  | 'dne'
  | 'lem';

/** A cited subproof, reduced to the two formulas any discharging rule needs. */
export interface SubproofShape {
  assumption: Formula;
  conclusion: Formula;
}

export interface RuleSpec {
  id: RuleId;
  /** Short form shown in the justification column, e.g. `∧I`. */
  label: string;
  name: string;
  /** One-line explanation shown in the rule picker. */
  summary: string;
  /** Schematic form, shown as a reminder while choosing citations. */
  shape: string;
  lineCount: number;
  subproofCount: number;
  /**
   * Returns `null` when the step is valid, otherwise the reason it is not.
   * Called only once the citation counts already match.
   */
  check(conclusion: Formula, lines: Formula[], subproofs: SubproofShape[]): string | null;
}

const q = (f: Formula) => `“${format(f)}”`;

export const RULES: Record<RuleId, RuleSpec> = {
  premise: {
    id: 'premise',
    label: 'Premise',
    name: 'Premise',
    summary: 'Given to you by the level.',
    shape: '',
    lineCount: 0,
    subproofCount: 0,
    check: () => null,
  },

  assumption: {
    id: 'assumption',
    label: 'Assumption',
    name: 'Assumption',
    summary: 'Opens a subproof. It must be discharged before the proof ends.',
    shape: '',
    lineCount: 0,
    subproofCount: 0,
    check: () => null,
  },

  reit: {
    id: 'reit',
    label: 'Reit',
    name: 'Reiteration',
    summary: 'Repeat a line you already have, so it sits where you need it.',
    shape: 'A ⊢ A',
    lineCount: 1,
    subproofCount: 0,
    check: (conclusion, [a]) =>
      equals(conclusion, a) ? null : `Reiteration copies a line unchanged, so this should be ${q(a)}.`,
  },

  andI: {
    id: 'andI',
    label: `${SYMBOL.and}I`,
    name: 'Conjunction Introduction',
    summary: 'From both halves separately, conclude the conjunction.',
    shape: 'A, B ⊢ A ∧ B',
    lineCount: 2,
    subproofCount: 0,
    check: (conclusion, [a, b]) => {
      if (conclusion.kind !== 'and') {
        return `${SYMBOL.and}I concludes a conjunction, so this line should be ${q(and(a, b))}.`;
      }
      if (equals(conclusion.left, a) && equals(conclusion.right, b)) return null;
      if (equals(conclusion.left, b) && equals(conclusion.right, a)) return null;
      return `The two halves must be exactly the lines you cited: ${q(and(a, b))}.`;
    },
  },

  andE: {
    id: 'andE',
    label: `${SYMBOL.and}E`,
    name: 'Conjunction Elimination',
    summary: 'From a conjunction, take either half on its own.',
    shape: 'A ∧ B ⊢ A   (or B)',
    lineCount: 1,
    subproofCount: 0,
    check: (conclusion, [a]) => {
      if (a.kind !== 'and') {
        return `${SYMBOL.and}E needs a conjunction to work on, but you cited ${q(a)}.`;
      }
      if (equals(conclusion, a.left) || equals(conclusion, a.right)) return null;
      return `From ${q(a)} you can take ${q(a.left)} or ${q(a.right)}, not ${q(conclusion)}.`;
    },
  },

  orI: {
    id: 'orI',
    label: `${SYMBOL.or}I`,
    name: 'Disjunction Introduction',
    summary: 'From one disjunct, conclude a disjunction with anything you like.',
    shape: 'A ⊢ A ∨ B',
    lineCount: 1,
    subproofCount: 0,
    check: (conclusion, [a]) => {
      if (conclusion.kind !== 'or') {
        return `${SYMBOL.or}I concludes a disjunction — try something like ${q(or(a, a))}.`;
      }
      if (equals(conclusion.left, a) || equals(conclusion.right, a)) return null;
      return `One side of the disjunction has to be the line you cited, ${q(a)}.`;
    },
  },

  orE: {
    id: 'orE',
    label: `${SYMBOL.or}E`,
    name: 'Disjunction Elimination',
    summary: 'Prove the same thing from each disjunct, and it follows outright.',
    shape: 'A ∨ B, [A ⊢ C], [B ⊢ C] ⊢ C',
    lineCount: 1,
    subproofCount: 2,
    check: (conclusion, [disjunction], [first, second]) => {
      if (disjunction.kind !== 'or') {
        return `${SYMBOL.or}E needs a disjunction to work on, but you cited ${q(disjunction)}.`;
      }
      const { left, right } = disjunction;
      const matchesInOrder = equals(first.assumption, left) && equals(second.assumption, right);
      const matchesSwapped = equals(first.assumption, right) && equals(second.assumption, left);
      if (!matchesInOrder && !matchesSwapped) {
        return `The two subproofs must assume ${q(left)} and ${q(right)} — the two sides of ${q(disjunction)}.`;
      }
      if (!equals(first.conclusion, conclusion) || !equals(second.conclusion, conclusion)) {
        return `Both subproofs have to end on this same line. They currently end on ${q(first.conclusion)} and ${q(second.conclusion)}.`;
      }
      return null;
    },
  },

  impI: {
    id: 'impI',
    label: `${SYMBOL.implies}I`,
    name: 'Conditional Introduction',
    summary: 'Assume the antecedent, reach the consequent, discharge the assumption.',
    shape: '[A ⊢ B] ⊢ A → B',
    lineCount: 0,
    subproofCount: 1,
    check: (conclusion, _lines, [sub]) => {
      const expected = implies(sub.assumption, sub.conclusion);
      return equals(conclusion, expected)
        ? null
        : `That subproof assumes ${q(sub.assumption)} and reaches ${q(sub.conclusion)}, so it discharges to ${q(expected)}.`;
    },
  },

  impE: {
    id: 'impE',
    label: `${SYMBOL.implies}E`,
    name: 'Conditional Elimination',
    summary: 'Modus ponens: a conditional plus its antecedent gives the consequent.',
    shape: 'A → B, A ⊢ B',
    lineCount: 2,
    subproofCount: 0,
    check: (conclusion, [a, b]) => {
      // Citation order is not significant; try the conditional in either slot.
      for (const [conditional, antecedent] of [
        [a, b],
        [b, a],
      ] as const) {
        if (conditional.kind !== 'implies') continue;
        if (!equals(conditional.left, antecedent)) continue;
        return equals(conclusion, conditional.right)
          ? null
          : `${q(conditional)} together with ${q(antecedent)} gives ${q(conditional.right)}.`;
      }
      return `${SYMBOL.implies}E needs a conditional and, separately, its antecedent. You cited ${q(a)} and ${q(b)}.`;
    },
  },

  notI: {
    id: 'notI',
    label: `${SYMBOL.not}I`,
    name: 'Negation Introduction',
    summary: 'Assume it, derive a contradiction, and conclude its negation.',
    shape: '[A ⊢ ⊥] ⊢ ¬A',
    lineCount: 0,
    subproofCount: 1,
    check: (conclusion, _lines, [sub]) => {
      if (sub.conclusion.kind !== 'bottom') {
        return `${SYMBOL.not}I needs the subproof to end on ${SYMBOL.bottom}, but it ends on ${q(sub.conclusion)}.`;
      }
      const expected = not(sub.assumption);
      return equals(conclusion, expected)
        ? null
        : `The subproof assumes ${q(sub.assumption)}, so discharging it gives ${q(expected)}.`;
    },
  },

  notE: {
    id: 'notE',
    label: `${SYMBOL.not}E`,
    name: 'Negation Elimination',
    summary: 'A formula and its negation together give absurdity.',
    shape: 'A, ¬A ⊢ ⊥',
    lineCount: 2,
    subproofCount: 0,
    check: (conclusion, [a, b]) => {
      const contradictory =
        (b.kind === 'not' && equals(b.sub, a)) || (a.kind === 'not' && equals(a.sub, b));
      if (!contradictory) {
        return `${q(a)} and ${q(b)} are not a formula and its negation.`;
      }
      return conclusion.kind === 'bottom'
        ? null
        : `A contradiction gives ${SYMBOL.bottom}, so this line should be ${SYMBOL.bottom}.`;
    },
  },

  botE: {
    id: 'botE',
    label: `${SYMBOL.bottom}E`,
    name: 'Absurdity Elimination',
    summary: 'From a contradiction, anything at all follows.',
    shape: '⊥ ⊢ A',
    lineCount: 1,
    subproofCount: 0,
    check: (_conclusion, [a]) =>
      a.kind === 'bottom'
        ? null
        : `${SYMBOL.bottom}E needs a line that is exactly ${SYMBOL.bottom}, but you cited ${q(a)}.`,
  },

  iffI: {
    id: 'iffI',
    label: `${SYMBOL.iff}I`,
    name: 'Biconditional Introduction',
    summary: 'Prove each direction in its own subproof.',
    shape: '[A ⊢ B], [B ⊢ A] ⊢ A ↔ B',
    lineCount: 0,
    subproofCount: 2,
    check: (conclusion, _lines, [first, second]) => {
      if (conclusion.kind !== 'iff') {
        return `${SYMBOL.iff}I concludes a biconditional, so this line should be ${q(
          iff(first.assumption, first.conclusion),
        )}.`;
      }
      const { left, right } = conclusion;
      const forwards =
        equals(first.assumption, left) &&
        equals(first.conclusion, right) &&
        equals(second.assumption, right) &&
        equals(second.conclusion, left);
      const backwards =
        equals(first.assumption, right) &&
        equals(first.conclusion, left) &&
        equals(second.assumption, left) &&
        equals(second.conclusion, right);
      return forwards || backwards
        ? null
        : `The subproofs must run ${format(left)} ${SYMBOL.turnstile} ${format(right)} and ${format(right)} ${SYMBOL.turnstile} ${format(left)}, one in each direction.`;
    },
  },

  iffE: {
    id: 'iffE',
    label: `${SYMBOL.iff}E`,
    name: 'Biconditional Elimination',
    summary: 'A biconditional plus either side gives the other side.',
    shape: 'A ↔ B, A ⊢ B',
    lineCount: 2,
    subproofCount: 0,
    check: (conclusion, [a, b]) => {
      for (const [biconditional, given] of [
        [a, b],
        [b, a],
      ] as const) {
        if (biconditional.kind !== 'iff') continue;
        if (equals(biconditional.left, given)) {
          return equals(conclusion, biconditional.right)
            ? null
            : `${q(biconditional)} with ${q(given)} gives ${q(biconditional.right)}.`;
        }
        if (equals(biconditional.right, given)) {
          return equals(conclusion, biconditional.left)
            ? null
            : `${q(biconditional)} with ${q(given)} gives ${q(biconditional.left)}.`;
        }
      }
      return `${SYMBOL.iff}E needs a biconditional and one of its two sides. You cited ${q(a)} and ${q(b)}.`;
    },
  },

  raa: {
    id: 'raa',
    label: 'RAA',
    name: 'Reductio ad Absurdum',
    summary: 'Assume the opposite, hit a contradiction, and conclude what you wanted.',
    shape: '[¬A ⊢ ⊥] ⊢ A',
    lineCount: 0,
    subproofCount: 1,
    check: (conclusion, _lines, [sub]) => {
      if (sub.conclusion.kind !== 'bottom') {
        return `RAA needs the subproof to end on ${SYMBOL.bottom}, but it ends on ${q(sub.conclusion)}.`;
      }
      if (sub.assumption.kind !== 'not') {
        return `RAA needs the subproof to assume a negation — assume ${q(not(conclusion))} to prove ${q(conclusion)}.`;
      }
      return equals(sub.assumption.sub, conclusion)
        ? null
        : `That subproof assumes ${q(sub.assumption)}, so refuting it gives ${q(sub.assumption.sub)}.`;
    },
  },

  dne: {
    id: 'dne',
    label: `${SYMBOL.not}${SYMBOL.not}E`,
    name: 'Double Negation Elimination',
    summary: 'Two negations cancel out.',
    shape: '¬¬A ⊢ A',
    lineCount: 1,
    subproofCount: 0,
    check: (conclusion, [a]) => {
      if (a.kind !== 'not' || a.sub.kind !== 'not') {
        return `${SYMBOL.not}${SYMBOL.not}E needs a doubly negated line, but you cited ${q(a)}.`;
      }
      return equals(conclusion, a.sub.sub)
        ? null
        : `Cancelling both negations in ${q(a)} gives ${q(a.sub.sub)}.`;
    },
  },

  lem: {
    id: 'lem',
    label: 'LEM',
    name: 'Law of Excluded Middle',
    summary: 'For any A, you may write down A ∨ ¬A out of nowhere.',
    shape: '⊢ A ∨ ¬A',
    lineCount: 0,
    subproofCount: 0,
    check: (conclusion) => {
      if (conclusion.kind !== 'or') {
        return 'LEM writes down a disjunction of the form A ∨ ¬A.';
      }
      const { left, right } = conclusion;
      const ok =
        (right.kind === 'not' && equals(right.sub, left)) ||
        (left.kind === 'not' && equals(left.sub, right));
      return ok ? null : `The two sides must be a formula and its negation, as in ${q(or(left, not(left)))}.`;
    },
  },
};

/** Rules a player can pick from the rule sheet, in teaching order. */
export const SELECTABLE_RULES: RuleId[] = [
  'andI',
  'andE',
  'impI',
  'impE',
  'orI',
  'orE',
  'notI',
  'notE',
  'botE',
  'iffI',
  'iffE',
  'raa',
  'dne',
  'lem',
  'reit',
];

export function ruleLabel(id: RuleId): string {
  return RULES[id].label;
}

/** `⊥` is only ever produced by ¬E, so surface it as a keypad hint. */
export const CONTRADICTION = bottom();
