import { replaceTokens } from "@/lib/math/problems";
import type { ImportIssue, ProblemBankCopy } from "@/lib/math/problems";

export function AuditPanel({
  copy,
  issues,
}: {
  copy: ProblemBankCopy["importFamily"];
  issues: ImportIssue[];
}) {
  const groups = issues.reduce<Record<string, ImportIssue[]>>((acc, issue) => {
    const list = acc[issue.item] ?? [];
    list.push(issue);
    acc[issue.item] = list;
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-brass/25 bg-brass-tint px-4 py-3">
      <p className="text-xs font-semibold tracking-wide text-brass">
        {copy.auditTitle}
      </p>
      <p className="mt-1 text-sm text-brass-strong">{copy.auditHint}</p>
      <p className="mt-1 text-xs text-muted">
        {replaceTokens(copy.auditCount, { count: issues.length })}
      </p>
      <ul className="mt-3 max-h-64 space-y-3 overflow-y-auto">
        {Object.entries(groups).map(([item, rows]) => (
          <li key={item}>
            <p className="text-xs font-semibold text-ink">{item}</p>
            <ul className="mt-1 space-y-1 font-mono text-xs text-ink">
              {rows.map((row, index) => (
                <li key={`${item}-${row.path}-${index}`}>
                  <span className="text-muted">{row.path}</span>
                  {": "}
                  {row.message}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
