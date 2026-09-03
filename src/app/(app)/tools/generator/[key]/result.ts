/** Gedeeld tussen de server action en het client-paneel. */
export type GenerateResult = { text: string | null; error: string | null };

export const emptyGenerateResult: GenerateResult = { text: null, error: null };
