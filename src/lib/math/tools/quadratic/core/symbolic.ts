/**
 * Lightweight symbolic expressions for parametric quadratics.
 * Supports: numbers, parameter letters, +, -, *, /, ^ (integer), parentheses.
 * Collects coefficients of the solve-variable up to degree 2.
 */

export type SymExpr =
  | { kind: 'num'; n: number }
  | { kind: 'sym'; name: string }
  | { kind: 'add'; args: SymExpr[] }
  | { kind: 'mul'; args: SymExpr[] }
  | { kind: 'pow'; base: SymExpr; exp: number }
  | { kind: 'div'; num: SymExpr; den: SymExpr }
  | { kind: 'neg'; arg: SymExpr };

/** Multivariate monomial: coeff * ∏ param^exp  (solve-variable is separate) */
export type Mono = { coeff: number; exps: Record<string, number> };

/** Polynomial = sum of monomials (in parameters only) */
export type Poly = Mono[];

export function num(n: number): SymExpr {
  return { kind: 'num', n };
}
export function sym(name: string): SymExpr {
  return { kind: 'sym', name };
}

function isZeroExpr(e: SymExpr): boolean {
  return e.kind === 'num' && e.n === 0;
}

export function addE(...args: SymExpr[]): SymExpr {
  const flat: SymExpr[] = [];
  for (const a of args) {
    if (a.kind === 'add') flat.push(...a.args);
    else if (!isZeroExpr(a)) flat.push(a);
  }
  if (!flat.length) return num(0);
  if (flat.length === 1) return flat[0];
  return { kind: 'add', args: flat };
}

export function mulE(...args: SymExpr[]): SymExpr {
  const flat: SymExpr[] = [];
  for (const a of args) {
    if (a.kind === 'num' && a.n === 0) return num(0);
    if (a.kind === 'mul') flat.push(...a.args);
    else flat.push(a);
  }
  // fold numeric factors
  let c = 1;
  const rest: SymExpr[] = [];
  for (const a of flat) {
    if (a.kind === 'num') c *= a.n;
    else rest.push(a);
  }
  if (c === 0) return num(0);
  if (rest.length === 0) return num(c);
  if (c === 1 && rest.length === 1) return rest[0];
  if (c === 1) return { kind: 'mul', args: rest };
  return { kind: 'mul', args: [num(c), ...rest] };
}

export function negE(e: SymExpr): SymExpr {
  if (e.kind === 'num') return num(-e.n);
  if (e.kind === 'neg') return e.arg;
  return { kind: 'neg', arg: e };
}

export function powE(base: SymExpr, exp: number): SymExpr {
  if (exp === 0) return num(1);
  if (exp === 1) return base;
  if (base.kind === 'num') return num(base.n ** exp);
  return { kind: 'pow', base, exp };
}

export function divE(nume: SymExpr, den: SymExpr): SymExpr {
  if (den.kind === 'num' && den.n === 1) return nume;
  if (den.kind === 'num' && nume.kind === 'num') return num(nume.n / den.n);
  return { kind: 'div', num: nume, den };
}

// ─── Polynomial helpers (parameters only) ───

function monoKey(exps: Record<string, number>): string {
  return Object.keys(exps)
    .sort()
    .filter((k) => exps[k] !== 0)
    .map((k) => `${k}^${exps[k]}`)
    .join('*');
}

function normalizeMono(m: Mono): Mono {
  const exps: Record<string, number> = {};
  for (const [k, v] of Object.entries(m.exps)) {
    if (v !== 0) exps[k] = v;
  }
  return { coeff: m.coeff, exps };
}

export function polyFromNum(n: number): Poly {
  if (n === 0) return [];
  return [{ coeff: n, exps: {} }];
}

export function polyAdd(a: Poly, b: Poly): Poly {
  const map = new Map<string, Mono>();
  for (const m of [...a, ...b]) {
    const nm = normalizeMono(m);
    const k = monoKey(nm.exps);
    const prev = map.get(k);
    if (prev) prev.coeff += nm.coeff;
    else map.set(k, { ...nm });
  }
  return [...map.values()].filter((m) => m.coeff !== 0);
}

