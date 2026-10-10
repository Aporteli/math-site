import { uploadImageToStorageAction } from '@/lib/actions/upload';
import type { AssignImage } from './types';

export async function uploadAssignImages(assignImages: AssignImage[]) {
  const uploadedUrls: string[] = [];
  for (const image of assignImages) {
    const uploaded = await uploadImageToStorageAction({
      dataUrl: image.dataUrl,
      fileName: image.fileName,
    });
    if (!uploaded.success || !uploaded.url) {
      alert('სურათის ატვირთვა ვერ მოხერხდა');
      return null;
    }
    uploadedUrls.push(uploaded.url);
  }
  return uploadedUrls;
}
