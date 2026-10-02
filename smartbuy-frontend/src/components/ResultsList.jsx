import { memo } from 'react';
import { Check, Plus } from 'lucide-react';
import { fmtSGD, fmtScore, isNum, legacyChange, scoreOf, shortVariant, storeLabel, traits } from '../lib/data';
import { EstBadge, MiniBars, PriceChange, Traits } from './bits';

export default function ResultsList({
  phones,
  categories,
  preset,
  sortLabel,
  presetLabel,
  legacyDate,
  compare,
  onToggleCompare,
  onOpen,
  onHover,
  selectedId,
  total,
  onReset,
}) {
  return (
    <section aria-labelledby="rankings-title" className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <h2 id="rankings-title" className="text-base font-semibold text-ink">
            Ranked by {sortLabel}
          </h2>
          <p className="text-xs text-muted">
            {phones.length} of {total} phones · {presetLabel} priority
          </p>
        </div>
        <CategoryKey categories={categories} />
      </div>

      {phones.length > 0 && <ListHeader />}
      {phones.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-medium text-ink">No phones match these filters.</p>
          <p className="mt-1 text-sm text-muted">Try a higher budget or fewer brands.</p>
          <button type="button" className="btn mt-4" onClick={onReset}>
            Clear filters
          </button>
        </div>
      ) : (
        <ol className="divide-y divide-line">
          {phones.map((p, i) => (
            <PhoneRow
              key={p.id}
              phone={p}
              rank={i + 1}
              categories={categories}
              preset={preset}
              legacyDate={legacyDate}
              inCompare={compare.includes(p.id)}
              compareFull={compare.length >= 3}
              onToggleCompare={onToggleCompare}
              onOpen={onOpen}
              onHover={onHover}
              selected={p.id === selectedId}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function CategoryKey({ categories }) {
  if (!categories.length) return null;
  return (
    <details className="group text-xs text-muted">
      <summary className="cursor-pointer list-none rounded px-1 hover:text-ink [&::-webkit-details-marker]:hidden">
        <span className="underline decoration-dotted underline-offset-2">What are the little bars?</span>
      </summary>
      <p className="mt-1 max-w-sm text-ink-2">
        Category scores out of 10, left to right: {categories.map((c) => c.label).join(', ')}.
      </p>
    </details>
  );
}

const ROW_GRID = 'sm:grid sm:grid-cols-[minmax(0,1fr)_auto_7.25rem_6.25rem_1.75rem] sm:items-center sm:gap-x-4';

function ListHeader() {
  return (
    <div className="hidden border-b border-line bg-surface-2/50 px-5 py-1.5 text-2xs font-medium uppercase tracking-wide text-muted sm:flex sm:gap-4">
      <span className="w-7 shrink-0 text-right">#</span>
      <div className={`min-w-0 flex-1 ${ROW_GRID}`}>
        <span>Phone</span>
        <span className="w-[79px]">Categories</span>
        <span className="text-right">Price</span>
        <span className="text-right">SmartBuy</span>
        <span className="sr-only">Compare</span>
      </div>
    </div>
  );
}

const PhoneRow = memo(function PhoneRow({
  phone,
  rank,
  categories,
  preset,
  legacyDate,
  inCompare,
  compareFull,
  onToggleCompare,
  onOpen,
  onHover,
  selected,
}) {
  const s = scoreOf(phone, preset);
  const price = phone.price || {};
  const change = legacyChange(phone, legacyDate);
  const { strengths, weakness } = traits(phone, categories);
  const discounted = isNum(price.list_sgd) && isNum(price.sgd) && price.list_sgd > price.sgd;
  const meta = [shortVariant(phone.variant), storeLabel(price.store)].filter(Boolean).join(' · ');
  const blockedCompare = !inCompare && compareFull;

  const priceLine = (
    <div className="flex flex-wrap items-baseline gap-x-1.5 sm:justify-end">
      <span className="text-[0.95rem] font-semibold text-ink">{fmtSGD(price.sgd)}</span>
      {discounted && (
        <s className="text-xs text-muted">
          <span className="sr-only">was </span>
          {fmtSGD(price.list_sgd)}
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
      }`}
      onMouseEnter={() => onHover(phone.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="tnum w-6 shrink-0 pt-0.5 text-right text-sm font-semibold text-muted sm:w-7">{rank}</div>
      <div className={`min-w-0 flex-1 ${ROW_GRID}`}>
        {/* Name, meta, traits */}
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
              <EstBadge phone={phone} />
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span>{meta}</span>
              {change && <PriceChange change={change} className="hidden sm:inline-flex" />}
            </div>
            <div className="mt-1 sm:hidden">
              {priceLine}
              {change && <PriceChange change={change} />}
            </div>
            <div className="mt-1.5">
              <Traits strengths={strengths} weakness={weakness} compact />
            </div>
          </div>
          {/* Scores (mobile position) */}
          <div className="shrink-0 text-right sm:hidden">
            <div className="text-2xs font-medium uppercase tracking-wide text-muted">SmartBuy</div>
            <ScoreBlock s={s} />
          </div>
        </div>

        <div className="relative z-[1] hidden sm:flex">
          <MiniBars phone={phone} categories={categories} />
        </div>

        <div className="tnum hidden text-right sm:block">{priceLine}</div>

        <div className="hidden text-right sm:block">
          <ScoreBlock s={s} />
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

        {/* Bottom strip (mobile) */}
        <div className="mt-2 flex items-center gap-3 sm:hidden">
          <div className="relative z-[1] flex">
            <MiniBars phone={phone} categories={categories} height={20} />
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

function ScoreBlock({ s }) {
  return (
    <>
      <div className="text-[1.375rem] font-semibold leading-tight text-ink">{fmtScore(s.smartbuy)}</div>
      <div className="tnum whitespace-nowrap text-2xs text-ink-2">
        Value <span className="font-semibold text-ink">{fmtScore(s.value)}</span> · Spec{' '}
        <span className="font-semibold text-ink">{fmtScore(s.spec)}</span>
      </div>
    </>
  );
}
