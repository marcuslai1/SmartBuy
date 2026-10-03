import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { fmtDate, fmtMonth, fmtScore, isNum, shortVariant } from '../lib/data';
import { specScore } from '../lib/engine';
import { EstBadge, MiniBars } from './bits';

const PREVIEW = 10;

const COLUMNS = [
  { key: 'name', label: 'Phone', dir: 1 },
  { key: 'spec', label: 'Score', dir: -1 },
];

/**
 * Phones with spec scores but no current price. Never ranked or plotted:
 * a value score needs a price.
 */
export default function AwaitingSection({
  phones,
  totalAwaiting,
  categories,
  weights,
  presetLabel,
  crawl,
  priceDate,
  onOpen,
  hasFilters,
}) {
  const [sort, setSort] = useState({ key: 'spec', dir: -1 });
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    const get = {
      name: (p) => p.name,
      spec: (p) => specScore(p.categories, weights),
    }[sort.key];
    return [...phones].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const na = va == null || (typeof va === 'number' && !isNum(va));
      const nb = vb == null || (typeof vb === 'number' && !isNum(vb));
      if (na || nb) return na === nb ? 0 : na ? 1 : -1;
      if (typeof va === 'string') return va.localeCompare(vb) * sort.dir;
      if (va !== vb) return (va - vb) * sort.dir;
      return (specScore(b.categories, weights) ?? 0) - (specScore(a.categories, weights) ?? 0);
    });
  }, [phones, sort, weights]);

  if (!totalAwaiting) return null;
  const shown = expanded ? sorted : sorted.slice(0, PREVIEW);
  const brands = crawl.incompleteBrands;

  const toggleSort = (col) =>
    setSort((s) => (s.key === col.key ? { key: col.key, dir: -s.dir } : { key: col.key, dir: col.dir }));

  return (
    <section id="awaiting" aria-labelledby="awaiting-title" className="scroll-mt-32">
      <h2 id="awaiting-title" className="text-lg font-semibold text-ink">
        Awaiting prices <span className="font-normal text-muted">· {totalAwaiting}</span>
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-2">
        {crawl.note
          ? `${crawl.note.trim().replace(/\.?$/, '.')} `
          : `Prices for ${brands.length ? listBrands(brands) : 'some brands'} weren’t fully collected on ${fmtDate(priceDate)}. `}
        These phones have scores but no current price, so they aren’t compared on price or plotted on the chart. Some
        may not be sold officially in Singapore.
      </p>

      <div className="card mt-4 overflow-hidden">
        {phones.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            {hasFilters ? 'None match your brand or search filters.' : 'Nothing awaiting prices.'}
          </p>
        ) : (
          <table className="tnum w-full text-sm">
            <caption className="sr-only">
              Phones awaiting prices, {presetLabel} score. Column headers sort the table.
            </caption>
            <thead>
              <tr className="border-b border-line bg-surface-2/50 text-left text-2xs uppercase tracking-wide text-muted">
                <th scope="col" className="w-8 py-1.5 pl-4 pr-1 text-right font-medium sm:w-10 sm:pl-5">
                  #
                </th>
                {COLUMNS.map((col) => {
                  const active = sort.key === col.key;
                  const right = col.key !== 'name';
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                      className={`px-2 py-1.5 font-medium ${right ? 'text-right' : ''} ${col.key === 'spec' ? 'pr-4 sm:pr-5' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink ${active ? 'text-ink' : ''}`}
                      >
                        {col.key === 'spec' ? (
                          <>
                            Score<span className="hidden sm:inline"> · {presetLabel}</span>
                          </>
                        ) : (
                          col.label
                        )}
                        {active &&
                          (sort.dir === 1 ? (
                            <ArrowUp size={11} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={11} aria-hidden="true" />
                          ))}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((p, i) => {
                return (
                  <tr
                    key={p.id}
                    className="cursor-pointer border-t border-line align-middle hover:bg-surface-2/70"
                    onClick={(e) => {
                      if (!e.target.closest('button, a, abbr')) onOpen(p.id);
                    }}
                  >
                    <td className="py-2.5 pl-4 pr-1 text-right text-xs font-semibold text-muted sm:pl-5">{i + 1}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onOpen(p.id)}
                            className="text-left font-semibold text-ink hover:underline"
                          >
                            {p.name}
                          </button>{' '}
                          <EstBadge phone={p} />
                          <div className="text-xs text-muted">
                            {shortVariant(p.variant)}
                            {p.announced && (
                              <span className="hidden sm:inline"> · announced {fmtMonth(p.announced)}</span>
                            )}
                          </div>
                        </div>
                        <div className="hidden md:flex">
                          <MiniBars phone={p} categories={categories} height={18} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pl-2 pr-4 text-right text-base font-semibold text-ink sm:pr-5">
                      {fmtScore(specScore(p.categories, weights))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {sorted.length > PREVIEW && (
          <div className="border-t border-line px-4 py-2 sm:px-5">
            <button
              type="button"
              className="text-sm font-medium text-accent-ink hover:underline"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show fewer' : `Show all (${sorted.length})`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function listBrands(brands) {
  if (brands.length <= 1) return brands.join('');
  return `${brands.slice(0, -1).join(', ')} and ${brands[brands.length - 1]}`;
}
