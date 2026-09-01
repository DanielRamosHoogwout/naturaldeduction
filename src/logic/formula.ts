/**
 * Propositional formulas.
 *
 * The whole game rests on this AST: it is pure data, structurally comparable,
 * and deliberately free of any React or React Native import so the engine can
 * be unit tested (and later reused on the web) without a renderer.
 */

export type Formula =
  | { kind: 'atom'; name: string }
  | { kind: 'bottom' }
  | { kind: 'not'; sub: Formula }
  | { kind: 'and'; left: Formula; right: Formula }
  | { kind: 'or'; left: Formula; right: Formula }
  | { kind: 'implies'; left: Formula; right: Formula }
  | { kind: 'iff'; left: Formula; right: Formula };

export type BinaryKind = 'and' | 'or' | 'implies' | 'iff';

export const atom = (name: string): Formula => ({ kind: 'atom', name });
export const bottom = (): Formula => ({ kind: 'bottom' });
export const not = (sub: Formula): Formula => ({ kind: 'not', sub });
export const and = (left: Formula, right: Formula): Formula => ({ kind: 'and', left, right });
export const or = (left: Formula, right: Formula): Formula => ({ kind: 'or', left, right });
export const implies = (left: Formula, right: Formula): Formula => ({ kind: 'implies', left, right });
export const iff = (left: Formula, right: Formula): Formula => ({ kind: 'iff', left, right });

/** The canonical glyph for each connective, as displayed everywhere in the UI. */
export const SYMBOL = {
  not: '¬',
  and: '∧',
  or: '∨',
  implies: '→',
  iff: '↔',
  bottom: '⊥',
  turnstile: '⊢',
} as const;

/** Structural equality. Formulas are trees of plain data, so this is a deep compare. */
export function equals(a: Formula, b: Formula): boolean {
  if (a.kind !== b.kind) return false;
  switch (a.kind) {
    case 'atom':
      return a.name === (b as typeof a).name;
    case 'bottom':
      return true;
    case 'not':
      return equals(a.sub, (b as typeof a).sub);
    default: {
      const other = b as typeof a;
      return equals(a.left, other.left) && equals(a.right, other.right);
    }
  }
}

/**
 * Binding strength, used only to decide which parentheses can be dropped when
 * displaying a formula. Higher binds tighter: ¬ > ∧ > ∨ > → > ↔.
 */
function precedence(f: Formula): number {
  switch (f.kind) {
    case 'atom':
    case 'bottom':
      return 5;
    case 'not':
      return 4;
    case 'and':
      return 3;
    case 'or':
      return 2;
    case 'implies':
      return 1;
    case 'iff':
      return 0;
  }
}

const RIGHT_ASSOCIATIVE: Record<BinaryKind, boolean> = {
  and: false,
  or: false,
  implies: true,
  iff: true,
};

/** Renders a formula with the minimum number of parentheses. */
export function format(f: Formula): string {
  switch (f.kind) {
    case 'atom':
      return f.name;
    case 'bottom':
      return SYMBOL.bottom;
    case 'not':
      return SYMBOL.not + wrap(f.sub, precedence(f), false);
    default: {
      const p = precedence(f);
      const rightAssoc = RIGHT_ASSOCIATIVE[f.kind];
      const left = wrap(f.left, p, rightAssoc);
      const right = wrap(f.right, p, !rightAssoc);
      return `${left} ${SYMBOL[f.kind]} ${right}`;
    }
  }
}

/**
 * Parenthesises a child if it binds more loosely than its parent. `tie` says
 * whether an equal-precedence child also needs brackets, which is how
 * associativity is respected: `P → (Q → R)` prints bare, `(P → Q) → R` does not.
 */
function wrap(child: Formula, parentPrecedence: number, tie: boolean): string {
  const p = precedence(child);
  const needsParens = p < parentPrecedence || (p === parentPrecedence && tie);
  return needsParens ? `(${format(child)})` : format(child);
}

/** Every atom appearing in a formula, in first-occurrence order. */
export function atoms(f: Formula, seen: string[] = []): string[] {
  switch (f.kind) {
    case 'atom':
      if (!seen.includes(f.name)) seen.push(f.name);
      return seen;
    case 'bottom':
      return seen;
    case 'not':
      return atoms(f.sub, seen);
    default:
      atoms(f.left, seen);
      return atoms(f.right, seen);
  }
}