export function polyNeg(a: Poly): Poly {
  return a.map((m) => ({ coeff: -m.coeff, exps: { ...m.exps } }));
}

export function polyMul(a: Poly, b: Poly): Poly {
  const out: Poly = [];
  for (const ma of a) {
    for (const mb of b) {
      const exps: Record<string, number> = { ...ma.exps };
      for (const [k, v] of Object.entries(mb.exps)) {
        exps[k] = (exps[k] || 0) + v;
      }
      out.push({ coeff: ma.coeff * mb.coeff, exps });
    }
  }
  return polyAdd(out, []);
}

export function polySub(a: Poly, b: Poly): Poly {
  return polyAdd(a, polyNeg(b));
}

/** Convert expression (no solve-variable) to parameter polynomial */
export function exprToPoly(e: SymExpr, params: Set<string>): Poly {
  switch (e.kind) {
    case 'num':
      return polyFromNum(e.n);
    case 'sym':
      if (!params.has(e.name)) {
        // treat unknown as parameter
        params.add(e.name);
      }
      return [{ coeff: 1, exps: { [e.name]: 1 } }];
    case 'neg':
      return polyNeg(exprToPoly(e.arg, params));
    case 'add': {
      let acc: Poly = [];
      for (const a of e.args) acc = polyAdd(acc, exprToPoly(a, params));
      return acc;
    }
    case 'mul': {
      let acc: Poly = polyFromNum(1);
      for (const a of e.args) acc = polyMul(acc, exprToPoly(a, params));
      return acc;
    }
    case 'pow': {
      if (e.exp < 0 || !Number.isInteger(e.exp)) throw new Error('ხარისხი უნდა იყოს არაუარყოფითი მთელი');
      let acc = polyFromNum(1);
      const base = exprToPoly(e.base, params);
      for (let i = 0; i < e.exp; i++) acc = polyMul(acc, base);
      return acc;
    }
    case 'div': {
      const den = exprToPoly(e.den, params);
      if (den.length === 1 && Object.keys(den[0].exps).length === 0) {
        const d = den[0].coeff;
        if (d === 0) throw new Error('გაყოფა ნულზე');
        return exprToPoly(e.num, params).map((m) => ({
          coeff: m.coeff / d,
          exps: m.exps,
        }));
      }
      throw new Error('პარამეტრული რეჟიმი: გაყოფა მხოლოდ რიცხვზეა მხარდაჭერილი');
    }
  }
}

/**
 * Collect coefficients of variable^0, variable^1, variable^2.
 * Expression may contain the solve-variable and parameters.
 */
export function collectInVariable(
  e: SymExpr,
  variable: string,
): { c0: SymExpr; c1: SymExpr; c2: SymExpr; params: string[] } {
  const params = new Set<string>();
  const expanded = expandInVar(e, variable, params);
  // expanded: array of { power of var, poly in params as SymExpr via poly }
  let p0: Poly = [];
  let p1: Poly = [];
  let p2: Poly = [];
  for (const term of expanded) {
    if (term.varPow === 0) p0 = polyAdd(p0, term.poly);
    else if (term.varPow === 1) p1 = polyAdd(p1, term.poly);
    else if (term.varPow === 2) p2 = polyAdd(p2, term.poly);
    else if (term.varPow > 2) throw new Error('ხარისხი 2-ზე მეტია — ეს აღარ არის კვადრატული განტოლება');
  }
  const paramList = [...params].sort();
  return {
    c0: polyToExpr(p0),
    c1: polyToExpr(p1),
    c2: polyToExpr(p2),
    params: paramList,
  };
}

type VarTerm = { varPow: number; poly: Poly };

