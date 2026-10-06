/**
 * The ranking engine. Everything that depends on the buyer's choices (priorities,
 * storage need, brand / size / must-have filters) is worked out here, in the browser:
 *
 *  1. Each phone is priced at its cheapest variant with at least the storage needed.
 *     pipeline/build.py lists a priced variant per storage size, some of them estimates.
 *  2. Score = the category scores weighted by the priorities (memory is that variant's).
 *  3. Value = score minus the typical score at the phone's price, from a curve fitted
 *     across every phone that meets the storage need.
 *  4. Best buys: phones that nothing costing the same or less outscores, among the phones
 *     the buyer is considering. The ladder is redrawn with the priorities, prices and
 *     estimated specs nudged by their likely error (phones.json `uncertainty`); the share
 *     of draws a phone stays on it decides "Best buy" or "Close call".
 *
 * Prices for the ladder and the value curve are typical prices (median over recent
 * price checks), so a one-day sale doesn't reshuffle anything. pipeline/value.py is
 * the reference for steps 2-4; engine.test.js checks the two agree on phones.json.
 */

/** Must-have features (hard filters), tested against a phone's spec summary. */
export const MUST_HAVES = [
  { key: 'esim', label: 'eSIM', test: (s) => s.esim === true },
  { key: 'jack', label: 'Headphone jack', test: (s) => s.jack === true },
  { key: 'sd', label: 'microSD slot', test: (s) => s.card_slot === true },
  { key: 'wireless', label: 'Wireless charging', test: (s) => s.wireless_w > 0 },
  { key: 'ip68', label: 'IP68 / IP69', test: (s) => /IP6[89]/.test(s.ip_rating || '') },
];

/** Screen-size filter (inches). */
export const SIZES = [
  { key: 'any', label: 'Any' },
  { key: 'compact', label: 'Compact', title: 'Under 6.4″', test: (d) => d < 6.4 },
  { key: 'standard', label: 'Standard', title: '6.4–6.79″', test: (d) => d >= 6.4 && d < 6.8 },
  { key: 'large', label: 'Large', title: '6.8″ and up', test: (d) => d >= 6.8 },
];

// Picks: "nearly as good" means within NEAR score points (about the size of the
// estimate noise); it has to save at least SAVE_MIN of the price to be worth a mention.
// A phone up to STRETCH over budget is suggested if it beats the top pick by NEAR.
export const NEAR = 0.4;
const SAVE_MIN = 0.1;
const STEP_MAX = 1.0;
const STRETCH = 0.2;
// "Still better at": categories where a beaten phone leads the phone beating it by this much
const BETTER_BY = 1.0;
// No budget in mind: the sweet spot is the cheapest phone within SWEET_GAP of the best
// score on offer (compared as displayed, to a tenth, so 0.0001 can't cost S$100), and
// "spend less" is the best phone at no more than SWEET_LESS of its price.
const SWEET_GAP = 1.0;
const SWEET_LESS = 2 / 3;

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp10 = (v) => Math.max(0, Math.min(10, v));

/** Weighted mean of the category scores (weights needn't sum to 1). */
export function specScore(cats, weights) {
  let num = 0;
  let den = 0;
  for (const k of Object.keys(weights)) {
    const w = weights[k];
    if (!(w > 0) || !isNum(cats[k])) continue;
    num += cats[k] * w;
    den += w;
  }
  return den > 0 ? num / den : null;
}

/* ---------------------------------------------------------------- value curve */

function solve3(m, v) {
  const a = m.map((row, i) => [...row, v[i]]);
  for (let i = 0; i < 3; i++) {
    let piv = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(a[r][i]) > Math.abs(a[piv][i])) piv = r;
    [a[i], a[piv]] = [a[piv], a[i]];
    for (let r = i + 1; r < 3; r++) {
      const f = a[r][i] / a[i][i];
      a[r] = a[r].map((x, j) => x - f * a[i][j]);
    }
  }
  const out = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let s = a[i][3];
    for (let j = i + 1; j < 3; j++) s -= a[i][j] * out[j];
    out[i] = s / a[i][i];
  }
  return out;
}

/**
 * Typical score at each price: least squares of score = a + b·x + c·x², x = ln(price)
 * (pipeline/value.py fit). Null with too few phones to fit.
 */
