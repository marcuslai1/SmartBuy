import { useMemo, useState } from 'react';
import { expectedAt, fmtSGD, fmtScore, isNum, scoreOf, shortName, shortVariant, storeLabel } from '../lib/data';
import { useElementSize } from '../lib/hooks';

const X_TICKS = [100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000];
const HIT_RADIUS = 24;

/**
 * Price (log x) vs spec score (y) for the current priority, with the fitted
 * "typical for the price" curve. Filtered-out phones stay, dimmed.
 */
export default function ValueChart({
  phones,
  matchIds,
  preset,
  presetLabel,
  model,
  tiers,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
  labelIds,
}) {
  const [wrapRef, { width }] = useElementSize();
  const [kbd, setKbd] = useState(false);
  const small = width > 0 && width < 560;
  const H = small ? 290 : 440;
  const m = { t: 26, r: small ? 10 : 18, b: 38, l: 34 };
  const iw = Math.max(10, width - m.l - m.r);
  const ih = H - m.t - m.b;

  const pts = useMemo(
    () =>
      phones
        .map((p) => ({ p, price: p.price?.sgd, spec: scoreOf(p, preset).spec }))
        .filter((d) => isNum(d.price) && d.price > 0 && isNum(d.spec)),
    [phones, preset],
  );

  const geo = useMemo(() => {
    if (!pts.length || !width) return null;
    const prices = pts.map((d) => d.price);
    const specs = pts.map((d) => d.spec);
    const lo = Math.min(...prices) * 0.86;
    const hi = Math.max(...prices) * 1.1;
    const ylo = Math.max(0, Math.floor(Math.min(...specs) - 0.6));
    const yhi = Math.min(10, Math.ceil(Math.max(...specs) + 0.6));
    const L0 = Math.log(lo);
    const L1 = Math.log(hi);
    const sx = (v) => m.l + ((Math.log(v) - L0) / (L1 - L0)) * iw;
    const sy = (v) => m.t + (1 - (v - ylo) / (yhi - ylo)) * ih;

    const xt = [];
    for (const t of X_TICKS) {
      if (t < lo || t > hi) continue;
      const x = sx(t);
      if (xt.length && x - sx(xt[xt.length - 1]) < (small ? 46 : 52)) continue;
      xt.push(t);
    }
    const step = yhi - ylo > 6 ? 2 : 1;
    const yt = [];
    for (let v = Math.ceil(ylo / step) * step; v <= yhi + 1e-9; v += step) yt.push(v);

    let curve = null;
    let band = null;
    if (model && isNum(model.a) && isNum(model.b)) {
      const N = 60;
      const xs = Array.from({ length: N + 1 }, (_, i) => Math.exp(L0 + ((L1 - L0) * i) / N));
      const line = xs.map((x) => [sx(x), sy(expectedAt(model, x))]);
      curve = line.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
      if (isNum(model.sd) && model.sd > 0) {
        const up = xs.map((x) => [sx(x), sy(expectedAt(model, x) + model.sd)]);
        const dn = xs.map((x) => [sx(x), sy(expectedAt(model, x) - model.sd)]).reverse();
        band = [...up, ...dn].map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + 'Z';
      }
    }

    // Tier regions along the top edge.
    const regions = (tiers || [])
      .map((t) => {
        const a = Math.max(lo, t.min || lo);
        const b = Math.min(hi, t.max == null ? hi : t.max);
        if (b <= a) return null;
        return { key: t.key, x0: sx(a), x1: sx(b), boundary: t.min > lo ? sx(t.min) : null };
      })
      .filter(Boolean);

    return { sx, sy, xt, yt, curve, band, regions, ylo, yhi, lo, hi };
  }, [pts, width, model, tiers, iw, ih, m.l, m.t, small]);

  const placed = useMemo(() => {
    if (!geo) return [];
    const boxes = [];
    const out = [];
    const byId = new Map(pts.map((d) => [d.p.id, d]));
    for (const id of labelIds) {
      const d = byId.get(id);
      if (!d) continue;
      const text = shortName(d.p);
      const w = text.length * 6.3 + 4;
      const x = geo.sx(d.price);
      const y = geo.sy(d.spec);
      const tries = [
        { x: x + 9, y: y + 4, anchor: 'start', bx: x + 9 },
        { x: x - 9, y: y + 4, anchor: 'end', bx: x - 9 - w },
        { x, y: y - 11, anchor: 'middle', bx: x - w / 2 },
        { x, y: y + 19, anchor: 'middle', bx: x - w / 2 },
        { x: x + 7, y: y - 9, anchor: 'start', bx: x + 7 },
        { x: x - 7, y: y - 9, anchor: 'end', bx: x - 7 - w },
        { x: x + 7, y: y + 17, anchor: 'start', bx: x + 7 },
        { x: x - 7, y: y + 17, anchor: 'end', bx: x - 7 - w },
      ];
      // Other dots are obstacles too, so labels don't sit on top of data.
      const dots = pts.filter((o) => o.p.id !== id).map((o) => [geo.sx(o.price), geo.sy(o.spec)]);
      const hitsDot = (b) => dots.some(([cx, cy]) => cx > b.x0 - 4 && cx < b.x1 + 4 && cy > b.y0 - 4 && cy < b.y1 + 4);
      let fallback = null;
      for (const t of tries) {
        const box = { x0: t.bx, x1: t.bx + w, y0: t.y - 11, y1: t.y + 3 };
        if (box.x0 < m.l || box.x1 > m.l + iw || box.y0 < m.t + 18 || box.y1 > m.t + ih) continue;
        if (boxes.some((b) => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))) continue;
        if (hitsDot(box)) {
          fallback = fallback || { t, box };
          continue;
        }
        fallback = null;
        boxes.push(box);
        out.push({ id, text, ...t, selected: id === selectedId });
        break;
      }
      // In a dense cluster, accept sitting over a dot (the halo keeps it legible).
      if (fallback && !out.some((o) => o.id === id)) {
        boxes.push(fallback.box);
        out.push({ id, text, ...fallback.t, selected: id === selectedId });
      }
    }
    return out;
  }, [geo, labelIds, pts, selectedId, m.l, m.t, iw, ih]);

  const keyOrder = useMemo(
    () => pts.filter((d) => matchIds.has(d.p.id)).sort((a, b) => a.price - b.price),
    [pts, matchIds],
  );

  if (!pts.length) {
    return (
      <div ref={wrapRef} className="flex h-40 items-center justify-center text-sm text-muted">
        No prices to plot yet.
      </div>
    );
  }

  const nearest = (e) => {
    if (!geo) return null;
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    let best = null;
    let bestD = Infinity;
    for (const d of pts) {
      const dist = Math.hypot(geo.sx(d.price) - mx, geo.sy(d.spec) - my) + (matchIds.has(d.p.id) ? 0 : 6);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    return bestD <= HIT_RADIUS ? best.p.id : null;
  };

  const onKeyDown = (e) => {
    if (!keyOrder.length) return;
    const idx = keyOrder.findIndex((d) => d.p.id === hoveredId);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = idx < 0 ? 0 : Math.min(keyOrder.length - 1, idx + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = idx < 0 ? 0 : Math.max(0, idx - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = keyOrder.length - 1;
    else if ((e.key === 'Enter' || e.key === ' ') && hoveredId) {
      e.preventDefault();
      onSelect(hoveredId);
      return;
    } else if (e.key === 'Escape') {
      onHover(null);
      return;
    }
    if (next != null) {
      e.preventDefault();
      setKbd(true);
      onHover(keyOrder[next].p.id);
    }
  };

  const hovered = pts.find((d) => d.p.id === hoveredId) || null;
  const drawOrder = [...pts].sort((a, b) => rankOf(a) - rankOf(b));
  function rankOf(d) {
    if (d.p.id === hoveredId) return 4;
    if (d.p.id === selectedId) return 3;
    return matchIds.has(d.p.id) ? 2 : 1;
  }

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      {geo && (
        <svg
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          className="block cursor-crosshair touch-pan-y rounded-md focus-visible:outline-offset-4"
          tabIndex={0}
          role="img"
          aria-label={`Scatter chart: price against ${presetLabel} spec score for ${pts.length} phones, with the typical score for each price drawn as a curve. Use arrow keys to step through matching phones by price, Enter to open one. The ranked list below has the same data.`}
          onPointerMove={(e) => {
            setKbd(false);
            const id = nearest(e);
            if (id !== hoveredId) onHover(id);
          }}
          onPointerLeave={() => onHover(null)}
          onClick={(e) => {
            const id = nearest(e);
            if (id) onSelect(id);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (kbd) onHover(null);
            setKbd(false);
          }}
        >
          <defs>
            <clipPath id="plot-clip">
              <rect x={m.l} y={m.t} width={iw} height={ih} />
            </clipPath>
          </defs>

          {/* tier regions */}
          {geo.regions.map((r) => (
            <g key={r.key}>
              {r.boundary != null && (
                <line
                  x1={r.boundary}
                  x2={r.boundary}
                  y1={m.t - 14}
                  y2={m.t + ih}
                  stroke="var(--line)"
                  strokeWidth="1"
                />
              )}
              {r.x1 - r.x0 > 70 && (
                <text
                  x={(r.x0 + r.x1) / 2}
                  y={m.t - 10}
                  textAnchor="middle"
                  fontSize="10.5"
                  fill="var(--muted)"
                  fontWeight="500"
                >
                  {r.key === 'budget'
                    ? 'Budget'
                    : r.key === 'midrange'
                      ? 'Mid-range'
                      : r.key === 'flagship'
                        ? 'Flagship'
                        : r.key}
                </text>
              )}
            </g>
          ))}

          {/* grid */}
          {geo.yt.map((v) => (
            <g key={`y${v}`}>
              <line x1={m.l} x2={m.l + iw} y1={geo.sy(v)} y2={geo.sy(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={m.l - 8} y={geo.sy(v) + 3.5} textAnchor="end" fontSize="11" fill="var(--muted)" className="tnum">
                {v}
              </text>
            </g>
          ))}
          <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke="var(--line-strong)" strokeWidth="1" />
          {geo.xt.map((t) => (
            <text
              key={`x${t}`}
              x={geo.sx(t)}
              y={m.t + ih + 17}
              textAnchor="middle"
              fontSize="11"
              fill="var(--muted)"
              className="tnum"
            >
              {t >= 1000 ? `${t / 1000}k` : t}
            </text>
          ))}
          <text x={m.l + iw} y={H - 4} textAnchor="end" fontSize="11" fill="var(--muted)">
            Price, S$ (log scale) →
          </text>

          {/* typical-for-price curve */}
          <g clipPath="url(#plot-clip)">
            {geo.band && <path d={geo.band} fill="var(--band)" />}
            {geo.curve && (
              <path
                d={geo.curve}
                fill="none"
                stroke="var(--curve)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>

          <text x={m.l + 8} y={m.t + 14} fontSize="11" fill="var(--ink-2)" fontWeight="500" className="chart-label">
            ↑ Above the line: more phone for the money
          </text>

          {/* points */}
          {drawOrder.map((d) => {
            const id = d.p.id;
            const on = matchIds.has(id);
            const isSel = id === selectedId;
            const isHov = id === hoveredId;
            const x = geo.sx(d.price);
            const y = geo.sy(d.spec);
            const r = isSel || isHov ? 6.5 : on ? (small ? 4.5 : 5) : 4;
            return (
              <g key={id}>
                {(isSel || isHov) && (
                  <circle
                    cx={x}
                    cy={y}
                    r={r + 4}
                    fill="none"
                    stroke={isSel ? 'var(--accent-ink)' : 'var(--ink-2)'}
                    strokeWidth="1.5"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={on || isSel || isHov ? 'var(--accent)' : 'var(--dim-point)'}
                  stroke="var(--surface)"
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {/* selective direct labels */}
          {placed.map((l) => (
            <text
              key={`l${l.id}`}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
              fontSize="11.5"
              fontWeight={l.selected ? 600 : 500}
              fill="var(--ink)"
              className="chart-label"
              pointerEvents="none"
            >
              {l.text}
            </text>
          ))}
        </svg>
      )}

      {hovered && geo && (
        <Tooltip
          d={hovered}
          geo={geo}
          width={width}
          H={H}
          preset={preset}
          model={model}
          matched={matchIds.has(hovered.p.id)}
        />
      )}

      <div className="sr-only" aria-live="polite">
        {kbd && hovered
          ? `${hovered.p.name}, ${fmtSGD(hovered.price)}, spec ${fmtScore(hovered.spec)}, value ${fmtScore(scoreOf(hovered.p, preset).value)}, SmartBuy ${fmtScore(scoreOf(hovered.p, preset).smartbuy)}`
          : ''}
      </div>
    </div>
  );
}

function Tooltip({ d, geo, width, H, preset, model, matched }) {
  const s = scoreOf(d.p, preset);
  const x = geo.sx(d.price);
  const y = geo.sy(d.spec);
  const flip = x > width - 250;
  const top = Math.max(4, Math.min(H - 196, y - 40));
  const expected = isNum(s.expected) ? s.expected : expectedAt(model, d.price);
  return (
    <div
      className="pointer-events-none absolute z-10 w-[230px] rounded-lg border border-line bg-surface p-3 text-xs shadow-[var(--shadow)]"
      style={{ left: flip ? x - 16 : x + 16, top, transform: flip ? 'translateX(-100%)' : undefined }}
      role="presentation"
    >
      <div className="text-[0.8125rem] font-semibold leading-snug text-ink">{d.p.name}</div>
      <div className="mt-0.5 text-muted">
        {[shortVariant(d.p.variant), storeLabel(d.p.price?.store)].filter(Boolean).join(' · ')}
      </div>
      <dl className="tnum mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
        <dt className="text-ink-2">Price</dt>
        <dd className="text-right font-semibold text-ink">{fmtSGD(d.price)}</dd>
        <dt className="text-ink-2">Spec score</dt>
        <dd className="text-right font-semibold text-ink">{fmtScore(s.spec)}</dd>
        <dt className="text-ink-2">Typical at this price</dt>
        <dd className="text-right text-ink-2">{fmtScore(expected)}</dd>
        <dt className="text-ink-2">Value</dt>
        <dd className="text-right font-semibold text-ink">{fmtScore(s.value)}</dd>
        <dt className="text-ink-2">SmartBuy</dt>
        <dd className="text-right font-semibold text-ink">{fmtScore(s.smartbuy)}</dd>
      </dl>
      <div className="mt-2 border-t border-line pt-1.5 text-muted">
        {matched ? 'Click for details' : 'Outside your filters · click for details'}
      </div>
    </div>
  );
}
