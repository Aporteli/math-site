'use client';

import { useState } from 'react';
import { submitStudentHomeworkAction, withdrawStudentHomeworkAction } from '@/lib/actions/student-submission';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { convertPdfToImages } from '@/lib/pdf-helpers';
import type { Assignment, StudentContentTab } from '../types/student-assignment.types';
import { fileToBase64 } from '../helpers/student-assignment.helpers';

interface UseAssignmentSubmissionsProps {
  selectedDateKey: string;
  taskAssignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  setActiveTab: (tab: StudentContentTab) => void;
  setNotice: (notice: string | null) => void;
}

export function useAssignmentSubmissions({
  selectedDateKey,
  taskAssignments,
  setAssignments,
  setActiveTab,
  setNotice,
}: UseAssignmentSubmissionsProps) {
  const [dateGroupAttachments, setDateGroupAttachments] = useState<
    Record<string, { id: string; fileName: string; url: string }[]>
  >({});
  const [submittedDateGroups, setSubmittedDateGroups] = useState<Record<string, boolean>>({});
  const [uploadingDateKey, setUploadingDateKey] = useState<string | null>(null);
  const [submittingDateKey, setSubmittingDateKey] = useState<string | null>(null);
  const [withdrawingDateKey, setWithdrawingDateKey] = useState<string | null>(null);

  async function handleGroupFileUpload(dateKey: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingDateKey(dateKey);

    const newItems: { id: string; fileName: string; url: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          const pdfPages = await convertPdfToImages(file);
          pdfPages.forEach((page, idx) => {
            newItems.push({
              id: `grp-${Date.now()}-${idx}`,
              fileName: `${file.name} (${page.name})`,
              url: page.url,
            });
          });
        } catch (e) {
          console.error(e);
        }
      } else if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        newItems.push({
          id: `grp-${Date.now()}-${i}`,
          fileName: file.name,
          url: base64,
        });
      }
    }

    setDateGroupAttachments((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), ...newItems],
    }));
    setUploadingDateKey(null);
  }

  function removeGroupAttachment(dateKey: string, attachmentId: string) {
    setDateGroupAttachments((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter((x) => x.id !== attachmentId),
    }));
  }

  async function handleSubmitDateGroup(dateKey: string, items: Assignment[]) {
    const files = dateGroupAttachments[dateKey] || [];
    if (files.length === 0) return;

    setSubmittingDateKey(dateKey);

    let resolvedUrls: string[] = [];
    try {
      resolvedUrls = await Promise.all(
        files.map(async (a) => {
          const uploaded = await uploadImageToStorageAction({
            dataUrl: a.url,
            fileName: a.fileName,
          });
          if (!uploaded.success || !uploaded.url) {
            throw new Error('UPLOAD_FAILED');
          }
          return uploaded.url;
        }),
      );
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      alert('სურათის ატვირთვა ვერ მოხერხდა');
      setSubmittingDateKey(null);
      return;
    }
    const combinedUrls = JSON.stringify(resolvedUrls);
    const itemIds = new Set(items.map((i) => i.id));

    await Promise.all(
      items.map((assignment) =>
        submitStudentHomeworkAction({
          assignmentId: assignment.id,
          attachmentUrl: combinedUrls,
        }),
      ),
    );

    setAssignments((prev) =>
      prev.map((a) =>
        itemIds.has(a.id)
          ? {
              ...a,
              problems: a.problems.map((p) => ({
                ...p,
                status: 'submitted',
                previewUrl: combinedUrls,
              })),
            }
          : a,
      ),
    );

    setSubmittedDateGroups((prev) => ({
      ...prev,
      [dateKey]: true,
    }));

    setSubmittingDateKey(null);
    setNotice('პასუხები წარმატებით გაიგზავნა და გადავიდა „პასუხების“ ტაბში!');
    setActiveTab('answers');
    setTimeout(() => setNotice(null), 3500);
  }

  async function handleResetDateGroup(dateKey: string, items: Assignment[]) {
    const confirmed = confirm('დარწმუნებული ხართ, რომ გსურთ ამ დღის ყველა ატვირთული პასუხის დაბრუნება და წაშლა?');
    if (!confirmed) return;

    setWithdrawingDateKey(dateKey);
    const itemIds = items.map((i) => i.id);

    const res = await withdrawStudentHomeworkAction({ assignmentIds: itemIds });

    if (res.success) {
      setAssignments((prev) =>
        prev.map((a) =>
          itemIds.includes(a.id)
            ? {
                ...a,
                problems: a.problems.map((p) => ({
                  ...p,
                  status: 'notStarted',
                  previewUrl: undefined,
                  fileName: undefined,
                })),
              }
            : a,
        ),
      );

      setSubmittedDateGroups((prev) => ({
        ...prev,
        [dateKey]: false,
      }));
      setDateGroupAttachments((prev) => ({
        ...prev,
        [dateKey]: [],
      }));

      setNotice('პასუხები წარმატებით წაიშალა.');
      setActiveTab('tasks');
      setTimeout(() => setNotice(null), 3500);
    } else {
      alert('შეცდომა: ' + (res.error || 'პასუხების წაშლა ვერ მოხერხდა'));
    }

    setWithdrawingDateKey(null);
  }

  const currentGroupFiles = dateGroupAttachments[selectedDateKey] || [];
  const isUploading = uploadingDateKey === selectedDateKey;
  const isSubmitting = submittingDateKey === selectedDateKey;
  const isWithdrawing = withdrawingDateKey === selectedDateKey;

  const isGroupAlreadySubmitted =
    submittedDateGroups[selectedDateKey] ||
    (taskAssignments.length > 0 &&
      taskAssignments.every((a) => a.problems.every((p) => p.status === 'submitted' || p.status === 'graded')));

  return {
    currentGroupFiles,
    isUploading,
    isSubmitting,
    isWithdrawing,
    isGroupAlreadySubmitted,
    handleGroupFileUpload,
    removeGroupAttachment,
    handleSubmitDateGroup,
    handleResetDateGroup,
  };
}
