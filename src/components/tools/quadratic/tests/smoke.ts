import { solveQuadratic } from '../core/solver';
import { generateAllMethods } from '../steps/generator';
import { buildAnalysisTable } from '../analysis/panel';
import { exportMarkdown, exportPlainSummary } from '../export/report';

const cases = [
  'x^2 - 5x + 6 = 0',
  'x^2 - 6x + 9 = 0',
  'x^2 + 4x + 8 = 0',
  '2x^2 - 18 = 0',
  '3x^2 + 12x = 0',
  '5 + 2x^2 - 7x = 3',
  'x^2 + 1 = 0',
  '2x + 4 = 0',
  '0 = 0',
  '5 = 3',
];

console.log('=== Smoke tests ===\n');

for (const input of cases) {
  try {
    const r = solveQuadratic(input);
    console.log('─'.repeat(60));
    console.log('Input:', input);
    console.log('Standard:', r.equation.standardForm);
    console.log('Class:', r.classification);
    console.log('D:', r.discriminantExact);
    console.log('Roots:', r.roots.map((x) => x.exact).join(' , '));
    console.log('Verified:', r.verified);
    console.log('Vertex:', r.analysis.vertex.x.exact, r.analysis.vertex.y.exact);
    if (r.factorization) console.log('Factor:', r.factorization);

    const methods = generateAllMethods(r);
    console.log('Methods available:', methods.map((m) => m.title).join(' | '));
    console.log('Steps (discriminant):', methods[0].steps.length);
  } catch (e: any) {
    console.log('ERROR on', input, '→', e.message);
  }
}

console.log('\n=== Sample Markdown export ===\n');
const sample = solveQuadratic('x^2 - 5x + 6 = 0');
console.log(exportPlainSummary(sample));
console.log('\n--- Markdown (first 800 chars) ---\n');
console.log(exportMarkdown(sample).slice(0, 800));
