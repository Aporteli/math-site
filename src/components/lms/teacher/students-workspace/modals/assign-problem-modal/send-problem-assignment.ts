import { sendProblemToStudentAction } from '@/lib/actions/students';
import { buildCreatedAssignment } from './build-created-assignment';
import { buildProblemData } from './build-problem-data';
import { resolveUploadedImage } from './resolve-uploaded-image';
import type { AssignImage, AssignProblemModalProps, SelectedProblemDetails } from './types';
import { uploadAssignImages } from './upload-assign-images';
import type { SetProblem } from '../../types/teacher-workspace.types';

export async function sendProblemAssignment({
  selectedProblemId,
  customTitle,
  assignComment,
  selectedProblem,
  selectedProblemDetails,
  assignImages,
  studentId,
  setAssigning,
  onSuccess,
  onClose,
}: {
  selectedProblemId: string;
  customTitle: string;
  assignComment: string;
  selectedProblem: SetProblem | undefined;
  selectedProblemDetails: SelectedProblemDetails | null;
  assignImages: AssignImage[];
  studentId: string;
  setAssigning: (assigning: boolean) => void;
  onSuccess: AssignProblemModalProps['onSuccess'];
  onClose: () => void;
}) {
  const safeTitle = customTitle.trim() || 'თავისუფალი დავალება';
  const safeComment = assignComment.trim();

  const problemData = buildProblemData(selectedProblemId, safeTitle, selectedProblem, selectedProblemDetails);
  if (!problemData) return;

  setAssigning(true);

  try {
    const uploadedUrls = await uploadAssignImages(assignImages);
    if (!uploadedUrls) return;

    const resolvedImage = resolveUploadedImage(uploadedUrls);

    const res = await sendProblemToStudentAction({
      studentId,
      instructions: safeComment || undefined,
      attachmentUrl: resolvedImage,
      problem: problemData,
    });

    if (res.success) {
      onSuccess(buildCreatedAssignment(res.assignmentId, problemData, safeComment, resolvedImage));
      onClose();
    } else {
      alert('გაგზავნა ვერ მოხერხდა: ' + (res.error || 'უცნობი შეცდომა'));
    }
  } catch (error) {
    console.error(error);
    alert('დაფიქსირდა შეცდომა დავალების გაგზავნისას.');
  } finally {
    setAssigning(false);
  }
}
