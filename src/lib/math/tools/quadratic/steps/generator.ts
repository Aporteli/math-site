import type {
  ExactRoot,
  MethodSolution,
  QuadraticSolution,
  SolutionStep,
} from '../types/quadratic';
import {
  add,
  cmp,
  div,
  FOUR,
  mul,
  neg,
  perfectSquareRational,
  rat,
  sub,
  toDecimal,
  toFraction,
  ZERO,
  TWO,
  ONE,
  isZero,
  isPositive,
  isNegative,
  simplifySqrtRational,
  toFractionPlain,
} from '../core/rational';

function coeffTex(r: ReturnType<typeof rat>, showPlus = false): string {
  const t = toFraction(r);
  if (showPlus && r.n > 0) return `+ ${t}`;
  return t;
}

function formatStandardLatex(
  a: ReturnType<typeof rat>,
  b: ReturnType<typeof rat>,
  c: ReturnType<typeof rat>,
  variable: string,
): string {
  const parts: string[] = [];
  // a x²
  if (!isZero(a)) {
    if (a.n === a.d) parts.push(`${variable}^{2}`);
    else if (a.n === -a.d) parts.push(`-${variable}^{2}`);
    else parts.push(`${toFraction(a)}${variable}^{2}`);
  }
  // b x
  if (!isZero(b)) {
    const bt = toFraction(b);
    if (b.n === b.d) parts.push(parts.length ? `+ ${variable}` : variable);
    else if (b.n === -b.d) parts.push(`- ${variable}`);
    else if (b.n > 0) parts.push(parts.length ? `+ ${bt}${variable}` : `${bt}${variable}`);
    else parts.push(`${bt}${variable}`);
  }
  // c
  if (!isZero(c)) {
    const ct = toFraction(c);
    if (c.n > 0) parts.push(parts.length ? `+ ${ct}` : ct);
    else parts.push(ct);
  }
  if (!parts.length) return '0';
  return parts.join(' ');
}

/** დისკრიმინანტის მეთოდი — სრული აკადემიური ნაბიჯები */
export function generateDiscriminantSteps(sol: QuadraticSolution): MethodSolution {
  const { equation, discriminant: D, roots, classification } = sol;
  const { a, b, c, variable } = equation;
  const steps: SolutionStep[] = [];

  steps.push({
    title: 'ნაბიჯი 1: სტანდარტული სახე',
    explanation: `განტოლება მოვიყვანოთ სტანდარტულ სახეზე $a${variable}^{2} + b${variable} + c = 0$.`,
    latex: `${formatStandardLatex(a, b, c, variable)} = 0`,
  });

  steps.push({
    title: 'ნაბიჯი 2: კოეფიციენტების იდენტიფიკაცია',
    explanation: 'გამოვყოთ კოეფიციენტები:',
    latex: `a = ${toFraction(a)}, \\quad b = ${toFraction(b)}, \\quad c = ${toFraction(c)}`,
  });

  steps.push({
    title: 'ნაბიჯი 3: დისკრიმინანტის გამოთვლა',
    explanation: 'დისკრიმინანტი გამოითვლება ფორმულით $D = b^{2} - 4ac$.',
    latex: `D = \\left(${toFraction(b)}\\right)^{2} - 4\\cdot\\left(${toFraction(a)}\\right)\\cdot\\left(${toFraction(c)}\\right) = ${toFraction(D)}`,
  });

  // Nature of roots
  if (cmp(D, ZERO) > 0) {
    steps.push({
      title: 'ნაბიჯი 4: ფესვების ბუნება',
      explanation: 'რადგან $D > 0$, განტოლებას აქვს ორი განსხვავებული ნამდვილი ფესვი.',
      latex: `D = ${toFraction(D)} > 0 \\implies \\text{ორი განსხვავებული ნამდვილი ფესვი}`,
    });
  } else if (cmp(D, ZERO) === 0) {
    steps.push({
      title: 'ნაბიჯი 4: ფესვების ბუნება',
      explanation: 'რადგან $D = 0$, განტოლებას აქვს ერთი (ორმაგი) ნამდვილი ფესვი.',
      latex: `D = 0 \\implies \\text{ერთი ორმაგი ნამდვილი ფესვი}`,
    });
  } else {
    steps.push({
      title: 'ნაბიჯი 4: ფესვების ბუნება',
      explanation: 'რადგან $D < 0$, განტოლებას აქვს ორი კომპლექსური შეუღლებული ფესვი.',
      latex: `D = ${toFraction(D)} < 0 \\implies \\text{ორი კომპლექსური ფესვი}`,
    });
  }

  // Roots formula
  steps.push({
    title: 'ნაბიჯი 5: ფესვების ფორმულა',
    explanation: 'კვადრატული ფორმულა:',
    latex: `${variable}_{1,2} = \\dfrac{-b \\pm \\sqrt{D}}{2a}`,
  });

  if (classification === 'two-real-distinct' || classification === 'one-real-double') {
    const rootLatex = roots.map((r, i) => `${variable}_{${i + 1}} = ${r.exact}`).join(', \\quad ');
    steps.push({
      title: 'ნაბიჯი 6: ფესვების გამოთვლა',
      explanation: 'ჩავსვათ მნიშვნელობები და გამოვთვალოთ:',
      latex: rootLatex,
    });
  } else {
    const rootLatex = roots.map((r, i) => `${variable}_{${i + 1}} = ${r.exact}`).join(', \\quad ');
    steps.push({
      title: 'ნაბიჯი 6: კომპლექსური ფესვები',
      explanation: 'გამოვიყენოთ $\\sqrt{D} = i\\sqrt{|D|}$:',
      latex: rootLatex,
    });
  }

  // Verification
  steps.push({
    title: 'ნაბიჯი 7: შემოწმება',
    explanation:
      sol.verified ?
        'რაციონალური ფესვები შემოწმებულია ჩასმით — განტოლება სრულდება.'
      : 'ფესვები მიღებულია ანალიტიკურად კვადრატული ფორმულით.',
    latex: sol.factorization ? `${variable} = ${roots.map((r) => r.exact).join(', \\; ')}` : undefined,
  });

  return {
    method: 'discriminant',
    title: 'დისკრიმინანტის მეთოდი',
    steps,
    finalRoots: roots,
  };
}