export function fitCurve(prices, specs) {
  const n = prices.length;
  if (n < 5) return null;
  const xs = prices.map(Math.log);
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = specs.reduce((s, y) => s + y, 0) / n;
  const us = xs.map((x) => x - mx);
  const pow = (i) => us.map((u) => u ** i);
  const P = [pow(0), pow(1), pow(2), pow(3), pow(4)];
  const sum = (arr) => arr.reduce((s, x) => s + x, 0);
  const M = [0, 1, 2].map((i) => [0, 1, 2].map((j) => sum(P[i + j])));
  const V = [0, 1, 2].map((i) => sum(P[i].map((u, t) => specs[t] * u)));
  const [k0, k1, k2] = solve3(M, V);
  if (![k0, k1, k2].every(isNum)) return null;
  const model = { a: k0 - k1 * mx + k2 * mx * mx, b: k1 - 2 * k2 * mx, c: k2 };
  const resid = prices.map((p, i) => specs[i] - expectedAt(model, p));
  const sd = Math.sqrt(sum(resid.map((r) => r * r)) / Math.max(1, n - 3));
  const ssTot = sum(specs.map((y) => (y - my) ** 2));
  return { ...model, sd, r2: ssTot ? 1 - sum(resid.map((r) => r * r)) / ssTot : 0, n };
}

/** The curve at a price, held flat past its turning point so it never falls as price rises. */
export function expectedAt(model, price) {
  if (!model || !isNum(model.a) || !isNum(model.b) || !(price > 0)) return null;
  const c = isNum(model.c) ? model.c : 0;
  let x = Math.log(price);
  if (c) {
    const peak = -model.b / (2 * c);
    x = c < 0 ? Math.min(x, peak) : Math.max(x, peak);
  }
  return model.a + model.b * x + c * x * x;
}

/* ---------------------------------------------------------------- ladder */

/**
 * Indexes of the phones nothing cheaper (or the same price) outscores (pipeline/value.py
 * best_buys). At equal prices the higher score wins; exact twins both stay.
 */
export function bestBuys(prices, specs) {
  const order = prices.map((_, i) => i).sort((i, j) => prices[i] - prices[j] || specs[j] - specs[i]);
  const on = new Set();
  let best = -Infinity;
  let bestPrice = null;
  for (const i of order) {
    if (specs[i] > best + 1e-9) {
      best = specs[i];
      bestPrice = prices[i];
      on.add(i);
    } else if (Math.abs(specs[i] - best) <= 1e-9 && prices[i] === bestPrice) {
      on.add(i);
    }
  }
  return on;
}

/* ---------------------------------------------------------------- variants */

const typicalOf = (v) => (isNum(v.typical_sgd) ? v.typical_sgd : v.sgd);

// Cheaper (typical price) first; ties: more storage, more RAM, cheaper today
const variantOrder = (a, b) =>
  typicalOf(a) - typicalOf(b) || b.storage_gb - a.storage_gb || (b.ram_gb || 0) - (a.ram_gb || 0) || a.sgd - b.sgd;

/** Cheapest variant with at least `need` GB (pipeline/build.py choose_variant). */
export function chooseVariant(variants, need) {
  let best = null;
  for (const v of variants) if (v.storage_gb >= need && (!best || variantOrder(v, best) < 0)) best = v;
  return best;
}

function variantsOf(p) {
  if (Array.isArray(p.variants) && p.variants.some((v) => isNum(v?.sgd)))
    return p.variants.filter((v) => isNum(v?.sgd));
  // Older data: one variant, the headline price
  if (isNum(p.price?.sgd)) return [{ ...p.price, ...p.variant, memory: p.categories?.memory, est_from: null }];
  return [];
}

/* ---------------------------------------------------------------- randomness */

/** Small seeded PRNG so the what-if draws (and so the badges) are the same on every render. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng) {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Share of what-if draws in which each phone stays on the ladder. */
function ladderOdds(rows, weights, cfg, seed) {
  const n = rows.length;
  const counts = new Array(n).fill(0);
  const draws = cfg?.draws || 0;
  if (!draws || !n) return null;
  const rng = mulberry32(seed);
  const keys = Object.keys(weights);
  const noise = cfg.estimate_noise || {};
  for (let d = 0; d < draws; d++) {
    const w = {};
    for (const k of keys) w[k] = weights[k] * (1 + cfg.weight_wobble * (2 * rng() - 1));
    const prices = rows.map((r) => {
      const wob = cfg.price_wobble + (cfg.est_price_wobble || 0) * (r.variant.est_from?.steps || 0);
      return r.price * (1 + wob * (2 * rng() - 1));
    });
    const specs = rows.map((r) => {
      const est = r.phone.estimated;
      if (!est?.length) return specScore(r.cats, w);
      const cats = { ...r.cats };
      for (const k of est) if (isNum(cats[k])) cats[k] = clamp10(cats[k] + gauss(rng) * (noise[k] ?? 0.5));
      return specScore(cats, w);
    });
    for (const i of bestBuys(prices, specs)) counts[i]++;
  }
  return counts.map((c) => c / draws);
}

