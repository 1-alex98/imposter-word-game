export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

export type HostErrorCode = 'empty' | 'duplicate' | 'minCount' | 'maxCount';

export interface NameValidation {
  // index-aligned with the input names array; null = no error on that row.
  fieldErrors: (HostErrorCode | null)[];
  formError: HostErrorCode | null;
  valid: boolean;
}

export function normalizeName(name: string): string {
  return name.trim();
}

export function validateNames(rawNames: readonly string[]): NameValidation {
  const trimmed = rawNames.map(normalizeName);
  const lowered = trimmed.map((n) => n.toLocaleLowerCase());
  const fieldErrors: (HostErrorCode | null)[] = trimmed.map(() => null);

  // empty fields
  trimmed.forEach((n, i) => {
    if (n.length === 0) fieldErrors[i] = 'empty';
  });

  // duplicates (case-insensitive) — flag every offender
  const seen = new Map<string, number[]>();
  lowered.forEach((n, i) => {
    if (trimmed[i].length === 0) return;
    const arr = seen.get(n) ?? [];
    arr.push(i);
    seen.set(n, arr);
  });
  for (const positions of seen.values()) {
    if (positions.length > 1) {
      for (const i of positions) {
        if (fieldErrors[i] === null) fieldErrors[i] = 'duplicate';
      }
    }
  }

  const validRows = trimmed.filter((n, i) => n.length > 0 && fieldErrors[i] === null);
  let formError: HostErrorCode | null = null;
  if (validRows.length < MIN_PLAYERS) formError = 'minCount';
  else if (validRows.length > MAX_PLAYERS) formError = 'maxCount';

  const valid = fieldErrors.every((e) => e === null) && formError === null;
  return { fieldErrors, formError, valid };
}
