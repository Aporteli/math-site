import type { FormEvent } from 'react';
import {
  canResampleProblem,
  canVary,
  classifyTemplateGenerateFilter,
  generateDiverseProblemsSchema,
  generateFromTemplate,
  generateProblems,
  generateProblemsSchema,
  generateVariants,
  parseFamilyKind,
  stampFamilySource,
  templateJsonForProblem,
  type BankProblem,
  type ProblemTopic,
  type SavedProblemFamily,
} from '@/lib/math/problems';
import { generateDiverseProblemsAction, loadAiModelStatusAction } from '@/lib/math/problems/actions';
import { replaceTokens } from '@/lib/math/problems';
import { getLocalDraftProblems, setLocalDraftProblems } from '../helpers/local-drafts';
import type { ProblemBankActionContext } from './problem-bank-action-context';

export function bindGenerateActions(ctx: ProblemBankActionContext) {
  const selectedKindFamily =
    ctx.families.find(
      (family) =>
        !family.parentId &&
        family.slug === parseFamilyKind(ctx.genKind) &&
        (ctx.genTopic === 'any' || family.topic === ctx.genTopic),
    ) ?? null;

  function generateFilters() {
    return {
      difficulty: ctx.genDifficulty === 'any' ? undefined : ctx.genDifficulty,
      year: ctx.genYear === 'any' ? undefined : ctx.genYear,
    };
  }

  function familyGenerateMissNotice(raw: unknown) {
    const status = classifyTemplateGenerateFilter(raw, generateFilters());
    return status === 'no_match' ? ctx.copy.familyCenter.noMatchGenerate : ctx.copy.familyCenter.emptyGenerate;
  }

  // ახალი ამოცანების სიაში და LocalStorage-ში ჩამატება
  function applyCreated(created: BankProblem[]) {
    if (created.length === 0) return;
    ctx.setBank((current) => [...created, ...current]);
    ctx.setDraftIds((current) => [...created.map((problem) => problem.id), ...current]);

    // LocalStorage-ის სინქრონიზაცია
    const existingDrafts = getLocalDraftProblems();
    const updatedDrafts = [...created, ...existingDrafts.filter((item) => !created.some((c) => c.id === item.id))];
    setLocalDraftProblems(updatedDrafts);

    ctx.setSelectedId(created[0]?.id ?? null);
    ctx.setShowSolution(false);
    ctx.setFilters({
      query: '',
      branchId: 'all',
      topicNodeId: 'all',
      subtopicId: 'all',
      conceptId: 'all',
      difficulty: 'all',
      year: 'all',
      origin: created.every((problem) => problem.templateId === 'ai-plain')
        ? 'unchecked'
        : created.every((problem) => problem.templateId === 'ai-verified')
          ? 'verified'
          : (created[0]?.source ?? 'all'),
    });
  }

  function generateFromFamilyKind(family: SavedProblemFamily) {
    try {
      const raw = JSON.parse(family.json) as unknown;
      const created = stampFamilySource(
        generateFromTemplate(raw, {
          count: ctx.genCount,
          locale: ctx.locale,
          ...generateFilters(),
        }),
        family,
      );
      if (created.length === 0) {
        ctx.setNotice(familyGenerateMissNotice(raw));
        return;
      }
      applyCreated(created);
      ctx.setNotice(null);
    } catch (error) {
      ctx.setNotice(error instanceof Error && error.message.trim() ? error.message : ctx.copy.generate.errorFailed);
    }
  }

  function generateFromFamilyList(list: SavedProblemFamily[]) {
    if (list.length === 0) return;
    if (list.length === 1) {
      generateFromFamilyKind(list[0]!);
      return;
    }
    try {
      const filters = generateFilters();
      const usable = list.filter((family) => {
        try {
          return classifyTemplateGenerateFilter(JSON.parse(family.json) as unknown, filters) === 'ok';
        } catch {
          return false;
        }
      });
      if (usable.length === 0) {
        const anyCards = list.some((family) => {
          try {
            return classifyTemplateGenerateFilter(JSON.parse(family.json) as unknown, {}) !== 'empty';
          } catch {
            return false;
          }
        });
        ctx.setNotice(anyCards ? ctx.copy.familyCenter.noMatchGenerate : ctx.copy.familyCenter.emptyGenerate);
        return;
      }
      const created: BankProblem[] = [];
      let remaining = ctx.genCount;
      for (let i = 0; i < usable.length; i += 1) {
        const left = usable.length - i;
        const count = i === usable.length - 1 ? remaining : Math.max(1, Math.floor(remaining / left));
        remaining -= count;
        created.push(
          ...stampFamilySource(
            generateFromTemplate(JSON.parse(usable[i]!.json) as unknown, {
              count,
              locale: ctx.locale,
              ...filters,
            }),
            usable[i]!,
          ),
        );
      }
      if (created.length === 0) {
        ctx.setNotice(ctx.copy.familyCenter.noMatchGenerate);
        return;
      }
      applyCreated(created);
      ctx.setNotice(null);
    } catch (error) {
      ctx.setNotice(error instanceof Error && error.message.trim() ? error.message : ctx.copy.generate.errorFailed);
    }
  }

  function generateSelectedKind(kind: SavedProblemFamily) {
    const kids = ctx.families.filter((family) => family.parentId === kind.id);
    if (kids.length > 0) generateFromFamilyList(kids);
    else generateFromFamilyKind(kind);
  }

  function selectGenTopic(value: ProblemTopic | 'any') {
    ctx.setGenTopic(value);
    ctx.setGenKind('any');
  }

  function selectGenKind(value: string) {
    ctx.setGenKind(value);
    if (ctx.genMode === 'families') {
      const slug = parseFamilyKind(value);
      const family = slug ? (ctx.families.find((item) => item.slug === slug) ?? null) : null;
      if (family) generateFromFamilyKind(family);
      return;
    }
    const slug = parseFamilyKind(value);
    const family = slug
      ? (ctx.families.find(
          (item) => !item.parentId && item.slug === slug && (ctx.genTopic === 'any' || item.topic === ctx.genTopic),
        ) ?? null)
      : null;
    if (family) generateSelectedKind(family);
  }

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (ctx.genMode === 'families') {
      if (ctx.familyGenerateTargets.length === 0) {
        ctx.setNotice(ctx.copy.generate.kindJsonNeedFamily);
        return;
      }
      generateFromFamilyList(ctx.familyGenerateTargets);
      return;
    }

    if (ctx.genMode === 'algorithms') {
      if (selectedKindFamily) {
        generateSelectedKind(selectedKindFamily);
        return;
      }
      const parsed = generateProblemsSchema.safeParse({
        topic: ctx.genTopic === 'any' ? undefined : ctx.genTopic,
        kind: ctx.genKind === 'any' ? undefined : ctx.genKind,
        difficulty: ctx.genDifficulty === 'any' ? undefined : ctx.genDifficulty,
        year: ctx.genYear === 'any' ? undefined : ctx.genYear,
        count: ctx.genCount,
        locale: ctx.locale,
      });
      if (!parsed.success) return;
      applyCreated(generateProblems(parsed.data));
      ctx.setNotice(null);
      return;
    }

    const parsed = generateDiverseProblemsSchema.safeParse({
      request: ctx.genRequest,
      topic: ctx.genTopic === 'any' ? undefined : ctx.genTopic,
      difficulty: ctx.genDifficulty === 'any' ? undefined : ctx.genDifficulty,
      year: ctx.genYear === 'any' ? undefined : ctx.genYear,
      count: Math.min(8, ctx.genCount),
      locale: ctx.genReplyLocale,
      check: ctx.genCheck,
      model: ctx.genModel,
    });
    if (!parsed.success) return;

    ctx.setGenerating(true);
    ctx.setNotice(null);
    try {
      const result = await generateDiverseProblemsAction(parsed.data);

      if (!result.ok) {
        const messages = {
          missing_key: ctx.copy.generate.errorMissingKey,
          invalid_key: ctx.copy.generate.errorInvalidKey,
          failed: ctx.copy.generate.errorFailed,
          none_verified: ctx.copy.generate.errorNoneVerified,
          unauthorized: ctx.copy.generate.errorUnauthorized,
          limit_exceeded: ctx.copy.generate.errorLimit,
          billing: ctx.copy.generate.errorBilling,
          timeout: ctx.copy.generate.errorTimeout,
          bad_output: ctx.copy.generate.errorBadOutput,
        } as const;
        ctx.setNotice(messages[result.error]);
        return;
      }

      applyCreated(result.problems);
      void loadAiModelStatusAction().then(ctx.setModelStatus);
      if (result.verified < result.requested) {
        ctx.setNotice(
          replaceTokens(ctx.copy.generate.partial, {
            verified: result.verified,
            requested: result.requested,
          }),
        );
      }
    } catch {
      ctx.setNotice(ctx.copy.generate.errorFailed);
    } finally {
      ctx.setGenerating(false);
    }
  }

  function onVariants(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ctx.selected) {
      ctx.setNotice(ctx.copy.variantPanel.needProblem);
      return;
    }
    const template = templateJsonForProblem(ctx.selected, ctx.families);
    if (!canVary(ctx.selected, template)) {
      ctx.setNotice(ctx.copy.variantPanel.needFormula);
      return;
    }

    try {
      const created = generateVariants(ctx.selected, ctx.variantCount, {
        template: template ?? undefined,
        locale: ctx.locale,
      });
      if (created.length === 0) {
        let familyRaw: unknown = null;
        if (template) {
          try {
            familyRaw = JSON.parse(template) as unknown;
          } catch {
            familyRaw = null;
          }
        }
        ctx.setNotice(
          !canResampleProblem(ctx.selected, familyRaw)
            ? ctx.copy.variantPanel.needSlots
            : ctx.copy.variantPanel.noneVerified,
        );
        return;
      }

      applyCreated(created);
      ctx.setNotice(null);
    } catch {
      ctx.setNotice(ctx.copy.variantPanel.noneVerified);
    }
  }

  return {
    applyCreated,
    selectGenTopic,
    selectGenKind,
    onGenerate,
    onVariants,
  };
}
