// Helpers for reading phones.json defensively: every field may be missing.

export const DEFAULT_PRESET = 'balanced';
export const CUSTOM = 'custom';

export const SORTS = [
  { key: 'best', label: 'Best buys first' },
  { key: 'spec', label: 'Score' },
  { key: 'value', label: 'Above typical for the price' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
];

/** Quick budget choices (S$, upper limits). */
export const BUDGETS = [400, 600, 800, 1200];

const FALLBACK_TIERS = [
  { key: 'budget', min: 0, max: 400 },
  { key: 'midrange', min: 400, max: 800 },
  { key: 'flagship', min: 800, max: null },
];

const STORE_LABELS = {
  lazada: 'Lazada',
  'apple.com/sg': 'Apple Store',
  'store.google.com/sg': 'Google Store',
};

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
export { isNum };

/** Normalise the raw JSON into something components can trust. */
export function normalizeData(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const categories = Array.isArray(d.categories) ? d.categories.filter((c) => c && c.key) : [];
  const presets = d.presets && typeof d.presets === 'object' ? d.presets : {};
  const tiers = Array.isArray(d.tiers) && d.tiers.length ? d.tiers : FALLBACK_TIERS;
  const phones = (Array.isArray(d.phones) ? d.phones : []).filter((p) => p && p.id && p.name).map(normalizePhone);
  const rankedIds = new Set(phones.map((p) => p.id));
  // Phones with spec scores but no current price: never ranked or plotted.
  const awaiting = (Array.isArray(d.awaiting) ? d.awaiting : [])
    .filter((p) => p && p.id && p.name && !rankedIds.has(p.id))
    .map((p) => ({ ...normalizePhone(p), awaiting: true }));
  const crawl = d.crawl && typeof d.crawl === 'object' ? d.crawl : {};
  const incompleteBrands = Array.isArray(crawl.incomplete_brands) ? crawl.incomplete_brands : [];
  const brands = [...new Set([...phones, ...awaiting].map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' }),
  );
  const storage = d.storage && Array.isArray(d.storage.needs) ? d.storage : { needs: [0, 128, 256, 512], default: 128 };
  return {
    generatedAt: d.generated_at || null,
    priceDate: d.price_date || null,
    categories,
    presets,
    tiers,
    storage,
    bestBuy: d.best_buy || { sure: 0.5, close: 0.2 },
    uncertainty: d.uncertainty || null,
    phones,
    awaiting,
    brands,
    crawl: { note: crawl.note || null, incompleteBrands, completeBrands: crawl.complete_brands || [] },
  };
}

function normalizePhone(p) {
  return {
    ...p,
    brand: p.brand || String(p.name).split(' ')[0],
    model: p.model || p.name,
    price: p.price || {},
    variants: Array.isArray(p.variants) ? p.variants.filter(Boolean) : [],
    offers: Array.isArray(p.offers) ? p.offers.filter(Boolean) : [],
    history: Array.isArray(p.history) ? p.history.filter((h) => h && isNum(h.sgd)) : [],
    categories: p.categories || {},
    estimated: Array.isArray(p.estimated) ? p.estimated : [],
    estimated_reasons: p.estimated_reasons && typeof p.estimated_reasons === 'object' ? p.estimated_reasons : {},
    notes: p.notes && typeof p.notes === 'object' ? p.notes : {},
    scores: p.scores || {},
    specs: p.specs || {},
    variant: p.variant || {},
    last_price: p.last_price || null,
  };
}

/**
 * The priorities in force: a preset, or the buyer's own weights from the quiz
 * (`view.w`, one number per category in category order).
 */
export function resolvePriority(view, presets, categories) {
  const custom =
    Array.isArray(view.w) && view.w.length === categories.length && view.w.every((x) => isNum(x) && x >= 0)
      ? Object.fromEntries(categories.map((c, i) => [c.key, view.w[i]]))
      : null;
  if (view.preset === CUSTOM && custom && Object.values(custom).some((x) => x > 0)) {
    return {
      key: CUSTOM,
      label: 'Yours',
      title: 'Your priorities',
      phrase: 'your priorities',
      blurb: 'Your answers to “Find my phone”.',
      weights: custom,
      custom,
    };
  }
  const key = presets[view.preset] ? view.preset : presets[DEFAULT_PRESET] ? DEFAULT_PRESET : Object.keys(presets)[0];
  const p = presets[key] || {};
  const label = p.label || key;
  return {
    key,
    label,
    title: `${label} priority`,
    phrase: `a ${label} priority`,
    blurb: p.blurb || '',
    weights: p.weights || {},
    custom,
  };
}

/** Short label for tight spaces (chart labels, compare tray). */
export function shortName(p) {
  if (p?.short_name) return p.short_name;
  const m = p?.model;
  if (m && m.length > 4 && /[a-z]/i.test(m)) return m;
  return p?.name || m || '';
}

/** Category weights as fractions that sum to 1. */
export function weightShares(weights, categories) {
  const w = weights || {};
  const total = categories.reduce((s, c) => s + (isNum(w[c.key]) ? w[c.key] : 0), 0);
  const out = {};
  categories.forEach((c) => {
    out[c.key] = total > 0 && isNum(w[c.key]) ? w[c.key] / total : null;
  });
  return out;
}

export function storageLabel(need) {
  return need ? `${fmtStorage(need)}+` : 'any storage';
}

/* ---------- formatting ---------- */

export function fmtSGD(n) {
  if (!isNum(n)) return '—';
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return (
    'S$' +
    n.toLocaleString('en-SG', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0,
    })
  );
}

/** A variant's current price, "~S$720" when it's an estimate. */
export function fmtVariantPrice(v) {
  if (!v) return '—';
  return `${v.est_from ? '~' : ''}${fmtSGD(v.sgd)}`;
}

export function fmtScore(n, digits = 1) {
  return isNum(n) ? n.toFixed(digits) : '–';
}

/** Signed score difference: "+1.4", "−0.3", "±0.0". */
export function fmtDiff(n, digits = 1) {
  if (!isNum(n)) return '–';
  const r = Number(n.toFixed(digits));
  if (r === 0) return `±${(0).toFixed(digits)}`;
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(digits)}`;
}

export function fmtNum(n, digits = 0) {
  if (!isNum(n)) return '—';
  return n.toLocaleString('en-SG', { maximumFractionDigits: digits });
}

export function fmtStorage(gb) {
  if (!isNum(gb)) return null;
  if (gb >= 1024) return `${fmtNum(gb / 1024, 1)}TB`;
  return `${fmtNum(gb)}GB`;
}

export function variantLabel(v) {
  if (!v) return '';
  const parts = [];
  if (isNum(v.ram_gb)) parts.push(`${fmtNum(v.ram_gb, 1)}GB RAM`);
  const s = fmtStorage(v.storage_gb);
  if (s) parts.push(s);
  return parts.join(' · ');
}

export function shortVariant(v) {
  if (!v) return '';
  const parts = [];
  if (isNum(v.ram_gb)) parts.push(`${fmtNum(v.ram_gb, 1)}GB`);
  const s = fmtStorage(v.storage_gb);
  if (s) parts.push(s);
  return parts.join(' · ');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseISO(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

export function fmtDate(iso) {
  const p = parseISO(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : '—';
}

export function fmtMonth(iso) {
  const p = parseISO(iso);
  return p ? `${MONTHS[p.m - 1]} ${p.y}` : '—';
}

export function storeLabel(store) {
  if (!store) return 'Unknown store';
  return STORE_LABELS[store] || store;
}

/** Optical format like 1/1.3" from a sensor size in inches. */
export function sensorFormat(inches) {
  if (!isNum(inches) || inches <= 0) return null;
  if (inches >= 0.95) return '1"';
  const d = 1 / inches;
  return `1/${d.toFixed(1).replace(/\.0$/, '')}"`;
}

