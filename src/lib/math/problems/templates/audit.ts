import { generateFromTemplate } from '../algorithms';
import { adaptExternalTemplate, parseTeacherJson } from './adapt';
import { problemTemplateSchema, type ProblemTemplate } from './schema';

export interface ImportIssue {
  item: string;
  path: string;
  message: string;
}

const MAX_ISSUES = 120;

function pathOf(path: readonly PropertyKey[]) {
  return path.map(String).filter(Boolean).join('.') || '(root)';
}

function itemLabel(raw: unknown, index: number) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const id = (raw as { id?: unknown }).id;
    if (typeof id === 'string' && id.trim()) {
      return `${index + 1}. ${id.trim()}`;
    }
  }
  return `${index + 1}.`;
}

function auditAdapted(raw: unknown, item: string): ImportIssue[] {
  const adapted = adaptExternalTemplate(raw);
  const parsed = problemTemplateSchema.safeParse(adapted);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => ({
      item,
      path: pathOf(issue.path),
      message: issue.message,
    }));
  }
  return auditSampling(parsed.data, item);
}

function auditSampling(template: ProblemTemplate, item: string): ImportIssue[] {
  const issues: ImportIssue[] = [];
  if (template.variants.length === 0) {
    issues.push({
      item,
      path: 'variants',
      message: 'no variants',
    });
    return issues;
  }
  template.variants.forEach((variant, index) => {
    const path = variant.id ? `variants.${variant.id}` : `variants.${index}`;
    try {
      const created = generateFromTemplate(template, { count: 1, seed: 1 }, { pinVariant: true, variantIndex: index });
      if (created.length === 0) {
        issues.push({
          item,
          path,
          message: 'sampling produced no problem',
        });
      }
    } catch (error) {
      issues.push({
        item,
        path,
        message: error instanceof Error ? error.message : 'sampling failed',
      });
    }
  });
  return issues;
}

export function auditImportJson(raw: string): ImportIssue[] {
  let parsed: unknown;
  try {
    parsed = parseTeacherJson(raw);
  } catch (error) {
    return [
      {
        item: 'JSON',
        path: '(root)',
        message: error instanceof Error ? error.message : 'invalid JSON',
      },
    ];
  }

  const docs = Array.isArray(parsed) ? parsed : [parsed];
  if (docs.length === 0) {
    return [{ item: 'JSON', path: '(root)', message: 'empty list' }];
  }

  const issues: ImportIssue[] = [];
  for (let index = 0; index < docs.length; index += 1) {
    issues.push(...auditAdapted(docs[index], itemLabel(docs[index], index)));
    if (issues.length >= MAX_ISSUES) break;
  }
  return issues.slice(0, MAX_ISSUES);
}
