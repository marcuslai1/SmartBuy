import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { normalizeData, matchesFilters, sortPhones, SORTS, DEFAULT_PRESET } from './lib/data';
import { useTheme, useUrlState } from './lib/hooks';
import Header from './components/Header';
import Controls from './components/Controls';
import ValueChart from './components/ValueChart';
import ResultsList from './components/ResultsList';
import PhoneDetail from './components/PhoneDetail';
import { CompareDialog, CompareTray } from './components/Compare';
import { Footer, HowItWorks } from './components/InfoSections';
import AwaitingSection from './components/AwaitingSection';

function useData() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch(`${import.meta.env.BASE_URL}phones.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => alive && setState({ status: 'ready', data: normalizeData(json), error: null }))
      .catch((err) => alive && setState({ status: 'error', data: null, error: err }));
    return () => {
      alive = false;
    };
  }, [attempt]);
  const retry = useCallback(() => {
    setState({ status: 'loading', data: null, error: null });
    setAttempt((a) => a + 1);
  }, []);
  return { ...state, retry };
}

export default function App() {
  const { theme, toggle } = useTheme();
  const { status, data, retry } = useData();

  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#rankings"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to rankings
      </a>
      <Header
        priceDate={data?.priceDate}
        theme={theme}
        onToggleTheme={toggle}
        count={data?.phones.length}
        incompleteBrands={data?.crawl.incompleteBrands || []}
        awaitingCount={data?.awaiting.length || 0}
      />
      {status === 'ready' && data ? (
        <Explorer data={data} />
      ) : (
        <main className="mx-auto max-w-[1360px] px-4 py-16 text-center sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <p className="text-sm text-muted" role="status">
              Loading phones…
            </p>
          ) : (
            <div role="alert">
              <p className="font-medium text-ink">Couldn’t load the phone data.</p>
              <button type="button" className="btn mt-3" onClick={retry}>
                Try again
              </button>
            </div>
          )}
        </main>
      )}
    </MotionConfig>
  );
}

function Explorer({ data }) {
  const [view, update] = useUrlState();
  const [hoveredId, setHoveredId] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const pushedDetail = useRef(false);

  const { phones, presets, categories, tiers, valueModels } = data;
  const presetKey = presets[view.preset]
    ? view.preset
    : presets[DEFAULT_PRESET]
      ? DEFAULT_PRESET
      : Object.keys(presets)[0];
  const sortKey = SORTS.some((s) => s.key === view.sort) ? view.sort : 'smartbuy';
  const presetLabel = presets[presetKey]?.label || 'Balanced';
  const sortLabel =
    sortKey === 'smartbuy' ? 'SmartBuy score' : SORTS.find((s) => s.key === sortKey).label.toLowerCase();

  const { awaiting } = data;
  const incomplete = useMemo(() => new Set(data.crawl.incompleteBrands), [data.crawl.incompleteBrands]);
  // Awaiting phones can be opened and compared, but are never ranked or plotted.
  const byId = useMemo(() => new Map([...phones, ...awaiting].map((p) => [p.id, p])), [phones, awaiting]);
  const brands = useMemo(() => {
    const counts = new Map();
    phones.forEach((p) => counts.set(p.brand, (counts.get(p.brand) || 0) + 1));
    return data.brands.map((name) => ({ name, count: counts.get(name) || 0, partial: incomplete.has(name) }));
  }, [phones, data.brands, incomplete]);

  const filters = useMemo(
    () => ({ budget: view.budget, size: view.size, max: view.max, brands: view.brands, q: view.q }),
    [view.budget, view.size, view.max, view.brands, view.q],
  );
  const matched = useMemo(() => phones.filter((p) => matchesFilters(p, filters, tiers)), [phones, filters, tiers]);
  const sorted = useMemo(() => sortPhones(matched, sortKey, presetKey), [matched, sortKey, presetKey]);
  // Budget filters need a price, so only brand and search apply to awaiting phones.
  const awaitingMatched = useMemo(
    () => awaiting.filter((p) => matchesFilters(p, { brands: view.brands, size: view.size, q: view.q }, tiers)),
    [awaiting, view.brands, view.size, view.q, tiers],
  );
  const matchIds = useMemo(() => new Set(matched.map((p) => p.id)), [matched]);

  const labelIds = useMemo(() => {
    const ids = [];
    if (view.phone && byId.has(view.phone)) ids.push(view.phone);
    // Label the top of the current ranking (price sorts fall back to SmartBuy order).
    const rankSort = sortKey.startsWith('price') ? 'smartbuy' : sortKey;
    sortPhones(matched, rankSort, presetKey)
      .slice(0, 3)
      .forEach((p) => !ids.includes(p.id) && ids.push(p.id));
    return ids;
  }, [matched, presetKey, sortKey, view.phone, byId]);

  const activeCount =
    (view.budget !== 'any' ? 1 : 0) +
    (view.size !== 'any' ? 1 : 0) +
    (view.max ? 1 : 0) +
    (view.brands.length ? 1 : 0) +
    (view.q.trim() ? 1 : 0);
  const reset = useCallback(() => update({ budget: 'any', size: 'any', max: null, brands: [], q: '' }), [update]);

  const openPhone = useCallback(
    (id) => {
      setCompareOpen(false);
      pushedDetail.current = true;
      update({ phone: id }, { push: true });
    },
    [update],
  );
  const closePhone = useCallback(() => {
    if (pushedDetail.current) {
      pushedDetail.current = false;
      window.history.back();
    } else {
      update({ phone: null });
    }
  }, [update]);

  const toggleCompare = useCallback(
    (id) => {
      const has = view.compare.includes(id);
      if (!has && view.compare.length >= 3) return;
      update({ compare: has ? view.compare.filter((x) => x !== id) : [...view.compare, id] });
    },
    [update, view.compare],
  );
  const comparePhones = useMemo(() => view.compare.map((id) => byId.get(id)).filter(Boolean), [view.compare, byId]);

  // Keep the last opened phone while the drawer animates out.
  const detailPhone = (view.phone && byId.get(view.phone)) || null;
  const [lastPhone, setLastPhone] = useState(detailPhone);
  if (detailPhone && detailPhone !== lastPhone) setLastPhone(detailPhone);

  // Expose the sticky controls' height so the chart can stick just below them.
  useEffect(() => {
    const el = document.querySelector('[data-controls]');
    if (!el) return undefined;
    const set = () => document.documentElement.style.setProperty('--controls-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <Controls
        view={view}
        update={update}
        presets={presets}
        presetKey={presetKey}
        brands={brands}
        tiers={tiers}
        activeCount={activeCount}
        onReset={reset}
        shown={matched.length}
        total={phones.length}
      />

      <main className={`mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 ${comparePhones.length ? 'pb-24' : 'pb-4'}`}>
        <div
          id="rankings"
          className="mt-5 grid scroll-mt-32 items-start gap-5 lg:mt-6 lg:gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]"
        >
          <section aria-labelledby="chart-title" className="card chart-sticky p-4 sm:p-5">
            <h2 id="chart-title" className="text-base font-semibold text-ink">
              Price vs spec score
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-ink-2">
              Spec score (0–10) for a <strong className="font-semibold text-ink">{presetLabel}</strong> priority. The
              line is the typical score at each price; dots above it give more phone for the money.
            </p>
            <ChartKey />
            <div className="mt-2">
              <ValueChart
                phones={phones}
                matchIds={matchIds}
                preset={presetKey}
                presetLabel={presetLabel}
                model={valueModels[presetKey]}
                tiers={tiers}
                selectedId={view.phone}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onSelect={openPhone}
                labelIds={labelIds}
              />
            </div>
            <p className="mt-1 text-2xs text-muted">
              Hover or tap a dot for details. With the keyboard, focus the chart and use the arrow keys.
            </p>
          </section>

          <ResultsList
            phones={sorted}
            total={phones.length}
            categories={categories}
            preset={presetKey}
            presetLabel={presetLabel}
            sort={sortKey}
            sortLabel={sortLabel}
            compare={view.compare}
            onToggleCompare={toggleCompare}
            onOpen={openPhone}
            onHover={setHoveredId}
            selectedId={view.phone}
            onReset={reset}
          />
        </div>

        <div className="mt-14 space-y-14">
          <AwaitingSection
            phones={awaitingMatched}
            totalAwaiting={awaiting.length}
            categories={categories}
            preset={presetKey}
            presetLabel={presetLabel}
            crawl={data.crawl}
            priceDate={data.priceDate}
            onOpen={openPhone}
            hasFilters={view.brands.length > 0 || !!view.q.trim()}
          />
          <HowItWorks categories={categories} />
        </div>
      </main>

      <Footer generatedAt={data.generatedAt} priceDate={data.priceDate} />

      <CompareTray
        phones={comparePhones}
        onRemove={toggleCompare}
        onClear={() => update({ compare: [] })}
        onOpen={() => setCompareOpen(true)}
      />
      <CompareDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        phones={comparePhones}
        categories={categories}
        preset={presetKey}
        presetLabel={presetLabel}
        onOpenPhone={openPhone}
      />
      <PhoneDetail
        phone={detailPhone || lastPhone}
        open={!!detailPhone}
        onClose={closePhone}
        data={data}
        preset={presetKey}
        inCompare={!!detailPhone && view.compare.includes(detailPhone.id)}
        compareFull={view.compare.length >= 3}
        onToggleCompare={toggleCompare}
      />
    </>
  );
}

function ChartKey() {
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Chart key">
      <li className="inline-flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true">
          <circle cx="5" cy="5" r="4.5" fill="var(--accent)" />
        </svg>
        Matches your filters
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill="var(--dim-point)" />
        </svg>
        Filtered out
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="18" height="10" aria-hidden="true">
          <rect x="0" y="1" width="18" height="8" fill="var(--band)" />
          <line x1="0" x2="18" y1="5" y2="5" stroke="var(--curve)" strokeWidth="2" />
        </svg>
        Typical for the price (±1 SD)
      </li>
    </ul>
  );
}
