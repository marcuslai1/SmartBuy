// "Find my phone": turns a few answers into priorities (category weights) and filters.
// Weights start from the Balanced preset; each thing that matters most multiplies its
// categories, and how long the phone will be kept scales software support and build.
// Most questions can be answered "not sure" (key 'unsure'): it maps to a sensible
// default, and the view remembers it so the picks can say what was assumed.

export const OS_CHOICES = [
  { key: 'any', label: 'Either' },
  { key: 'ios', label: 'iPhone' },
  { key: 'android', label: 'Android' },
];

export const BUDGET_CHOICES = [300, 500, 800, 1200, 1800];

export const UNSURE_STORAGE = 128;

export const STORAGE_CHOICES = [
  { key: 128, label: '128GB', hint: 'Fine for most people' },
  { key: 256, label: '256GB', hint: 'Lots of photos, videos or games' },
  { key: 512, label: '512GB+', hint: 'You never delete anything' },
  { key: 'unsure', label: 'Not sure', hint: `We’ll go with ${UNSURE_STORAGE}GB, enough for most` },
];

export const FOCUS = [
  { key: 'camera', label: 'Camera', boost: { camera: 2.5 } },
  { key: 'battery', label: 'Battery life', boost: { battery: 2.5 } },
  { key: 'speed', label: 'Speed & gaming', boost: { performance: 2.5, memory: 1.5, display: 1.25 } },
  { key: 'screen', label: 'Screen', boost: { display: 2.5 } },
  { key: 'charging', label: 'Fast charging', boost: { charging: 3 } },
  { key: 'tough', label: 'Toughness', boost: { build: 2.5 } },
  { key: 'updates', label: 'Years of updates', boost: { software: 2.5 } },
];
export const MAX_FOCUS = 3;

export const KEEP = [
  { key: 'short', label: 'About 2 years', boost: { software: 0.5, build: 0.8 } },
  { key: 'mid', label: '3–4 years', boost: {} },
  { key: 'long', label: '5 years or more', boost: { software: 2, build: 1.5 } },
  { key: 'unsure', label: 'Not sure', boost: {} },
];

export const DEFAULT_ANSWERS = {
  os: 'any',
  budget: 'unsure',
  storage: 128,
  size: 'any',
  focus: [],
  keep: 'mid',
  must: [],
};

export function quizWeights(answers, baseWeights) {
  const w = { ...baseWeights };
  const boost = (b) => Object.entries(b || {}).forEach(([k, m]) => k in w && (w[k] *= m));
  (answers.focus || []).slice(0, MAX_FOCUS).forEach((f) => boost(FOCUS.find((x) => x.key === f)?.boost));
  boost(KEEP.find((x) => x.key === answers.keep)?.boost);
  return w;
}

/** Questions answered "not sure", in the order the picks mention them. */
export function unsureOf(answers) {
  return [
    answers.budget === 'unsure' && 'budget',
    answers.storage === 'unsure' && 'storage',
    answers.keep === 'unsure' && 'keep',
    (answers.focus || []).includes('unsure') && 'focus',
  ].filter(Boolean);
}

// The view fields each "not sure" answer became: once one is changed by hand, that
// answer is no longer a guess and its note goes.
const UNSURE_FIELDS = { budget: ['max'], storage: ['storage'], keep: ['preset', 'w'], focus: ['preset', 'w'] };

/** The "not sure" notes that still apply after a view update. */
export function keepUnsure(unsure, patch) {
  if ('unsure' in patch) return patch.unsure;
  return unsure.filter((k) => !UNSURE_FIELDS[k]?.some((f) => f in patch));
}

/** The view (URL state) the answers lead to. `brands` is every brand on the site. */
export function quizToView(answers, { baseWeights, categories, brands }) {
  const w = quizWeights(answers, baseWeights);
  return {
    preset: 'custom',
    w: categories.map((c) => Math.round((w[c.key] ?? 0) * 100) / 100),
    max: typeof answers.budget === 'number' ? answers.budget : null,
    storage: answers.storage === 'unsure' ? UNSURE_STORAGE : answers.storage,
    unsure: unsureOf(answers),
    size: answers.size,
    brands:
      answers.os === 'ios'
        ? brands.filter((b) => b === 'Apple')
        : answers.os === 'android'
          ? brands.filter((b) => b !== 'Apple')
          : [],
    must: answers.must || [],
    sort: 'best',
    q: '',
  };
}

const STORE_KEY = 'sb-quiz';

export function loadAnswers() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE_KEY));
    return raw && typeof raw === 'object' ? { ...DEFAULT_ANSWERS, ...raw } : { ...DEFAULT_ANSWERS };
  } catch {
    return { ...DEFAULT_ANSWERS };
  }
}

export function saveAnswers(answers) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(answers));
  } catch {
    /* storage blocked */
  }
}
