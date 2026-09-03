import pdfParse from "pdf-parse/lib/pdf-parse.js";

/**
 * Haalt platte tekst uit een geüpload bestand: pdf via pdf-parse,
 * anders als utf-8 tekst. Alleen server-side gebruiken.
 */
export async function extractFileText(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (isPdf) {
    try {
      const { text } = await pdfParse(buf);
      return text.trim();
    } catch {
      return "";
    }
  }
  return buf.toString("utf8").trim();
}