/** კვადრატის შევსების მეთოდი */
export function generateCompleteSquareSteps(sol: QuadraticSolution): MethodSolution {
  const { equation, roots, discriminant: D } = sol;
  const { a, b, c, variable } = equation;
  const steps: SolutionStep[] = [];

  steps.push({
    title: 'ნაბიჯი 1: სტანდარტული სახე',
    explanation: 'დავიწყოთ სტანდარტული სახით:',
    latex: `${formatStandardLatex(a, b, c, variable)} = 0`,
  });

  // Divide by a if a ≠ 1
  let A = a,
    B = b,
    C = c;
  if (!(a.n === a.d)) {
    steps.push({
      title: 'ნაბიჯი 2: გაყოფა წამყვან კოეფიციენტზე',
      explanation: `გავყოთ ყველა წევრი $a = ${toFraction(a)}$-ზე, რათა მივიღოთ მონიკური პოლინომი:`,
      latex: `${variable}^{2} + ${toFraction(div(b, a))}${variable} + ${toFraction(div(c, a))} = 0`,
    });
    B = div(b, a);
    C = div(c, a);
    A = ONE;
  } else {
    steps.push({
      title: 'ნაბიჯი 2: მონიკური ფორმა',
      explanation: 'წამყვანი კოეფიციენტი უკვე 1-ის ტოლია.',
      latex: `${variable}^{2} + ${toFraction(b)}${variable} + ${toFraction(c)} = 0`,
    });
  }

  // Move constant
  steps.push({
    title: 'ნაბიჯი 3: თავისუფალი წევრის გადატანა',
    explanation: 'თავისუფალი წევრი გადავიტანოთ მარჯვენა მხარეს:',
    latex: `${variable}^{2} + ${toFraction(B)}${variable} = ${toFraction(neg(C))}`,
  });

  // Complete the square: add (B/2)²
  const halfB = div(B, TWO);
  const halfBSq = mul(halfB, halfB);
  steps.push({
    title: 'ნაბიჯი 4: კვადრატის შევსება',
    explanation: `დავამატოთ $\\left(\\dfrac{b}{2}\\right)^{2} = \\left(${toFraction(halfB)}\\right)^{2} = ${toFraction(halfBSq)}$ ორივე მხარეს:`,
    latex: `${variable}^{2} + ${toFraction(B)}${variable} + ${toFraction(halfBSq)} = ${toFraction(neg(C))} + ${toFraction(halfBSq)}`,
  });

  const right = add(neg(C), halfBSq);
  steps.push({
    title: 'ნაბიჯი 5: სრული კვადრატი',
    explanation: 'მარცხენა მხარე არის სრული კვადრატი:',
    latex: `\\left(${variable} + ${toFraction(halfB)}\\right)^{2} = ${toFraction(right)}`,
  });

  if (cmp(right, ZERO) < 0 && classificationIsComplex(sol)) {
    steps.push({
      title: 'ნაბიჯი 6: კომპლექსური ფესვები',
      explanation: 'მარჯვენა მხარე უარყოფითია, ამიტომ ფესვები კომპლექსურია.',
      latex: `${variable} + ${toFraction(halfB)} = \\pm \\sqrt{${toFraction(right)}} = \\pm i\\sqrt{${toFraction(neg(right))}}`,
    });
  } else if (cmp(right, ZERO) === 0) {
    steps.push({
      title: 'ნაბიჯი 6: ერთი ფესვი',
      explanation: 'მარჯვენა მხარე ნულია:',
      latex: `${variable} + ${toFraction(halfB)} = 0 \\implies ${variable} = ${toFraction(neg(halfB))}`,
    });
  } else {
    const sqrtR = simplifySqrtRational(right);
    steps.push({
      title: 'ნაბიჯი 6: კვადრატული ფესვის ამოღება',
      explanation: 'ავიღოთ კვადრატული ფესვი ორივე მხრიდან:',
      latex: `${variable} + ${toFraction(halfB)} = \\pm ${sqrtR.latex}`,
    });
  }

  const rootLatex = roots.map((r, i) => `${variable}_{${i + 1}} = ${r.exact}`).join(', \\quad ');
  steps.push({
    title: 'ნაბიჯი 7: საბოლოო პასუხი',
    explanation: 'გამოვხსნათ $x$-ის მიმართ:',
    latex: rootLatex,
  });

  return {
    method: 'complete_square',
    title: 'კვადრატის შევსების მეთოდი',
    steps,
    finalRoots: roots,
  };
}