function expandInVar(e: SymExpr, variable: string, params: Set<string>): VarTerm[] {
  switch (e.kind) {
    case 'num':
      return [{ varPow: 0, poly: polyFromNum(e.n) }];
    case 'sym':
      if (e.name === variable) return [{ varPow: 1, poly: polyFromNum(1) }];
      params.add(e.name);
      return [{ varPow: 0, poly: [{ coeff: 1, exps: { [e.name]: 1 } }] }];
    case 'neg':
      return expandInVar(e.arg, variable, params).map((t) => ({
        varPow: t.varPow,
        poly: polyNeg(t.poly),
      }));
    case 'add': {
      const out: VarTerm[] = [];
      for (const a of e.args) out.push(...expandInVar(a, variable, params));
      return out;
    }
    case 'mul': {
      let acc: VarTerm[] = [{ varPow: 0, poly: polyFromNum(1) }];
      for (const a of e.args) {
        const next = expandInVar(a, variable, params);
        const neu: VarTerm[] = [];
        for (const x of acc) {
          for (const y of next) {
            neu.push({
              varPow: x.varPow + y.varPow,
              poly: polyMul(x.poly, y.poly),
            });
          }
        }
        acc = neu;
      }
      return acc;
    }
    case 'pow': {
      if (e.exp < 0 || !Number.isInteger(e.exp)) throw new Error('ხარისხი უნდა იყოს არაუარყოფითი მთელი');
      if (e.exp > 2) {
        // may still be ok if base has no variable — check after
      }
      let acc: VarTerm[] = [{ varPow: 0, poly: polyFromNum(1) }];
      const base = expandInVar(e.base, variable, params);
      for (let i = 0; i < e.exp; i++) {
        const neu: VarTerm[] = [];
        for (const x of acc) {
          for (const y of base) {
            neu.push({
              varPow: x.varPow + y.varPow,
              poly: polyMul(x.poly, y.poly),
            });
          }
        }
        acc = neu;
      }
      for (const t of acc) {
        if (t.varPow > 2) throw new Error('ხარისხი 2-ზე მეტია — ეს აღარ არის კვადრატული განტოლება');
      }
      return acc;
    }
    case 'div': {
      const denTerms = expandInVar(e.den, variable, params);
      if (denTerms.length === 1 && denTerms[0].varPow === 0) {
        const denPoly = denTerms[0].poly;
        if (denPoly.length === 1 && Object.keys(denPoly[0].exps).length === 0) {
          const d = denPoly[0].coeff;
          if (d === 0) throw new Error('გაყოფა ნულზე');
          return expandInVar(e.num, variable, params).map((t) => ({
            varPow: t.varPow,
            poly: t.poly.map((m) => ({ coeff: m.coeff / d, exps: m.exps })),
          }));
        }
      }
      throw new Error('პარამეტრული რეჟიმი: გაყოფა მხოლოდ მუდმივ რიცხვზეა მხარდაჭერილი');
    }
  }
}

export function polyToExpr(p: Poly): SymExpr {
  if (!p.length) return num(0);
  const terms: SymExpr[] = p.map((m) => {
    const absC = Math.abs(m.coeff);
    const f2: SymExpr[] = [];
    if (absC !== 1 || Object.keys(m.exps).length === 0) {
      f2.push(num(absC));
    }
    for (const [name, exp] of Object.entries(m.exps).sort()) {
      if (exp === 1) f2.push(sym(name));
      else f2.push(powE(sym(name), exp));
    }
    let body: SymExpr;
    if (!f2.length) body = num(0);
    else if (f2.length === 1) body = f2[0];
    else body = mulE(...f2);
    return m.coeff < 0 ? negE(body) : body;
  });
  if (terms.length === 1) return terms[0];
  return addE(...terms);
}

/** LaTeX for expression */
export function exprToLatex(e: SymExpr): string {
  return toLatex(e, false);
}