/* ---------- derived info ---------- */

export function traits(cats, categories) {
  const scored = categories.map((c) => ({ key: c.key, label: c.label, v: cats?.[c.key] })).filter((c) => isNum(c.v));
  const strengths = scored
    .filter((c) => c.v >= 8)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2);
  const weakness = scored
    .filter((c) => c.v <= 3.5)
    .sort((a, b) => a.v - b.v)
    .slice(0, 1);
  return { strengths, weakness };
}

export function categoryLabel(categories, key) {
  return categories.find((c) => c.key === key)?.label || key;
}

export function estimateNote(phone, key) {
  const reason = phone.estimated_reasons?.[key];
  if (typeof reason === 'string' && reason.trim()) return reason.trim().replace(/\.$/, '');
  const s = phone.specs || {};
  if (key === 'performance') {
    if (s.gb6_source === 'same chipset') return 'Benchmark borrowed from another phone with the same chipset';
    if (s.gb6_source === 'unknown' || !isNum(s.gb6)) return 'No benchmark found; estimated from the chipset and CPU';
    return 'Benchmark taken from a similar chipset';
  }
  if (key === 'battery') {
    if (s.battery_source === 'capacity estimate') return 'Not lab-tested; battery life estimated from capacity';
    return 'Not lab-tested; estimated from the EU energy label or capacity';
  }
  return 'Estimated rather than lab-tested';
}

/** Why a variant's price is an estimate. */
export function priceEstimateNote(v) {
  if (!v?.est_from) return null;
  return `No store lists the ${fmtStorage(v.storage_gb)} version; estimated from the ${fmtStorage(
    v.est_from.storage_gb,
  )} at ${fmtSGD(v.est_from.sgd)} plus a typical storage upgrade price`;
}

const yes = (b, label) => (b ? label : null);

