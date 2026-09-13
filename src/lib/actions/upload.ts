"use server";

import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { isDataUrl, uploadImageDataUrl } from "@/lib/storage/blob";

const uploadImageSchema = z.object({
  dataUrl: z.string().min(1),
  fileName: z.string().max(240).optional(),
});

export interface UploadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a Base64 data URL to Vercel Blob and return the public URL.
 * This is the client-facing entry point: components call it *before* passing
 * an attachment to a database mutation so only the URL is persisted.
 */
export async function uploadImageToStorageAction(input: {
  dataUrl: string;
  fileName?: string;
}): Promise<UploadImageResult> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: "unauthorized" };
    }

    const parsed = uploadImageSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "invalid_payload" };
    }

    const { dataUrl, fileName } = parsed.data;
    const trimmed = dataUrl.trim();

    // Idempotent: already-hosted URLs are returned unchanged.
    if (!isDataUrl(trimmed)) {
      return { success: true, url: trimmed };
    }

    const url = await uploadImageDataUrl(trimmed, { fileName });
    return { success: true, url };
  } catch (error) {
    console.error("UPLOAD_IMAGE_ERROR:", error);
    return { success: false, error: "upload_failed" };
  }
}