function toLatex(e: SymExpr, paren: boolean): string {
  switch (e.kind) {
    case 'num': {
      if (Number.isInteger(e.n)) return String(e.n);
      // simple fraction attempt
      return String(e.n);
    }
    case 'sym':
      return e.name;
    case 'neg': {
      const inner = toLatex(e.arg, true);
      return paren ? `\\left(-${inner}\\right)` : `-${inner}`;
    }
    case 'add': {
      let s = '';
      for (let i = 0; i < e.args.length; i++) {
        const a = e.args[i];
        if (i === 0) {
          s += toLatex(a, false);
        } else if (a.kind === 'neg') {
          s += ` - ${toLatex(a.arg, false)}`;
        } else if (a.kind === 'num' && a.n < 0) {
          s += ` - ${toLatex(num(-a.n), false)}`;
        } else {
          s += ` + ${toLatex(a, false)}`;
        }
      }
      return paren ? `\\left(${s}\\right)` : s;
    }
    case 'mul': {
      const parts = e.args.map((a, i) => {
        if (a.kind === 'add' || a.kind === 'neg') return toLatex(a, true);
        if (a.kind === 'num' && a.n === -1 && e.args.length > 1) return '-';
        if (a.kind === 'num' && i === 0) return toLatex(a, false);
        if (a.kind === 'num') return `\\cdot ${toLatex(a, false)}`;
        return toLatex(a, false);
      });
      // clean "-"+next
      let s = parts.join('');
      s = s.replace(/-\\cdot /g, '-');
      return paren ? `\\left(${s}\\right)` : s;
    }
    case 'pow': {
      const b =
        e.base.kind === 'sym' || e.base.kind === 'num'
          ? toLatex(e.base, false)
          : toLatex(e.base, true);
      return `${b}^{${e.exp}}`;
    }
    case 'div': {
      return `\\dfrac{${toLatex(e.num, false)}}{${toLatex(e.den, false)}}`;
    }
  }
}

/** Plain-ish string for debugging */
export function exprToString(e: SymExpr): string {
  switch (e.kind) {
    case 'num':
      return String(e.n);
    case 'sym':
      return e.name;
    case 'neg':
      return `-(${exprToString(e.arg)})`;
    case 'add':
      return e.args.map(exprToString).join(' + ');
    case 'mul':
      return e.args.map(exprToString).join('*');
    case 'pow':
      return `(${exprToString(e.base)})^${e.exp}`;
    case 'div':
      return `(${exprToString(e.num)})/(${exprToString(e.den)})`;
  }
}

export function isZeroSym(e: SymExpr): boolean {
  if (e.kind === 'num') return e.n === 0;
  if (e.kind === 'add') return e.args.every(isZeroSym);
  return false;
}

export function isOneSym(e: SymExpr): boolean {
  return e.kind === 'num' && e.n === 1;
}

