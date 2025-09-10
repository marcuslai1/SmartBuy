export function addRanks(list) {
  if (!Array.isArray(list)) return [];

  const N = list.length;

  // Sort *by reference* so we can map ranks back using object identity.
  const byRaw   = [...list].sort((a, b) => (b.raw_score ?? 0) - (a.raw_score ?? 0));
  const byValue = [...list].sort((a, b) => (b.smartbuy_score ?? 0) - (a.smartbuy_score ?? 0));

  const rawRank   = new Map();
  const valueRank = new Map();

  byRaw.forEach((p, i)   => rawRank.set(p,   i + 1));
  byValue.forEach((p, i) => valueRank.set(p, i + 1));

  // Final rank is just the returned order (already sorted by your backend).
  return list.map((p, i) => ({
    ...p,
    rank_final: i + 1,
    rank_raw: rawRank.get(p) ?? null,
    rank_value: valueRank.get(p) ?? null,
    rank_total: N,
  }));
}
