'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calculator,
  RotateCcw,
  CheckCircle2,
  Keyboard,
  History,
  LineChart,
  Delete,
  X,
  ListOrdered,
} from 'lucide-react';
// @ts-ignore
import nerdamer from 'nerdamer/all.min';
import { KatexPreview } from '@/components/math/katex-preview';
import { PageHero } from '@/components/ui/page-hero';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800';

const panelClass =
  'rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800';

type Copy = Dictionary['equations'];

type HistoryItem = {
  equation: string;
  variable: string;
  solutions: string[];
};

interface StepItem {
  title: string;
  explanation: string;
  latex?: string;
}

interface QuadraticCalculatorProps {
  locale: Locale;
  copy: Copy;
  title: string;
  description: string;
}

const KEYBOARD_GROUPS = [
  { label: 'ციფრები', keys: ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'] },
  { label: 'ცვლადები', keys: ['x', 'y', 'a', 'b', 'c'] },
  { label: 'ოპერატორები', keys: ['+', '-', '*', '/', '=', '(', ')', 'BACKSPACE'] },
  { label: 'ხარისხი/ფესვი', keys: ['^2', '^4', 'sqrt()', 'abs()'] },
];

function cleanLaTeXInput(input: string): string {
  if (!input) return '';
  let cleaned = input;
  cleaned = cleaned.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
  cleaned = cleaned.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)');
  cleaned = cleaned.replace(/\\text\s*\{abs\}/g, 'abs').replace(/text\(abs\)/g, 'abs');
  cleaned = cleaned.replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)');
  cleaned = cleaned.replace(/\\left\s*\\vert/g, '|').replace(/\\right\s*\\vert/g, '|');
  cleaned = cleaned.replace(/\\left\s*\|/g, '|').replace(/\\right\s*\|/g, '|');

  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(/\|([^|]+)\|/g, 'abs($1)');
  } while (cleaned !== previous);

  // 1. ავტომატურად ვსვამთ გამრავლებას შეტყუპებულ ფრჩხილებს შორის: (x-2)(x-3) -> (x-2)*(x-3)
  cleaned = cleaned.replace(/\)\(/g, ')*(');

  // 2. ვსვამთ გამრავლებას რიცხვსა და ცვლადს/ფრჩხილს შორის: 5x -> 5*x
  cleaned = cleaned.replace(/([0-9])([a-zA-Z(])/g, '$1*$2');

  // 3. ვაშორებთ ყველანაირ Space-ს და ზედმეტ სიმბოლოს
  cleaned = cleaned.replace(/[\$\\]/g, '').replace(/\s+/g, '');

  if (!cleaned.includes('=')) {
    cleaned = cleaned + '=0';
  }
  return cleaned;
}

// 1. სტანდარტული კვადრატული განტოლების შეფასება (უსაფრთხო წერტილებით რაციონალურებისთვის)
function extractQuadratic(diffExpr: string, varName: string): { a: number; b: number; c: number; error?: string } {
  try {
    const getVal = (v: number) =>
      parseFloat(
        nerdamer(diffExpr, { [varName]: v })
          .evaluate()
          .text('decimals'),
      );
    let y0 = getVal(0),
      y1 = getVal(1),
      ym1 = getVal(-1),
      y2 = getVal(2);

    // თუ 0, 1 ან -1 იწვევს გაყოფას 0-ზე (NaN / Infinity), ვიყენებთ უსაფრთხო წერტილებს 2, 3, 4, 5
    if (!isFinite(y0) || !isFinite(y1) || !isFinite(ym1) || !isFinite(y2)) {
      const p1 = getVal(2),
        p2 = getVal(3),
        p3 = getVal(4),
        p4 = getVal(5);
      if (!isFinite(p1) || !isFinite(p2) || !isFinite(p3) || !isFinite(p4))
        return { a: 0, b: 0, c: 0, error: 'invalid' };
      // a, b, c პოვნა (x=2,3,4)
      const a = (p1 - 2 * p2 + p3) / 2;
      const b = p2 - p1 - 5 * a;
      const c = p1 - 4 * a - 2 * b;

      const expectedP4 = 25 * a + 5 * b + c;
      if (Math.abs(p4 - expectedP4) > 1e-3) return { a: 0, b: 0, c: 0, error: 'not_quadratic' };
      return { a, b, c };
    }

    const c = y0;
    const a = (y1 + ym1 - 2 * c) / 2;
    const b = y1 - a - c;

    const expectedY2 = 4 * a + 2 * b + c;
    if (Math.abs(y2 - expectedY2) > 1e-3) return { a: 0, b: 0, c: 0, error: 'not_quadratic' };

    return { a, b, c };
  } catch {
    return { a: 0, b: 0, c: 0, error: 'parse_error' };
  }
}

