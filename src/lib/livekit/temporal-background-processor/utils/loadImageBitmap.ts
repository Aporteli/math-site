/**
 * Load an image URL (or blob/data URL) into an ImageBitmap.
 * Sets crossOrigin for non-blob/data sources.
 */
export async function loadImageBitmap(src: string): Promise<ImageBitmap> {
  const img = new Image();
  if (!src.startsWith('blob:') && !src.startsWith('data:')) {
    img.crossOrigin = 'anonymous';
  }
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load background image'));
    img.src = src;
  });
  return createImageBitmap(img);
}
