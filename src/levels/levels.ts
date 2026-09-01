/**
 * The level catalogue.
 *
 * Every level carries a reference solution, and `levels.test.ts` replays each
 * one through the real checker — so a level that cannot be solved with the
 * rules it hands the player fails the build rather than the player.
 */

import { mustParse } from '../logic/parser';
import { RuleId } from '../logic/rules';
import { ChapterDefinition, Level } from './types';

const CONJUNCTION: RuleId[] = ['andI', 'andE', 'reit'];
const CONDITIONAL: RuleId[] = [...CONJUNCTION, 'impI', 'impE'];
const DISJUNCTION: RuleId[] = [...CONDITIONAL, 'orI', 'orE'];
const NEGATION: RuleId[] = [...DISJUNCTION, 'notI', 'notE', 'botE'];
const BICONDITIONAL: RuleId[] = [...NEGATION, 'iffI', 'iffE'];
const CLASSICAL: RuleId[] = [...BICONDITIONAL, 'raa', 'dne', 'lem'];

export const CHAPTERS: readonly ChapterDefinition[] = [
  {
    id: 'conjunction',
    title: 'Conjunction',
    subtitle: 'Taking “and” apart and putting it back together',
    levels: [
      {
        id: 'and-commute',
        title: 'Turn it around',
        premises: ['P ∧ Q'],
        goal: 'Q ∧ P',
        rules: CONJUNCTION,
        hint: 'Pull out each half on its own first, then join them the other way round.',
        solution: [
          ['Q', 'andE', 1],
          ['P', 'andE', 1],
          ['Q ∧ P', 'andI', 2, 3],
        ],
      },
      {
        id: 'and-intro',
        title: 'Join them up',
        premises: ['P', 'Q'],
        goal: 'P ∧ Q',
        rules: CONJUNCTION,
        hint: 'You already have both halves. One step.',
        solution: [['P ∧ Q', 'andI', 1, 2]],
      },
      {
        id: 'and-regroup',
        title: 'Regroup',
        premises: ['P ∧ (Q ∧ R)'],
        goal: '(P ∧ Q) ∧ R',
        rules: CONJUNCTION,
        hint: 'Break the premise all the way down to P, Q and R before rebuilding.',
        solution: [
          ['P', 'andE', 1],
          ['Q ∧ R', 'andE', 1],
          ['Q', 'andE', 3],
          ['R', 'andE', 3],
          ['P ∧ Q', 'andI', 2, 4],
          ['(P ∧ Q) ∧ R', 'andI', 6, 5],
        ],
      },
      {
        id: 'and-mix',
        title: 'Borrow a half',
        premises: ['P ∧ Q', 'R'],
        goal: 'Q ∧ R',
        rules: CONJUNCTION,
        hint: 'Only one half of the first premise is any use to you.',
        solution: [
          ['Q', 'andE', 1],
          ['Q ∧ R', 'andI', 3, 2],
        ],
      },
    ],
  },

  {
    id: 'conditional',
    title: 'Conditionals',
    subtitle: 'Assuming things, and getting rid of the assumption',
    levels: [
      {
        id: 'modus-ponens',
        title: 'Modus ponens',
        premises: ['P → Q', 'P'],
        goal: 'Q',
        rules: CONDITIONAL,
        hint: 'A conditional plus its antecedent. One step.',
        solution: [['Q', 'impE', 1, 2]],
      },
      {
        id: 'weakening',
        title: 'Out of thin air',
        premises: ['P'],
        goal: 'Q → P',
        rules: CONDITIONAL,
        hint: 'Assume Q. You never have to use it — P was already true.',
        solution: [
          { assume: 'Q', steps: [['P', 'reit', 1]] },
          ['Q → P', 'impI', '2-3'],
        ],
      },
      {
        id: 'chain',
        title: 'Chain rule',
        premises: ['P → Q', 'Q → R'],
        goal: 'P → R',
        rules: CONDITIONAL,
        hint: 'Assume P, walk along both conditionals, then discharge.',
        solution: [
          {
            assume: 'P',
            steps: [
              ['Q', 'impE', 1, 3],
              ['R', 'impE', 2, 4],
            ],
          },
          ['P → R', 'impI', '3-5'],
        ],
      },
      {
        id: 'uncurry',
        title: 'Two into one',
        premises: ['P → (Q → R)'],
        goal: '(P ∧ Q) → R',
        rules: CONDITIONAL,
        hint: 'Assume the conjunction, then split it to feed both conditionals.',
        solution: [
          {
            assume: 'P ∧ Q',
            steps: [
              ['P', 'andE', 2],
              ['Q', 'andE', 2],
              ['Q → R', 'impE', 1, 3],
              ['R', 'impE', 5, 4],
            ],
          },
          ['(P ∧ Q) → R', 'impI', '2-6'],
        ],
      },
      {
        id: 'curry',
        title: 'One into two',
        premises: ['(P ∧ Q) → R'],
        goal: 'P → (Q → R)',
        rules: CONDITIONAL,
        hint: 'You will need a subproof inside a subproof: assume P, then assume Q.',
        solution: [
          {
            assume: 'P',
            steps: [
              {
                assume: 'Q',
                steps: [
                  ['P ∧ Q', 'andI', 2, 3],
                  ['R', 'impE', 1, 4],
                ],
              },
              ['Q → R', 'impI', '3-5'],
            ],
          },
          ['P → (Q → R)', 'impI', '2-6'],
        ],
      },
    ],
  },

  {
    id: 'disjunction',
    title: 'Disjunction',
    subtitle: 'Arguing by cases',
    levels: [
      {
        id: 'or-intro',
        title: 'Widen it',
        premises: ['P'],
        goal: 'P ∨ Q',
        rules: DISJUNCTION,
        hint: 'Once you have one disjunct, the other side can be anything.',
        solution: [['P ∨ Q', 'orI', 1]],
      },
      {
        id: 'or-commute',
        title: 'Either way',
        premises: ['P ∨ Q'],
        goal: 'Q ∨ P',
        rules: DISJUNCTION,
        hint: 'Take each case separately and reach the same conclusion in both.',
        solution: [
          { assume: 'P', steps: [['Q ∨ P', 'orI', 2]] },
          { assume: 'Q', steps: [['Q ∨ P', 'orI', 4]] },
          ['Q ∨ P', 'orE', 1, '2-3', '4-5'],
        ],
      },
      {
        id: 'or-cases',
        title: 'Both roads lead there',
        premises: ['P ∨ Q', 'P → R', 'Q → R'],
        goal: 'R',
        rules: DISJUNCTION,
        hint: 'Each case has its own conditional waiting for it.',
        solution: [
          { assume: 'P', steps: [['R', 'impE', 2, 4]] },
          { assume: 'Q', steps: [['R', 'impE', 3, 6]] },
          ['R', 'orE', 1, '4-5', '6-7'],
        ],
      },
      {
        id: 'distribute',
        title: 'Distribute',
        premises: ['(P ∨ Q) ∧ R'],
        goal: '(P ∧ R) ∨ (Q ∧ R)',
        rules: DISJUNCTION,
        hint: 'Pull R out first — it is available inside both cases.',
        solution: [
          ['P ∨ Q', 'andE', 1],
          ['R', 'andE', 1],
          {
            assume: 'P',
            steps: [
              ['P ∧ R', 'andI', 4, 3],
              ['(P ∧ R) ∨ (Q ∧ R)', 'orI', 5],
            ],
          },
          {
            assume: 'Q',
            steps: [
              ['Q ∧ R', 'andI', 7, 3],
              ['(P ∧ R) ∨ (Q ∧ R)', 'orI', 8],
            ],
          },
          ['(P ∧ R) ∨ (Q ∧ R)', 'orE', 2, '4-6', '7-9'],
        ],
      },
    ],
  },

  {
    id: 'negation',
    title: 'Negation',
    subtitle: 'Contradictions, and what you can do with them',
    levels: [
      {
        id: 'explosion',
        title: 'Anything at all',
        premises: ['P', '¬P'],
        goal: 'Q',
        rules: NEGATION,
        hint: 'Reach ⊥ first. From absurdity, everything follows.',
        solution: [
          ['⊥', 'notE', 1, 2],
          ['Q', 'botE', 3],
        ],
      },
      {
        id: 'modus-tollens',
        title: 'Modus tollens',
        premises: ['P → Q', '¬Q'],
        goal: '¬P',
        rules: NEGATION,
        hint: 'To prove a negation, assume the thing and derive ⊥.',
        solution: [
          {
            assume: 'P',
            steps: [
              ['Q', 'impE', 1, 3],
              ['⊥', 'notE', 4, 2],
            ],
          },
          ['¬P', 'notI', '3-5'],
        ],
      },
      {
        id: 'double-neg-intro',
        title: 'Not not',
        premises: ['P'],
        goal: '¬¬P',
        rules: NEGATION,
        hint: 'Assume ¬P and watch it clash with the premise.',
        solution: [
          { assume: '¬P', steps: [['⊥', 'notE', 1, 2]] },
          ['¬¬P', 'notI', '2-3'],
        ],
      },
      {
        id: 'demorgan-easy',
        title: 'Neither one',
        premises: ['¬(P ∨ Q)'],
        goal: '¬P ∧ ¬Q',
        rules: NEGATION,
        hint: 'Prove each negation separately. Assuming P is enough to rebuild P ∨ Q.',
        solution: [
          {
            assume: 'P',
            steps: [
              ['P ∨ Q', 'orI', 2],
              ['⊥', 'notE', 3, 1],
            ],
          },
          ['¬P', 'notI', '2-4'],
          {
            assume: 'Q',
            steps: [
              ['P ∨ Q', 'orI', 6],
              ['⊥', 'notE', 7, 1],
            ],
          },
          ['¬Q', 'notI', '6-8'],
          ['¬P ∧ ¬Q', 'andI', 5, 9],
        ],
      },
      {
        id: 'demorgan-or',
        title: 'One of them fails',
        premises: ['¬P ∨ ¬Q'],
        goal: '¬(P ∧ Q)',
        rules: NEGATION,
        hint: 'Argue by cases, and inside each case assume P ∧ Q to reach ⊥.',
        solution: [
          {
            assume: '¬P',
            steps: [
              {
                assume: 'P ∧ Q',
                steps: [
                  ['P', 'andE', 3],
                  ['⊥', 'notE', 4, 2],
                ],
              },
              ['¬(P ∧ Q)', 'notI', '3-5'],
            ],
          },
          {
            assume: '¬Q',
            steps: [
              {
                assume: 'P ∧ Q',
                steps: [
                  ['Q', 'andE', 8],
                  ['⊥', 'notE', 9, 7],
                ],
              },
              ['¬(P ∧ Q)', 'notI', '8-10'],
            ],
          },
          ['¬(P ∧ Q)', 'orE', 1, '2-6', '7-11'],
        ],
      },
    ],
  },

  {
    id: 'biconditional',
    title: 'Biconditionals',
    subtitle: 'Both directions at once',
    levels: [
      {
        id: 'iff-elim',
        title: 'Cash it in',
        premises: ['P ↔ Q', 'P'],
        goal: 'Q',
        rules: BICONDITIONAL,
        hint: 'A biconditional works like a conditional in whichever direction you need.',
        solution: [['Q', 'iffE', 1, 2]],
      },
      {
        id: 'iff-intro',
        title: 'Both ways',
        premises: ['P → Q', 'Q → P'],
        goal: 'P ↔ Q',
        rules: BICONDITIONAL,
        hint: 'One subproof per direction.',
        solution: [
          { assume: 'P', steps: [['Q', 'impE', 1, 3]] },
          { assume: 'Q', steps: [['P', 'impE', 2, 5]] },
          ['P ↔ Q', 'iffI', '3-4', '5-6'],
        ],
      },
      {
        id: 'iff-commute',
        title: 'Symmetry',
        premises: ['P ↔ Q'],
        goal: 'Q ↔ P',
        rules: BICONDITIONAL,
        hint: 'The premise is usable inside both subproofs.',
        solution: [
          { assume: 'Q', steps: [['P', 'iffE', 1, 2]] },
          { assume: 'P', steps: [['Q', 'iffE', 1, 4]] },
          ['Q ↔ P', 'iffI', '2-3', '4-5'],
        ],
      },
    ],
  },

  {
    id: 'classical',
    title: 'Going classical',
    subtitle: 'Reductio, excluded middle, and the proofs that need them',
    levels: [
      {
        id: 'double-neg-elim',
        title: 'Cancelling out',
        premises: ['¬¬P'],
        goal: 'P',
        rules: CLASSICAL,
        hint: 'This one is a single classical step.',
        solution: [['P', 'dne', 1]],
      },
      {
        id: 'excluded-middle',
        title: 'No middle ground',
        premises: [],
        goal: 'P ∨ ¬P',
        rules: [...CLASSICAL].filter((rule) => rule !== 'lem'),
        hint: 'Assume the goal is false. Then P cannot hold either — which hands you the goal.',
        solution: [
          {
            assume: '¬(P ∨ ¬P)',
            steps: [
              {
                assume: 'P',
                steps: [
                  ['P ∨ ¬P', 'orI', 2],
                  ['⊥', 'notE', 3, 1],
                ],
              },
              ['¬P', 'notI', '2-4'],
              ['P ∨ ¬P', 'orI', 5],
              ['⊥', 'notE', 6, 1],
            ],
          },
          ['P ∨ ¬P', 'raa', '1-7'],
        ],
      },
      {
        id: 'demorgan-hard',
        title: 'De Morgan, the hard way',
        premises: ['¬(P ∧ Q)'],
        goal: '¬P ∨ ¬Q',
        rules: CLASSICAL,
        hint: 'Assume the goal is false, then work inwards: assume P, then assume Q.',
        solution: [
          {
            assume: '¬(¬P ∨ ¬Q)',
            steps: [
              {
                assume: 'P',
                steps: [
                  {
                    assume: 'Q',
                    steps: [
                      ['P ∧ Q', 'andI', 3, 4],
                      ['⊥', 'notE', 5, 1],
                    ],
                  },
                  ['¬Q', 'notI', '4-6'],
                  ['¬P ∨ ¬Q', 'orI', 7],
                  ['⊥', 'notE', 8, 2],
                ],
              },
              ['¬P', 'notI', '3-9'],
              ['¬P ∨ ¬Q', 'orI', 10],
              ['⊥', 'notE', 11, 2],
            ],
          },
          ['¬P ∨ ¬Q', 'raa', '2-12'],
        ],
      },
      {
        id: 'material-conditional',
        title: 'What a conditional really says',
        premises: ['P → Q'],
        goal: '¬P ∨ Q',
        rules: CLASSICAL,
        hint: 'Split on whether P holds. Excluded middle gives you that split for free.',
        solution: [
          ['P ∨ ¬P', 'lem'],
          {
            assume: 'P',
            steps: [
              ['Q', 'impE', 1, 3],
              ['¬P ∨ Q', 'orI', 4],
            ],
          },
          { assume: '¬P', steps: [['¬P ∨ Q', 'orI', 6]] },
          ['¬P ∨ Q', 'orE', 2, '3-5', '6-7'],
        ],
      },
      {
        id: 'linearity',
        title: 'One or the other',
        premises: [],
        goal: '(P → Q) ∨ (Q → P)',
        rules: CLASSICAL,
        hint: 'If P is false, P → Q holds vacuously. If P is true, Q → P holds.',
        solution: [
          ['P ∨ ¬P', 'lem'],
          {
            assume: 'P',
            steps: [
              { assume: 'Q', steps: [['P', 'reit', 2]] },
              ['Q → P', 'impI', '3-4'],
              ['(P → Q) ∨ (Q → P)', 'orI', 5],
            ],
          },
          {
            assume: '¬P',
            steps: [
              {
                assume: 'P',
                steps: [
                  ['⊥', 'notE', 8, 7],
                  ['Q', 'botE', 9],
                ],
              },
              ['P → Q', 'impI', '8-10'],
              ['(P → Q) ∨ (Q → P)', 'orI', 11],
            ],
          },
          ['(P → Q) ∨ (Q → P)', 'orE', 1, '2-6', '7-12'],
        ],
      },
      {
        id: 'peirce',
        title: 'Peirce’s law',
        premises: [],
        goal: '((P → Q) → P) → P',
        rules: CLASSICAL,
        hint: 'Assume the antecedent, then split on P. The hard case builds P → Q out of absurdity.',
        solution: [
          {
            assume: '(P → Q) → P',
            steps: [
              ['P ∨ ¬P', 'lem'],
              { assume: 'P', steps: [['P', 'reit', 3]] },
              {
                assume: '¬P',
                steps: [
                  {
                    assume: 'P',
                    steps: [
                      ['⊥', 'notE', 6, 5],
                      ['Q', 'botE', 7],
                    ],
                  },
                  ['P → Q', 'impI', '6-8'],
                  ['P', 'impE', 1, 9],
                ],
              },
              ['P', 'orE', 2, '3-4', '5-10'],
            ],
          },
          ['((P → Q) → P) → P', 'impI', '1-11'],
        ],
      },
    ],
  },
];

/** Every level, flattened, in play order. */
export const LEVELS: Level[] = CHAPTERS.flatMap((chapter) =>
  chapter.levels.map((definition) => ({
    ...definition,
    premises: definition.premises.map(mustParse),
    goal: mustParse(definition.goal),
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    index: 0,
  })),
).map((level, position) => ({ ...level, index: position + 1 }));

export const LEVEL_BY_ID = new Map(LEVELS.map((level) => [level.id, level]));

export function levelById(id: string): Level | undefined {
  return LEVEL_BY_ID.get(id);
}

export function nextLevel(id: string): Level | undefined {
  const level = LEVEL_BY_ID.get(id);
  return level ? LEVELS[level.index] : undefined;
}

/** Definition (with the unparsed solution) for a given level id. */
export function definitionById(id: string) {
  for (const chapter of CHAPTERS) {
    const found = chapter.levels.find((level) => level.id === id);
    if (found) return found;
  }
  return undefined;
}