// 2. ბიქვადრატული შეფასება (5 წერტილით)
function extractBiquadratic(diffExpr: string, varName: string): { a: number; b: number; c: number; error?: string } {
  try {
    const getVal = (v: number) =>
      parseFloat(
        nerdamer(diffExpr, { [varName]: v })
          .evaluate()
          .text('decimals'),
      );
    const y0 = getVal(0),
      y1 = getVal(1),
      y2 = getVal(2),
      ym1 = getVal(-1),
      ym2 = getVal(-2);

    if (!isFinite(y0) || !isFinite(y1) || !isFinite(y2) || !isFinite(ym1) || !isFinite(ym2))
      return { a: 0, b: 0, c: 0, error: 'invalid' };
    if (Math.abs(y1 - ym1) > 1e-4 || Math.abs(y2 - ym2) > 1e-4) return { a: 0, b: 0, c: 0, error: 'not_even' };

    const c = y0;
    const eq1 = y1 - c;
    const eq2 = (y2 - c) / 4;
    const a = (eq2 - eq1) / 3;
    const b = eq1 - a;

    const y3 = getVal(3);
    const expectedY3 = 81 * a + 9 * b + c;
    if (Math.abs(y3 - expectedY3) > 1e-4) return { a: 0, b: 0, c: 0, error: 'not_biquadratic' };

    return { a, b, c };
  } catch {
    return { a: 0, b: 0, c: 0, error: 'parse_error' };
  }
}

function sanitizeSolutions(rawSolutions: any[]): string[] {
  const sanitized: string[] = [];
  for (const sol of rawSolutions) {
    const str = sol.toString();
    try {
      const tex = nerdamer(sol).toTeX();
      if (!sanitized.includes(tex) && tex.length < 50) sanitized.push(tex);
    } catch {
      if (!sanitized.includes(str)) sanitized.push(str);
    }
  }
  return sanitized;
}

