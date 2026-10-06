import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { normalizeData, resolvePriority, SORTS, storageLabel } from './lib/data';
import { analyse, considers, picks, sweetSpotPicks, textMatch } from './lib/engine';
import { quizToView, saveAnswers } from './lib/quiz';
import { useTheme, useUrlState } from './lib/hooks';
import Header from './components/Header';
import Controls from './components/Controls';
import ValueChart from './components/ValueChart';
import ResultsList from './components/ResultsList';
import PhoneDetail from './components/PhoneDetail';
import { CompareDialog, CompareTray } from './components/Compare';
import { Footer, HowItWorks } from './components/InfoSections';
import AwaitingSection from './components/AwaitingSection';
import Picks from './components/Picks';
import Quiz from './components/Quiz';

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
        href="#picks"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to picks
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
  const [quizOpen, setQuizOpen] = useState(false);
  const pushedDetail = useRef(false);

  const { phones, presets, categories, tiers, awaiting } = data;
  const priority = useMemo(
    () => resolvePriority({ preset: view.preset, w: view.w }, presets, categories),
    [view.preset, view.w, presets, categories],
  );
  const sortKey = SORTS.some((s) => s.key === view.sort) ? view.sort : 'best';
  const needLabel = storageLabel(view.storage);

  // Everything that depends on the buyer's choices: prices at the storage need,
  // scores for the priorities, the best-buy ladder among the phones considered.
  const analysis = useMemo(
    () =>
      analyse(data, {
        weights: priority.weights,
        storage: view.storage,
        brands: view.brands,
        size: view.size,
        must: view.must,
      }),
    [data, priority.weights, view.storage, view.brands, view.size, view.must],
  );
  // The budget and the search box only narrow what's shown.
  const shown = useMemo(
    () => analysis.rows.filter((r) => r.considered && (!view.max || r.now <= view.max) && textMatch(r.phone, view.q)),
    [analysis, view.max, view.q],
  );
  const matchIds = useMemo(() => new Set(shown.map((r) => r.id)), [shown]);
  // Not sure of a budget (quiz): price levels around a sweet spot instead of a budget
  const noBudget = view.unsure.includes('budget') && !view.max;
  const pickList = useMemo(
    () => (noBudget ? sweetSpotPicks(analysis) : picks(analysis, view.max)),
    [analysis, view.max, noBudget],
  );

  const incomplete = useMemo(() => new Set(data.crawl.incompleteBrands), [data.crawl.incompleteBrands]);
  const phoneById = useMemo(() => new Map([...phones, ...awaiting].map((p) => [p.id, p])), [phones, awaiting]);
  const brands = useMemo(() => {
    const counts = new Map();
    phones.forEach((p) => counts.set(p.brand, (counts.get(p.brand) || 0) + 1));
    return data.brands.map((name) => ({ name, count: counts.get(name) || 0, partial: incomplete.has(name) }));
  }, [phones, data.brands, incomplete]);

  // Awaiting phones have no price: only brand, size, must-haves and search apply.
  const awaitingMatched = useMemo(
    () =>
      awaiting.filter(
        (p) => considers(p, { brands: view.brands, size: view.size, must: view.must }) && textMatch(p, view.q),
      ),
    [awaiting, view.brands, view.size, view.must, view.q],
  );

  const labelIds = useMemo(() => {
    const ids = [];
    if (view.phone && analysis.byId.has(view.phone)) ids.push(view.phone);
    pickList.forEach((p) => !ids.includes(p.row.id) && ids.push(p.row.id));
    return ids;
  }, [pickList, view.phone, analysis]);

  const activeCount =
    (view.size !== 'any' ? 1 : 0) +
    (view.max ? 1 : 0) +
    (view.brands.length ? 1 : 0) +
    (view.must.length ? 1 : 0) +
    (view.q.trim() ? 1 : 0);
  const reset = useCallback(() => update({ size: 'any', max: null, brands: [], must: [], q: '' }), [update]);

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
  const compareItems = useMemo(
    () =>
      view.compare
        .map((id) => phoneById.get(id))
        .filter(Boolean)
        .map((phone) => ({ phone, row: analysis.byId.get(phone.id) || null })),
    [view.compare, phoneById, analysis],
  );

  const submitQuiz = useCallback(
    (answers) => {
      saveAnswers(answers);
      update(
        quizToView(answers, {
          baseWeights: presets.balanced?.weights || priority.weights,
          categories,
          brands: data.brands,
        }),
      );
      setQuizOpen(false);
      requestAnimationFrame(() => document.getElementById('picks')?.scrollIntoView({ block: 'start' }));
    },
    [update, presets, priority.weights, categories, data.brands],
  );

  // Keep the last opened phone while the drawer animates out.
  const detailPhone = (view.phone && phoneById.get(view.phone)) || null;
  const [lastPhone, setLastPhone] = useState(detailPhone);
  if (detailPhone && detailPhone !== lastPhone) setLastPhone(detailPhone);
  const drawerPhone = detailPhone || lastPhone;

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

  const context = useMemo(
    () => ({ priority, needLabel, storage: view.storage, max: view.max, unsure: view.unsure }),
    [priority, needLabel, view.storage, view.max, view.unsure],
  );

  return (
    <>
      <Controls
        view={view}
        update={update}
        presets={presets}
        priority={priority}
        brands={brands}
        storageNeeds={data.storage.needs}
        activeCount={activeCount}
        onReset={reset}
        shown={shown.length}
        total={analysis.counts.considered}
      />

      <main className={`mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8 ${compareItems.length ? 'pb-24' : 'pb-4'}`}>
        <Picks
          picks={pickList}
          context={context}
          categories={categories}
          onOpen={openPhone}
          onQuiz={() => setQuizOpen(true)}
          onHover={setHoveredId}
        />

        <div
          id="rankings"
          className="mt-5 grid scroll-mt-[calc(var(--controls-h,120px)+16px)] items-start gap-5 lg:mt-6 lg:gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]"
        >
          <section aria-labelledby="chart-title" className="card chart-sticky p-4 sm:p-5">
            <h2 id="chart-title" className="text-base font-semibold text-ink">
              Price vs score
            </h2>
            <p className="mt-0.5 text-[0.8125rem] text-ink-2">
              Score (0–10) for {priority.phrase}, priced for {needLabel}. The staircase is the best score you can get at
              each price: phones on it are best buys.
            </p>
            <ChartKey />
            <div className="mt-2">
              <ValueChart
                rows={analysis.rows}
                model={analysis.model}
                matchIds={matchIds}
                presetLabel={priority.label}
                tiers={tiers}
                max={view.max}
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
            rows={shown}
            sort={sortKey}
            onSort={(sort) => update({ sort })}
            context={context}
            categories={categories}
            counts={analysis.counts}
            searching={!!view.q.trim()}
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
            weights={priority.weights}
            presetLabel={priority.label}
            crawl={data.crawl}
            priceDate={data.priceDate}
            onOpen={openPhone}
            hasFilters={view.brands.length > 0 || view.must.length > 0 || view.size !== 'any' || !!view.q.trim()}
          />
          <HowItWorks categories={categories} />
        </div>
      </main>

      <Footer generatedAt={data.generatedAt} priceDate={data.priceDate} />

      <CompareTray
        items={compareItems}
        onRemove={toggleCompare}
        onClear={() => update({ compare: [] })}
        onOpen={() => setCompareOpen(true)}
      />
      <CompareDialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        items={compareItems}
        categories={categories}
        context={context}
        onOpenPhone={openPhone}
      />
      <PhoneDetail
        phone={drawerPhone}
        row={drawerPhone ? analysis.byId.get(drawerPhone.id) || null : null}
        open={!!detailPhone}
        onClose={closePhone}
        data={data}
        context={context}
        inCompare={!!detailPhone && view.compare.includes(detailPhone.id)}
        compareFull={view.compare.length >= 3}
        onToggleCompare={toggleCompare}
        onOpen={openPhone}
      />
      <Quiz open={quizOpen} onClose={() => setQuizOpen(false)} onSubmit={submitQuiz} />
    </>
  );
}

function ChartKey() {
  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Chart key">
      <li className="inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="5" fill="var(--accent)" />
        </svg>
        Best buy
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden="true">
          <circle cx="6" cy="6" r="4" fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.75" />
        </svg>
        A cheaper phone scores higher
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true">
          <circle cx="5" cy="5" r="4" fill="var(--dim-point)" />
        </svg>
        Filtered out
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="18" height="10" aria-hidden="true">
          <path d="M0,8 H7 V2 H18" fill="none" stroke="var(--accent-ink)" strokeWidth="2" />
        </svg>
        Best score for the price
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="18" height="10" aria-hidden="true">
          <line x1="0" x2="18" y1="5" y2="5" stroke="var(--curve)" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
        Typical for the price
      </li>
    </ul>
  );
}
