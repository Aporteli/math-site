'use client';

import { createPortal } from 'react-dom';
import { EditProblemFooter } from './EditProblemFooter';
import { EditProblemHeader } from './EditProblemHeader';
import { EditProblemMetaFields } from './EditProblemMetaFields';
import { EditProblemTaxonomyFields } from './EditProblemTaxonomyFields';
import { EditProblemTexField } from './EditProblemTexField';
import type { EditProblemModalProps } from './types';
import { useEditProblem } from './use-edit-problem';

export function EditProblemModal(props: EditProblemModalProps) {
  const edit = useEditProblem(props);
  const { ui, titleId } = edit;

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={ui.close}
        onClick={edit.onClose}
      />
      <div className="pointer-events-none relative z-10 flex h-full items-center justify-center p-4 sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="pointer-events-auto flex max-h-full w-full max-w-2xl min-h-0 flex-col overflow-hidden rounded-box border border-hairline bg-paper shadow-2xl">
          <EditProblemHeader titleId={titleId} title={ui.title} closeLabel={ui.close} onClose={edit.onClose} />

          <div className="min-h-0 flex-1 bg-main space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            <EditProblemMetaFields
              titleId={titleId}
              copy={edit.copy}
              difficultyLabel={ui.difficulty}
              yearLabel={ui.year}
              noYearLabel={ui.noYear}
              sourceLabel={ui.source}
              difficulty={edit.difficulty}
              year={edit.year}
              source={edit.source}
              onDifficultyChange={edit.setDifficulty}
              onYearChange={edit.setYear}
              onSourceChange={edit.setSource}
            />

            <EditProblemTaxonomyFields
              titleId={titleId}
              copy={edit.copy}
              taxonomy={edit.taxonomy}
              taxonomyLabels={edit.taxonomyLabels}
              branchOptions={edit.branchOptions}
              topicOptions={edit.topicOptions}
              subtopicOptions={edit.subtopicOptions}
              conceptOptions={edit.conceptOptions}
              onTaxonomyChange={edit.updateTaxonomy}
            />

            <EditProblemTexField
              id={`${titleId}-prompt`}
              label={ui.promptLabel}
              value={edit.prompt}
              maxLength={4000}
              placeholder={ui.promptPlaceholder}
              previewLabel={ui.previewLabel}
              onChange={edit.setPrompt}
            />
            <EditProblemTexField
              id={`${titleId}-solution`}
              label={ui.solutionLabel}
              value={edit.solution}
              maxLength={12000}
              placeholder={ui.solutionPlaceholder}
              previewLabel={ui.previewLabel}
              onChange={edit.setSolution}
            />
          </div>

          <EditProblemFooter
            notice={edit.notice}
            cancelLabel={ui.cancel}
            saveLabel={ui.save}
            savingLabel={ui.saving}
            busy={edit.busy}
            disabled={edit.busy || !edit.prompt.trim() || !edit.solution.trim()}
            onClose={edit.onClose}
            onSubmit={() => void edit.onSubmit()}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