/** Parse expression string into SymExpr (no '='). Allows multiple letters as symbols. */
export function parseSymExpr(input: string, variable: string): SymExpr {
  const s = input
    .replace(/[×·]/g, '*')
    .replace(/−/g, '-')
    .replace(/²/g, '^2')
    .replace(/\s+/g, '');
  if (!s) return num(0);

  type Tok = { type: 'num' | 'id' | 'op' | 'lparen' | 'rparen'; v: string };
  const toks: Tok[] = [];
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    if (/\d|\./.test(ch)) {
      const m = s.slice(i).match(/^\d*(?:\.\d*)?/);
      if (!m?.[0] || m[0] === '.') throw new Error('არასწორი რიცხვი');
      toks.push({ type: 'num', v: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      // read full identifier (sqrt, abs, or single-letter param)
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const id = s.slice(i, j);
      const reserved = ['sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln', 'exp'];
      if (reserved.includes(id.toLowerCase())) {
        throw new Error(
          `ფუნქცია "${id}" არ არის კვადრატული პოლინომი. შეიყვანეთ სახის ax^2+bx+c=0 (რიცხვები ან პარამეტრები a,k,...)`,
        );
      }
      if (id.length > 1) {
        throw new Error(
          `უცნობი იდენტიფიკატორი "${id}". პარამეტრები უნდა იყოს ერთი ასო (მაგ. a, k, m)`,
        );
      }
      toks.push({ type: 'id', v: id });
      i = j;
      continue;
    }
    if ('+-*/^'.includes(ch)) {
      toks.push({ type: 'op', v: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      toks.push({ type: 'lparen', v: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      toks.push({ type: 'rparen', v: ch });
      i++;
      continue;
    }
    throw new Error(`მხარდაუჭერელი სიმბოლო: ${ch}`);
  }

  // implicit multiplication
  const out: Tok[] = [];
  for (let i = 0; i < toks.length; i++) {
    const a = toks[i];
    const b = toks[i + 1];
    out.push(a);
    if (!b) continue;
    const endOk = a.type === 'num' || a.type === 'id' || a.type === 'rparen';
    const startOk = b.type === 'num' || b.type === 'id' || b.type === 'lparen';
    if (endOk && startOk) out.push({ type: 'op', v: '*' });
  }

  let i = 0;
  const peek = () => out[i];
  const take = () => out[i++];
  const accept = (v: string) => {
    if (peek()?.v === v) {
      i++;
      return true;
    }
    return false;
  };

  function parseExpr(): SymExpr {
    let left = parseTerm();
    while (peek()?.v === '+' || peek()?.v === '-') {
      const op = take().v;
      const right = parseTerm();
      left = op === '+' ? addE(left, right) : addE(left, negE(right));
    }
    return left;
  }

  function parseTerm(): SymExpr {
    let left = parseUnary();
    while (peek()?.v === '*' || peek()?.v === '/') {
      const op = take().v;
      const right = parseUnary();
      left = op === '*' ? mulE(left, right) : divE(left, right);
    }
    return left;
  }

  function parseUnary(): SymExpr {
    if (accept('+')) return parseUnary();
    if (accept('-')) return negE(parseUnary());
    return parsePower();
  }

  function parsePower(): SymExpr {
    let base = parsePrimary();
    if (accept('^')) {
      const t = take();
      if (!t || t.type !== 'num' || !/^\d+$/.test(t.v)) throw new Error('ხარისხი უნდა იყოს არაუარყოფითი მთელი რიცხვი');
      const exp = Number(t.v);
      if (exp > 4) throw new Error('მაღალი ხარისხი მხარდაუჭერელია');
      base = powE(base, exp);
    }
    return base;
  }

  function parsePrimary(): SymExpr {
    const t = take();
    if (!t) throw new Error('მოსალოდნელი იყო გამოსახულება');
    if (t.type === 'num') return num(Number(t.v));
    if (t.type === 'id') return sym(t.v);
    if (t.type === 'lparen') {
      const e = parseExpr();
      if (!accept(')')) throw new Error('აკლია დახურვის ფრჩხილი');
      return e;
    }
    throw new Error(`მოულოდნელი ტოკენი: ${t.v}`);
  }

  const result = parseExpr();
  if (i !== out.length) throw new Error('მოულოდნელი ტოკენი');
  return result;
}

export function parseParametricEquation(
  input: string,
  variable = 'x',
): {
  a: SymExpr;
  b: SymExpr;
  c: SymExpr;
  params: string[];
  original: string;
  standardLatex: string;
} {
  const original = input.trim();
  if (!original) throw new Error('განტოლება ცარიელია');
  const eqCount = [...original].filter((ch) => ch === '=').length;
  if (eqCount !== 1) throw new Error('განტოლება უნდა შეიცავდეს ზუსტად ერთ ტოლობის ნიშანს');
  const [left, right] = original.split('=');
  const L = parseSymExpr(left.trim() || '0', variable);
  const R = parseSymExpr(right.trim() || '0', variable);
  const diff = addE(L, negE(R));
  const { c0, c1, c2, params } = collectInVariable(diff, variable);

  if (isZeroSym(c2)) {
    throw new Error('ეს არ არის კვადრატული განტოლება არჩეული ცვლადის მიმართ (a = 0)');
  }

  const aL = exprToLatex(c2);
  const bL = exprToLatex(c1);
  const cL = exprToLatex(c0);
  const standardLatex = `${aL}${variable}^{2} + \\left(${bL}\\right)${variable} + \\left(${cL}\\right) = 0`;

  return {
    a: c2,
    b: c1,
    c: c0,
    params,
    original,
    standardLatex,
  };
}
