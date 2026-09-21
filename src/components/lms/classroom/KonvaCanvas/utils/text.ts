export function cleanPastedText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.replace(/\n+/g, ' ').trim())
      .join('\n\n')
      .trim();
  }