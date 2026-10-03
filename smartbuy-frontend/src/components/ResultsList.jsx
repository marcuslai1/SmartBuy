import { memo, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import {
  SORTS,
  categoryLabel,
  fmtDiff,
  fmtNum,
  fmtSGD,
  fmtScore,
  fmtVariantPrice,
  isNum,
  shortName,
  shortVariant,
  sortRows,
  storeLabel,
} from '../lib/data';
import { EstBadge, MiniBars, StatusBadge } from './bits';

export default function ResultsList({
  rows,
  sort,
  onSort,
  context,
  categories,
  counts,
  searching,
  compare,
  onToggleCompare,
  onOpen,
  onHover,
  selectedId,
  onReset,
}) {
  const [showBeaten, setShowBeaten] = useState(false);
  const ladderMode = sort === 'best';
  const sorted = sortRows(rows, ladderMode ? 'spec' : sort);
  const top = ladderMode ? sorted.filter((r) => r.status !== 'beaten') : sorted;
  const beaten = ladderMode ? sorted.filter((r) => r.status === 'beaten') : [];
  const openBeaten = showBeaten || searching || !top.length;
  const budget = context.max ? ` under S$${fmtNum(context.max)}` : '';
  const left = counts.priced - counts.fit;

  const rowProps = (r) => ({
    row: r,
    categories,
    ladderMode,
    inCompare: compare.includes(r.id),
    compareFull: compare.length >= 3,
    onToggleCompare,
    onOpen,
    onHover,
    selected: r.id === selectedId,
  });

  return (
    <section aria-labelledby="rankings-title" className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 id="rankings-title" className="text-base font-semibold text-ink">
            {ladderMode ? `Best buys${budget}` : `All phones${budget}`}
          </h2>
          <p className="text-xs text-muted">
            {ladderMode ? `${top.length} of ${rows.length} phones` : `${rows.length} phones`} · {context.priority.title}{' '}
            · {context.needLabel}
            {left > 0 && (
              <span title={`Not sold with ${context.needLabel}`}>
                {' '}
                ({left} not sold with {context.needLabel})
              </span>
            )}
          </p>
        </div>
        <label className="flex items-center gap-2">
          <span className="eyebrow">Sort</span>
          <select value={sort} onChange={(e) => onSort(e.target.value)} className="field pl-2 pr-7">
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length > 0 && <ListHeader />}
      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-medium text-ink">No phones match these filters.</p>
          <p className="mt-1 text-sm text-muted">Try a higher budget, less storage or fewer must-haves.</p>
          <button type="button" className="btn mt-4" onClick={onReset}>
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <ol className="divide-y divide-line">
            {top.map((r, i) => (
              <PhoneRow key={r.id} rank={i + 1} {...rowProps(r)} />
            ))}
          </ol>
          {beaten.length > 0 && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-y border-line bg-surface-2/60 px-4 py-2.5 sm:px-5">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Beaten by a cheaper phone <span className="font-normal text-muted">· {beaten.length}</span>
                  </h3>
                  <p className="text-xs text-muted">
                    Each has a phone that costs the same or less and scores higher for your priorities.
                  </p>
                </div>
                {!searching && top.length > 0 && (
                  <button
                    type="button"
                    className="text-sm font-medium text-accent-ink hover:underline"
                    aria-expanded={openBeaten}
                    onClick={() => setShowBeaten((v) => !v)}
                  >
                    {openBeaten ? 'Hide' : `Show ${beaten.length}`}
                  </button>
                )}
              </div>
              {openBeaten && (
                <ol className="divide-y divide-line">
                  {beaten.map((r) => (
                    <PhoneRow key={r.id} {...rowProps(r)} />
                  ))}
                </ol>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

const ROW_GRID = 'sm:grid sm:grid-cols-[minmax(0,1fr)_auto_7.25rem_5.5rem_1.75rem] sm:items-center sm:gap-x-4';

function ListHeader() {
  return (
    <div className="hidden border-b border-line bg-surface-2/50 px-5 py-1.5 text-2xs font-medium uppercase tracking-wide text-muted sm:flex sm:gap-4">
      <span className="w-7 shrink-0 text-right">#</span>
      <div className={`min-w-0 flex-1 ${ROW_GRID}`}>
        <span>Phone</span>
        <span className="w-[79px]">Categories</span>
        <span className="text-right">Price</span>
        <span className="text-right">Score</span>
        <span className="sr-only">Compare</span>
      </div>
    </div>
  );
}

/** One line on where the phone sits on the price ladder. */
export function LadderNote({ row, categories, onOpen }) {
  const name = (r) =>
    onOpen ? (
      <button
        type="button"
        className="relative z-[1] font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-current"
        onClick={() => onOpen(r.id)}
      >
        {shortName(r.phone)}
      </button>
    ) : (
      <span className="font-medium text-ink">{shortName(r.phone)}</span>
    );
  if (row.beatenBy) {
    const by = row.beatenBy;
    const save = row.price - by.price;
    const lead = row.status === 'best' ? 'Neck and neck with' : 'Beaten by';
    return (
      <span>
        {lead} {name(by)}: {save >= 1 ? `${fmtSGD(save)} less` : 'same price'}, {fmtScore(by.spec - row.spec)} higher
        {row.betterAt.length > 0 &&
          ` · still better at ${row.betterAt.map((b) => categoryLabel(categories, b.key).toLowerCase()).join(' and ')}`}
      </span>
    );
  }
  if (row.stepDown) {
    const d = row.stepDown;
    return (
      <span>
        Next one down: {name(d)}, {fmtSGD(row.price - d.price)} less, {fmtScore(row.spec - d.spec)} lower
      </span>
    );
  }
  if (row.ladder) return <span>The cheapest phone that scores this well</span>;
  return null;
}

const PhoneRow = memo(function PhoneRow({
  row,
  rank,
  categories,
  ladderMode,
  inCompare,
  compareFull,
  onToggleCompare,
  onOpen,
  onHover,
  selected,
}) {
  const { phone, variant } = row;
  const discounted = isNum(variant.list_sgd) && variant.list_sgd > variant.sgd;
  const meta = [shortVariant(variant), variant.est_from ? 'price estimated' : storeLabel(variant.store)]
    .filter(Boolean)
    .join(' · ');
  const blockedCompare = !inCompare && compareFull;
  const note = row.considered ? <LadderNote row={row} categories={categories} /> : null;

  const priceLine = (
    <div className="flex flex-wrap items-baseline gap-x-1.5 sm:justify-end">
      <span className="text-[0.95rem] font-semibold text-ink" title={variant.est_from ? 'Estimated price' : undefined}>
        {fmtVariantPrice(variant)}
      </span>
      {discounted && (
        <s className="text-xs text-muted">
          <span className="sr-only">was </span>
          {fmtSGD(variant.list_sgd)}
        </s>
      )}
    </div>
  );

  const compareProps = {
    type: 'button',
    'aria-pressed': inCompare,
    disabled: blockedCompare,
    title: blockedCompare ? 'You can compare up to 3 phones' : inCompare ? 'Remove from compare' : 'Add to compare',
    onClick: () => onToggleCompare(phone.id),
  };

  return (
    <li
      className={`relative flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2/70 sm:gap-4 sm:px-5 ${
        selected ? 'bg-accent-soft' : ''
      } ${ladderMode && row.status === 'beaten' ? 'opacity-90' : ''}`}
      onMouseEnter={() => onHover(phone.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="tnum w-6 shrink-0 pt-0.5 text-right text-sm font-semibold text-muted sm:w-7">{rank ?? ''}</div>
      <div className={`min-w-0 flex-1 ${ROW_GRID}`}>
        <div className="flex min-w-0 items-start gap-3 sm:block">
          <div className="min-w-0 flex-1">
            <h3 className="text-[0.95rem] font-semibold leading-snug text-ink">
              <button
                type="button"
                onClick={() => onOpen(phone.id)}
                onFocus={() => onHover(phone.id)}
                onBlur={() => onHover(null)}
                className="text-left after:absolute after:inset-0 after:content-[''] hover:underline hover:decoration-1 hover:underline-offset-2 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--accent-ink)]"
              >
                {phone.name}
              </button>{' '}
              <StatusBadge row={row} /> <EstBadge phone={phone} />
            </h3>
            <div className="mt-0.5 text-xs text-muted">{meta}</div>
            <div className="mt-1 sm:hidden">{priceLine}</div>
            {note && <div className="mt-1 text-xs text-ink-2">{note}</div>}
          </div>
          <div className="shrink-0 text-right sm:hidden">
            <div className="text-2xs font-medium uppercase tracking-wide text-muted">Score</div>
            <ScoreBlock row={row} />
          </div>
        </div>

        <div className="relative z-[1] hidden sm:flex">
          <MiniBars phone={phone} cats={row.cats} categories={categories} />
        </div>

        <div className="tnum hidden text-right sm:block">{priceLine}</div>

        <div className="hidden text-right sm:block">
          <ScoreBlock row={row} />
        </div>

        <div className="hidden sm:block">
          <button
            {...compareProps}
            aria-label={`Compare ${phone.name}`}
            className="chip relative z-[1] h-7 w-7 justify-center p-0"
          >
            {inCompare ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          </button>
        </div>

        <div className="mt-2 flex items-center gap-3 sm:hidden">
          <div className="relative z-[1] flex">
            <MiniBars phone={phone} cats={row.cats} categories={categories} height={20} />
          </div>
          <button {...compareProps} className="chip relative z-[1] ml-auto h-7 shrink-0 px-2.5 text-xs">
            {inCompare ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
            Compare
          </button>
        </div>
      </div>
    </li>
  );
});

function ScoreBlock({ row }) {
  return (
    <>
      <div className="tnum text-[1.375rem] font-semibold leading-tight text-ink">{fmtScore(row.spec)}</div>
      <div
        className="tnum whitespace-nowrap text-2xs text-ink-2"
        title="Score minus the typical score of phones at this price"
      >
        <span className="font-semibold text-ink">{fmtDiff(row.value)}</span> vs typical
      </div>
    </>
  );
}
