import type { QuadraticSolution, MethodSolution } from '../types/quadratic';
import { generateAllMethods } from '../steps/generator';
import { buildAnalysisTable } from '../analysis/panel';
import { toFraction } from '../core/rational';

/** სრული LaTeX ანგარიში */
export function exportLaTeX(sol: QuadraticSolution, methods?: MethodSolution[]): string {
  const allMethods = methods ?? generateAllMethods(sol);
  const table = buildAnalysisTable(sol);
  const { equation, roots } = sol;
  const v = equation.variable;

  let out = `\\documentclass[12pt]{article}
\\usepackage[georgian]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\geometry{margin=2cm}
\\title{კვადრატული განტოლების ამოხსნა}
\\author{აკადემიური კალკულატორი}
\\date{}
\\begin{document}
\\maketitle

\\section*{განტოლება}
\\[
${equation.original.replace(/\\/g, '\\textbackslash{}')}
\\]
სტანდარტული სახე:
\\[
${equation.standardForm.replace(/\*/g, '')}
\\]

\\section*{პასუხი}
\\[
${v} = ${roots.map((r) => r.exact).join(',\\quad ') || '\\emptyset'}
\\]

\\section*{ანალიზი}
\\begin{align*}
`;

  for (const row of table) {
    out += `${row.label} &= ${row.valueLatex} \\\\\n`;
  }
  out += `\\end{align*}\n\n`;

  for (const m of allMethods) {
    out += `\\section*{${m.title}}\n`;
    for (const step of m.steps) {
      out += `\\paragraph{${step.title}} ${step.explanation}\n`;
      if (step.latex) {
        out += `\\[\n${step.latex}\n\\]\n`;
      }
    }
    out += '\n';
  }

  out += `\\end{document}\n`;
  return out;
}

/** Markdown ანგარიში (ქართული) */
export function exportMarkdown(sol: QuadraticSolution, methods?: MethodSolution[]): string {
  const allMethods = methods ?? generateAllMethods(sol);
  const table = buildAnalysisTable(sol);
  const { equation, roots } = sol;
  const v = equation.variable;

  let md = `# კვადრატული განტოლების ამოხსნა

## განტოლება

\`\`\`
${equation.original}
\`\`\`

**სტანდარტული სახე:** \`${equation.standardForm}\`

## პასუხი

$$
${v} = ${roots.map((r) => r.exact).join(',\\quad ') || '\\emptyset'}
$$

## ანალიზი

| თვისება | მნიშვნელობა |
|---------|-------------|
`;

  for (const row of table) {
    md += `| ${row.label} | $${row.valueLatex}$ |\n`;
  }

  md += `\n`;

  for (const m of allMethods) {
    md += `## ${m.title}\n\n`;
    for (const step of m.steps) {
      md += `### ${step.title}\n\n`;
      md += `${step.explanation}\n\n`;
      if (step.latex) {
        md += `$$\n${step.latex}\n$$\n\n`;
      }
    }
  }

  md += `---\n*გენერირებულია აკადემიური კვადრატული კალკულატორით*\n`;
  return md;
}

/** მოკლე ტექსტური პასუხი (კოპირებისთვის) */
export function exportPlainSummary(sol: QuadraticSolution): string {
  const { equation, roots, classification, discriminantExact, analysis } = sol;
  const lines = [
    `განტოლება: ${equation.original}`,
    `სტანდარტული სახე: ${equation.standardForm}`,
    `დისკრიმინანტი: ${discriminantExact}`,
    `კლასიფიკაცია: ${classification}`,
    `ფესვები: ${roots.map((r) => r.exact).join(', ') || '∅'}`,
    `წვერო: (${analysis.vertex.x.exact}, ${analysis.vertex.y.exact})`,
    `სიმეტრიის ღერძი: ${equation.variable} = ${analysis.axisOfSymmetry.exact}`,
    `მიმართულება: ${analysis.direction === 'up' ? 'ზემოთ' : 'ქვემოთ'} (${analysis.extremaType})`,
  ];
  return lines.join('\n');
}
