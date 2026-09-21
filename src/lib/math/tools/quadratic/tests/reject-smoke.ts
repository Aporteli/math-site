import { solve } from '../index';

const cases = [
  'x^2 - 2(a-1)x + a + 5 = 0',
  'sqrt(x^2 - 3x + 5) + x^2 - 3x = 7',
  'x^2 - 5x + 6 = 0',
];

for (const eq of cases) {
  console.log('---');
  console.log('IN:', eq);
  try {
    const r = solve(eq, 'x');
    console.log('mode:', r.mode);
    if (r.mode === 'parametric') {
      console.log('params:', r.parametric.params);
      console.log('D:', r.parametric.discLatex);
    } else {
      console.log('roots:', r.solution!.roots.map((x) => x.exact).join(', '));
    }
  } catch (e: any) {
    console.log('ERROR:', e.message);
  }
}
