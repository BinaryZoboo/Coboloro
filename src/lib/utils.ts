export function getCategoryName(categories: unknown): string | undefined {
  if (Array.isArray(categories)) {
    return (categories[0] as { name?: string } | undefined)?.name;
  }
  return (categories as { name?: string } | null)?.name;
}

export function nextAndAfterMonthKeys(from: Date): { nextKey: string; afterKey: string } {
  const nm = from.getMonth() + 2;
  const ny = nm > 12 ? from.getFullYear() + 1 : from.getFullYear();
  const nn = nm > 12 ? nm - 12 : nm;
  const am = nn + 1;
  const ay = am > 12 ? ny + 1 : ny;
  const an = am > 12 ? 1 : am;
  return {
    nextKey: `${ny}-${String(nn).padStart(2, "0")}-01`,
    afterKey: `${ay}-${String(an).padStart(2, "0")}-01`,
  };
}
