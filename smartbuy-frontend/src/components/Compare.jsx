import { Check, X } from 'lucide-react';
import {
  fmtNum,
  fmtSGD,
  fmtScore,
  isNum,
  scoreOf,
  sensorFormat,
  shortName,
  shortVariant,
  storeLabel,
} from '../lib/data';
import Dialog from './Dialog';

/** Fixed bar listing the phones picked for comparison. */
export function CompareTray({ phones, onRemove, onClear, onOpen }) {
  if (!phones.length) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-[1360px] items-center gap-2 px-4 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
        <span className="eyebrow hidden sm:inline">Compare</span>
        <ul className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {phones.map((p) => (
            <li
              key={p.id}
              className="flex shrink-0 items-center gap-1 rounded-full border border-line-strong bg-surface-2 py-0.5 pl-2.5 pr-0.5 text-xs font-medium text-ink"
            >
              <span className="max-w-[9rem] truncate sm:max-w-none">{shortName(p)}</span>
              <button
                type="button"
                onClick={() => onRemove(p.id)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
                aria-label={`Remove ${p.name} from compare`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
          {phones.length < 2 && <li className="self-center whitespace-nowrap text-xs text-muted">Pick one more</li>}
        </ul>
        <button type="button" className="btn btn-ghost hidden px-2 text-muted sm:inline-flex" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="btn btn-primary shrink-0" disabled={phones.length < 2} onClick={onOpen}>
          Compare {phones.length}
        </button>
      </div>
    </div>
  );
}

// Rows: [label, getter, better ('high' | 'low' | null), formatter]
function rows(categories, preset) {
  const sp = (k) => (p) => p.specs?.[k];
  return [
    { group: 'Scores' },
    { label: 'SmartBuy', get: (p) => scoreOf(p, preset).smartbuy, better: 'high', fmt: fmtScore, strong: true },
    { label: 'Value', get: (p) => scoreOf(p, preset).value, better: 'high', fmt: fmtScore },
    { label: 'Spec score', get: (p) => scoreOf(p, preset).spec, better: 'high', fmt: fmtScore },
    { label: 'Price', get: (p) => p.price?.sgd, better: 'low', fmt: fmtSGD, strong: true },
    { group: 'Categories (out of 10)' },
    ...categories.map((c) => ({
      label: c.label,
      get: (p) => p.categories?.[c.key],
      better: 'high',
      fmt: fmtScore,
      est: (p) => p.estimated?.includes(c.key),
    })),
    { group: 'Key specs' },
    { label: 'Variant', get: (p) => shortVariant(p.variant), better: null, fmt: (v) => v || '—' },
    { label: 'Chipset', get: sp('chipset'), better: null, fmt: (v) => v || '—' },
    { label: 'Geekbench 6', get: sp('gb6'), better: 'high', fmt: (v) => fmtNum(v) },
    { label: '3DMark WLE', get: sp('gpu'), better: 'high', fmt: (v) => fmtNum(v) },
    {
      label: 'Battery, active use',
      get: sp('battery_h'),
      better: 'high',
      fmt: (v) => (isNum(v) ? `${fmtNum(v, 1)} h` : '—'),
    },
    { label: 'Main camera sensor', get: sp('main_sensor_in'), better: 'high', fmt: (v) => sensorFormat(v) || '—' },
    {
      label: 'Telephoto zoom',
      get: sp('tele_zoom'),
      better: 'high',
      fmt: (v) => (isNum(v) ? `${fmtNum(v, 1)}×` : 'None'),
    },
    { label: 'Brightness', get: sp('nits'), better: 'high', fmt: (v) => (isNum(v) ? `${fmtNum(v)} nits` : '—') },
    {
      label: 'Wired charging',
      get: (p) => (isNum(p.specs?.wired_w) ? p.specs.wired_w : p.specs?.wired_w_est),
      better: 'high',
      fmt: (v) => (isNum(v) ? `${fmtNum(v)}W` : '—'),
    },
    {
      label: 'Wireless charging',
      get: sp('wireless_w'),
      better: 'high',
      fmt: (v) => (isNum(v) ? `${fmtNum(v)}W` : 'No'),
    },
    { label: 'OS upgrades', get: sp('os_updates'), better: 'high', fmt: (v) => (isNum(v) ? `${v} yrs` : '—') },
    {
      label: 'Upgrade years left',
      get: sp('os_years_left'),
      better: 'high',
      fmt: (v) => (isNum(v) ? `~${fmtNum(v, 1)}` : '—'),
    },
    { label: 'Storage type', get: sp('storage_type'), better: null, fmt: (v) => v || '—' },
    {
      label: 'Battery cycles',
      get: sp('battery_cycles'),
      better: 'high',
      fmt: (v) => (isNum(v) ? fmtNum(v) : '—'),
    },
    { label: 'Water resistance', get: sp('ip_rating'), better: null, fmt: (v) => v || 'None' },
    { label: 'Weight', get: sp('weight_g'), better: 'low', fmt: (v) => (isNum(v) ? `${fmtNum(v)} g` : '—') },
    { label: 'Store', get: (p) => storeLabel(p.price?.store), better: null, fmt: (v) => v },
  ];
}

function bestIndexes(values, better) {
  if (!better) return new Set();
  const nums = values.map((v, i) => [v, i]).filter(([v]) => isNum(v));
  if (nums.length < 2) return new Set();
  const target = better === 'high' ? Math.max(...nums.map(([v]) => v)) : Math.min(...nums.map(([v]) => v));
  const winners = nums.filter(([v]) => Math.abs(v - target) < 1e-9).map(([, i]) => i);
  return winners.length === nums.length ? new Set() : new Set(winners);
}

export function CompareDialog({ open, onClose, phones, categories, preset, presetLabel, onOpenPhone }) {
  const list = rows(categories, preset);
  const cols = phones.length;
  return (
    <Dialog
      open={open && cols >= 2}
      onClose={onClose}
      title="Side by side"
      subtitle={`${presetLabel} priority`}
      variant="center"
      labelId="compare-title"
    >
      <div className="px-2 pb-4 sm:px-4">
        <table className="tnum w-full table-fixed border-collapse text-sm">
          <caption className="sr-only">
            Comparison of {phones.map((p) => p.name).join(', ')}. Best value in each row is marked.
          </caption>
          <colgroup>
            <col className="w-[30%] sm:w-[24%]" />
            {phones.map((p) => (
              <col key={p.id} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-[1] bg-surface">
            <tr>
              <th scope="col" className="p-2 text-left align-bottom">
                <span className="sr-only">Attribute</span>
              </th>
              {phones.map((p) => (
                <th key={p.id} scope="col" className="p-2 text-left align-bottom">
                  <span className="block text-2xs font-medium uppercase tracking-wide text-muted">{p.brand}</span>
                  <button
                    type="button"
                    className="text-left text-[0.8125rem] font-semibold leading-snug text-ink hover:underline sm:text-sm"
                    onClick={() => onOpenPhone(p.id)}
                  >
                    {shortName(p)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              if (r.group) {
                return (
                  <tr key={r.group}>
                    <th colSpan={cols + 1} scope="colgroup" className="eyebrow px-2 pb-1 pt-4 text-left">
                      {r.group}
                    </th>
                  </tr>
                );
              }
              const values = phones.map((p) => r.get(p));
              const best = bestIndexes(values, r.better);
              return (
                <tr key={r.label} className="border-t border-line">
                  <th scope="row" className="p-2 text-left text-xs font-normal text-ink-2 sm:text-[0.8125rem]">
                    {r.label}
                  </th>
                  {phones.map((p, i) => {
                    const isBest = best.has(i);
                    return (
                      <td
                        key={p.id}
                        className={`p-2 align-top text-[0.8125rem] sm:text-sm ${r.strong ? 'font-semibold' : ''} ${
                          isBest ? 'bg-accent-soft font-semibold text-ink' : 'text-ink'
                        } break-words`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isBest && (
                            <Check
                              size={13}
                              strokeWidth={2.75}
                              className="shrink-0 text-accent-ink"
                              aria-hidden="true"
                            />
                          )}
                          {r.fmt(values[i])}
                          {isBest && <span className="sr-only"> (best)</span>}
                          {r.est?.(p) && (
                            <abbr className="est ml-0.5" title="Estimated rather than lab-tested">
                              est.
                            </abbr>
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="px-2 pt-3 text-xs text-muted">
          <Check size={12} strokeWidth={2.75} className="mr-1 inline text-accent-ink" aria-hidden="true" />
          marks the best in each row (lowest for price and weight).
        </p>
      </div>
    </Dialog>
  );
}