function classificationIsComplex(sol: QuadraticSolution): boolean {
  return sol.classification === 'two-complex';
}

/** ვიეტას ფორმულები */
export function generateVietaSteps(sol: QuadraticSolution): MethodSolution {
  const { equation, roots, classification, discriminant: D } = sol;
  const { a, b, c, variable } = equation;
  const steps: SolutionStep[] = [];

  steps.push({
    title: 'ნაბიჯი 1: სტანდარტული სახე',
    explanation: 'განტოლება:',
    latex: `${formatStandardLatex(a, b, c, variable)} = 0`,
  });

  steps.push({
    title: 'ნაბიჯი 2: ვიეტას ფორმულები',
    explanation:
      'თუ $x_1$ და $x_2$ არის განტოლების ფესვები, მაშინ ვიეტას მიხედვით:',
    latex: `x_1 + x_2 = -\\dfrac{b}{a}, \\qquad x_1 \\cdot x_2 = \\dfrac{c}{a}`,
  });

  const sum = div(neg(b), a);
  const prod = div(c, a);

  steps.push({
    title: 'ნაბიჯი 3: ჯამისა და ნამრავლის გამოთვლა',
    explanation: 'ჩავსვათ კოეფიციენტები:',
    latex: `x_1 + x_2 = ${toFraction(sum)}, \\qquad x_1 \\cdot x_2 = ${toFraction(prod)}`,
  });

  if (classification === 'two-complex') {
    steps.push({
      title: 'ნაბიჯი 4: კომპლექსური შემთხვევა',
      explanation: `დისკრიმინანტი უარყოფითია ($D = ${toFraction(D)}$), ამიტომ ფესვები კომპლექსურია. ვიეტას ფორმულები მაინც სამართლიანია კომპლექსურ რიცხვებზე.`,
      latex: roots.map((r, i) => `${variable}_{${i + 1}} = ${r.exact}`).join(', \\quad '),
    });
  } else if (classification === 'one-real-double') {
    steps.push({
      title: 'ნაბიჯი 4: ორმაგი ფესვი',
      explanation: 'რადგან $D = 0$, ორივე ფესვი ტოლია:',
      latex: `x_1 = x_2 = ${roots[0].exact}`,
    });
    steps.push({
      title: 'ნაბიჯი 5: შემოწმება ვიეტათი',
      explanation: 'შევამოწმოთ:',
      latex: `2 \\cdot (${roots[0].exact}) = ${toFraction(sum)}, \\quad (${roots[0].exact})^{2} = ${toFraction(prod)}`,
    });
  } else {
    // Two distinct real roots – try to present them via system
    steps.push({
      title: 'ნაბიჯი 4: სისტემის ამოხსნა',
      explanation: 'გვაქვს სისტემა:',
      latex: `\\begin{cases} x_1 + x_2 = ${toFraction(sum)} \\\\ x_1 x_2 = ${toFraction(prod)} \\end{cases}`,
    });

    // They are roots of t² - (sum)t + prod = 0
    steps.push({
      title: 'ნაბიჯი 5: დამხმარე კვადრატული',
      explanation: `$x_1$ და $x_2$ არის შემდეგი განტოლების ფესვები:`,
      latex: `t^{2} - (${toFraction(sum)})t + (${toFraction(prod)}) = 0`,
    });

    const rootLatex = roots.map((r, i) => `${variable}_{${i + 1}} = ${r.exact}`).join(', \\quad ');
    steps.push({
      title: 'ნაბიჯი 6: ფესვები',
      explanation: 'დისკრიმინანტის მეთოდით (ან უშუალოდ) ვპოულობთ:',
      latex: rootLatex,
    });
  }

  return {
    method: 'vieta',
    title: 'ვიეტას ფორმულები',
    steps,
    finalRoots: roots,
  };
}

