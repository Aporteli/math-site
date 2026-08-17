/** Build a signed polynomial term: 3x^2, -x, + 5 */
export function polyTerm(
  coef: number,
  variable: string,
  isLead: boolean,
): string {
  if (coef === 0) return "";

  const abs = Math.abs(coef);
  let body: string;
  if (!variable) body = String(abs);
  else if (abs === 1) body = variable;
  else body = `${abs}${variable}`;

  if (isLead) return coef < 0 ? `-${body}` : body;
  return `${coef < 0 ? "-" : "+"} ${body}`;
}

export function joinTex(...parts: string[]) {
  return parts.filter(Boolean).join(" ").replace(/^\+ /, "");
}

export function formatLinearTex(a: number, b: number) {
  return joinTex(polyTerm(a, "x", true), polyTerm(b, "", a === 0));
}

export function formatQuadraticTex(a: number, b: number, c: number) {
  return joinTex(
    polyTerm(a, "x^2", true),
    polyTerm(b, "x", a === 0),
    polyTerm(c, "", a === 0 && b === 0),
  );
}

export function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}
