export function resolveUploadedImage(uploadedUrls: string[]) {
  return uploadedUrls.length > 1 ? JSON.stringify(uploadedUrls) : (uploadedUrls[0] ?? null);
}
