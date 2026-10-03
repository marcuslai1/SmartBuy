import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { BUDGETS, CUSTOM, fmtNum, fmtStorage } from '../lib/data';
import { MUST_HAVES, SIZES } from '../lib/engine';

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
    // External change (quick budget, reset, back button): resync the draft.
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
      <span className="text-xs text-muted">or up to</span>
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

function ChipGroup({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <span className="eyebrow mr-1">{label}</span>
      {children}
    </div>
  );
}

/** A filter button that opens a small panel (wide screens; phones show the panel inline). */
function Dropdown({ label, count, align = 'left', children }) {
  const ref = useRef(null);
  useEffect(() => {
    const close = () => ref.current && (ref.current.open = false);
    const onDown = (e) => ref.current?.open && !ref.current.contains(e.target) && close();
    const onKey = (e) => {
      if (e.key === 'Escape' && ref.current?.open) {
        close();
        ref.current.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  return (
    <details ref={ref} className="group relative">
      <summary className="chip cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        {label}
        {count > 0 ? (
          <span className="tnum rounded-full bg-accent-ink px-1.5 text-2xs font-semibold text-on-accent">{count}</span>
        ) : (
          <span className="text-muted">Any</span>
        )}
        <ChevronDown size={14} aria-hidden="true" className="transition-transform group-open:rotate-180" />
      </summary>
      <div
        className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full z-40 mt-1.5 w-[28rem] max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface p-3 shadow-[var(--shadow)]`}
      >
        {children}
      </div>
    </details>
  );
}

export default function Controls({
  view,
  update,
  presets,
  priority,
  brands,
  storageNeeds,
  activeCount,
  onReset,
  shown,
  total,
}) {
  const [open, setOpen] = useState(false);
  const presetOptions = [
    ...Object.entries(presets).map(([key, p]) => ({ key, label: p.label || key, title: p.blurb })),
    ...(priority.custom ? [{ key: CUSTOM, label: 'Yours', title: 'Your answers to “Find my phone”' }] : []),
  ];
  const budgetOptions = [
    { key: 'any', label: 'Any' },
    ...BUDGETS.map((b) => ({ key: String(b), label: `≤S$${fmtNum(b)}` })),
  ];
  const budgetValue = view.max == null ? 'any' : BUDGETS.includes(view.max) ? String(view.max) : '';
  const storageOptions = storageNeeds.map((n) => ({
    key: String(n),
    label: n ? `${fmtStorage(n)}+` : 'Any',
    title: n
      ? `Each phone priced at its cheapest version with at least ${fmtStorage(n)}`
      : 'Each phone priced at its cheapest version, whatever the storage',
  }));

  const toggleIn = (key, value) => {
    const list = view[key];
    update({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });
  };

  // Rendered twice (dropdown on wide screens, inline on phones): each copy needs its own radio name
  const sizeControl = (name) => (
    <Segmented
      name={name}
      label="Screen"
      options={SIZES.map(({ key, label, title }) => ({ key, label, title }))}
      value={view.size}
      onChange={(size) => update({ size })}
    />
  );
  const brandChips = (
    <ChipGroup label="Brand">
      {brands.map((b) => (
        <button
          key={b.name}
          type="button"
          className="chip"
          aria-pressed={view.brands.includes(b.name)}
          onClick={() => toggleIn('brands', b.name)}
        >
          {b.name}
          <span className="tnum text-2xs opacity-70">
            {b.count}
            {b.partial && (
              <span title="Prices only partly collected in the latest crawl">
                <span aria-hidden="true">*</span>
                <span className="sr-only"> priced, prices partial</span>
              </span>
            )}
          </span>
        </button>
      ))}
    </ChipGroup>
  );
  const mustChips = (
    <ChipGroup label="Must have">
      {MUST_HAVES.map((m) => (
        <button
          key={m.key}
          type="button"
          className="chip"
          aria-pressed={view.must.includes(m.key)}
          onClick={() => toggleIn('must', m.key)}
        >
          {m.label}
        </button>
      ))}
    </ChipGroup>
  );

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
            {priority.title} · {view.storage ? `${fmtStorage(view.storage)}+` : 'any storage'}
            {view.max ? ` · up to S$${fmtNum(view.max)}` : ''} · {shown} of {total} phones
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
                value={priority.key}
                onChange={(preset) => update({ preset })}
              />
              {priority.blurb && (
                <p className="text-xs text-ink-2 lg:min-w-0 lg:flex-1 lg:truncate lg:text-[0.8125rem]">
                  {priority.blurb}
                </p>
              )}
              <SearchBox value={view.q} onChange={(q) => update({ q })} className="hidden w-64 shrink-0 lg:block" />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-5 lg:gap-y-2">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <Segmented
                  name="budget"
                  label="Budget"
                  options={budgetOptions}
                  value={budgetValue}
                  onChange={(key) => update({ max: key === 'any' ? null : Number(key) })}
                />
                <MaxPrice value={view.max} onCommit={(max) => update({ max })} />
              </div>
              <Segmented
                name="storage"
                label="Storage"
                options={storageOptions}
                value={String(view.storage)}
                onChange={(key) => update({ storage: Number(key) })}
              />
              <div className="hidden items-center gap-2 lg:flex">
                <Dropdown label="Brand" count={view.brands.length}>
                  {brandChips}
                </Dropdown>
                <Dropdown
                  label="Size & features"
                  align="right"
                  count={(view.size !== 'any' ? 1 : 0) + view.must.length}
                >
                  <div className="space-y-3">
                    {sizeControl('size-wide')}
                    {mustChips}
                  </div>
                </Dropdown>
                {activeCount > 0 && (
                  <button type="button" className="btn btn-ghost px-2 text-accent-ink" onClick={onReset}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Phones: everything inline */}
            <div className="flex flex-col gap-3 lg:hidden">
              {sizeControl('size-narrow')}
              {brandChips}
              {mustChips}
              {activeCount > 0 && (
                <button type="button" className="btn btn-ghost self-start px-2 text-accent-ink" onClick={onReset}>
                  Clear filters
                </button>
              )}
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