/* ---------------------------------------------------------------- analysis */

/** Brand, screen size and must-haves: the phones the buyer is considering. */
export function considers(phone, { brands = [], size = 'any', must = [] } = {}) {
  if (brands.length && !brands.includes(phone.brand)) return false;
  const sz = SIZES.find((s) => s.key === size);
  const d = phone.specs?.display_in;
  if (sz?.test && !(isNum(d) && sz.test(d))) return false;
  for (const key of must) {
    const m = MUST_HAVES.find((x) => x.key === key);
    if (m && !m.test(phone.specs || {})) return false;
  }
  return true;
}

/** Search box match: every word appears in the name, brand or chipset. */
export function textMatch(phone, q) {
  const words = (q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${phone.name} ${phone.short_name || ''} ${phone.brand} ${phone.specs?.chipset || ''}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

function betterAt(row, other) {
  return Object.keys(row.cats)
    .map((k) => ({ key: k, mine: row.cats[k], theirs: other.cats[k] }))
    .filter((c) => isNum(c.mine) && isNum(c.theirs) && c.mine - c.theirs >= BETTER_BY)
    .sort((a, b) => b.mine - b.theirs - (a.mine - a.theirs))
    .slice(0, 2);
}

/**
 * Score every priced phone for the buyer's choices.
 *   data:    normalised phones.json (lib/data.js)
 *   weights: {category: weight}
 *   storage: minimum GB (0 = any size)
 *   filters: {brands, size, must} (the budget and search only change what's shown)
 * Returns {rows, byId, model, counts}. Each row: the phone, the variant it's priced at
 * (`fits` false if no variant meets the storage need; then it's priced at its cheapest
 * and left out of the curve and the ladder), score, value, and for phones being
 * considered the ladder status.
 */
export function analyse(data, { weights, storage = 0, brands = [], size = 'any', must = [], seed = 1 }) {
  const rows = [];
  for (const p of data.phones) {
    const variants = variantsOf(p);
    let variant = chooseVariant(variants, storage);
    const fits = !!variant;
    if (!variant) variant = chooseVariant(variants, 0);
    if (!variant) continue;
    const cats = { ...p.categories, ...(isNum(variant.memory) ? { memory: variant.memory } : {}) };
    rows.push({
      id: p.id,
      phone: p,
      variant,
      fits,
      price: typicalOf(variant),
      now: variant.sgd,
      cats,
      spec: specScore(cats, weights),
      expected: null,
      value: null,
      considered: false,
      ladder: false,
      prob: null,
      status: null,
      beatenBy: null,
      betterAt: [],
      stepDown: null,
    });
  }

  const market = rows.filter((r) => r.fits && isNum(r.spec));
  const model = fitCurve(
    market.map((r) => r.price),
    market.map((r) => r.spec),
  );
  for (const r of rows) {
    r.expected = expectedAt(model, r.price);
    r.value = isNum(r.expected) && isNum(r.spec) ? r.spec - r.expected : null;
  }

  const pool = market.filter((r) => considers(r.phone, { brands, size, must }));
  const ladderIdx = bestBuys(
    pool.map((r) => r.price),
    pool.map((r) => r.spec),
  );
  const odds = ladderOdds(pool, weights, data.uncertainty, seed);
  const sure = data.bestBuy?.sure ?? 0.5;
  const close = data.bestBuy?.close ?? 0.2;
  pool.forEach((r, i) => {
    r.considered = true;
    r.ladder = ladderIdx.has(i);
    r.prob = odds ? odds[i] : r.ladder ? 1 : 0;
    r.status = r.prob >= sure ? 'best' : r.prob >= close || r.ladder ? 'close' : 'beaten';
  });

  const ladder = pool.filter((r) => r.ladder).sort((a, b) => a.price - b.price || b.spec - a.spec);
  for (const r of pool) {
    if (r.ladder) {
      const i = ladder.indexOf(r);
      r.stepDown =
        ladder
          .slice(0, i)
          .reverse()
          .find((l) => l.price < r.price && l.spec < r.spec) || null;
    } else {
      // The best phone that costs no more: the ladder rung at or below this price
      let by = null;
      for (const l of ladder) if (l.price <= r.price && l.spec > r.spec && (!by || l.spec > by.spec)) by = l;
      r.beatenBy = by;
      r.betterAt = by ? betterAt(r, by) : [];
    }
  }

  return {
    rows,
    byId: new Map(rows.map((r) => [r.id, r])),
    model,
    counts: { priced: rows.length, fit: market.length, considered: pool.length },
  };
}

/* ---------------------------------------------------------------- picks */

const better = (a, b) => (!b || a.spec > b.spec + 1e-9 || (Math.abs(a.spec - b.spec) <= 1e-9 && a.now < b.now) ? a : b);

/**
 * Up to three picks from the phones being considered, in this order of preference:
 *  top     the highest score within budget
 *  save    the cheapest phone nearly as good (within NEAR) that saves at least SAVE_MIN,
 *          else `step`: the next best buy down if it gives up at most STEP_MAX points
 *  stretch the cheapest phone up to STRETCH over budget that beats the top pick by NEAR
 *  brand   the highest score from a brand not picked yet, at no more than the top pick's
 *          price and within STEP_MAX of its score
 */
export function picks(analysis, max) {
  const inBudget = (r) => !max || r.now <= max;
  const pool = analysis.rows.filter((r) => r.considered && inBudget(r));
  if (!pool.length) return [];
  const top = pool.reduce((b, r) => better(r, b), null);
  const out = [{ kind: 'top', row: top }];

  const cheaper = pool.filter((r) => r !== top && r.now <= top.now * (1 - SAVE_MIN));
  const near = cheaper.filter((r) => r.spec >= top.spec - NEAR);
  if (near.length) {
    const save = near.reduce((b, r) => (!b || r.now < b.now || (r.now === b.now && r.spec > b.spec) ? r : b), null);
    out.push({ kind: 'save', row: save });
  } else {
    const step = cheaper.filter((r) => r.ladder).reduce((b, r) => better(r, b), null);
    if (step && step.spec >= top.spec - STEP_MAX) out.push({ kind: 'step', row: step });
  }

  if (max) {
    const over = analysis.rows.filter(
      (r) => r.considered && r.now > max && r.now <= max * (1 + STRETCH) && r.spec >= top.spec + NEAR,
    );
    const s = over.reduce((b, r) => (!b || r.now < b.now ? r : b), null);
    if (s) out.push({ kind: 'stretch', row: s });
  }

  if (out.length < 3) {
    const used = new Set(out.map((p) => p.row.phone.brand));
    const other = pool
      .filter((r) => !used.has(r.phone.brand) && r.now <= top.now && r.spec >= top.spec - STEP_MAX)
      .reduce((b, r) => better(r, b), null);
    if (other) out.push({ kind: 'brand', row: other });
  }
  return out.slice(0, 3);
}

/**
 * Picks for a buyer with no budget in mind: price levels instead of a budget.
 *  sweet  the cheapest phone within SWEET_GAP of the best score among those considered
 *  less   the best phone at no more than SWEET_LESS of the sweet spot's price
 *  best   the highest score of all, unless that's the sweet spot
 * Each alternative has `trade`: up to two categories it differs most in from the sweet
 * spot (what spending less gives up, or what spending more buys).
 */
export function sweetSpotPicks(analysis) {
  const pool = analysis.rows.filter((r) => r.considered);
  if (!pool.length) return [];
  const best = pool.reduce((b, r) => better(r, b), null);
  const sweet = pool
    .filter((r) => r.spec >= best.spec - SWEET_GAP - 0.05)
    .reduce((b, r) => (!b || r.now < b.now || (r.now === b.now && r.spec > b.spec) ? r : b), null);
  const out = [{ kind: 'sweet', row: sweet }];
  const less = pool.filter((r) => r.now <= sweet.now * SWEET_LESS).reduce((b, r) => better(r, b), null);
  if (less) out.push({ kind: 'less', row: less, trade: betterAt(sweet, less) });
  if (best !== sweet) out.push({ kind: 'best', row: best, trade: betterAt(best, sweet) });
  return out;
}
