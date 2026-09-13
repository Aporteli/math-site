/**
 * Draw an ImageBitmap into a canvas context using "cover" sizing
 * (scale to fill, centered crop).
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap,
  width: number,
  height: number,
): void {
  const iw = image.width;
  const ih = image.height;
  const scale = Math.max(width / iw, height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
}
