/**
 * Recursive-descent parser for propositional formulas.
 *
 * Accepts the pretty Unicode connectives the keypad produces as well as the
 * ASCII spellings people type on a hardware keyboard, so level data can be
 * written either way.
 */

import { Formula, and, atom, bottom, iff, implies, not, or } from './formula';

export type ParseResult =
  | { ok: true; formula: Formula }
  | { ok: false; error: string; position: number };

type TokenType = 'atom' | 'not' | 'and' | 'or' | 'implies' | 'iff' | 'bottom' | 'lparen' | 'rparen';

interface Token {
  type: TokenType;
  text: string;
  position: number;
}

/** Multi-character spellings, longest first so `<->` wins over `<`. */
const OPERATORS: Array<{ match: string; type: TokenType }> = [
  { match: '<->', type: 'iff' },
  { match: '<=>', type: 'iff' },
  { match: '↔', type: 'iff' },
  { match: '≡', type: 'iff' },
  { match: '->', type: 'implies' },
  { match: '=>', type: 'implies' },
  { match: '→', type: 'implies' },
  { match: '⊃', type: 'implies' },
  { match: '/\\', type: 'and' },
  { match: '∧', type: 'and' },
  { match: '&&', type: 'and' },
  { match: '&', type: 'and' },
  { match: '·', type: 'and' },
  { match: '\\/', type: 'or' },
  { match: '∨', type: 'or' },
  { match: '||', type: 'or' },
  { match: '|', type: 'or' },
  { match: '¬', type: 'not' },
  { match: '~', type: 'not' },
  { match: '!', type: 'not' },
  { match: '_|_', type: 'bottom' },
  { match: '⊥', type: 'bottom' },
  { match: '#', type: 'bottom' },
  { match: '(', type: 'lparen' },
  { match: ')', type: 'rparen' },
];

class ParseError extends Error {
  constructor(message: string, readonly position: number) {
    super(message);
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  outer: while (i < input.length) {
    const char = input[i];
    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    for (const op of OPERATORS) {
      if (input.startsWith(op.match, i)) {
        tokens.push({ type: op.type, text: op.match, position: i });
        i += op.match.length;
        continue outer;
      }
    }

    // An atom is a letter optionally followed by digits or primes: P, Q1, R'.
    if (/[A-Za-z]/.test(char)) {
      const start = i;
      i += 1;
      while (i < input.length && /[0-9']/.test(input[i])) i += 1;
      tokens.push({ type: 'atom', text: input.slice(start, i), position: start });
      continue;
    }

    throw new ParseError(`Unexpected character “${char}”`, i);
  }

  return tokens;
}

/**
 * Grammar, loosest binding first:
 *   iff     := implies ('↔' iff)?          right associative
 *   implies := or ('→' implies)?           right associative
 *   or      := and ('∨' and)*              left associative
 *   and     := unary ('∧' unary)*          left associative
 *   unary   := '¬' unary | primary
 *   primary := atom | '⊥' | '(' iff ')'
 */
class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[], private readonly source: string) {}

  parse(): Formula {
    const formula = this.parseIff();
    const leftover = this.peek();
    if (leftover) {
      const hint =
        leftover.type === 'rparen'
          ? 'Unmatched “)”'
          : `Unexpected “${leftover.text}” — did you leave out a connective?`;
      throw new ParseError(hint, leftover.position);
    }
    return formula;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private consumeIf(type: TokenType): Token | undefined {
    const token = this.peek();
    if (token?.type === type) {
      this.index += 1;
      return token;
    }
    return undefined;
  }

  private parseIff(): Formula {
    const left = this.parseImplies();
    if (this.consumeIf('iff')) return iff(left, this.parseIff());
    return left;
  }

  private parseImplies(): Formula {
    const left = this.parseOr();
    if (this.consumeIf('implies')) return implies(left, this.parseImplies());
    return left;
  }

  private parseOr(): Formula {
    let left = this.parseAnd();
    while (this.consumeIf('or')) left = or(left, this.parseAnd());
    return left;
  }

  private parseAnd(): Formula {
    let left = this.parseUnary();
    while (this.consumeIf('and')) left = and(left, this.parseUnary());
    return left;
  }

  private parseUnary(): Formula {
    if (this.consumeIf('not')) return not(this.parseUnary());
    return this.parsePrimary();
  }

  private parsePrimary(): Formula {
    const token = this.peek();
    if (!token) {
      throw new ParseError('The formula ends too early', this.source.length);
    }

    if (token.type === 'atom') {
      this.index += 1;
      return atom(token.text);
    }
    if (token.type === 'bottom') {
      this.index += 1;
      return bottom();
    }
    if (token.type === 'lparen') {
      this.index += 1;
      const inner = this.parseIff();
      if (!this.consumeIf('rparen')) {
        throw new ParseError('Missing a closing “)”', token.position);
      }
      return inner;
    }

    throw new ParseError(`Expected a formula but found “${token.text}”`, token.position);
  }
}

/** Parses `input`, never throwing: failures come back as a result object. */
export function parse(input: string): ParseResult {
  try {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return { ok: false, error: 'Write a formula first', position: 0 };
    }
    return { ok: true, formula: new Parser(tokenize(trimmed), trimmed).parse() };
  } catch (error) {
    if (error instanceof ParseError) {
      return { ok: false, error: error.message, position: error.position };
    }
    throw error;
  }
}

/**
 * Parses a formula that is known to be well formed — level data and tests.
 * Throws loudly so a typo in a level surfaces the moment the module loads
 * rather than when a player opens that level.
 */
export function mustParse(input: string): Formula {
  const result = parse(input);
  if (!result.ok) {
    throw new Error(`Malformed formula “${input}”: ${result.error}`);
  }
  return result.formula;
}
