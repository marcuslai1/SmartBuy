import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';

/* ---------- URL-backed view state ---------- */

export const DEFAULT_VIEW = {
  preset: 'balanced',
  sort: 'smartbuy',
  budget: 'any',
  max: null,
  brands: [],
  q: '',
  phone: null,
  compare: [],
};

const list = (s) =>
  s
    ? s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
    : [];

function readView() {
  const p = new URLSearchParams(window.location.search);
  const max = Number(p.get('max'));
  return {
    preset: p.get('preset') || DEFAULT_VIEW.preset,
    sort: p.get('sort') || DEFAULT_VIEW.sort,
    budget: p.get('budget') || DEFAULT_VIEW.budget,
    max: Number.isFinite(max) && max > 0 ? max : null,
    brands: list(p.get('brands')),
    q: p.get('q') || '',
    phone: p.get('phone') || null,
    compare: list(p.get('compare')).slice(0, 3),
  };
}

function writeView(v, push) {
  const p = new URLSearchParams();
  if (v.preset !== DEFAULT_VIEW.preset) p.set('preset', v.preset);
  if (v.sort !== DEFAULT_VIEW.sort) p.set('sort', v.sort);
  if (v.budget !== DEFAULT_VIEW.budget) p.set('budget', v.budget);
  if (v.max) p.set('max', String(v.max));
  if (v.brands.length) p.set('brands', v.brands.join(','));
  if (v.q) p.set('q', v.q);
  if (v.compare.length) p.set('compare', v.compare.join(','));
  if (v.phone) p.set('phone', v.phone);
  const qs = p.toString().replace(/%2C/g, ',');
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  window.history[push ? 'pushState' : 'replaceState'](null, '', url);
}

/**
 * View state mirrored to the query string so any view is shareable.
 * `update(patch, { push })` — push adds a history entry (used for opening a phone).
 */
export function useUrlState() {
  const [view, setView] = useState(readView);
  const ref = useRef(view);

  useEffect(() => {
    const onPop = () => {
      const v = readView();
      ref.current = v;
      setView(v);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((patch, opts = {}) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    writeView(next, !!opts.push);
    setView(next);
  }, []);

  return [view, update];
}

/* ---------- media queries & theme ---------- */

export function useMediaQuery(query) {
  const subscribe = useCallback(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function readStoredTheme() {
  try {
    const t = window.localStorage.getItem('sb-theme');
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readStoredTheme);
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');

  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.dataset.theme = theme;
    else delete root.dataset.theme;
    try {
      if (theme) window.localStorage.setItem('sb-theme', theme);
      else window.localStorage.removeItem('sb-theme');
    } catch {
      /* storage blocked */
    }
  }, [theme]);

  const effective = theme || (systemDark ? 'dark' : 'light');
  const toggle = useCallback(() => {
    // Going back to the OS preference clears the override.
    const next = effective === 'dark' ? 'light' : 'dark';
    setTheme(next === (systemDark ? 'dark' : 'light') ? null : next);
  }, [effective, systemDark]);

  return { theme: effective, toggle };
}

/* ---------- element size ---------- */

export function useElementSize() {
  const [node, setNode] = useState(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!node) return undefined;
    const measure = () => {
      const r = node.getBoundingClientRect();
      setSize((s) => (s.width === r.width && s.height === r.height ? s : { width: r.width, height: r.height }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, size];
}
