import { convertPdfToImages } from "@/lib/pdf-helpers";
import { readFileAsDataUrl } from "./read-file-as-data-url";
import type { UploadedFileItem } from "./types";

export async function collectUploadedItems(fileArray: File[]): Promise<UploadedFileItem[]> {
  const newItems: UploadedFileItem[] = [];

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i];

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const pdfPages = await convertPdfToImages(file);
        pdfPages.forEach((page, idx) => {
          newItems.push({
            id: `pdf-page-${Date.now()}-${idx}-${Math.random()}`,
            name: `${file.name} (${page.name})`,
            url: page.url,
          });
        });
      } catch (e) {
        console.error("PDF-ის დამუშავების შეცდომა:", e);
        alert(`ვერ მოხერხდა PDF-ის წაკითხვა: ${file.name}`);
      }
    } else if (file.type.startsWith("image/")) {
      const base64 = await readFileAsDataUrl(file);

      newItems.push({
        id: `img-${Date.now()}-${i}-${Math.random()}`,
        name: file.name,
        url: base64,
      });
    }
  }

  return newItems;
}
