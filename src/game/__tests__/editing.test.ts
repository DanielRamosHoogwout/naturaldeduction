import { layout } from '../../logic/proof';
import { mustParse } from '../../logic/parser';
import {
  addLine,
  addSubproof,
  countLines,
  initialProof,
  remove,
  setFormula,
  setRule,
  toggleRef,
} from '../editing';

const premises = (...formulas: string[]) => initialProof(formulas.map(mustParse));

describe('adding lines', () => {
  it('appends at the end of the proof when nothing is selected', () => {
    const start = premises('P', 'Q');
    const { proof, focusId } = addLine(start, null);
    expect(countLines(proof)).toBe(3);
    expect(layout(proof).lineById.get(focusId)?.number).toBe(3);
  });

  it('inserts directly after the selected line', () => {
    const start = premises('P', 'Q');
    const first = layout(start).lines[0].line.id;
    const { proof, focusId } = addLine(start, first);
    expect(layout(proof).lineById.get(focusId)?.number).toBe(2);
  });

  it('adds inside the subproof when a line of it is selected', () => {
    const start = premises('P');
    const opened = addSubproof(start, null);
    const added = addLine(opened.proof, opened.focusId);
    const view = layout(added.proof);
    expect(view.lineById.get(added.focusId)?.depth).toBe(1);
    expect(view.subproofs[0].last).toBe(3);
  });

  it('adds outside the subproof when the subproof itself is selected', () => {
    const start = premises('P');
    const opened = addSubproof(start, null);
    const subproofId = layout(opened.proof).subproofs[0].subproof.id;
    const added = addLine(opened.proof, subproofId);
    expect(layout(added.proof).lineById.get(added.focusId)?.depth).toBe(0);
  });
});

describe('citations', () => {
  it('keeps line citations before subproof citations', () => {
    let proof = premises('P ∨ Q');
    const disjunction = layout(proof).lines[0].line.id;

    const first = addSubproof(proof, null);
    proof = first.proof;
    const second = addSubproof(proof, layout(proof).subproofs[0].subproof.id);
    proof = second.proof;

    const conclusion = addLine(proof, null, 'orE');
    proof = conclusion.proof;

    let view = layout(proof);
    const [subA, subB] = view.subproofs.map((entry) => entry.subproof.id);

    proof = toggleRef(proof, view, conclusion.focusId, subA);
    view = layout(proof);
    proof = toggleRef(proof, view, conclusion.focusId, disjunction);
    view = layout(proof);
    proof = toggleRef(proof, view, conclusion.focusId, subB);

    const line = layout(proof).lineById.get(conclusion.focusId)!.line;
    expect(line.refs).toEqual([disjunction, subA, subB]);
  });

  it('drops the oldest citation once the rule is full', () => {
    let proof = premises('P', 'Q', 'R');
    let view = layout(proof);
    const [a, b, c] = view.lines.map((entry) => entry.line.id);

    const added = addLine(proof, null, 'andI');
    proof = added.proof;

    for (const ref of [a, b, c]) {
      proof = toggleRef(proof, layout(proof), added.focusId, ref);
    }

    expect(layout(proof).lineById.get(added.focusId)!.line.refs).toEqual([b, c]);
  });

  it('removes a citation when it is tapped again', () => {
    let proof = premises('P');
    const premise = layout(proof).lines[0].line.id;
    const added = addLine(proof, null, 'reit');
    proof = added.proof;

    proof = toggleRef(proof, layout(proof), added.focusId, premise);
    expect(layout(proof).lineById.get(added.focusId)!.line.refs).toEqual([premise]);

    proof = toggleRef(proof, layout(proof), added.focusId, premise);
    expect(layout(proof).lineById.get(added.focusId)!.line.refs).toEqual([]);
  });

  it('clears citations when the rule changes', () => {
    let proof = premises('P');
    const premise = layout(proof).lines[0].line.id;
    const added = addLine(proof, null, 'reit');
    proof = toggleRef(added.proof, layout(added.proof), added.focusId, premise);

    proof = setRule(proof, added.focusId, 'andE');
    expect(layout(proof).lineById.get(added.focusId)!.line.refs).toEqual([]);
  });
});

describe('deletion', () => {
  it('strips citations that pointed at the deleted line', () => {
    let proof = premises('P ∧ Q');
    const premise = layout(proof).lines[0].line.id;

    const middle = addLine(proof, null, 'andE');
    proof = toggleRef(middle.proof, layout(middle.proof), middle.focusId, premise);
    proof = setFormula(proof, middle.focusId, mustParse('P'));

    const last = addLine(proof, null, 'reit');
    proof = toggleRef(last.proof, layout(last.proof), last.focusId, middle.focusId);

    proof = remove(proof, middle.focusId);
    expect(layout(proof).lineById.get(last.focusId)!.line.refs).toEqual([]);
  });

  it('deletes the whole subproof when its assumption is deleted', () => {
    const start = premises('P');
    const opened = addSubproof(start, null);
    const withBody = addLine(opened.proof, opened.focusId);

    const proof = remove(withBody.proof, opened.focusId);
    expect(layout(proof).subproofs).toHaveLength(0);
    expect(countLines(proof)).toBe(1);
  });

  it('refuses to delete a premise', () => {
    const start = premises('P', 'Q');
    const premise = layout(start).lines[0].line.id;
    expect(countLines(remove(start, premise))).toBe(2);
  });

  it('removes citations reaching into a deleted subproof', () => {
    let proof = premises('P');
    const opened = addSubproof(proof, null);
    proof = opened.proof;
    const subproofId = layout(proof).subproofs[0].subproof.id;

    const discharge = addLine(proof, subproofId, 'impI');
    proof = toggleRef(discharge.proof, layout(discharge.proof), discharge.focusId, subproofId);
    expect(layout(proof).lineById.get(discharge.focusId)!.line.refs).toHaveLength(1);

    proof = remove(proof, subproofId);
    expect(layout(proof).lineById.get(discharge.focusId)!.line.refs).toEqual([]);
  });
});