/** ფაქტორიზაცია (როცა შესაძლებელია) */
export function generateFactoringSteps(sol: QuadraticSolution): MethodSolution | null {
  if (!sol.factorization) return null;
  const { equation, roots } = sol;
  const { a, b, c, variable } = equation;
  const steps: SolutionStep[] = [];

  steps.push({
    title: 'ნაბიჯი 1: სტანდარტული სახე',
    explanation: 'განტოლება:',
    latex: `${formatStandardLatex(a, b, c, variable)} = 0`,
  });

  steps.push({
    title: 'ნაბიჯი 2: ფაქტორიზაცია',
    explanation: 'პოლინომი იშლება მამრავლებად:',
    latex: `${sol.factorization} = 0`,
  });

  steps.push({
    title: 'ნაბიჯი 3: ნამრავლის ნულოვანი თვისება',
    explanation: 'ნამრავლი ნულის ტოლია მაშინ და მხოლოდ მაშინ, როცა ერთ-ერთი მამრავალი მაინც ნულია.',
    latex: roots.map((r) => `${variable} - (${r.exact}) = 0`).join(' \\quad\\text{ან}\\quad '),
  });

  const rootLatex = roots.map((r, i) => `${variable}_{${i + 1}} = ${r.exact}`).join(', \\quad ');
  steps.push({
    title: 'ნაბიჯი 4: ფესვები',
    explanation: 'აქედან:',
    latex: rootLatex,
  });

  return {
    method: 'factoring',
    title: 'ფაქტორიზაციის მეთოდი',
    steps,
    finalRoots: roots,
  };
}

/** ყველა ხელმისაწვდომი მეთოდი (მხოლოდ ნამდვილი კვადრატულისთვის) */
export function generateAllMethods(sol: QuadraticSolution): MethodSolution[] {
  if (sol.classification === 'linear' || sol.classification === 'identity' || sol.classification === 'inconsistent' || sol.classification === 'not-quadratic') {
    // მარტივი ერთი მეთოდი არაკვადრატული შემთხვევებისთვის
    const steps: SolutionStep[] = [{
      title: 'კლასიფიკაცია',
      explanation: sol.classification === 'linear'
        ? 'ეს არის წრფივი განტოლება (a = 0).'
        : sol.classification === 'identity'
        ? 'ეს არის იდენტობა — ყველა მნიშვნელობა ამონახსნია.'
        : 'განტოლება წინააღმდეგობრივია — ამონახსნი არ აქვს.',
      latex: sol.equation.standardForm.replace(/\*/g, ''),
    }];
    if (sol.roots.length) {
      steps.push({
        title: 'ამონახსნი',
        explanation: 'ფესვი:',
        latex: sol.roots.map(r => r.exact).join(', '),
      });
    }
    return [{
      method: 'discriminant',
      title: 'ამოხსნა',
      steps,
      finalRoots: sol.roots,
    }];
  }
  const methods: MethodSolution[] = [
    generateDiscriminantSteps(sol),
    generateCompleteSquareSteps(sol),
    generateVietaSteps(sol),
  ];
  const factoring = generateFactoringSteps(sol);
  if (factoring) methods.push(factoring);
  return methods;
}
