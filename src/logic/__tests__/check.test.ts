import { checkProof } from '../check';
import { mustParse } from '../parser';
import { Proof, ProofItem, Subproof, makeLine, nextId } from '../proof';
import { RuleId } from '../rules';

/** Terse proof builders so each test reads like the Fitch diagram it encodes. */
const line = (formula: string | null, rule: RuleId, refs: string[] = []) =>
  makeLine(formula === null ? null : mustParse(formula), rule, refs);

const premise = (formula: string) => makeLine(mustParse(formula), 'premise', [], true);

const subproof = (assumption: string, ...rest: ProofItem[]): Subproof => ({
  type: 'subproof',
  id: nextId('s'),
  items: [line(assumption, 'assumption'), ...rest],
});

const proofOf = (...items: ProofItem[]): Proof => ({ items });

const check = (proof: Proof, goal: string) => checkProof(proof, { goal: mustParse(goal) });

const errorOn = (proof: Proof, goal: string, id: string) => {
  const result = check(proof, goal);
  const entry = result.results.get(id);
  expect(entry?.status).toBe('error');
  return entry!.message!;
};

describe('conjunction rules', () => {
  it('accepts a complete ∧ proof and reports it solved', () => {
    const p1 = premise('P ∧ Q');
    const l2 = line('Q', 'andE', [p1.id]);
    const l3 = line('P', 'andE', [p1.id]);
    const l4 = line('Q ∧ P', 'andI', [l2.id, l3.id]);

    const result = check(proofOf(p1, l2, l3, l4), 'Q ∧ P');
    expect(result.solved).toBe(true);
    expect(result.goalLineId).toBe(l4.id);
  });

  it('rejects ∧E applied to something that is not a conjunction', () => {
    const p1 = premise('P ∨ Q');
    const l2 = line('P', 'andE', [p1.id]);
    expect(errorOn(proofOf(p1, l2), 'P', l2.id)).toContain('needs a conjunction');
  });

  it('rejects ∧I whose halves are not the cited lines', () => {
    const p1 = premise('P');
    const p2 = premise('Q');
    const l3 = line('P ∧ R', 'andI', [p1.id, p2.id]);
    expect(errorOn(proofOf(p1, p2, l3), 'P ∧ R', l3.id)).toContain('P ∧ Q');
  });

  it('accepts ∧I with the citations given in either order', () => {
    const p1 = premise('P');
    const p2 = premise('Q');
    const l3 = line('Q ∧ P', 'andI', [p1.id, p2.id]);
    expect(check(proofOf(p1, p2, l3), 'Q ∧ P').solved).toBe(true);
  });
});

describe('citations', () => {
  it('flags a line with too few citations as incomplete, not wrong', () => {
    const p1 = premise('P');
    const l2 = line('P ∧ P', 'andI', [p1.id]);
    const result = check(proofOf(p1, l2), 'P ∧ P');
    expect(result.results.get(l2.id)?.status).toBe('incomplete');
    expect(result.results.get(l2.id)?.message).toContain('2 lines');
  });

  it('flags a line with no formula as incomplete', () => {
    const l1 = line(null, 'reit', []);
    expect(check(proofOf(l1), 'P').results.get(l1.id)?.status).toBe('incomplete');
  });

  it('refuses a subproof where a line is expected', () => {
    const p1 = premise('P');
    const sub = subproof('Q', line('P', 'reit', [p1.id]));
    const l4 = line('P', 'reit', [sub.id]);
    expect(errorOn(proofOf(p1, sub, l4), 'P', l4.id)).toContain('are a subproof');
  });

  it('refuses a line where a subproof is expected', () => {
    const p1 = premise('P');
    const l2 = line('Q → P', 'impI', [p1.id]);
    expect(errorOn(proofOf(p1, l2), 'Q → P', l2.id)).toContain('is a line');
  });
});

describe('scope', () => {
  it('lets a subproof cite lines from the enclosing proof', () => {
    const p1 = premise('P');
    const sub = subproof('Q', line('P', 'reit', [p1.id]));
    const l4 = line('Q → P', 'impI', [sub.id]);
    expect(check(proofOf(p1, sub, l4), 'Q → P').solved).toBe(true);
  });

  it('refuses a citation reaching into a closed subproof', () => {
    const p1 = premise('P');
    const inner = line('P', 'reit', [p1.id]);
    const sub = subproof('Q', inner);
    const l4 = line('P', 'reit', [inner.id]);
    expect(errorOn(proofOf(p1, sub, l4), 'P', l4.id)).toContain('inside a closed subproof');
  });

  it('refuses a citation pointing forwards', () => {
    const l1 = line('P', 'reit', ['later']);
    const l2 = premise('P');
    l1.refs = [l2.id];
    expect(errorOn(proofOf(l1, l2), 'P', l1.id)).toContain('cannot be cited');
  });

  it('does not count a goal reached inside a subproof as a solution', () => {
    const p1 = premise('P');
    const sub = subproof('Q', line('P', 'reit', [p1.id]));
    const result = check(proofOf(p1, sub), 'P');
    // Line 1 is the premise P at depth 0, so this proof is trivially solved
    // there; the point is that the *subproof* copy is not what closes it.
    expect(result.goalLineId).toBe(p1.id);
  });

  it('rejects a goal only ever reached under an undischarged assumption', () => {
    const sub = subproof('P', line('P ∨ Q', 'orI', []));
    const inner = sub.items[1] as ReturnType<typeof line>;
    inner.refs = [sub.items[0].id];
    const result = check(proofOf(sub), 'P ∨ Q');
    expect(result.solved).toBe(false);
    expect(result.goalLineId).toBeNull();
  });
});