/** One-line summary of the spec that drives each category score. */
export function keySpec(phone, key, variant = phone.variant) {
  const s = phone.specs || {};
  const join = (arr) => arr.filter(Boolean).join(' · ') || '—';
  switch (key) {
    case 'performance':
      return join([
        s.chipset,
        isNum(s.gb6) ? `Geekbench 6 ${fmtNum(s.gb6)}` : 'no benchmark',
        isNum(s.gpu) ? `3DMark ${fmtNum(s.gpu)}` : null,
        isNum(s.gpu_stability) ? `keeps ${Math.round(s.gpu_stability * 100)}% under load` : null,
      ]);
    case 'camera':
      return join([
        sensorFormat(s.main_sensor_in)
          ? `${sensorFormat(s.main_sensor_in)} main`
          : isNum(s.main_mp)
            ? `${fmtNum(s.main_mp)}MP main`
            : null,
        yes(s.main_ois, 'OIS'),
        isNum(s.tele_zoom) ? `${fmtNum(s.tele_zoom, 1)}× tele` : 'no tele',
        s.ultrawide === false ? 'no ultrawide' : yes(s.ultrawide, 'ultrawide'),
        s.video_8k ? '8K video' : yes(s.video_4k60, '4K60 video'),
        isNum(s.dxomark) && !s.dxomark_from ? `DXOMARK ${s.dxomark}` : null,
      ]);
    case 'battery':
      return join([
        isNum(s.battery_h) ? `${fmtNum(s.battery_h, 1)} h active use` : null,
        isNum(s.battery_mah) ? `${fmtNum(s.battery_mah)} mAh` : null,
      ]);
    case 'display':
      return join([
        isNum(s.display_in) ? `${fmtNum(s.display_in, 2)}″` : null,
        s.oled === true ? (s.ltpo ? 'LTPO OLED' : 'OLED') : s.oled === false ? 'LCD' : null,
        plausibleRefresh(s.refresh_hz) ? `${s.refresh_hz}Hz` : null,
        yes(s.has_hdr, 'HDR'),
        isNum(s.nits) ? `${fmtNum(s.nits)} nits${s.nits_measured ? '' : ' (claimed)'}` : null,
      ]);
    case 'charging': {
      const wired = isNum(s.wired_w) ? s.wired_w : s.wired_w_est;
      return join([
        isNum(wired) ? `${fmtNum(wired)}W wired${!isNum(s.wired_w) ? ' (est.)' : ''}` : null,
        isNum(s.wireless_w) ? `${fmtNum(s.wireless_w)}W wireless` : 'no wireless',
      ]);
    }
    case 'build':
      return join([
        s.ip_rating || 'no IP rating',
        s.glass,
        s.frame && `${s.frame} frame`,
        s.eu_free_fall && `EU drop class ${s.eu_free_fall}`,
        isNum(s.battery_cycles) && `${fmtNum(s.battery_cycles)} battery cycles`,
      ]);
    case 'memory': {
      const kind = variant?.storage_type || s.storage_type;
      return join([
        isNum(variant?.ram_gb) ? `${fmtNum(variant.ram_gb, 1)}GB RAM` : null,
        kind && `${kind}${s.storage_type_est ? ' (est.)' : ''} storage`,
      ]);
    }
    case 'software':
      if (!isNum(s.os_updates)) return '—';
      return join([
        isNum(s.os_years_left) ? `~${fmtNum(s.os_years_left, 1)} yrs of OS upgrades left` : null,
        `${s.os_updates} promised${s.os_updates_stated ? '' : ' (assumed)'}`,
      ]);
    case 'extras':
      return join([
        yes(s.has_5g, '5G'),
        yes(s.nfc, 'NFC'),
        yes(s.esim, 'eSIM'),
        yes(s.stereo, 'stereo'),
        yes(s.jack, '3.5mm jack'),
        yes(s.uwb, 'UWB'),
        yes(s.ir, 'IR blaster'),
        yes(s.secure_unlock, 'ultrasonic/3D unlock'),
      ]);
    default:
      return '—';
  }
}

/** Some scraped refresh rates are PWM frequencies (e.g. 2560Hz); hide those. */
export function plausibleRefresh(hz) {
  return isNum(hz) && hz >= 30 && hz <= 240;
}

/* ---------- sorting ---------- */

/** Sort engine rows; ties fall back to score, then price. */
export function sortRows(rows, sort) {
  const get =
    {
      value: (r) => r.value,
      price_asc: (r) => r.now,
      price_desc: (r) => r.now,
    }[sort] || ((r) => r.spec);
  const dir = sort === 'price_asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    const na = !isNum(va);
    const nb = !isNum(vb);
    if (na || nb) return na === nb ? 0 : na ? 1 : -1;
    if (va !== vb) return (va - vb) * dir;
    return b.spec - a.spec || a.now - b.now;
  });
}
