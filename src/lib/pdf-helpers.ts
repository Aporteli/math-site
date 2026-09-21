export async function convertPdfToImages(file: File): Promise<{ name: string; url: string }[]> {
  const pdfjsLib = await import("pdfjs-dist");

  // Worker-ის მითითება
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageImages: { name: string; url: string }[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (context) {
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // RenderTask-ის დამუშავება
      const renderContext = {
        canvasContext: context as unknown as CanvasRenderingContext2D,
        viewport: viewport,
      };

      await (page.render(renderContext as any).promise ?? page.render(renderContext as any));

      pageImages.push({
        name: `გვერდი ${pageNum}`,
        url: canvas.toDataURL("image/jpeg", 0.85),
      });
    }
  }

  return pageImages;
}