'use client';

import { createProblemBankActions } from './actions/createProblemBankActions';
import { ProblemBankFilters } from './components/ProblemBankFilters';
import { ProblemBankHero } from './components/ProblemBankHero';
import { ProblemBankList } from './components/ProblemBankList';
import { ProblemBankToolGrid } from './components/ProblemBankToolGrid';
import { ProblemBankWorkspaceDialogs } from './components/ProblemBankWorkspaceDialogs';
import { ProblemPreviewPanel } from './components/ProblemPreviewPanel';
import { VariantsPanel } from './components/VariantsPanel';
import { GeneratePanel } from './components/generate/GeneratePanel';
import { useProblemBankDerived } from './hooks/useProblemBankDerived';
import { useProblemBankEffects } from './hooks/useProblemBankEffects';
import { useProblemBankState } from './hooks/useProblemBankState';
import type { ProblemBankWorkspaceProps } from './problem-bank-workspace.types';

export function ProblemBankWorkspace({
  locale,
  title,
  subtitle,
  copy,
  initialBank,
  initialLessonSetIds,
  initialFamilies = [],
  hydrateSavedBank = true,
  visibleToolIds,
  initialPanel = 'generate',
  showGenerateVariants = true,
  showSendToLab = false,
  showCreateCard = false,
  showSaveToLab = false,
  initialLabIds = [],
  enableSlashPrompts = false,
  slashPromptsUserId = '',
  taxonomyNodes = [],
}: ProblemBankWorkspaceProps) {
  void showCreateCard;

  const state = useProblemBankState({
    initialBank,
    initialLessonSetIds,
    initialLabIds,
    initialPanel,
    initialFamilies,
    taxonomyNodes,
  });

  const derived = useProblemBankDerived({
    locale,
    copy,
    visibleToolIds,
    bank: state.bank,
    filters: state.filters,
    selectedProblemIds: state.selectedProblemIds,
    taxonomyTree: state.taxonomyTree,
    selectedId: state.selectedId,
    lessonSetIds: state.lessonSetIds,
    modelStatus: state.modelStatus,
    genModel: state.genModel,
    families: state.families,
    genKind: state.genKind,
    genTopic: state.genTopic,
  });

  useProblemBankEffects({
    setBank: state.setBank,
    setDraftIds: state.setDraftIds,
    setSelectedId: state.setSelectedId,
    initialFamilies,
    setFamilies: state.setFamilies,
    setModelStatus: state.setModelStatus,
    hydrateSavedBank,
    setShowSolution: state.setShowSolution,
    setNotice: state.setNotice,
    initialBank,
    setLessonSetIds: state.setLessonSetIds,
    taxonomyNodes,
    setTaxonomyTree: state.setTaxonomyTree,
    selectedId: state.selectedId,
    setCasNotice: state.setCasNotice,
    setCasOk: state.setCasOk,
    longPressTimerRef: state.longPressTimerRef,
  });

  const actions = createProblemBankActions({
    copy,
    locale,
    showSaveToLab,
    bank: state.bank,
    setBank: state.setBank,
    setFilters: state.setFilters,
    selectedId: state.selectedId,
    setSelectedId: state.setSelectedId,
    lessonSetIds: state.lessonSetIds,
    setLessonSetIds: state.setLessonSetIds,
    labIds: state.labIds,
    setLabIds: state.setLabIds,
    draftIds: state.draftIds,
    setDraftIds: state.setDraftIds,
    setShowSolution: state.setShowSolution,
    setPanel: state.setPanel,
    setImportOpen: state.setImportOpen,
    setCustomCardOpen: state.setCustomCardOpen,
    editingProblem: state.editingProblem,
    setNotice: state.setNotice,
    setProblemChatDraft: state.setProblemChatDraft,
    setProblemChatOpen: state.setProblemChatOpen,
    families: state.families,
    genTopic: state.genTopic,
    setGenTopic: state.setGenTopic,
    genKind: state.genKind,
    setGenKind: state.setGenKind,
    genDifficulty: state.genDifficulty,
    genYear: state.genYear,
    genCount: state.genCount,
    genMode: state.genMode,
    genRequest: state.genRequest,
    genReplyLocale: state.genReplyLocale,
    genModel: state.genModel,
    genCheck: state.genCheck,
    setGenerating: state.setGenerating,
    setSaving: state.setSaving,
    setModelStatus: state.setModelStatus,
    variantCount: state.variantCount,
    selectedProblemIds: state.selectedProblemIds,
    setSelectedProblemIds: state.setSelectedProblemIds,
    confirmBulkDelete: state.confirmBulkDelete,
    setConfirmBulkDelete: state.setConfirmBulkDelete,
    bulkSelectMode: state.bulkSelectMode,
    setBulkSelectMode: state.setBulkSelectMode,
    longPressTimerRef: state.longPressTimerRef,
    longPressTriggeredRef: state.longPressTriggeredRef,
    familyGenerateTargets: derived.familyGenerateTargets,
    selected: derived.selected,
    selectedVisibleIds: derived.selectedVisibleIds,
    allVisibleSelected: derived.allVisibleSelected,
    visibleIds: derived.visibleIds,
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-[2000px] ">
      <ProblemBankHero
        copy={copy}
        title={title}
        subtitle={subtitle}
        showSaveToLab={showSaveToLab}
        labCount={state.labIds.length}
        bankCount={state.bank.length}
        lessonSetCount={derived.lessonSet.length}
        generatedCount={derived.generatedCount}
      />
      <ProblemBankToolGrid
        copy={copy}
        locale={locale}
        visibleTools={derived.visibleTools}
        panel={state.panel}
        importOpen={state.importOpen}
        notice={state.notice}
        onTool={actions.onTool}
        onDismissNotice={() => state.setNotice(null)}
      />
      <ProblemBankWorkspaceDialogs
        locale={locale}
        copy={copy}
        showSaveToLab={showSaveToLab}
        customCardOpen={state.customCardOpen}
        setCustomCardOpen={state.setCustomCardOpen}
        saveProblems={actions.saveProblems}
        setBank={state.setBank}
        setLabIds={state.setLabIds}
        setSelectedId={state.setSelectedId}
        setShowSolution={state.setShowSolution}
        setNotice={state.setNotice}
        editingProblem={state.editingProblem}
        setEditingProblem={state.setEditingProblem}
        taxonomyTree={state.taxonomyTree}
        setTaxonomyTree={state.setTaxonomyTree}
        saveEditedProblem={actions.saveEditedProblem}
        importOpen={state.importOpen}
        setImportOpen={state.setImportOpen}
        genDifficulty={state.genDifficulty}
        genYear={state.genYear}
        genModel={state.genModel}
        setGenModel={state.setGenModel}
        applyCreated={actions.applyCreated}
        setFamilies={state.setFamilies}
        setFocusFamilyId={state.setFocusFamilyId}
        setPanel={state.setPanel}
        panel={state.panel}
        families={state.families}
        genCount={state.genCount}
        focusFamilyId={state.focusFamilyId}
        modelStatus={state.modelStatus}
        enableSlashPrompts={enableSlashPrompts}
        slashPromptsUserId={slashPromptsUserId}
        problemChatOpen={state.problemChatOpen}
        setProblemChatOpen={state.setProblemChatOpen}
        problemChatDraft={state.problemChatDraft}
        fullSolutionOpen={state.fullSolutionOpen}
        setFullSolutionOpen={state.setFullSolutionOpen}
        selected={derived.selected}
        visible={derived.visible}>
        {state.panel === 'generate' ? (
          <GeneratePanel
            copy={copy}
            genId={state.genId}
            onGenerate={actions.onGenerate}
            setPanel={state.setPanel}
            genMode={state.genMode}
            setGenMode={state.setGenMode}
            genKind={state.genKind}
            setGenKind={state.setGenKind}
            genCheck={state.genCheck}
            setGenCheck={state.setGenCheck}
            genReplyLocale={state.genReplyLocale}
            setGenReplyLocale={state.setGenReplyLocale}
            selectGenKind={actions.selectGenKind}
            familyKindOptions={derived.familyKindOptions}
            genDifficulty={state.genDifficulty}
            setGenDifficulty={state.setGenDifficulty}
            familyGenerateLabels={derived.familyGenerateLabels}
            genYear={state.genYear}
            setGenYear={state.setGenYear}
            genCount={state.genCount}
            setGenCount={state.setGenCount}
            generating={state.generating}
            genTopic={state.genTopic}
            selectGenTopic={actions.selectGenTopic}
            algorithmKindOptions={derived.algorithmKindOptions}
            draftIds={state.draftIds}
            saving={state.saving}
            saveDraftsToBank={actions.saveDraftsToBank}
            keepAllDrafts={actions.keepAllDrafts}
          />
        ) : null}
        {state.panel === 'variants' ? (
          <VariantsPanel
            copy={copy}
            onVariants={actions.onVariants}
            setPanel={state.setPanel}
            selected={derived.selected}
            variantCount={state.variantCount}
            setVariantCount={state.setVariantCount}
          />
        ) : null}
        <div className="mt-6 grid gap-5 xl:h-[calc(100vh-9rem)] xl:min-h-[36rem] xl:grid-cols-[16.5rem_minmax(0,1fr)_21rem] xl:items-stretch">
          <ProblemBankFilters
            copy={copy}
            searchId={state.searchId}
            filters={state.filters}
            updateFilter={actions.updateFilter}
            branchOptions={derived.branchOptions}
            topicOptions={derived.topicOptions}
            taxonomyLabels={derived.taxonomyLabels}
            updateTaxonomyFilter={actions.updateTaxonomyFilter}
            setFilters={state.setFilters}
          />
          <ProblemBankList
            copy={copy}
            visible={derived.visible}
            bulkSelectMode={state.bulkSelectMode}
            allVisibleSelected={derived.allVisibleSelected}
            toggleSelectAllVisible={actions.toggleSelectAllVisible}
            selectedVisibleIds={derived.selectedVisibleIds}
            saving={state.saving}
            discardSelectedProblems={actions.discardSelectedProblems}
            confirmBulkDelete={state.confirmBulkDelete}
            exitBulkSelectMode={actions.exitBulkSelectMode}
            cardProps={{
              selectedId: state.selectedId,
              lessonSetIds: state.lessonSetIds,
              selectedProblemIds: state.selectedProblemIds,
              copy,
              locale,
              taxonomyTree: state.taxonomyTree,
              bulkSelectMode: state.bulkSelectMode,
              showSaveToLab,
              showSendToLab,
              showGenerateVariants,
              labIds: state.labIds,
              families: state.families,
              longPressTriggeredRef: state.longPressTriggeredRef,
              beginCardLongPress: actions.beginCardLongPress,
              endCardLongPress: actions.endCardLongPress,
              toggleProblemSelected: actions.toggleProblemSelected,
              setSelectedId: state.setSelectedId,
              setShowSolution: state.setShowSolution,
              setEditingProblem: state.setEditingProblem,
              openProblemChat: actions.openProblemChat,
              copyProblemPrompt: actions.copyProblemPrompt,
              toggleInSet: actions.toggleInSet,
              router: state.router,
              saveProblemToLab: actions.saveProblemToLab,
              copyProblemToBank: actions.copyProblemToBank,
              removeProblemFromLab: actions.removeProblemFromLab,
              setPanel: state.setPanel,
              setNotice: state.setNotice,
              discardProblem: actions.discardProblem,
            }}
          />
          <ProblemPreviewPanel
            copy={copy}
            selected={derived.selected}
            locale={locale}
            taxonomyTree={state.taxonomyTree}
            showSaveToLab={showSaveToLab}
            labIds={state.labIds}
            showSolution={state.showSolution}
            setShowSolution={state.setShowSolution}
            setFullSolutionOpen={state.setFullSolutionOpen}
            saving={state.saving}
            setSaving={state.setSaving}
            saveProblems={actions.saveProblems}
            discardProblem={actions.discardProblem}
            casNotice={state.casNotice}
            casOk={state.casOk}
          />
        </div>
      </ProblemBankWorkspaceDialogs>
    </div>
  );
}
