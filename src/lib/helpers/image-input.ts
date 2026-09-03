export interface ChatImageDraft {
  id: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
  previewUrl: string;
}

const MAX_BASE64 = 1_200_000;
const MAX_DIMENSION = 1600;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode_failed"));
    image.src = src;
  });
}

function drawScaled(
  image: HTMLImageElement,
  maxDimension: number,
): HTMLCanvasElement {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scale = Math.min(
    1,
    maxDimension / Math.max(naturalWidth, naturalHeight, 1),
  );
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
  }
  return canvas;
}

function base64Length(dataUrl: string) {
  return dataUrl.length - dataUrl.indexOf(",") - 1;
}

/** Read an image file, downscale/re-encode it, and return a sendable draft. */
export async function fileToChatImage(
  file: File,
): Promise<ChatImageDraft | null> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return null;

  try {
    const source = await readFileAsDataUrl(file);
    const image = await loadImage(source);

    let canvas = drawScaled(image, MAX_DIMENSION);
    const mimeType = "image/jpeg";
    let quality = 0.9;
    let dataUrl = canvas.toDataURL(mimeType, quality);

    while (base64Length(dataUrl) > MAX_BASE64 && quality > 0.4) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL(mimeType, quality);
    }

    let dimension = MAX_DIMENSION;
    while (base64Length(dataUrl) > MAX_BASE64 && dimension > 512) {
      dimension = Math.floor(dimension / 1.4);
      canvas = drawScaled(image, dimension);
      quality = 0.85;
      dataUrl = canvas.toDataURL(mimeType, quality);
    }

    const data = dataUrl.split(",")[1] ?? "";
    if (data.length < 32 || data.length > MAX_BASE64) return null;

    return {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      mimeType,
      data,
      previewUrl: dataUrl,
    };
  } catch {
    return null;
  }
}