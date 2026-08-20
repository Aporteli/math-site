/** Ranges of `[...]` placeholders in a slash-prompt body (brackets included). */
export type BracketPlaceholder = {
  start: number;
  end: number;
  inner: string;
};

const BRACKET_RE = /\[[^\]]*\]/g;

export function findBracketPlaceholders(text: string): BracketPlaceholder[] {
  const out: BracketPlaceholder[] = [];
  BRACKET_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BRACKET_RE.exec(text))) {
    out.push({
      start: match.index,
      end: match.index + match[0].length,
      inner: match[0].slice(1, -1),
    });
  }
  return out;
}
