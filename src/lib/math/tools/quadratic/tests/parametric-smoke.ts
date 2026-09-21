import { solve, hasParameters, solveParametric } from '../index';

const cases = [
  'x^2 - 2(a-1)x + a + 5 = 0',
  'x^2 + (2k)x + k = 0',
  'x^2 - 5x + 6 = 0',
];

for (const eq of cases) {
  console.log('─'.repeat(50));
  console.log('Input:', eq);
  console.log('hasParams:', hasParameters(eq, 'x'));
  try {
    const r = solve(eq, 'x');
    console.log('mode:', r.mode);
    if (r.mode === 'parametric') {
      console.log('params:', r.parametric.params);
      console.log('A:', r.parametric.aLatex);
      console.log('B:', r.parametric.bLatex);
      console.log('C:', r.parametric.cLatex);
      console.log('D:', r.parametric.discLatex);
      console.log('x1:', r.parametric.root1Latex);
      console.log('x2:', r.parametric.root2Latex);
      console.log('steps:', r.parametric.steps.length);
    } else {
      console.log('roots:', r.solution.roots.map((x) => x.exact).join(', '));
    }
  } catch (e: any) {
    console.log('ERROR', e.message);
  }
}
