import "server-only";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

const DATA_URL_RE = /^data:([^;,]+);base64,([\s\S]*)$/;

export function isDataUrl(value: string): boolean {
  return DATA_URL_RE.test(value.trim());
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function parseDataUrl(value: string): { mimeType: string; base64: string } {
  const match = DATA_URL_RE.exec(value.trim());
  if (!match) {
    throw new Error("Invalid data URL");
  }
  const mimeType = (match[1] ?? "application/octet-stream").toLowerCase();
  const base64 = match[2] ?? "";
  if (!base64) {
    throw new Error("Empty data URL payload");
  }
  return { mimeType, base64 };
}

function extensionForMime(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] ?? "bin";
}

function sanitizeStem(fileName: string | undefined, fallback: string): string {
  const stem = (fileName ?? fallback)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return stem || fallback;
}

export interface UploadImageOptions {
  fileName?: string;
  folder?: string;
}

/**
 * Upload a Base64 data URL to Vercel Blob and return its public URL.
 * Only `data:` URLs are accepted here; callers should use the idempotent
 * resolvers below when the value may already be a hosted URL.
 */
export async function uploadImageDataUrl(
  dataUrl: string,
  options: UploadImageOptions = {},
): Promise<string> {
  const { mimeType, base64 } = parseDataUrl(dataUrl);
  const buffer = Buffer.from(base64, "base64");

  const ext = extensionForMime(mimeType);
  const folder = (options.folder ?? "images").replace(/^\/+|\/+$/g, "");
  const stem = sanitizeStem(options.fileName, randomUUID());
  const pathname = `${folder}/${stem}.${ext}`;

  const result = await put(pathname, buffer, {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: true,
  });

  return result.url;
}

/**
 * Resolve a single image value:
 * - `data:` URLs are uploaded to Vercel Blob.
 * - Anything else (HTTPS URLs, relative paths, plain text) is returned as-is
 *   so legacy data keeps rendering.
 */
export async function resolveImageValue(
  value: string | null | undefined,
  options: UploadImageOptions = {},
): Promise<string | null> {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (isDataUrl(trimmed)) {
    return uploadImageDataUrl(trimmed, options);
  }

  return trimmed;
}

/**
 * Resolve a value that is either a single image or a JSON array of images
 * (the legacy student-homework format). Returns a JSON array string when the
 * input was an array, otherwise a single URL string.
 */
export async function resolveImageUrlOrArray(
  value: string | null | undefined,
  options: UploadImageOptions = {},
): Promise<string | null> {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const resolved = await Promise.all(
          parsed.map((item) =>
            resolveImageValue(typeof item === "string" ? item : null, options),
          ),
        );
        const filtered = resolved.filter((item): item is string => Boolean(item));
        return filtered.length > 0 ? JSON.stringify(filtered) : null;
      }
    } catch {
      // Not valid JSON — treat it as a single value below.
    }
  }

  return resolveImageValue(trimmed, options);
}

/**
 * Backend guard for assignment/problem attachments.
 *
 * Raw canvas snapshots (`data:image/...`) must never be persisted to the
 * database. This uploads them to Vercel Blob first and returns only the public
 * URL, while leaving already-hosted URLs and legacy JSON arrays intact.
 */
export async function resolveAttachmentUrl(
  value: string | null | undefined,
  options: UploadImageOptions = {},
): Promise<string | null> {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return resolveImageUrlOrArray(trimmed, options);
  }

  if (trimmed.startsWith("data:image/")) {
    return uploadImageDataUrl(trimmed, options);
  }

  return resolveImageValue(trimmed, options);
}
