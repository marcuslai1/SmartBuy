import { useEffect, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { SORTS, tierLabel } from '../lib/data';

function Segmented({ name, label, options, value, onChange, hideLabel = false }) {
  return (
    <fieldset className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <legend className={hideLabel ? 'sr-only' : 'eyebrow float-left mr-2.5 leading-[34px]'}>{label}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o.key} className="seg-opt" title={o.title}>
            <input type="radio" name={name} value={o.key} checked={value === o.key} onChange={() => onChange(o.key)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SearchBox({ value, onChange, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={15}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search phone or chipset"
        aria-label="Search phones"
        className="field w-full pl-8 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink"
          aria-label="Clear search"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function MaxPrice({ value, onCommit }) {
  const [draft, setDraft] = useState(value ? String(value) : '');
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    // External change (reset / back button): resync the draft.
    setPrev(value);
    setDraft(value ? String(value) : '');
  }
  useEffect(() => {
    const n = Number(draft);
    const next = draft.trim() === '' || !(n > 0) ? null : Math.round(n);
    if (next === value) return undefined;
    const t = setTimeout(() => onCommit(next), 450);
    return () => clearTimeout(t);
  }, [draft, value, onCommit]);
  return (
    <label className="flex items-center gap-2">
      <span className="eyebrow">Max</span>
      <span className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">S$</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="50"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Any"
          aria-label="Maximum price in Singapore dollars"
          className="field tnum w-[6.5rem] pl-8 pr-2"
        />
      </span>
    </label>
  );
}

export default function Controls({
  view,
  update,
  presets,
  presetKey,
  brands,
  tiers,
  activeCount,
  onReset,
  shown,
  total,
}) {
  const [open, setOpen] = useState(false);
  const presetOptions = Object.entries(presets).map(([key, p]) => ({ key, label: p.label || key, title: p.blurb }));
  const budgetOptions = [{ key: 'any', label: 'Any' }, ...tiers.map((t) => ({ key: t.key, label: tierLabel(t) }))];
  const blurb = presets[presetKey]?.blurb;

  const toggleBrand = (b) => {
    const has = view.brands.includes(b.name);
    update({ brands: has ? view.brands.filter((x) => x !== b.name) : [...view.brands, b.name] });
  };

  return (
    <div className="sticky top-0 z-30 border-y border-line bg-surface" data-controls>
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        {/* Compact bar on small screens */}
        <div className="flex items-center gap-2 py-2.5 lg:hidden">
          <SearchBox value={view.q} onChange={(q) => update({ q })} className="min-w-0 flex-1" />
          <button
            type="button"
            className="btn shrink-0"
            aria-expanded={open}
            aria-controls="filter-panel"
            onClick={() => setOpen((o) => !o)}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <span className="tnum rounded-full bg-accent-ink px-1.5 text-2xs font-semibold text-on-accent">
                {activeCount}
              </span>
            )}
            <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {!open && (
          <p className="-mt-1 pb-2 text-xs text-muted lg:hidden">
            {presets[presetKey]?.label || 'Balanced'} priority · {shown} of {total} phones
          </p>
        )}

        <div
          id="filter-panel"
          className={`${open ? 'block' : 'hidden'} max-h-[calc(100dvh-120px)] overflow-y-auto pb-3 lg:block lg:max-h-none lg:overflow-visible lg:py-2.5`}
        >
          <div className="flex flex-col gap-3 lg:gap-2">
            <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:gap-4">
              <Segmented
                name="preset"
                label="Priority"
                options={presetOptions}
                value={presetKey}
                onChange={(preset) => update({ preset })}
              />
              {blurb && (
                <p className="text-xs text-ink-2 lg:min-w-0 lg:flex-1 lg:truncate lg:text-[0.8125rem]">{blurb}</p>
              )}
              <SearchBox value={view.q} onChange={(q) => update({ q })} className="hidden w-64 shrink-0 lg:block" />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-5 lg:gap-y-2">
              <Segmented
                name="budget"
                label="Budget"
                options={budgetOptions}
                value={view.budget}
                onChange={(budget) => update({ budget })}
              />
              <MaxPrice value={view.max} onCommit={(max) => update({ max })} />
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Brands">
                <span className="eyebrow mr-1">Brand</span>
                {brands.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    className="chip"
                    aria-pressed={view.brands.includes(b.name)}
                    onClick={() => toggleBrand(b)}
                  >
                    {b.name}
                    <span className="tnum text-2xs opacity-70">
                      {b.count}
                      {b.partial && (
                        <span title="Prices only partly collected in the latest crawl">
                          <span aria-hidden="true">*</span>
                          <span className="sr-only"> ranked, prices partial</span>
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2">
                <span className="eyebrow">Sort</span>
                <select
                  value={view.sort}
                  onChange={(e) => update({ sort: e.target.value })}
                  className="field pl-2 pr-7"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-2 lg:ml-auto">
                {activeCount > 0 && (
                  <button type="button" className="btn btn-ghost px-2 text-accent-ink" onClick={onReset}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2 lg:hidden">
              <button type="button" className="btn btn-primary flex-1" onClick={() => setOpen(false)}>
                Show {shown} phone{shown === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