describe('conditional rules', () => {
  it('accepts →E with the conditional cited second', () => {
    const p1 = premise('P');
    const p2 = premise('P → Q');
    const l3 = line('Q', 'impE', [p1.id, p2.id]);
    expect(check(proofOf(p1, p2, l3), 'Q').solved).toBe(true);
  });

  it('rejects affirming the consequent', () => {
    const p1 = premise('P → Q');
    const p2 = premise('Q');
    const l3 = line('P', 'impE', [p1.id, p2.id]);
    expect(errorOn(proofOf(p1, p2, l3), 'P', l3.id)).toContain('needs a conditional');
  });

  it('names the conditional a subproof actually discharges to', () => {
    const sub = subproof('P', line('P', 'reit', []));
    (sub.items[1] as ReturnType<typeof line>).refs = [sub.items[0].id];
    const l3 = line('Q → P', 'impI', [sub.id]);
    expect(errorOn(proofOf(sub, l3), 'Q → P', l3.id)).toContain('P → P');
  });
});

describe('negation rules', () => {
  it('accepts ¬I discharging an assumption to ⊥', () => {
    const p1 = premise('P');
    const sub = subproof('¬P', line('⊥', 'notE', []));
    (sub.items[1] as ReturnType<typeof line>).refs = [p1.id, sub.items[0].id];
    const l4 = line('¬¬P', 'notI', [sub.id]);
    expect(check(proofOf(p1, sub, l4), '¬¬P').solved).toBe(true);
  });

  it('rejects ¬I when the subproof does not reach ⊥', () => {
    const sub = subproof('P', line('P', 'reit', []));
    (sub.items[1] as ReturnType<typeof line>).refs = [sub.items[0].id];
    const l3 = line('¬P', 'notI', [sub.id]);
    expect(errorOn(proofOf(sub, l3), '¬P', l3.id)).toContain('end on ⊥');
  });

  it('rejects ¬E on two lines that are not contradictory', () => {
    const p1 = premise('P');
    const p2 = premise('¬Q');
    const l3 = line('⊥', 'notE', [p1.id, p2.id]);
    expect(errorOn(proofOf(p1, p2, l3), '⊥', l3.id)).toContain('not a formula and its negation');
  });

  it('lets ⊥E conclude anything at all', () => {
    const p1 = premise('⊥');
    const l2 = line('P ∧ ¬Q', 'botE', [p1.id]);
    expect(check(proofOf(p1, l2), 'P ∧ ¬Q').solved).toBe(true);
  });
});

describe('classical rules', () => {
  it('accepts RAA', () => {
    const p1 = premise('¬¬P');
    const sub = subproof('¬P', line('⊥', 'notE', []));
    (sub.items[1] as ReturnType<typeof line>).refs = [sub.items[0].id, p1.id];
    const l4 = line('P', 'raa', [sub.id]);
    expect(check(proofOf(p1, sub, l4), 'P').solved).toBe(true);
  });

  it('rejects RAA whose assumption is not the negation of the conclusion', () => {
    const p1 = premise('¬Q');
    const sub = subproof('¬P', line('⊥', 'notE', []));
    (sub.items[1] as ReturnType<typeof line>).refs = [sub.items[0].id, p1.id];
    const l4 = line('Q', 'raa', [sub.id]);
    expect(errorOn(proofOf(p1, sub, l4), 'Q', l4.id)).toContain('refuting it gives “P”');
  });

  it('accepts LEM for any formula with no citations', () => {
    const l1 = line('(P ∧ Q) ∨ ¬(P ∧ Q)', 'lem', []);
    expect(check(proofOf(l1), '(P ∧ Q) ∨ ¬(P ∧ Q)').solved).toBe(true);
  });

  it('rejects LEM on a disjunction that is not A ∨ ¬A', () => {
    const l1 = line('P ∨ ¬Q', 'lem', []);
    expect(errorOn(proofOf(l1), 'P ∨ ¬Q', l1.id)).toContain('a formula and its negation');
  });
});

describe('level rule gating', () => {
  it('rejects a rule the level has not unlocked', () => {
    const p1 = premise('¬¬P');
    const l2 = line('P', 'dne', [p1.id]);
    const result = checkProof(proofOf(p1, l2), {
      goal: mustParse('P'),
      allowedRules: ['andI', 'andE'],
    });
    expect(result.results.get(l2.id)?.message).toContain('not available in this level');
  });
});
