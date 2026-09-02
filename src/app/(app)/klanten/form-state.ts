/**
 * Gedeelde vorm van de klantformulier-state. Apart bestand omdat een
 * "use server" module alleen async functies mag exporteren.
 */
export type ClientFormState = {
  error: string | null;
  fieldErrors: Partial<Record<"name" | "status", string>>;
};

export const emptyClientFormState: ClientFormState = {
  error: null,
  fieldErrors: {},
};
