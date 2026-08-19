export function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ʻ|‘|’|`/g, "'")
    .replace(/\s+/g, " ");
}

export function matchesSearch(query: string, values: Array<unknown>) {
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery) {
    return true;
  }

  return values
    .flatMap((value) => flattenSearchValue(value))
    .filter(Boolean)
    .some((value) => normalizeSearch(String(value)).includes(normalizedQuery));
}

function flattenSearchValue(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenSearchValue(item));
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) => flattenSearchValue(item));
  }

  return [String(value)];
}