export function QuadraticCalculator({ locale, copy, title, description }: QuadraticCalculatorProps) {
  const [equation, setEquation] = useState('x^2 - 5x + 6 = 0');
  const [solveFor, setSolveFor] = useState('x');
  const [solutions, setSolutions] = useState<string[] | null>(null);
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [error, setError] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphExpr, setGraphExpr] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('quadratic-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
    handleSolve(undefined, 'x^2 - 5x + 6 = 0', 'x');
  }, []);

  const handleSolve = (e?: React.FormEvent, eqToSolve = equation, varToSolve = solveFor) => {
    if (e) e.preventDefault();
    const cleanedEq = cleanLaTeXInput(eqToSolve);

    if (!cleanedEq.trim() || !cleanedEq.includes('=')) {
      setError(true);
      setSolutions(null);
      setSteps([]);
      return;
    }

    const parts = cleanedEq.split('=');
    const diffExpr = `(${parts[0].trim()}) - (${parts[1].trim()})`;
    let parsedSolutions: string[] = [];
    let detailedSteps: StepItem[] = [];

    // --- სპეც-ჰენდლერი 1: ფრჩხილებიანი დაშლილი ფორმა (მაგ. (x-2)(x-3)=0) ---
    const factoredMatch = cleanedEq.match(/^\(([^)]+)\)\*\(([^)]+)\)=0$/);
    // --- სპეც-ჰენდლერი 2: ჩანაცვლებითი (expr)^2 + b*(expr) + c = 0 (მაგ. (x^2-x)^2 - 8(x^2-x) + 12 = 0) ---
    const substitutionMatch = cleanedEq.match(/^\(([^)]+)\)\^2([+-][0-9.]*\*?)\(\1\)([+-][0-9.]+)=0$/);
    // --- სპეც-ჰენდლერი 3: შერეული მოდული x^2 - abs(x) - 6 = 0 ---
    const mixedAbsMatch = cleanedEq.match(/^x\^2([+-][0-9.]*\*?)abs\(x\)([+-][0-9.]+)=0$/);
    // --- სპეც-ჰენდლერი 4: სუფთა მოდული abs(expr)=d ---
    const pureAbsMatch = cleanedEq.match(/^abs\((.*)\)=([0-9.]+)$/);

    if (factoredMatch) {
      const eq1 = `${factoredMatch[1]}=0`;
      const eq2 = `${factoredMatch[2]}=0`;
      let s1: string[] = [];
      let s2: string[] = [];
      try {
        s1 = sanitizeSolutions(Array.from(nerdamer.solveEquations(eq1, varToSolve)));
      } catch {}
      try {
        s2 = sanitizeSolutions(Array.from(nerdamer.solveEquations(eq2, varToSolve)));
      } catch {}
      parsedSolutions = [...s1, ...s2];
      detailedSteps = [
        {
          title: 'ნაბიჯი 1: მამრავლებად დაშლილი ფორმა',
          explanation: 'ნამრავლი უდრის ნულს, თუ ერთ-ერთი მამრავლი მაინც ნულია.',
          latex: `$${factoredMatch[1]} = 0 \\quad \\text{ან} \\quad ${factoredMatch[2]} = 0$`,
        },
        {
          title: 'ნაბიჯი 2: თითოეული განტოლების ამოხსნა',
          explanation: 'ვხსნით მიღებულ განტოლებებს:',
          latex: `$${varToSolve} = ${parsedSolutions.join('; \\quad ')}$`,
        },
      ];
    } else if (substitutionMatch) {
      const innerExpr = substitutionMatch[1];
      const bStr = substitutionMatch[2].replace('*', '');
      const cStr = substitutionMatch[3];
      const b = parseFloat(bStr);
      const c = parseFloat(cStr);

      detailedSteps.push({
        title: 'ნაბიჯი 1: ჩანაცვლება',
        explanation: `შემოვიღოთ ახალი ცვლადი $y = ${innerExpr}$. განტოლება მიიღებს სახეს:`,
        latex: `$y^2 ${b >= 0 ? '+' : ''}${b}y ${c >= 0 ? '+' : ''}${c} = 0$`,
      });

      const D = b * b - 4 * c;
      if (D < -1e-8) {
        detailedSteps.push({
          title: 'ამოხსნა არ აქვს',
          explanation: 'y-სთვის კვადრატულ განტოლებას არ აქვს რეალური ფესვები.',
          latex: `$y \\in \\emptyset \\implies x \\in \\emptyset$`,
        });
      } else {
        const y1 = (-b - Math.sqrt(D)) / 2;
        const y2 = (-b + Math.sqrt(D)) / 2;
        detailedSteps.push({
          title: 'ნაბიჯი 2: y-ის პოვნა',
          explanation: 'კვადრატული განტოლების ამოხსნით ვიღებთ:',
          latex: `$y_1 = ${y1}, \\quad y_2 = ${y2}$`,
        });

        let s1: string[] = [];
        let s2: string[] = [];
        try {
          s1 = sanitizeSolutions(Array.from(nerdamer.solveEquations(`${innerExpr}=${y1}`, varToSolve)));
        } catch {}
        try {
          s2 = sanitizeSolutions(Array.from(nerdamer.solveEquations(`${innerExpr}=${y2}`, varToSolve)));
        } catch {}
        parsedSolutions = [...s1, ...s2];

        detailedSteps.push({
          title: 'ნაბიჯი 3: დაბრუნება თავდაპირველ ცვლადზე',
          explanation: `ვხსნით $${innerExpr} = ${y1}$ და $${innerExpr} = ${y2}$ განტოლებებს.`,
          latex: `$${varToSolve} = ${parsedSolutions.join('; \\quad ')}$`,
        });
      }
    } else if (mixedAbsMatch) {
      const bStr = mixedAbsMatch[1].replace('*', '');
      const cStr = mixedAbsMatch[2];
      const b = parseFloat(bStr);
      const c = parseFloat(cStr);

      detailedSteps.push({
        title: 'ნაბიჯი 1: ჩანაცვლება',
        explanation: `რადგან $x^2 = |x|^2$, შემოვიღოთ ცვლადი $y = |x| \\ge 0$.`,
        latex: `$y^2 ${b >= 0 ? '+' : ''}${b}y ${c >= 0 ? '+' : ''}${c} = 0$`,
      });

      const D = b * b - 4 * c;
      if (D < -1e-8) {
        detailedSteps.push({
          title: 'ამოხსნა არ აქვს',
          explanation: 'რეალური ფესვები არ არსებობს.',
          latex: `$x \\in \\emptyset$`,
        });
      } else {
        const y1 = (-b - Math.sqrt(D)) / 2;
        const y2 = (-b + Math.sqrt(D)) / 2;
        detailedSteps.push({
          title: 'ნაბიჯი 2: y-ის პოვნა',
          explanation: 'ვიღებთ $y$-ის მნიშვნელობებს:',
          latex: `$y_1 = ${y1}, \\quad y_2 = ${y2}$`,
        });

        const validY = [y1, y2].filter((y) => y >= -1e-8);
        if (validY.length === 0) {
          detailedSteps.push({
            title: 'ამოხსნა არ აქვს',
            explanation: 'რადგან $y = |x| \\ge 0$, უარყოფითი ფესვები არ გვაწყობს.',
            latex: `$x \\in \\emptyset$`,
          });
        } else {
          validY.forEach((y) => {
            const val = Math.max(0, y);
            parsedSolutions.push(val.toString());
            if (val > 1e-8) parsedSolutions.push((-val).toString());
          });
          parsedSolutions = sanitizeSolutions(parsedSolutions);
          detailedSteps.push({
            title: 'ნაბიჯი 3: x-ის პოვნა',
            explanation: 'მოდულის განმარტებიდან გამომდინარე $x = \\pm y$:',
            latex: `$x = ${parsedSolutions.join('; \\quad ')}$`,
          });
        }
      }
    } else if (pureAbsMatch) {
      const inner = pureAbsMatch[1];
      const val = parseFloat(pureAbsMatch[2]);
      if (val < 0) {
        detailedSteps = [
          {
            title: 'არ აქვს ამონახსნი',
            explanation: 'მოდული არ შეიძლება იყოს უარყოფითი.',
            latex: `$${varToSolve} \\in \\emptyset$`,
          },
        ];
      } else if (val === 0) {
        try {
          parsedSolutions = sanitizeSolutions(Array.from(nerdamer.solveEquations(`${inner}=0`, varToSolve)));
        } catch {}
        detailedSteps = [
          { title: 'ნაბიჯი 1: მოდულის მოხსნა', explanation: 'რადგან მნიშვნელობა 0-ია:', latex: `$${inner} = 0$` },
        ];
      } else {
        let s1: string[] = [];
        let s2: string[] = [];
        try {
          s1 = sanitizeSolutions(Array.from(nerdamer.solveEquations(`${inner}=${val}`, varToSolve)));
        } catch {}
        try {
          s2 = sanitizeSolutions(Array.from(nerdamer.solveEquations(`${inner}=-${val}`, varToSolve)));
        } catch {}
        parsedSolutions = [...s1, ...s2];
        detailedSteps = [
          {
            title: 'ნაბიჯი 1: მოდულის ორად გაშლა',
            explanation: 'მოდულიანი განტოლება იშლება ორ შემთხვევად:',
            latex: `$${inner} = ${val} \\quad \\text{ან} \\quad ${inner} = -${val}$`,
          },
          {
            title: 'ნაბიჯი 2: ამოხსნა',
            explanation: 'ორივე განტოლების ამოხსნით ვიღებთ:',
            latex: `$${varToSolve} = ${parsedSolutions.join('; \\quad ')}$`,
          },
        ];
      }
    } else {
      // --- სპეც-ჰენდლერი 5: ბიქვადრატული (x^4) ---
      const biq = extractBiquadratic(diffExpr, varToSolve);
      if (!biq.error && Math.abs(biq.a) > 1e-6) {
        const { a, b, c } = biq;
        const D = b * b - 4 * a * c;
        detailedSteps.push({
          title: 'ნაბიჯი 1: ბიქვადრატული განტოლება',
          explanation: 'ვთქვათ $y = x^2$. მაშინ განტოლება მიიღებს სახეს:',
          latex: `$${a.toFixed(4)}y^2 ${b >= 0 ? '+' : ''}${b.toFixed(4)}y ${c >= 0 ? '+' : ''}${c.toFixed(4)} = 0$`,
        });
        if (D < -1e-8) {
          detailedSteps.push({
            title: 'ამოხსნა არ აქვს',
            explanation: 'დისკრიმინანტი უარყოფითია, რეალური ფესვები არ არსებობს.',
            latex: `$y \\in \\emptyset \\implies x \\in \\emptyset$`,
          });
        } else {
          const y1 = (-b - Math.sqrt(D)) / (2 * a);
          const y2 = (-b + Math.sqrt(D)) / (2 * a);
          detailedSteps.push({
            title: 'ნაბიჯი 2: y-ის მნიშვნელობები',
            explanation: 'კვადრატული ფორმულით ვიღებთ:',
            latex: `$y_1 = ${y1.toFixed(4)}, \\quad y_2 = ${y2.toFixed(4)}$`,
          });

          let hasReal = false;
          if (y1 >= -1e-8) {
            parsedSolutions.push(Math.sqrt(Math.max(0, y1)).toString(), (-Math.sqrt(Math.max(0, y1))).toString());
            hasReal = true;
          }
          if (y2 >= -1e-8) {
            parsedSolutions.push(Math.sqrt(Math.max(0, y2)).toString(), (-Math.sqrt(Math.max(0, y2))).toString());
            hasReal = true;
          }

          if (!hasReal) {
            detailedSteps.push({
              title: 'ნაბიჯი 3: x-ის პოვნა',
              explanation: 'რადგან ყველა $y < 0$, განტოლებას არ აქვს რეალური $x$.',
              latex: `$x \\in \\emptyset$`,
            });
          } else {
            parsedSolutions = sanitizeSolutions(parsedSolutions);
            detailedSteps.push({
              title: 'ნაბიჯი 3: x-ის პოვნა',
              explanation: 'ვინაიდან $x = \\pm \\sqrt{y}$ და $y \\ge 0$, საბოლოოდ გვაქვს:',
              latex: `$x = ${parsedSolutions.join('; \\quad ')}$`,
            });
          }
        }
      }
      // --- სპეც-ჰენდლერი 6: სტანდარტული, რაციონალური და არასრული კვადრატული ---
      else {
        const quad = extractQuadratic(diffExpr, varToSolve);
        if (!quad.error) {
          const { a, b, c } = quad;

          if (cleanedEq.includes('/')) {
            detailedSteps.push({
              title: 'ნაბიჯი 1: მნიშვნელიდან გათავისუფლება',
              explanation: 'გავაერთმნიშვნელიანოთ და დავიყვანოთ სტანდარტულ კვადრატულ ფორმამდე.',
              latex: `$${a.toFixed(4)}${varToSolve}^2 ${b >= 0 ? '+' : ''}${b.toFixed(4)}${varToSolve} ${c >= 0 ? '+' : ''}${c.toFixed(4)} = 0$`,
            });
          } else {
            detailedSteps.push({
              title: 'ნაბიჯი 1: სტანდარტული ფორმა',
              explanation: 'განტოლება მოვიყვანოთ $ax^2 + bx + c = 0$ სახით:',
              latex: `$${a.toFixed(4)}${varToSolve}^2 ${b >= 0 ? '+' : ''}${b.toFixed(4)}${varToSolve} ${c >= 0 ? '+' : ''}${c.toFixed(4)} = 0$`,
            });
          }

          // არასრული: b = 0
          if (Math.abs(a) > 1e-8 && Math.abs(b) < 1e-8) {
            detailedSteps.push({
              title: 'ნაბიჯი 2: არასრული კვადრატული ($b=0$)',
              explanation: 'გადავიტანოთ თავისუფალი წევრი და ამოვიღოთ ფესვი:',
              latex: `$${a.toFixed(4)}${varToSolve}^2 = ${(-c).toFixed(4)} \\implies ${varToSolve}^2 = ${(-c / a).toFixed(4)}$`,
            });
            if (-c / a < -1e-8) {
              detailedSteps.push({
                title: 'ნაბიჯი 3: ამონახსნი არ აქვს',
                explanation: 'კვადრატი ვერ იქნება უარყოფითი.',
                latex: `$${varToSolve} \\in \\emptyset$`,
              });
            } else {
              const root = Math.sqrt(-c / a);
              parsedSolutions = [root.toString(), (-root).toString()];
            }
          }
          // არასრული: c = 0
          else if (Math.abs(a) > 1e-8 && Math.abs(c) < 1e-8) {
            detailedSteps.push({
              title: 'ნაბიჯი 2: არასრული კვადრატული ($c=0$)',
              explanation: `გავიტანოთ $${varToSolve}$ ფრჩხილებს გარეთ:`,
              latex: `$${varToSolve}(${a.toFixed(4)}${varToSolve} ${b >= 0 ? '+' : ''}${b.toFixed(4)}) = 0$`,
            });
            parsedSolutions = ['0', (-b / a).toString()];
          }
          // სტანდარტული: a, b, c
          else if (Math.abs(a) > 1e-8) {
            const D = b * b - 4 * a * c;
            detailedSteps.push({
              title: 'ნაბიჯი 2: დისკრიმინანტი',
              explanation: `$D = b^2 - 4ac = (${b.toFixed(4)})^2 - 4(${a.toFixed(4)})(${c.toFixed(4)}) = ${D.toFixed(4)}$`,
              latex: `$D = ${D.toFixed(4)}$`,
            });
            if (D < -1e-8) {
              detailedSteps.push({
                title: 'ნაბიჯი 3: ამონახსნი არ აქვს',
                explanation: 'რადგან $D < 0$, რეალური ფესვები არ არსებობს.',
                latex: `$${varToSolve} \\in \\emptyset$`,
              });
            } else {
              const sqrtD = Math.sqrt(D);
              parsedSolutions = [((-b - sqrtD) / (2 * a)).toString(), ((-b + sqrtD) / (2 * a)).toString()];
              detailedSteps.push({
                title: 'ნაბიჯი 3: ფესვების ფორმულა',
                explanation: `$${varToSolve} = \\frac{-b \\pm \\sqrt{D}}{2a}$`,
                latex: `$${varToSolve} = \\frac{-(${b.toFixed(4)}) \\pm \\sqrt{${D.toFixed(4)}}}{${(2 * a).toFixed(4)}}$`,
              });
            }
          } else {
            // წრფივი
            if (Math.abs(b) > 1e-8) {
              parsedSolutions = [(-c / b).toString()];
              detailedSteps.push({
                title: 'ეს წრფივი განტოლებაა',
                explanation: `$${b.toFixed(4)}${varToSolve} + ${c.toFixed(4)} = 0$`,
                latex: `$${varToSolve} = ${(-c / b).toFixed(4)}$`,
              });
            }
          }

          // თუ განტოლებაში იყო ირაციონალური რიცხვები (მაგ. sqrt(3)), nerdamer-ს დავაბრუნებინოთ ზუსტი სიმბოლური პასუხი
          if (cleanedEq.includes('sqrt')) {
            try {
              parsedSolutions = sanitizeSolutions(Array.from(nerdamer.solveEquations(cleanedEq, varToSolve)));
            } catch {}
          } else {
            parsedSolutions = sanitizeSolutions(parsedSolutions);
          }
        } else {
          // --- Fallback უცნობი სტრუქტურებისთვის ---
          try {
            const result = nerdamer.solveEquations(cleanedEq, varToSolve);
            parsedSolutions = sanitizeSolutions(Array.isArray(result) ? result : [result]);
            if (parsedSolutions.length > 0) {
              detailedSteps = [
                {
                  title: 'ნაბიჯი 1: ალგებრული ამოხსნა',
                  explanation: 'ზოგადი ალგებრული გარდაქმნებით და ფესვების ამოღებით:',
                  latex: `$${parsedSolutions.map((s, i) => `${varToSolve}_{${i + 1}} = ${s}`).join(', \\quad ')}$`,
                },
              ];
            }
          } catch {}
        }
      }
    }

    if (
      parsedSolutions.length > 0 &&
      detailedSteps.length > 0 &&
      !detailedSteps[detailedSteps.length - 1].title.includes('ამონახსნი არ აქვს') &&
      !detailedSteps[detailedSteps.length - 1].title.includes('ალგებრული')
    ) {
      detailedSteps.push({
        title: 'საბოლოო პასუხი',
        explanation: 'ნაპოვნი ფესვები:',
        latex: `$${parsedSolutions.map((s, i) => `${varToSolve}_{${i + 1}} = ${s}`).join(', \\quad ')}$`,
      });
    }

    setSolutions(parsedSolutions.length > 0 ? parsedSolutions : null);
    setError(parsedSolutions.length === 0 && detailedSteps.length === 0);
    setSteps(detailedSteps);

    setGraphExpr(diffExpr);
    setShowGraph(true);

    if (parsedSolutions.length > 0) {
      const newItem = { equation: cleanedEq, variable: varToSolve, solutions: parsedSolutions };
      const newHistory = [newItem, ...history.filter((h) => h.equation !== cleanedEq)].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('quadratic-history', JSON.stringify(newHistory));
    }
    setShowKeyboard(false);
  };

  const insertText = (text: string) => {
    if (text === 'BACKSPACE') {
      setEquation((prev) => prev.slice(0, -1));
      return;
    }
    setEquation((prev) => prev + text);
  };

  return (
    <div className="min-h-screen bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={localePath(locale, '/tools')}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy dark:text-sky-400">
          <ArrowLeft className="size-4" /> ხელსაწყოებზე დაბრუნება
        </Link>
        <div className="mt-5">
          <PageHero icon={Calculator} eyebrow="კვადრატული კალკულატორი" title={title} description={description} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink dark:text-slate-100">განტოლების შეყვანა</h2>
                <button
                  type="button"
                  onClick={() => {
                    setEquation('');
                    setSolutions(null);
                    setSteps([]);
                    setError(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink dark:bg-slate-800 dark:text-slate-200">
                  <RotateCcw className="size-3.5" /> გასუფთავება
                </button>
              </div>

              <form onSubmit={handleSolve} className="mt-4">
                <div className="flex gap-2">
                  <label className="w-24 shrink-0">
                    <span className="mb-1.5 ml-1 block text-xs font-medium text-muted">ცვლადი</span>
                    <input
                      value={solveFor}
                      onChange={(e) => setSolveFor(e.target.value)}
                      maxLength={3}
                      className={`${fieldClass} text-center font-bold`}
                    />
                  </label>
                  <label className="flex-1">
                    <span className="mb-1.5 ml-1 block text-xs font-medium text-muted">განტოლება</span>
                    <input
                      ref={inputRef}
                      value={equation}
                      onChange={(e) => setEquation(e.target.value)}
                      placeholder="(x-2)(x-3)=0"
                      className={fieldClass}
                    />
                  </label>
                </div>

                {equation && (
                  <div className="mt-3 rounded-xl border border-hairline/60 bg-paper/40 p-2.5 text-center text-xs dark:bg-slate-800/40">
                    <KatexPreview tex={equation} />
                  </div>
                )}

                {error && <p className="mt-2 text-xs text-rose-600">ამოხსნა ვერ მოხერხდა ან არ აქვს ფესვები.</p>}

                <button
                  type="button"
                  onClick={() => setShowKeyboard(!showKeyboard)}
                  className="my-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy dark:text-sky-400">
                  <Keyboard className="size-4" /> ვირტუალური კლავიატურა
                </button>

                {showKeyboard && (
                  <div className="absolute z-10 mt-1 w-full rounded-xl border border-hairline bg-white p-3 shadow-lg dark:bg-slate-900">
                    <div className="flex flex-wrap gap-1">
                      {KEYBOARD_GROUPS.map((g, i) => (
                        <div key={i} className="flex flex-wrap gap-1">
                          {g.keys.map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => insertText(k)}
                              className="rounded-lg border border-hairline px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800">
                              {k === 'BACKSPACE' ? <Delete className="size-3" /> : k}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKeyboard(false)}
                      className="mt-2 text-xs text-muted hover:text-ink">
                      <X className="size-4 inline" /> დახურვა
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong dark:bg-sky-600 dark:hover:bg-sky-500">
                  <CheckCircle2 className="size-4.5" /> ამოხსნა
                </button>
              </form>
            </section>

            {history.length > 0 && (
              <section className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-slate-100">
                    <History className="size-4 text-muted" /> ისტორია
                  </h2>
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('quadratic-history');
                    }}
                    className="text-xs font-medium text-muted hover:text-rose-600">
                    გასუფთავება
                  </button>
                </div>
                <ul className="space-y-2">
                  {history.map((h, i) => (
                    <li key={i}>
                      <button
                        onClick={() => {
                          setEquation(h.equation);
                          setSolveFor(h.variable);
                          handleSolve(undefined, h.equation, h.variable);
                        }}
                        className="group flex w-full items-center justify-between rounded-xl border border-hairline bg-paper px-3 py-2 text-left text-xs transition-all hover:border-navy/30 dark:border-slate-800 dark:bg-slate-800/60">
                        <span className="line-clamp-1 font-mono text-ink group-hover:text-navy dark:text-slate-200 dark:group-hover:text-sky-400">
                          {h.equation}
                        </span>
                        <span className="ml-2 shrink-0 text-[10px] font-semibold text-muted">var: {h.variable}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>

          <div className="space-y-4">
            <section className={panelClass}>
              <h2 className="text-sm font-semibold text-ink dark:text-slate-100">ამონახსნი</h2>
              <div className="mt-4 flex min-h-[8rem] flex-col items-center justify-center rounded-2xl border border-hairline bg-paper/50 p-5 text-center dark:border-slate-800 dark:bg-slate-800/30">
                {solutions && solutions.length > 0 ? (
                  <div className="w-full space-y-4">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                      ნაპოვნი ფესვები ({solveFor}):
                    </p>
                    <div className="flex w-full flex-wrap justify-center gap-3">
                      {solutions.map((sol, idx) => (
                        <div
                          key={idx}
                          className="shadow-xs rounded-xl border border-hairline bg-white px-5 py-3 font-bold text-navy text-base dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400">
                          <KatexPreview tex={`$${solveFor}_{${idx + 1}} = ${sol}$`} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-2 inline-flex size-10 items-center justify-center rounded-xl bg-paper-deep text-muted dark:bg-slate-800">
                      <Calculator className="size-5" />
                    </div>
                    <p className="mx-auto max-w-xs text-xs text-muted">შეიყვანეთ განტოლება შედეგის სანახავად.</p>
                  </div>
                )}
              </div>
            </section>

            {steps.length > 0 && (
              <section className={panelClass}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
                  <ListOrdered className="size-4 text-navy dark:text-sky-400" /> ნაბიჯ-ნაბიჯ ამოხსნა
                </h2>
                <div className="space-y-3">
                  {steps.map((st, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <h3 className="text-xs font-bold text-navy dark:text-sky-400">{st.title}</h3>
                      <p className="text-xs leading-relaxed text-muted">{st.explanation}</p>
                      {st.latex && (
                        <div className="mt-2 overflow-x-auto rounded-lg border border-hairline/80 bg-white p-2.5 text-center dark:border-slate-700 dark:bg-slate-900">
                          <KatexPreview tex={st.latex} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {showGraph && solveFor === 'x' && graphExpr && (
              <section className={panelClass}>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink dark:text-slate-100">
                  <LineChart className="size-4 text-navy dark:text-sky-400" /> გრაფიკული ხედი
                </h2>
                <div className="overflow-hidden rounded-2xl border border-hairline bg-white p-2 shadow-inner dark:border-slate-800 dark:bg-slate-950">
                  <MiniGraph expression={graphExpr} />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniGraph({ expression }: { expression: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hostRef.current || !expression) return;
    let disposed = false;
    async function draw() {
      try {
        const mod = await import('function-plot');
        const functionPlot = mod.default;
        if (disposed || !hostRef.current) return;
        const isDark = document.documentElement.classList.contains('dark');
        hostRef.current.replaceChildren();
        functionPlot({
          target: hostRef.current,
          width: hostRef.current.clientWidth || 400,
          height: 280,
          grid: true,
          xAxis: { domain: [-6, 6] },
          yAxis: { domain: [-6, 6] },
          data: [{ fn: expression, color: isDark ? '#38bdf8' : '#2563eb', graphType: 'polyline' }],
        });
        setError(false);
      } catch {
        setError(true);
      }
    }
    draw();
    return () => {
      disposed = true;
    };
  }, [expression]);

  if (error)
    return <div className="p-4 text-center text-xs font-medium text-rose-500">გრაფიკის აგება ვერ მოხერხდა.</div>;
  return (
    <div
      ref={hostRef}
      className="flex w-full justify-center [&_svg]:block [&_svg]:max-w-full dark:[&_.domain]:stroke-slate-600 dark:[&_.grid]:stroke-slate-800 dark:[&_.origin]:stroke-slate-400 dark:[&_.tick_line]:stroke-slate-700 dark:[&_.tick_text]:fill-slate-400"
    />
  );
}
