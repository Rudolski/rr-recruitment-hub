/** Gedeelde bouwstenen voor server-action formulieren. */

export type FormState = {
  error: string | null;
  fieldErrors: Record<string, string>;
};

export const emptyFormState: FormState = { error: null, fieldErrors: {} };

export function fieldError(fieldErrors: Record<string, string>): FormState {
  return { error: null, fieldErrors };
}

export function formError(message: string): FormState {
  return { error: message, fieldErrors: {} };
}

/* ---- FormData lezen ---- */

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function nullableStr(fd: FormData, key: string): string | null {
  const value = str(fd, key);
  return value === "" ? null : value;
}

export function numOrNull(fd: FormData, key: string): number | null {
  const value = str(fd, key);
  if (value === "") return null;
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function intOrNull(fd: FormData, key: string): number | null {
  const n = numOrNull(fd, key);
  return n == null ? null : Math.trunc(n);
}

export function checkbox(fd: FormData, key: string): boolean {
  return fd.get(key) != null;
}
