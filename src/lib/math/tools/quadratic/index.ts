/**
 * აკადემიური კვადრატული კალკულატორი — საჯარო API
 */

import { solveQuadratic, verifyRoot } from './core/solver';
import { parseQuadraticEquation } from './core/parser';
import {
  generateDiscriminantSteps,
  generateCompleteSquareSteps,
  generateVietaSteps,
  generateFactoringSteps,
  generateAllMethods,
} from './steps/generator';
import { buildAnalysisTable, graphData, type AnalysisRow } from './analysis/panel';
import { exportLaTeX, exportMarkdown, exportPlainSummary } from './export/report';
import { formatRoot, rootsToLatex } from './utils/formatting';
import { solveParametric, hasParameters, type ParametricSolution } from './core/parametric';

export {
  solveQuadratic,
  verifyRoot,
  parseQuadraticEquation,
  generateDiscriminantSteps,
  generateCompleteSquareSteps,
  generateVietaSteps,
  generateFactoringSteps,
  generateAllMethods,
  buildAnalysisTable,
  graphData,
  exportLaTeX,
  exportMarkdown,
  exportPlainSummary,
  formatRoot,
  rootsToLatex,
  solveParametric,
  hasParameters,
};

export type { AnalysisRow, ParametricSolution };

export type {
  QuadraticSolution,
  ExactRoot,
  SolutionStep,
  MethodSolution,
  MethodId,
  ParabolaAnalysis,
  QuadraticClassification,
} from './types/quadratic';

export type SolveResult =
  | {
      mode: 'numeric';
      solution: ReturnType<typeof solveQuadratic>;
      methods: ReturnType<typeof generateAllMethods>;
      analysisRows: AnalysisRow[];
      graph: ReturnType<typeof graphData>;
      markdown: string;
      latex: string;
      summary: string;
    }
  | {
      mode: 'parametric';
      parametric: ParametricSolution;
      methods: { method: 'discriminant'; title: string; steps: ParametricSolution['steps']; finalRoots: [] }[];
      analysisRows: AnalysisRow[];
      graph: null;
      markdown: string;
      latex: string;
      summary: string;
      solution: null;
    };

function parametricMarkdown(p: ParametricSolution): string {
  let md = `# პარამეტრული კვადრატული განტოლება\n\n`;
  md += `## განტოლება\n\n\`${p.original}\`\n\n`;
  md += `## სტანდარტული სახე\n\n$$\n${p.standardLatex}\n$$\n\n`;
  md += `## კოეფიციენტები\n\n$$A = ${p.aLatex},\\quad B = ${p.bLatex},\\quad C = ${p.cLatex}$$\n\n`;
  md += `## დისკრიმინანტი\n\n$$D = ${p.discLatex}$$\n\n`;
  md += `## ფესვები\n\n$$\n${p.variable}_1 = ${p.root1Latex},\\quad ${p.variable}_2 = ${p.root2Latex}\n$$\n\n`;
  md += `## ვიეტა\n\n$$${p.variable}_1+${p.variable}_2 = ${p.sumLatex},\\quad ${p.variable}_1${p.variable}_2 = ${p.prodLatex}$$\n\n`;
  if (p.analysisNote) md += `## შენიშვნა\n\n${p.analysisNote}\n`;
  return md;
}

function parametricSummary(p: ParametricSolution): string {
  return [
    `პარამეტრული: ${p.original}`,
    `პარამეტრები: ${p.params.join(', ') || '—'}`,
    `A = ${p.aLatex}`,
    `B = ${p.bLatex}`,
    `C = ${p.cLatex}`,
    `D = ${p.discLatex}`,
    `${p.variable}1 = ${p.root1Latex}`,
    `${p.variable}2 = ${p.root2Latex}`,
  ].join('\n');
}

/** ერთიანი API: ავტომატურად ირჩევს რიცხვით ან პარამეტრულ რეჟიმს */
export function solve(input: string, variable = 'x'): SolveResult {
  let cleaned = input.replace(/\$/g, '').trim();
  // normalize common latex
  cleaned = cleaned.replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)');
  cleaned = cleaned.replace(/\\cdot/g, '*').replace(/\\times/g, '*');

  const lower = cleaned.toLowerCase();
  for (const fn of ['sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln', 'exp']) {
    if (lower.includes(fn)) {
      throw new Error(
        `ფუნქცია "${fn}" ამ კალკულატორში არაა მხარდაჭერილი. მხოლოდ კვადრატული პოლინომი: a x^2 + b x + c = 0 (რიცხვები ან პარამეტრები).`,
      );
    }
  }

  if (hasParameters(cleaned, variable)) {
    const parametric = solveParametric(cleaned, variable);
    const analysisRows: AnalysisRow[] = [
      { label: 'რეჟიმი', valueLatex: '\\text{პარამეტრული}' },
      { label: 'პარამეტრები', valueLatex: parametric.params.map((x) => x).join(', ') || '—' },
      { label: 'A', valueLatex: parametric.aLatex },
      { label: 'B', valueLatex: parametric.bLatex },
      { label: 'C', valueLatex: parametric.cLatex },
      { label: 'დისკრიმინანტი', valueLatex: parametric.discLatex },
      { label: 'ფესვი 1', valueLatex: parametric.root1Latex },
      { label: 'ფესვი 2', valueLatex: parametric.root2Latex },
      { label: 'ჯამი (ვიეტა)', valueLatex: parametric.sumLatex },
      { label: 'ნამრავლი (ვიეტა)', valueLatex: parametric.prodLatex },
    ];
    if (parametric.analysisNote) {
      analysisRows.push({ label: 'ბუნება', valueLatex: '\\text{იხ. D-ს ნიშანი}', note: parametric.analysisNote });
    }
    return {
      mode: 'parametric',
      parametric,
      solution: null,
      methods: [
        {
          method: 'discriminant',
          title: 'პარამეტრული ამოხსნა',
          steps: parametric.steps,
          finalRoots: [],
        },
      ],
      analysisRows,
      graph: null,
      markdown: parametricMarkdown(parametric),
      latex: parametricMarkdown(parametric),
      summary: parametricSummary(parametric),
    };
  }

  const sol = solveQuadratic(cleaned, variable);
  const methods = generateAllMethods(sol);
  const analysisRows = buildAnalysisTable(sol);
  const graph = graphData(sol);
  return {
    mode: 'numeric',
    solution: sol,
    methods,
    analysisRows,
    graph,
    markdown: exportMarkdown(sol, methods),
    latex: exportLaTeX(sol, methods),
    summary: exportPlainSummary(sol),
  };
}
