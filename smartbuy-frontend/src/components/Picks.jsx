import { Sparkles } from 'lucide-react';
import { fmtDiff, fmtNum, fmtSGD, fmtScore, fmtVariantPrice, shortName, shortVariant, traits } from '../lib/data';
import { NEAR } from '../lib/engine';
import { UNSURE_STORAGE } from '../lib/quiz';
import { StatusBadge, Traits } from './bits';

const LABELS = {
  save: 'Nearly as good, for less',
  step: 'Spend less',
  stretch: 'Worth stretching?',
  brand: 'Best from another brand',
  sweet: 'Sweet spot',
  less: 'Spend less',
  best: 'The best you can get',
};

// What the picks assume for each quiz question answered "not sure"
const ASSUMED = {
  budget: 'price levels instead of a budget',
  storage: `${UNSURE_STORAGE}GB of storage`,
  keep: 'keeping it 3–4 years',
  focus: 'a balanced mix of priorities',
};

const listOf = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** `best`: the best-of-all pick next to a sweet spot; `trade`: categories an alternative differs in. */
function reason(kind, row, top, max, { best, trade }) {
  const name = shortName(top.phone);
  const lower = fmtScore(top.spec - row.spec);
  const cheaper = top.now - row.now;
  switch (kind) {
    case 'top':
      return max
        ? `The highest score you can get for S$${fmtNum(max)} or less.`
        : 'The highest score of any phone on sale.';
    case 'save':
      return `${fmtSGD(cheaper)} less than the ${name} and only ${lower} lower: within the margin of error.`;
    case 'step':
      return `${fmtSGD(cheaper)} less than the ${name}, for a score ${lower} lower.`;
    case 'stretch':
      return `${fmtSGD(row.now - max)} over budget, but ${fmtScore(row.spec - top.spec)} higher than the ${name}.`;
    case 'brand':
      return `If you’d rather not buy ${top.phone.brand}: ${lower} lower than the ${name}${
        cheaper >= 1 ? `, ${fmtSGD(cheaper)} less` : ''
      }.`;
    case 'sweet':
      return best
        ? `Within ${fmtScore(best.spec - row.spec)} of the best here, the ${shortName(best.phone)}, for ${fmtSGD(
            best.now - row.now,
          )} less.`
        : 'The highest score here, and nothing cheaper comes within a point.';
    case 'less':
      return `${fmtSGD(cheaper)} less than the ${name}, for a score ${lower} lower${trade ? `: mostly weaker ${trade}` : ''}.`;
    case 'best':
      return `${fmtSGD(row.now - top.now)} more than the ${name}, for ${fmtScore(row.spec - top.spec)} higher${
        trade ? `: mainly better ${trade}` : ''
      }.`;
    default:
      return '';
  }
}

export default function Picks({ picks, context, categories, onOpen, onQuiz, onHover }) {
  const { priority, needLabel, max, unsure = [] } = context;
  const top = picks[0]?.row;
  const custom = priority.key === 'custom';
  const levels = picks[0]?.kind === 'sweet';
  const nothingClose = top && !levels && !picks.some((p) => p.kind === 'save');
  const best = picks.find((p) => p.kind === 'best')?.row;
  // Mid-sentence category names: 'Battery life' -> 'battery life', 'RAM & storage speed' stays
  const label = (key) => {
    const l = categories.find((c) => c.key === key)?.label || key;
    return /^[A-Z][a-z]/.test(l) ? l[0].toLowerCase() + l.slice(1) : l;
  };

  return (
    <section
      id="picks"
      aria-labelledby="picks-title"
      className="mt-5 scroll-mt-[calc(var(--controls-h,120px)+16px)] lg:mt-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id="picks-title" className="text-lg font-semibold text-ink">
            {custom ? 'Your picks' : 'Top picks'}
            {max ? ` under S$${fmtNum(max)}` : ''}
          </h2>
          <p className="text-[0.8125rem] text-ink-2">
            {priority.title} · {needLabel}
            {nothingClose && picks.length > 0 && ` · nothing cheaper comes within ${NEAR} of the top pick`}
          </p>
          {unsure.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              Where you weren’t sure, we went with {listOf(unsure.map((k) => ASSUMED[k]).filter(Boolean))}.
            </p>
          )}
        </div>
        <button type="button" className={`btn ${custom ? '' : 'btn-primary'}`} onClick={onQuiz}>
          <Sparkles size={14} aria-hidden="true" />
          {custom ? 'Change my answers' : 'Find my phone in 30 seconds'}
        </button>
      </div>

      {picks.length === 0 ? (
        <p className="card mt-3 px-4 py-6 text-center text-sm text-muted">
          No phones match these filters. Try a higher budget, less storage or fewer must-haves.
        </p>
      ) : (
        <ol className="mt-3 grid gap-3 md:grid-cols-3">
          {picks.map(({ kind, row, trade }) => (
            <PickCard
              key={`${kind}-${row.id}`}
              kind={kind}
              row={row}
              top={top}
              max={max}
              extra={{ best, trade: trade?.length ? trade.map((t) => label(t.key)).join(' and ') : '' }}
              categories={categories}
              onOpen={onOpen}
              onHover={onHover}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function PickCard({ kind, row, top, max, extra, categories, onOpen, onHover }) {
  const { phone, variant } = row;
  const { strengths, weakness } = traits(row.cats, categories);
  const label = kind === 'top' ? (max ? `Best under S$${fmtNum(max)}` : 'Best overall') : LABELS[kind];
  return (
    <li
      className={`card relative flex flex-col p-4 transition-shadow hover:shadow-[var(--shadow)] ${
        kind === 'top' || kind === 'sweet' ? 'border-accent-ink' : ''
      }`}
      onMouseEnter={() => onHover(phone.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="eyebrow">{label}</div>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-snug text-ink">
            <button
              type="button"
              onClick={() => onOpen(phone.id)}
              className="text-left after:absolute after:inset-0 after:content-[''] hover:underline hover:underline-offset-2"
            >
              {phone.name}
            </button>
          </h3>
          <div className="tnum mt-0.5 text-sm text-ink-2">
            <span className="font-semibold text-ink">{fmtVariantPrice(variant)}</span>
            {variant.est_from && <span className="text-muted"> est.</span>} · {shortVariant(variant)}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="tnum text-2xl font-semibold leading-none text-ink">{fmtScore(row.spec)}</div>
          <div className="tnum mt-1 text-2xs text-ink-2">{fmtDiff(row.value)} vs typical</div>
        </div>
      </div>
      <p className="mt-2 text-[0.8125rem] text-ink-2">{reason(kind, row, top, max, extra)}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2.5">
        <StatusBadge row={row} />
        <Traits strengths={strengths} weakness={weakness} compact />
      </div>
    </li>
  );
}
