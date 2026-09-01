import { format } from '../formula';
import { mustParse, parse } from '../parser';

/** Parsing then formatting should be a fixed point for well-bracketed input. */
const roundTrips = [
  'P',
  '⊥',
  '¬P',
  '¬¬P',
  'P ∧ Q',
  'P ∨ Q',
  'P → Q',
  'P ↔ Q',
  'P ∧ Q ∧ R',
  'P ∨ Q ∨ R',
  'P → Q → R',
  '(P → Q) → R',
  '¬(P ∧ Q)',
  '¬P ∧ ¬Q',
  'P ∧ Q → R',
  'P → Q ∧ R',
  '(P ∨ Q) ∧ R',
  'P ∨ Q ∧ R',
  '((P → Q) → P) → P',
  'P ∧ Q ↔ Q ∧ P',
];

describe('parser', () => {
  it.each(roundTrips)('round-trips %s', (source) => {
    expect(format(mustParse(source))).toBe(source);
  });

  it('accepts ASCII spellings of every connective', () => {
    expect(format(mustParse('~(P /\\ Q) -> (R \\/ S) <-> T'))).toBe('¬(P ∧ Q) → R ∨ S ↔ T');
    expect(format(mustParse('!P & Q | R => S'))).toBe('¬P ∧ Q ∨ R → S');
    expect(format(mustParse('_|_'))).toBe('⊥');
  });

  it('treats ∧ and ∨ as left associative', () => {
    expect(format(mustParse('P ∧ (Q ∧ R)'))).toBe('P ∧ (Q ∧ R)');
    expect(format(mustParse('(P ∧ Q) ∧ R'))).toBe('P ∧ Q ∧ R');
  });

  it('treats → and ↔ as right associative', () => {
    expect(format(mustParse('P → (Q → R)'))).toBe('P → Q → R');
    expect(format(mustParse('(P → Q) → R'))).toBe('(P → Q) → R');
  });

  it('binds ¬ tighter than every binary connective', () => {
    expect(format(mustParse('¬P ∧ Q'))).toBe('¬P ∧ Q');
    expect(format(mustParse('¬(P ∧ Q)'))).toBe('¬(P ∧ Q)');
  });

  it('reads multi-character atoms', () => {
    expect(format(mustParse("P1 ∧ Q'"))).toBe("P1 ∧ Q'");
  });

  it.each([
    ['', 'Write a formula first'],
    ['P ∧', 'The formula ends too early'],
    ['(P ∧ Q', 'Missing a closing “)”'],
    ['P ∧ Q)', 'Unmatched “)”'],
    ['P Q', 'Unexpected “Q”'],
    ['∧ P', 'Expected a formula'],
    ['P $ Q', 'Unexpected character'],
  ])('rejects %p', (source, fragment) => {
    const result = parse(source);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(fragment);
  });
});
