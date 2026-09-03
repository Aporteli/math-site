import { solveParametric, hasParameters } from '../core/parametric.ts';
import { parseSymExpr } from '../core/symbolic.ts';
import { solveQuadratic } from '../core/solver.ts';

console.log('hasParams a:', hasParameters('x^2-2(a-1)x+a+5=0', 'x'));
try {
  const p = solveParametric('x^2 - 2(a-1)x + a + 5 = 0', 'x');
  console.log('parametric D:', p.discLatex);
  console.log('params:', p.params);
} catch (e) {
  console.log('param err', e.message);
}

try {
  parseSymExpr('sqrt(x^2-3x+5)+x^2', 'x');
  console.log('sqrt should have thrown');
} catch (e) {
  console.log('sqrt ERROR (good):', e.message);
}

try {
  const r = solveQuadratic('x^2-5x+6=0', 'x');
  console.log('numeric roots:', r.roots.map((x) => x.exact).join(', '));
} catch (e) {
  console.log('num err', e.message);
}
