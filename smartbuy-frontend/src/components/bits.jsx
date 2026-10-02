import { Minus, Plus } from 'lucide-react';
import { estimateNote, fmtScore, isNum } from '../lib/data';

/** Horizontal 0–10 meter: accent fill on a lighter track of the same hue. */
export function Meter({ value, max = 10, className = '', height = 6 }) {
  const pct = isNum(value) ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
  return (
    <div
      className={`relative w-full overflow-hidden rounded-full ${className}`}
      style={{ height, background: 'var(--track)' }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct}%`, background: 'var(--accent)' }}
      />
    </div>
  );
}

/** Nine tiny columns, one per category, in the fixed category order. */
export function MiniBars({ phone, categories, height = 22 }) {
  const bw = 7;
  const gap = 2;
  const width = categories.length * (bw + gap) - gap;
  const label = categories.map((c) => `${c.label} ${fmtScore(phone.categories?.[c.key])}`).join(', ');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Category scores out of 10: ${label}`}
      className="shrink-0"
    >
      {categories.map((c, i) => {
        const v = phone.categories?.[c.key];
        const h = isNum(v) ? Math.max(1.5, (Math.min(10, Math.max(0, v)) / 10) * height) : 0;
        const x = i * (bw + gap);
        const est = phone.estimated?.includes(c.key);
        return (
          <g key={c.key}>
            <title>{`${c.label}: ${fmtScore(v)}${est ? ' (estimated)' : ''}`}</title>
            <rect x={x} y={0} width={bw} height={height} rx={2} fill="var(--track)" />
            {h > 0 && <path d={roundedTop(x, height - h, bw, h, Math.min(2, h / 2))} fill="var(--accent)" />}
          </g>
        );
      })}
    </svg>
  );
}

// Rounded data-end on top, square at the baseline.
function roundedTop(x, y, w, h, r) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export function EstBadge({ phone, keys }) {
  const ks = (keys || phone.estimated || []).filter(Boolean);
  if (!ks.length) return null;
  const text = ks.map((k) => `${cap(k)}: ${estimateNote(phone, k)}`).join('. ');
  return (
    <abbr className="est" title={text} aria-label={`Estimated: ${text}`}>
      est.
    </abbr>
  );
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function Traits({ strengths, weakness, compact = false }) {
  if (!strengths.length && !weakness.length) {
    return <span className="text-xs text-muted">No standout strengths</span>;
  }
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Strengths and weaknesses">
      {strengths.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1 text-ink-2">
          <Plus size={12} strokeWidth={2.5} className="text-good" aria-hidden="true" />
          <span className="sr-only">Strength:</span>
          {s.label}
          {!compact && <span className="tnum text-muted">{fmtScore(s.v)}</span>}
        </li>
      ))}
      {weakness.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1 text-ink-2">
          <Minus size={12} strokeWidth={2.5} className="text-bad" aria-hidden="true" />
          <span className="sr-only">Weakness:</span>
          {s.label}
          {!compact && <span className="tnum text-muted">{fmtScore(s.v)}</span>}
        </li>
      ))}
    </ul>
  );
}

