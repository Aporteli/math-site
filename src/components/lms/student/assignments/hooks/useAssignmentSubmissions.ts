'use client';

import { useState } from 'react';
import { submitStudentHomeworkAction, withdrawStudentHomeworkAction } from '@/lib/actions/student-submission';
import { uploadImageToStorageAction } from '@/lib/actions/upload';
import { convertPdfToImages } from '@/lib/pdf-helpers';
import type { Assignment, StudentContentTab } from '../types/student-assignment.types';
import { fileToBase64 } from '../helpers/student-assignment.helpers';

/**
 * ჰუკის შემავალი პროპსების ინტერფეისი:
 * @param selectedDateKey - ამჟამად მონიშნული თარიღი (მაგ: "2026-09-03")
 * @param taskAssignments - მიმდინარე თარიღის დავალებების სია
 * @param setAssignments - დავალებების მთავარი State-ის განმაახლებელი ფუნქცია
 * @param setActiveTab - აქტიური ტაბის შემცვლელი ფუნქცია ('tasks' | 'answers')
 * @param setNotice - შეტყობინებების (Toast/Alert) გამოსატანი ფუნქცია
 */
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
  // ----------------------------------------------------
  // მდგომარეობები (State)
  // ----------------------------------------------------

  // თარიღების მიხედვით დაჯგუფებული დროებითი ფაილები (Base64/ლოკალური URL-ები) გაგზავნამდე
  const [dateGroupAttachments, setDateGroupAttachments] = useState<
    Record<string, { id: string; fileName: string; url: string }[]>
  >({});

  // ინახავს ინფორმაციას, გაგზავნილია თუ არა კონკრეტული თარიღის დავალებები
  const [submittedDateGroups, setSubmittedDateGroups] = useState<Record<string, boolean>>({});

  // ჩატვირთვის (Loading) ინდიკატორები კონკრეტული თარიღისთვის
  const [uploadingDateKey, setUploadingDateKey] = useState<string | null>(null); // ფაილების ლოკალურად დამუშავება
  const [submittingDateKey, setSubmittingDateKey] = useState<string | null>(null); // სერვერზე ატვირთვა და გაგზავნა
  const [withdrawingDateKey, setWithdrawingDateKey] = useState<string | null>(null); // გაგზავნილი ნაშრომის უკან დაბრუნება/წაშლა

  // ----------------------------------------------------
  // 1. ფაილების ატვირთვა და დამუშავება (PDF -> სურათები ან პირდაპირ სურათი)
  // ----------------------------------------------------
  async function handleGroupFileUpload(dateKey: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingDateKey(dateKey);

    const newItems: { id: string; fileName: string; url: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // თუ ფაილი არის PDF: ვშლით თითოეულ გვერდს ცალკეულ სურათებად
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
          console.error('PDF-ის სურათებად კონვერტაცია ჩაიშალა:', e);
        }
      // თუ ფაილი ჩვეულებრივი სურათია: გადაგვყავს Base64 ფორმატში
      } else if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        newItems.push({
          id: `grp-${Date.now()}-${i}`,
          fileName: file.name,
          url: base64,
        });
      }
    }

    // ვამატებთ ახალ ფაილებს უკვე არსებულ ფაილებთან შესაბამის თარიღზე
    setDateGroupAttachments((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), ...newItems],
    }));
    setUploadingDateKey(null);
  }

  // ----------------------------------------------------
  // 2. დროებითი ფაილის ამოშლა სიიდან (გაგზავნამდე)
  // ----------------------------------------------------
  function removeGroupAttachment(dateKey: string, attachmentId: string) {
    setDateGroupAttachments((prev) => ({
      ...prev,
      [dateKey]: (prev[dateKey] || []).filter((x) => x.id !== attachmentId),
    }));
  }

  // ----------------------------------------------------
  // 3. დავალებების გაგზავნა (Cloud Storage-ზე ატვირთვა + ბაზაში დაფიქსირება)
  // ----------------------------------------------------
  async function handleSubmitDateGroup(dateKey: string, items: Assignment[]) {
    const files = dateGroupAttachments[dateKey] || [];
    if (files.length === 0) return;

    setSubmittingDateKey(dateKey);

    let resolvedUrls: string[] = [];
    try {
      // ყველა ფაილს პარალელურად ვტვირთავთ მთავარ საცავში (Cloud Storage/S3/Supabase)
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
      console.error('საცავში ფაილების ატვირთვა ჩაიშალა:', error);
      alert('სურათის ატვირთვა ვერ მოხერხდა');
      setSubmittingDateKey(null);
      return;
    }

    // მიღებულ Cloud URL-ებს ვაერთიანებთ JSON სტრინგად
    const combinedUrls = JSON.stringify(resolvedUrls);
    const itemIds = new Set(items.map((i) => i.id));

    // სერვერის action-ით ვაფიქსირებთ თითოეული დავალების ჩაბარებას
    await Promise.all(
      items.map((assignment) =>
        submitStudentHomeworkAction({
          assignmentId: assignment.id,
          attachmentUrl: combinedUrls,
        }),
      ),
    );

    // ლოკალურ State-ში ვანახლებთ დავალებების სტატუსს 'submitted'-ზე
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

    // ვნიშნავთ, რომ ეს დღე უკვე ჩაბარებულია
    setSubmittedDateGroups((prev) => ({
      ...prev,
      [dateKey]: true,
    }));

    setSubmittingDateKey(null);
    setNotice('პასუხები წარმატებით გაიგზავნა და გადავიდა „პასუხების“ ტაბში!');
    setActiveTab('answers'); // მომხმარებელი გადაგვყავს პასუხების ტაბზე
    setTimeout(() => setNotice(null), 3500);
  }

  // ----------------------------------------------------
  // 4. გაგზავნილი დავალებების უკან გაწვევა/წაშლა
  // ----------------------------------------------------
  async function handleResetDateGroup(dateKey: string, items: Assignment[]) {
    const confirmed = confirm('დარწმუნებული ხართ, რომ გსურთ ამ დღის ყველა ატვირთული პასუხის დაბრუნება და წაშლა?');
    if (!confirmed) return;

    setWithdrawingDateKey(dateKey);
    const itemIds = items.map((i) => i.id);

    // სერვერზე ვშლით ჩაბარებულ პასუხებს
    const res = await withdrawStudentHomeworkAction({ assignmentIds: itemIds });

    if (res.success) {
      // ლოკალურ State-ში ვუბრუნებთ სტატუსს 'notStarted'-ზე
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

      // ვასუფთავებთ გაგზავნის ფლაგს და მიმაგრებულ ფაილებს
      setSubmittedDateGroups((prev) => ({
        ...prev,
        [dateKey]: false,
      }));
      setDateGroupAttachments((prev) => ({
        ...prev,
        [dateKey]: [],
      }));

      setNotice('პასუხები წარმატებით წაიშალა.');
      setActiveTab('tasks'); // მომხმარებელი ბრუნდება დავალებების ტაბზე
      setTimeout(() => setNotice(null), 3500);
    } else {
      alert('შეცდომა: ' + (res.error || 'პასუხების წაშლა ვერ მოხერხდა'));
    }

    setWithdrawingDateKey(null);
  }

  // ----------------------------------------------------
  // გამოთვლილი ცვლადები UI-სთვის
  // ----------------------------------------------------
  // მიმდინარე არჩეული თარიღის ფაილები
  const currentGroupFiles = dateGroupAttachments[selectedDateKey] || [];

  // ლოადერების სტატუსები არჩეული თარიღისთვის
  const isUploading = uploadingDateKey === selectedDateKey;
  const isSubmitting = submittingDateKey === selectedDateKey;
  const isWithdrawing = withdrawingDateKey === selectedDateKey;

  // ამოწმებს, არის თუ არა ეს დღე უკვე სრულად ჩაბარებული/შეფასებული
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