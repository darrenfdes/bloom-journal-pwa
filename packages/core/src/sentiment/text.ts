/**
 * Shared, negation-aware text matching used by sentiment inference and the
 * pumpkin easter-egg trigger. All matching is whole-word (and whole-phrase),
 * so a keyword never matches as a substring of a larger word ("hopeless" does
 * not match "hope", "related" does not match "elated").
 */

/** How many tokens before a match we scan for a negator (within one clause). */
const NEGATION_WINDOW = 3;

const NEGATORS = new Set([
  'not',
  'no',
  'never',
  'without',
  'hardly',
  'barely',
  'rarely',
  'seldom',
  'cannot',
]);

/** A token negates a following keyword, e.g. `not`, `never`, or any `*n't`. */
export function isNegator(token: string): boolean {
  return NEGATORS.has(token) || token.endsWith("n't");
}

/**
 * Split text into clauses (on sentence/clause punctuation) then into lowercase
 * word tokens. Negation never reaches across a clause boundary, so
 * "I am not sad, just happy" leaves "happy" un-negated.
 */
function toClauses(text: string): string[][] {
  return text
    .toLowerCase()
    .split(/[.,;:!?]+/)
    .map((clause) => clause.split(/[^a-z0-9']+/).filter(Boolean))
    .filter((clause) => clause.length > 0);
}

/** True if a negator sits within the lookback window before `start` in the clause. */
function negatedAt(clause: string[], start: number): boolean {
  for (let i = Math.max(0, start - NEGATION_WINDOW); i < start; i++) {
    if (isNegator(clause[i]!)) return true;
  }
  return false;
}

/** Count un-negated whole-word/phrase occurrences of `term` across all clauses. */
function countTerm(clauses: string[][], term: string): number {
  const parts = term.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 0;
  let count = 0;
  for (const clause of clauses) {
    for (let i = 0; i + parts.length <= clause.length; i++) {
      let matched = true;
      for (let j = 0; j < parts.length; j++) {
        if (clause[i + j] !== parts[j]) {
          matched = false;
          break;
        }
      }
      if (matched && !negatedAt(clause, i)) count++;
    }
  }
  return count;
}

/** Total un-negated matches of any of `terms` in `text`. */
export function countMatches(text: string, terms: string[]): number {
  const clauses = toClauses(text);
  let total = 0;
  for (const term of terms) total += countTerm(clauses, term);
  return total;
}

/** True if any of `terms` appears un-negated as a whole word/phrase in `text`. */
export function matchesAny(text: string, terms: string[]): boolean {
  const clauses = toClauses(text);
  return terms.some((term) => countTerm(clauses, term) > 0);
}
