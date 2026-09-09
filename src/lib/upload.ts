/**
 * Gedeelde validatie voor geüploade bestanden. Server-side gebruiken.
 * Houdt de opslag en de tekst-extractie beheersbaar en weert
 * onverwachte bestandstypes.
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_CV_BYTES = 10 * 1024 * 1024; // 10 MB

/** Documenten en afbeeldingen die in de bestandenmodule zijn toegestaan. */
export const ALLOWED_UPLOAD_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

/** Bestandstypes waar de cv-tekstextractie iets mee kan. */
export const ALLOWED_CV_MIME = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXT_FALLBACK: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export type FileCheck = { ok: true } | { ok: false; reason: string };

/**
 * Controleert grootte en type van een geüpload bestand. Browsers laten
 * `file.type` soms leeg; dan valt hij terug op de extensie.
 */
export function checkUpload(
  file: File,
  {
    maxBytes = MAX_UPLOAD_BYTES,
    allowed = ALLOWED_UPLOAD_MIME,
  }: { maxBytes?: number; allowed?: Set<string> } = {},
): FileCheck {
  if (file.size === 0) return { ok: false, reason: "Leeg bestand." };
  if (file.size > maxBytes) {
    return {
      ok: false,
      reason: `Bestand is te groot (max ${Math.round(maxBytes / 1024 / 1024)} MB).`,
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = file.type || EXT_FALLBACK[ext] || "";
  if (!allowed.has(type)) {
    return { ok: false, reason: "Dit bestandstype is niet toegestaan." };
  }
  return { ok: true };
}
