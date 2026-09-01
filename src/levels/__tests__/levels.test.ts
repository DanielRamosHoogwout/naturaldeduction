import { checkProof } from '../../logic/check';
import { format } from '../../logic/formula';
import { RULES } from '../../logic/rules';
import { CHAPTERS, LEVELS, definitionById, levelById, nextLevel } from '../levels';
import { buildSolution } from '../solution';

describe('level catalogue', () => {
  it('has unique level ids', () => {
    const ids = LEVELS.map((level) => level.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('introduces every rule in a chapter before or when it is needed', () => {
    // Rule sets are cumulative, so each chapter must offer at least what the
    // one before it did — a level that silently loses a rule is a design bug.
    const perChapter = CHAPTERS.map((chapter) => new Set(chapter.levels.flatMap((l) => l.rules)));
    perChapter.forEach((rules, index) => {
      if (index === 0) return;
      perChapter[index - 1].forEach((rule) => expect(rules.has(rule)).toBe(true));
    });
  });

  it('numbers levels consecutively across chapters', () => {
    LEVELS.forEach((level, position) => expect(level.index).toBe(position + 1));
  });

  it('links each level to the next one', () => {
    expect(nextLevel(LEVELS[0].id)?.id).toBe(LEVELS[1].id);
    expect(nextLevel(LEVELS[LEVELS.length - 1].id)).toBeUndefined();
  });

  it('resolves levels by id', () => {
    expect(levelById(LEVELS[3].id)?.title).toBe(LEVELS[3].title);
    expect(levelById('no-such-level')).toBeUndefined();
  });
});

/**
 * The load-bearing test: replay every shipped solution through the same checker
 * the app runs, restricted to the rules that level actually unlocks. A level
 * that cannot be finished — or that needs a rule the player has not been given —
 * fails here rather than stranding someone mid-chapter.
 */
describe.each(CHAPTERS.map((chapter) => [chapter.title, chapter] as const))('%s', (_title, chapter) => {
  it.each(chapter.levels.map((level) => [level.title, level] as const))(
    'solves “%s”',
    (_levelTitle, level) => {
      const proof = buildSolution(level.premises, level.solution);
      const result = checkProof(proof, {
        goal: LEVELS.find((entry) => entry.id === level.id)!.goal,
        allowedRules: [...level.rules],
      });

      const failures = result.layout.lines
        .filter((entry) => result.results.get(entry.line.id)?.status !== 'ok')
        .map((entry) => {
          const formula = entry.line.formula ? format(entry.line.formula) : '(empty)';
          const message = result.results.get(entry.line.id)?.message ?? '';
          return `line ${entry.number} (${formula}, ${RULES[entry.line.rule].label}): ${message}`;
        });

      expect(failures).toEqual([]);
      expect(result.solved).toBe(true);
    },
  );
});

describe('level design', () => {
  it.each(LEVELS.map((level) => [level.title, level] as const))(
    '“%s” only lists rules the engine knows',
    (_title, level) => {
      level.rules.forEach((rule) => expect(RULES[rule]).toBeDefined());
    },
  );

  it.each(LEVELS.map((level) => [level.title, level] as const))(
    '“%s” is not solved before the player starts',
    (_title, level) => {
      const proof = buildSolution(definitionById(level.id)!.premises, []);
      expect(checkProof(proof, { goal: level.goal }).solved).toBe(false);
    },
  );

  it('gives every level a hint', () => {
    LEVELS.forEach((level) => expect(level.hint.length).toBeGreaterThan(10));
  });
});
