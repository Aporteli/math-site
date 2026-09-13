import type { Polynomial, QuadraticEquation } from '../types/quadratic';
import { add, sub, mul, div, ZERO, fromDecimal, rat, isZero } from './rational';
import { addPoly, subPoly, mulPoly, divPoly, negPoly, poly, isZeroPoly } from './polynomial';

type Token = { type: 'number' | 'variable' | 'op' | 'lparen' | 'rparen'; value: string };

function tokenize(input: string, variable: string): Token[] {
  const s = input
    .replace(/[×·]/g, '*')
    .replace(/−/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\s+/g, '');
  const out: Token[] = [];
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    if (/\d|\./.test(ch)) {
      const m = s.slice(i).match(/^\d*(?:\.\d*)?/);
      if (!m?.[0] || m[0] === '.') throw new Error('არასწორი რიცხვი');
      out.push({ type: 'number', value: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const id = s.slice(i, j);
      if (id === 'sqrt' || id === 'abs' || id === 'sin' || id === 'cos' || id === 'log' || id === 'ln') {
        throw new Error(
          `ფუნქცია "${id}" არ არის კვადრატული პოლინომი. ამ კალკულატორში მხოლოდ ax^2+bx+c=0 სახის განტოლებებია`,
        );
      }
      if (id === variable) {
        out.push({ type: 'variable', value: variable });
        i = j;
        continue;
      }
      if (id.length === 1) {
        throw new Error(
          `პარამეტრი "${id}" — გამოიყენეთ პარამეტრული რეჟიმი ან ჩაანაცვლეთ რიცხვით`,
        );
      }
      throw new Error(`მხარდაუჭერელი იდენტიფიკატორი: ${id}`);
    }
    if ('+-*/^'.includes(ch)) {
      out.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      out.push({ type: 'lparen', value: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      out.push({ type: 'rparen', value: ch });
      i++;
      continue;
    }
    throw new Error(`მხარდაუჭერელი სიმბოლო: ${ch}`);
  }
  return insertImplicitMultiplication(out);
}

function insertImplicitMultiplication(tokens: Token[]): Token[] {
  const canEnd = (t?: Token) => !!t && (t.type === 'number' || t.type === 'variable' || t.type === 'rparen');
  const canStart = (t?: Token) => !!t && (t.type === 'number' || t.type === 'variable' || t.type === 'lparen');
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    out.push(a);
    if (canEnd(a) && canStart(b)) out.push({ type: 'op', value: '*' });
  }
  return out;
}

class Parser {
  private i = 0;
  private tokens: Token[];
  private variable: string;
  constructor(tokens: Token[], variable: string) {
    this.tokens = tokens;
    this.variable = variable;
  }
  private peek() {
    return this.tokens[this.i];
  }
  private take() {
    return this.tokens[this.i++];
  }
  private accept(value: string) {
    if (this.peek()?.value === value) {
      this.i++;
      return true;
    }
    return false;
  }

  parse(): Polynomial {
    const result = this.expr();
    if (this.i !== this.tokens.length) throw new Error('მოულოდნელი ტოკენი');
    return result;
  }

  private expr(): Polynomial {
    let value = this.term();
    while (this.peek()?.value === '+' || this.peek()?.value === '-') {
      const op = this.take().value;
      const rhs = this.term();
      value = op === '+' ? addPoly(value, rhs) : subPoly(value, rhs);
    }
    return value;
  }

  private term(): Polynomial {
    let value = this.unary();
    while (this.peek()?.value === '*' || this.peek()?.value === '/') {
      const op = this.take().value;
      const rhs = this.unary();
      value = op === '*' ? mulPoly(value, rhs) : divPoly(value, rhs);
    }
    return value;
  }

  private unary(): Polynomial {
    if (this.accept('+')) return this.unary();
    if (this.accept('-')) return negPoly(this.unary());
    return this.power();
  }

  private power(): Polynomial {
    let value = this.primary();
    if (this.accept('^')) {
      const exponent = this.take();
      if (!exponent || exponent.type !== 'number' || !/^\d+$/.test(exponent.value)) {
        throw new Error('ხარისხი უნდა იყოს არაუარყოფითი მთელი რიცხვი');
      }
      const n = Number(exponent.value);
      if (n > 2) throw new Error('ხარისხი 2-ზე მეტია — ეს აღარ არის კვადრატული განტოლება');
      if (n === 0) return poly(rat(1));
      if (n === 1) return value;
      return mulPoly(value, value);
    }
    return value;
  }

  private primary(): Polynomial {
    const t = this.take();
    if (!t) throw new Error('მოსალოდნელი იყო გამოსახულება');
    if (t.type === 'number') return poly(fromDecimal(t.value));
    if (t.type === 'variable') return poly(ZERO, rat(1));
    if (t.type === 'lparen') {
      const v = this.expr();
      if (!this.accept(')')) throw new Error('აკლია დახურვის ფრჩხილი');
      return v;
    }
    throw new Error(`მოულოდნელი ტოკენი: ${t.value}`);
  }
}

function parseSide(side: string, variable: string): Polynomial {
  const trimmed = side.trim();
  if (!trimmed) return poly(ZERO);
  return new Parser(tokenize(trimmed, variable), variable).parse();
}

export function parseQuadraticEquation(input: string, variable = 'x'): QuadraticEquation {
  const original = input.trim();
  if (!original) throw new Error('განტოლება ცარიელია');
  if (!/^[A-Za-z]$/.test(variable)) throw new Error('ცვლადი უნდა იყოს ერთი ასო');
  const equalCount = [...original].filter((ch) => ch === '=').length;
  if (equalCount !== 1) throw new Error('განტოლება უნდა შეიცავდეს ზუსტად ერთ ტოლობის ნიშანს');
  const [left, right] = original.split('=');
  const lhs = parseSide(left, variable);
  const rhs = parseSide(right, variable);
  const p = subPoly(lhs, rhs);

  if (isZeroPoly(p)) {
    return {
      variable,
      polynomial: p,
      a: ZERO,
      b: ZERO,
      c: ZERO,
      standardForm: '0 = 0',
      original,
    };
  }

  if (isZero(p.c2) && isZero(p.c1)) {
    return {
      variable,
      polynomial: p,
      a: ZERO,
      b: ZERO,
      c: p.c0,
      standardForm: formatStandardForm(p, variable),
      original,
    };
  }

  if (isZero(p.c2)) {
    return {
      variable,
      polynomial: p,
      a: ZERO,
      b: p.c1,
      c: p.c0,
      standardForm: formatStandardForm(p, variable),
      original,
    };
  }

  return {
    variable,
    polynomial: p,
    a: p.c2,
    b: p.c1,
    c: p.c0,
    standardForm: formatStandardForm(p, variable),
    original,
  };
}

function formatRationalPlain(n: { n: number; d: number }): string {
  if (n.d === 1) return String(n.n);
  return `(${n.n}/${n.d})`;
}

function term(coeff: { n: number; d: number }, power: number, variable: string): string {
  if (coeff.n === 0) return '';
  const c = formatRationalPlain(coeff);
  if (power === 0) return c;
  if (coeff.n === coeff.d) return power === 1 ? variable : `${variable}^2`;
  if (coeff.n === -coeff.d) return power === 1 ? `-${variable}` : `-${variable}^2`;
  const body = power === 1 ? variable : `${variable}^2`;
  if (coeff.d === 1) return `${c}${body}`;
  return `(${c})*${body}`;
}

function formatStandardForm(p: Polynomial, variable: string): string {
  const raw = [term(p.c2, 2, variable), term(p.c1, 1, variable), term(p.c0, 0, variable)].filter(Boolean);
  if (!raw.length) return '0 = 0';
  let result = raw[0];
  for (const t of raw.slice(1)) {
    if (t.startsWith('-')) result += ` ${t}`;
    else result += ` + ${t}`;
  }
  return `${result} = 0`;
}
