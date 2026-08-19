const NAME = "[A-Za-z][A-Za-z0-9_]{0,23}";
/** `A_{{n}-j+1` — `n` is a slot, `j` is a LaTeX index. */
const HALF_CLOSED = new RegExp(`([_^])\\{\\{\\s*(${NAME})\\s*\\}(?!\\})`, "g");
/** `A_{{n-j+1` — same, without a brace after the param name. */
const PARAM_THEN_INDEX = new RegExp(
  `([_^])\\{\\{\\s*(${NAME})\\s*([+\\-])\\s*(${NAME})`,
  "g",
);

/**
 * `A_{{n}-j+1, {{n}}-i+1}` / `A_{{n-j+1, {{n}}-i+1}`: fill `n`, leave `i`/`j`.
 * Result looks like `A_{5-j+1, 5-i+1}`.
 */
export function closeParamIndexSlots(
  text: string,
  names: ReadonlySet<string>,
): string {
  if (names.size === 0) return text;
  let out = text.replace(HALF_CLOSED, (full, prefix: string, name: string) =>
    names.has(name) ? `${prefix}{{{${name}}}` : full,
  );
  out = out.replace(
    PARAM_THEN_INDEX,
    (full, prefix: string, name: string, op: string, index: string) =>
      names.has(name) && !names.has(index)
        ? `${prefix}{{{${name}}}${op}${index}`
        : full,
  );
  return out;
}

export function exprUsesOnlyKnownNames(
  expr: string,
  names: ReadonlySet<string>,
): boolean {
  const idents = expr.match(/[A-Za-z][A-Za-z0-9_]*/g) ?? [];
  return idents.every((id) => names.has(id));
}
