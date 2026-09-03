'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { deleteTaxonomyNodeAction, upsertTaxonomyNodeAction } from '@/lib/math/problems/actions';
import {
  childrenOf,
  taxonomySlugFromName,
  TAXONOMY_LEVELS,
  type TaxonomyLevel,
  type TaxonomyNodeDto,
} from '@/lib/math/problems/taxonomy-shared';
import type { Locale } from '@/i18n/config';

type TaxonomyCopy = {
  title: string;
  subtitle: string;
  levels: Record<TaxonomyLevel, string>;
  nameKa: string;
  nameEn: string;
  nameRu: string;
  slug: string;
  parent: string;
  add: string;
  remove: string;
  empty: string;
  saved: string;
  error: string;
  selectParent: string;
};

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15';

function labelFor(node: TaxonomyNodeDto, locale: Locale) {
  if (locale === 'en') return node.nameEn;
  if (locale === 'ru') return node.nameRu;
  return node.nameKa;
}

export function TaxonomyManager({
  locale,
  copy,
  initialNodes,
  embedded = false,
}: {
  locale: Locale;
  copy: TaxonomyCopy;
  initialNodes: TaxonomyNodeDto[];
  embedded?: boolean;
}) {
  const [nodes, setNodes] = useState(initialNodes);
  const [level, setLevel] = useState<TaxonomyLevel>('topic');
  const [parentId, setParentId] = useState('');
  const [nameKa, setNameKa] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parentLevel =
    level === 'branch' ? null : level === 'topic' ? 'branch' : level === 'subtopic' ? 'topic' : 'subtopic';

  const parentOptions = useMemo(() => {
    if (!parentLevel) return [];
    return nodes.filter((node) => node.level === parentLevel);
  }, [nodes, parentLevel]);

  const tree = useMemo(() => {
    const branches = childrenOf(nodes, null, 'branch');
    return branches.map((branch) => ({
      branch,
      topics: childrenOf(nodes, branch.id, 'topic').map((topic) => ({
        topic,
        subtopics: childrenOf(nodes, topic.id, 'subtopic').map((subtopic) => ({
          subtopic,
          concepts: childrenOf(nodes, subtopic.id, 'concept'),
        })),
      })),
    }));
  }, [nodes]);

  async function onAdd() {
    setBusy(true);
    setNotice(null);
    const generatedSlug = taxonomySlugFromName(nameEn || nameKa || nameRu);
    const result = await upsertTaxonomyNodeAction({
      level,
      slug: generatedSlug,
      nameKa,
      nameEn,
      nameRu,
      parentId: parentLevel ? parentId || null : null,
    });
    setBusy(false);
    if (!result.ok) {
      setNotice(copy.error);
      return;
    }
    setNodes((current) => [...current, result.node]);
    setNameKa('');
    setNameEn('');
    setNameRu('');
    setNotice(copy.saved);
  }

  async function onRemove(id: string) {
    setBusy(true);
    setNotice(null);
    const result = await deleteTaxonomyNodeAction(id);
    setBusy(false);
    if (!result.ok) {
      setNotice(copy.error);
      return;
    }
    setNodes((current) => {
      const remove = new Set<string>([id]);
      let growing = true;
      while (growing) {
        growing = false;
        for (const node of current) {
          if (node.parentId && remove.has(node.parentId) && !remove.has(node.id)) {
            remove.add(node.id);
            growing = true;
          }
        }
      }
      return current.filter((node) => !remove.has(node.id));
    });
  }

  return (
    <div className="space-y-6">
      {embedded ? null : (
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{copy.title}</h1>
          <p className="mt-1 text-sm text-body">{copy.subtitle}</p>
        </header>
      )}

      <section className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            {copy.levels[level]}
            <select
              className={`${fieldClass} mt-1.5`}
              value={level}
              onChange={(event) => {
                setLevel(event.target.value as TaxonomyLevel);
                setParentId('');
              }}>
              {TAXONOMY_LEVELS.map((id) => (
                <option key={id} value={id}>
                  {copy.levels[id]}
                </option>
              ))}
            </select>
          </label>
          {parentLevel ? (
            <label className="block text-sm font-medium text-ink">
              {copy.parent}
              <select
                className={`${fieldClass} mt-1.5`}
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}>
                <option value="">{copy.selectParent}</option>
                {parentOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {labelFor(node, locale)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-sm font-medium text-ink">
            {copy.nameKa}
            <input
              className={`${fieldClass} mt-1.5`}
              value={nameKa}
              onChange={(event) => setNameKa(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            {copy.nameEn}
            <input
              className={`${fieldClass} mt-1.5`}
              value={nameEn}
              onChange={(event) => setNameEn(event.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            {copy.nameRu}
            <input
              className={`${fieldClass} mt-1.5`}
              value={nameRu}
              onChange={(event) => setNameRu(event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onAdd()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-strong disabled:opacity-60">
          <Plus className="size-4" aria-hidden="true" />
          {copy.add}
        </button>
        {notice ? <p className="mt-3 text-sm text-brass-strong">{notice}</p> : null}
      </section>

      <section className="rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5">
        {tree.length === 0 ? (
          <p className="text-sm text-muted">{copy.empty}</p>
        ) : (
          <ul className="space-y-4">
            {tree.map(({ branch, topics }) => (
              <li key={branch.id}>
                <NodeRow
                  title={`${copy.levels.branch}: ${labelFor(branch, locale)}`}
                  onRemove={() => void onRemove(branch.id)}
                  removeLabel={copy.remove}
                />
                <ul className="mt-2 space-y-2 border-l border-hairline-soft ps-4">
                  {topics.map(({ topic, subtopics }) => (
                    <li key={topic.id}>
                      <NodeRow
                        title={`${copy.levels.topic}: ${labelFor(topic, locale)}`}
                        onRemove={() => void onRemove(topic.id)}
                        removeLabel={copy.remove}
                      />
                      <ul className="mt-2 space-y-2 border-l border-hairline-soft ps-4">
                        {subtopics.map(({ subtopic, concepts }) => (
                          <li key={subtopic.id}>
                            <NodeRow
                              title={`${copy.levels.subtopic}: ${labelFor(subtopic, locale)}`}
                              onRemove={() => void onRemove(subtopic.id)}
                              removeLabel={copy.remove}
                            />
                            <ul className="mt-2 space-y-1 border-l border-hairline-soft ps-4">
                              {concepts.map((concept) => (
                                <li key={concept.id}>
                                  <NodeRow
                                    title={`${copy.levels.concept}: ${labelFor(concept, locale)}`}
                                    onRemove={() => void onRemove(concept.id)}
                                    removeLabel={copy.remove}
                                  />
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NodeRow({ title, onRemove, removeLabel }: { title: string; onRemove: () => void; removeLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-hairline-soft bg-paper px-3 py-2">
      <p className="text-sm font-medium text-ink">{title}</p>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white hover:text-ink">
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
