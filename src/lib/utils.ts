export function getCategoryName(categories: unknown): string | undefined {
  if (Array.isArray(categories)) {
    return (categories[0] as { name?: string } | undefined)?.name;
  }
  return (categories as { name?: string } | null)?.name;
}

// Format a Date using its *local* calendar fields. Using `toISOString()` on a
// locally-constructed Date converts through UTC first, which rolls the date
// back a day for any timezone ahead of UTC (e.g. Europe/Paris) — breaking
// month-boundary lookups such as the budget page around the 1st of the month.
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function nextAndAfterMonthKeys(from: Date): { nextKey: string; afterKey: string } {
  return {
    nextKey: toMonthKey(new Date(from.getFullYear(), from.getMonth() + 1, 1)),
    afterKey: toMonthKey(new Date(from.getFullYear(), from.getMonth() + 2, 1)),
  };
}
