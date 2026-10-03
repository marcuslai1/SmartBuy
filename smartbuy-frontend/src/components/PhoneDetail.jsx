import { Check, ExternalLink, Plus } from 'lucide-react';
import {
  categoryLabel,
  estimateNote,
  fmtDate,
  fmtDiff,
  fmtMonth,
  fmtNum,
  fmtSGD,
  fmtScore,
  fmtStorage,
  fmtVariantPrice,
  isNum,
  keySpec,
  plausibleRefresh,
  priceEstimateNote,
  sensorFormat,
  shortName,
  storeLabel,
  traits,
  variantLabel,
  weightShares,
} from '../lib/data';
import { specScore } from '../lib/engine';
import { Meter, StatusBadge, Traits } from './bits';
import Dialog from './Dialog';

export default function PhoneDetail({
  phone,
  row,
  open,
  onClose,
  data,
  context,
  inCompare,
  compareFull,
  onToggleCompare,
  onOpen,
}) {
  return (
    <Dialog
      open={open && !!phone}
      onClose={onClose}
      title={phone?.name}
      subtitle={
        phone
          ? [
              phone.brand,
              phone.released
                ? `Released ${fmtMonth(phone.released)}`
                : phone.announced && `Announced ${fmtMonth(phone.announced)}`,
            ]
              .filter(Boolean)
              .join(' · ')
          : ''
      }
      labelId="detail-title"
    >
      {phone && (
        <DetailBody
          phone={phone}
          row={row}
          data={data}
          context={context}
          inCompare={inCompare}
          compareFull={compareFull}
          onToggleCompare={onToggleCompare}
          onOpen={onOpen}
        />
      )}
    </Dialog>
  );
}

function Section({ title, children, aside }) {
  return (
    <section className="border-b border-line px-4 py-5 last:border-b-0 sm:px-6">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="eyebrow">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function PhoneLink({ row, onOpen }) {
  return (
    <button
      type="button"
      className="font-medium text-ink underline decoration-line-strong underline-offset-2 hover:decoration-current"
      onClick={() => onOpen(row.id)}
    >
      {shortName(row.phone)}
    </button>
  );
}

/** Where the phone sits on the price ladder, in words. */
function LadderVerdict({ row, context, categories, onOpen }) {
  const { phrase } = context.priority;
  const pct = isNum(row.prob) ? Math.round(row.prob * 100) : null;
  if (!row.fits) {
    return (
      <p>It isn’t sold with {context.needLabel}, so it’s left out of the comparison. Shown at its cheapest size.</p>
    );
  }
  if (!row.considered) return <p>It’s outside your brand, size or must-have filters, so it isn’t on your ladder.</p>;
  const by = row.beatenBy;
  const vs = by && (
    <>
      <PhoneLink row={by} onOpen={onOpen} /> costs{' '}
      {row.price - by.price >= 1 ? `${fmtSGD(row.price - by.price)} less` : 'the same'} and scores{' '}
      {fmtScore(by.spec - row.spec)} higher
    </>
  );
  const still = row.betterAt.length > 0 && (
    <>
      {' '}
      It’s still better at{' '}
      {row.betterAt
        .map((b) => `${categoryLabel(categories, b.key).toLowerCase()} (${fmtScore(b.mine)} vs ${fmtScore(b.theirs)})`)
        .join(' and ')}
      .
    </>
  );
  if (row.status === 'best') {
    return (
      <p>
        <strong className="text-ink">Best buy.</strong> Nothing that costs the same or less scores higher for {phrase}
        {pct != null && pct < 100
          ? ` (in ${pct}% of what-ifs with specs, prices and priorities nudged by their likely error)`
          : ''}
        .{by && <> Neck and neck with {vs}.</>}
        {row.stepDown && (
          <>
            {' '}
            The next one down is <PhoneLink row={row.stepDown} onOpen={onOpen} />:{' '}
            {fmtSGD(row.price - row.stepDown.price)} less, {fmtScore(row.spec - row.stepDown.spec)} lower.
          </>
        )}
      </p>
    );
  }
  if (row.status === 'close') {
    return (
      <p>
        <strong className="text-ink">Close call.</strong> {vs ? <>{vs}, </> : ''}but that’s within the margin of error:
        it stays a best buy in {pct}% of what-ifs.{still}
      </p>
    );
  }
  return (
    <p>
      <strong className="text-ink">A cheaper phone scores higher.</strong> {vs}.{still}
    </p>
  );
}

function DetailBody({ phone, row, data, context, inCompare, compareFull, onToggleCompare, onOpen }) {
  const { categories } = data;
  const { priority } = context;
  const cats = row ? row.cats : phone.categories;
  const spec = row ? row.spec : specScore(cats, priority.weights);
  const shares = weightShares(priority.weights, categories);
  const v = row?.variant || null;
  const { strengths, weakness } = traits(cats, categories);
  const discounted = v && isNum(v.list_sgd) && v.list_sgd > v.sgd;
  const last = phone.last_price;
  const usual = v && isNum(v.typical_sgd) && v.typical_crawls >= 2 && Math.abs(v.typical_sgd - v.sgd) > 1;
  const diff = row?.value;

  return (
    <div>
      {/* Price & scores */}
      <div className="grid gap-5 px-4 py-5 sm:grid-cols-[1fr_auto] sm:px-6">
        <div>
          <div className="text-xs text-muted">{variantLabel(v || phone.variant) || 'Variant not stated'}</div>
          {v ? (
            <>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-semibold text-ink">{fmtVariantPrice(v)}</span>
                {discounted && <s className="tnum text-sm text-muted">{fmtSGD(v.list_sgd)}</s>}
                {v.est_from && (
                  <abbr className="est" title={priceEstimateNote(v)}>
                    est.
                  </abbr>
                )}
              </div>
              <div className="mt-0.5 text-sm text-ink-2">
                {v.est_from
                  ? `${priceEstimateNote(v)}.`
                  : `${storeLabel(v.store)}${v.seller && v.seller !== storeLabel(v.store) ? ` · ${v.seller}` : ''}`}
              </div>
              {usual && (
                <div className="tnum mt-1 text-xs text-muted">
                  {v.sgd < v.typical_sgd ? 'Below' : 'Above'} its usual {fmtSGD(v.typical_sgd)} (median of{' '}
                  {v.typical_crawls} price checks). Scores and best buys use the usual price.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mt-1 text-xl font-semibold text-ink">Price not collected yet</div>
              <div className="tnum mt-0.5 text-sm text-ink-2">
                {last && isNum(last.sgd)
                  ? `Was ${fmtSGD(last.sgd)}${isNum(last.storage_gb) ? ` for ${fmtStorage(last.storage_gb)}` : ''} at ${storeLabel(last.store)} in ${fmtMonth(last.date)}`
                  : 'No price recorded yet.'}
              </div>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {v?.url && (
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                {v.est_from ? 'View listing' : `View at ${storeLabel(v.store)}`}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
            <button
              type="button"
              className="btn"
              aria-pressed={inCompare}
              disabled={!inCompare && compareFull}
              onClick={() => onToggleCompare(phone.id)}
            >
              {inCompare ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
              {inCompare ? 'In compare' : 'Compare'}
            </button>
          </div>
        </div>
        <div className="flex gap-5 sm:flex-col sm:items-end sm:gap-2 sm:text-right">
          <div>
            <div className="text-2xs font-medium uppercase tracking-wide text-muted">Score · {priority.label}</div>
            <div className="tnum text-4xl font-semibold leading-none text-ink">{fmtScore(spec)}</div>
            {isNum(diff) && (
              <div className="tnum mt-1 text-xs text-ink-2" title="Score minus the typical score at this price">
                {fmtDiff(diff)} vs typical for the price
              </div>
            )}
          </div>
          {row && <StatusBadge row={row} />}
        </div>
      </div>

      <div className="mx-4 mb-5 space-y-2 rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-2 sm:mx-6">
        {row ? (
          <>
            <LadderVerdict row={row} context={context} categories={categories} onOpen={onOpen} />
            {isNum(diff) && (
              <p>
                A typical phone at <span className="tnum">{fmtSGD(row.price)}</span> scores{' '}
                <span className="tnum">{fmtScore(row.expected)}</span>;{' '}
                {Math.abs(diff) < 0.15
                  ? 'this one is right on the curve.'
                  : diff > 0
                    ? `this one is ${fmtScore(diff)} above that.`
                    : `this one is ${fmtScore(-diff)} below that, so you pay more than usual for what you get.`}
              </p>
            )}
          </>
        ) : (
          <p>
            For {priority.phrase} it scores <strong className="tnum text-ink">{fmtScore(spec)}</strong>. It isn’t
            compared on price until we have a current Singapore price
            {data.priceDate ? ` (prices weren’t fully collected on ${fmtDate(data.priceDate)})` : ''}.
          </p>
        )}
        <Traits strengths={strengths} weakness={weakness} />
      </div>

      <Section
        title={`Score breakdown · ${priority.label}`}
        aside={<span className="text-2xs text-muted">weight · score / 10</span>}
      >
        <ul className="space-y-3">
          {categories.map((c) => {
            const val = cats?.[c.key];
            const est = phone.estimated.includes(c.key);
            return (
              <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_2.5rem_2.25rem] items-center gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-ink">
                    {c.label}
                    {est && (
                      <abbr className="est" title={estimateNote(phone, c.key)}>
                        est.
                      </abbr>
                    )}
                  </div>
                </div>
                <div className="tnum text-right text-xs text-muted" title="Share of the score">
                  {isNum(shares[c.key]) ? `${Math.round(shares[c.key] * 100)}%` : '—'}
                </div>
                <div className="tnum text-right text-sm font-semibold text-ink">{fmtScore(val)}</div>
                <div className="col-span-3 -mt-0.5">
                  <Meter value={val} />
                </div>
                <div className="col-span-3 text-xs text-muted">
                  {keySpec(phone, c.key, v || phone.variant)}
                  {phone.notes?.[c.key] && <span className="block text-ink-2">{phone.notes[c.key]}.</span>}
                  {est && <span className="block text-ink-2">{estimateNote(phone, c.key)}.</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {phone.variants.length > 1 && (
        <Section title="Storage options">
          <ul className="divide-y divide-line rounded-lg border border-line">
            {phone.variants.map((o) => (
              <li
                key={o.storage_gb}
                className={`flex items-center gap-3 px-3 py-2 text-sm ${o === v ? 'bg-accent-soft' : ''}`}
              >
                <span className="w-16 font-medium text-ink">{fmtStorage(o.storage_gb)}</span>
                <span className="flex-1 text-xs text-muted">
                  {isNum(o.ram_gb) ? `${fmtNum(o.ram_gb, 1)}GB RAM` : ''}
                  {o === v ? ' · priced here' : ''}
                </span>
                <span className="tnum font-semibold text-ink">{fmtVariantPrice(o)}</span>
                {o.est_from ? (
                  <abbr className="est" title={priceEstimateNote(o)}>
                    est.
                  </abbr>
                ) : (
                  <span className="w-[27px]" />
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Phones are priced at their cheapest version with at least the storage you need ({context.needLabel}).
            Estimated prices are for sizes the phone comes in that no store lists yet.
          </p>
        </Section>
      )}

      <Section title="Where to buy">
        {phone.offers.length ? (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {phone.offers.map((o, i) => (
              <li key={`${o.url}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-ink">
                    {storeLabel(o.store)}
                    {o.seller && o.seller !== storeLabel(o.store) && (
                      <span className="font-normal text-muted"> · {o.seller}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">
                    {[
                      isNum(o.ram_gb) ? `${fmtNum(o.ram_gb, 1)}GB RAM` : null,
                      fmtStorage(o.storage_gb),
                      o.date && `checked ${fmtDate(o.date)}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                <div className="tnum text-right">
                  <div className="text-sm font-semibold text-ink">{fmtSGD(o.sgd)}</div>
                  {isNum(o.list_sgd) && o.list_sgd > o.sgd && (
                    <s className="text-xs text-muted">{fmtSGD(o.list_sgd)}</s>
                  )}
                </div>
                {o.url ? (
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn h-8 w-8 shrink-0 p-0"
                    aria-label={`Open ${storeLabel(o.store)} listing (${fmtSGD(o.sgd)})`}
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="w-8" />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            {v
              ? 'No current offers recorded.'
              : `No current offers: ${phone.brand} listings weren’t fully collected on ${fmtDate(data.priceDate)}, and it may not be sold officially in Singapore.`}
          </p>
        )}
        {phone.price?.variant_basis === 'assumed base' && (
          <p className="mt-2 text-xs text-muted">
            The listing didn’t state its storage size, so the base model is assumed.
          </p>
        )}
      </Section>

      <Section title="Price history">
        <PriceHistory history={phone.history.length ? phone.history : last && isNum(last.sgd) ? [last] : []} />
      </Section>

      <Section title="Specifications">
        <SpecList phone={phone} />
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {[
            [phone.gsm_url, 'Full specs and tests on GSMArena'],
            [
              phone.specs?.dxomark_url,
              phone.specs?.dxomark_from
                ? `DXOMARK camera test of the ${phone.specs.dxomark_from}`
                : 'DXOMARK camera test',
            ],
            [phone.specs?.stress_url, 'Notebookcheck review'],
          ]
            .filter(([url]) => url)
            .map(([url, label]) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="link inline-flex items-center gap-1"
              >
                {label}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ))}
        </div>
      </Section>
    </div>
  );
}

function PriceHistory({ history }) {
  if (!history.length) return <p className="text-sm text-muted">No price history yet.</p>;
  const rows = [...history].reverse();
  return (
    <>
      {history.length >= 3 && <Sparkline history={history} />}
      <table className="tnum w-full text-sm">
        <thead className="sr-only">
          <tr>
            <th>Date</th>
            <th>Storage</th>
            <th>Store</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h, i) => (
            <tr key={`${h.date}-${i}`} className="border-b border-line last:border-0">
              <td className="py-1.5 text-ink-2">{fmtDate(h.date)}</td>
              <td className="py-1.5 text-xs text-muted">
                {[isNum(h.ram_gb) ? `${fmtNum(h.ram_gb, 1)}GB` : null, fmtStorage(h.storage_gb)]
                  .filter(Boolean)
                  .join(' · ')}
              </td>
              <td className="py-1.5 text-xs text-muted">{storeLabel(h.store)}</td>
              <td className="py-1.5 text-right font-semibold text-ink">
                {isNum(h.list_sgd) && h.list_sgd > h.sgd && (
                  <s className="mr-1.5 text-xs font-normal text-muted">{fmtSGD(h.list_sgd)}</s>
                )}
                {fmtSGD(h.sgd)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {history.length === 1 && (
        <p className="mt-2 text-xs text-muted">One price check so far. History builds up with each crawl.</p>
      )}
      {new Set(history.map((h) => h.storage_gb).filter(isNum)).size > 1 && (
        <p className="mt-2 text-xs text-muted">Storage differs between checks, so prices aren’t like-for-like.</p>
      )}
    </>
  );
}

function Sparkline({ history }) {
  const W = 320;
  const H = 64;
  const pad = 6;
  const vals = history.map((h) => h.sgd);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const pts = history.map((h, i) => [
    pad + (i / (history.length - 1)) * (W - pad * 2),
    pad + (1 - (h.sgd - lo) / span) * (H - pad * 2),
  ]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const last = pts[pts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mb-2 h-16 w-full max-w-sm"
      role="img"
      aria-label="Price trend; values in the table below"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

function SpecList({ phone }) {
  const s = phone.specs || {};
  const yn = (b) => (b === true ? 'Yes' : b === false ? 'No' : null);
  const wired = isNum(s.wired_w)
    ? `${fmtNum(s.wired_w)}W`
    : isNum(s.wired_w_est)
      ? `~${fmtNum(s.wired_w_est)}W (estimated)`
      : null;
  const groups = [
    {
      title: 'Performance',
      rows: [
        ['Chipset', s.chipset],
        [
          'Geekbench 6 multi-core',
          isNum(s.gb6)
            ? `${fmtNum(s.gb6)}${s.gb6_source === 'same chipset' ? ' (same chipset)' : ''}`
            : 'Not available',
        ],
        [
          '3DMark Wild Life Extreme',
          isNum(s.gpu)
            ? `${fmtNum(s.gpu)}${s.gpu_source && s.gpu_source !== 'tested' ? ' (estimated)' : ''}`
            : 'Not available',
        ],
        ['Storage type', s.storage_type ? `${s.storage_type}${s.storage_type_est ? ' (estimated)' : ''}` : null],
        [
          'Sustained graphics',
          isNum(s.gpu_stability)
            ? `keeps ${Math.round(s.gpu_stability * 100)}% of peak${
                s.stability_source === 'tested'
                  ? ''
                  : s.stability_source === 'overheated'
                    ? ' (overheated)'
                    : ' (estimated)'
              }`
            : null,
        ],
        ['Hottest surface under load', isNum(s.max_temp_c) ? `${fmtNum(s.max_temp_c, 1)} °C` : null],
      ],
    },
    {
      title: 'Display',
      rows: [
        ['Size', isNum(s.display_in) ? `${fmtNum(s.display_in, 2)}″` : null],
        ['Panel', s.oled === true ? (s.ltpo ? 'OLED, LTPO' : 'OLED') : s.oled === false ? 'LCD' : null],
        ['Refresh rate', plausibleRefresh(s.refresh_hz) ? `${s.refresh_hz}Hz` : null],
        ['HDR', yn(s.has_hdr)],
        [
          'Peak brightness',
          isNum(s.nits) ? `${fmtNum(s.nits)} nits ${s.nits_measured ? '(measured)' : '(claimed)'}` : null,
        ],
        ['PWM dimming', isNum(s.pwm_hz) ? `${fmtNum(s.pwm_hz)}Hz` : null],
      ],
    },
    {
      title: 'Camera',
      rows: [
        [
          'Main',
          [
            isNum(s.main_mp) && `${fmtNum(s.main_mp)}MP`,
            sensorFormat(s.main_sensor_in) && `${sensorFormat(s.main_sensor_in)}${s.main_sensor_est ? ' (est.)' : ''}`,
            s.main_ois === true && 'OIS',
          ]
            .filter(Boolean)
            .join(' · ') || null,
        ],
        ['Telephoto', isNum(s.tele_zoom) ? `${fmtNum(s.tele_zoom, 1)}× optical` : 'None'],
        ['Ultrawide', yn(s.ultrawide)],
        ['Video', s.video_8k ? '8K, 4K60' : s.video_4k60 ? '4K60' : s.video_4k60 === false ? 'No 4K60' : null],
        ['Selfie', isNum(s.selfie_mp) ? `${fmtNum(s.selfie_mp)}MP` : null],
        [
          'DXOMARK camera',
          isNum(s.dxomark) && !s.dxomark_from
            ? `${s.dxomark} (protocol v${s.dxomark_protocol})`
            : s.dxomark_from
              ? `Not tested (adjusted from the ${s.dxomark_from})`
              : 'Not tested',
        ],
      ],
    },
    {
      title: 'Battery & charging',
      rows: [
        ['Capacity', isNum(s.battery_mah) ? `${fmtNum(s.battery_mah)} mAh` : null],
        [
          'Active use test',
          isNum(s.battery_h)
            ? `${fmtNum(s.battery_h, 1)} h${s.battery_source && s.battery_source !== 'tested' ? ' (estimated)' : ''}`
            : null,
        ],
        ['Wired', wired],
        ['Wireless', isNum(s.wireless_w) ? `${fmtNum(s.wireless_w)}W` : 'No'],
        ['Battery lifespan', isNum(s.battery_cycles) ? `${fmtNum(s.battery_cycles)} charge cycles (EU label)` : null],
      ],
    },
    {
      title: 'Build',
      rows: [
        ['Water/dust', s.ip_rating || 'Not rated'],
        ['Glass', s.glass],
        ['Frame', s.frame],
        ['EU drop-test class', s.eu_free_fall ? `${s.eu_free_fall} (A best, E worst)` : null],
        ['Weight', isNum(s.weight_g) ? `${fmtNum(s.weight_g)} g` : null],
        ['Thickness', isNum(s.thickness_mm) ? `${fmtNum(s.thickness_mm, 1)} mm` : null],
      ],
    },
    {
      title: 'Software & features',
      rows: [
        ['OS at launch', s.os],
        [
          'OS upgrades',
          isNum(s.os_updates) ? `${s.os_updates} years${s.os_updates_stated ? ' (promised)' : ' (assumed)'}` : null,
        ],
        ['Upgrade years left', isNum(s.os_years_left) ? `~${fmtNum(s.os_years_left, 1)}` : null],
        ['5G', yn(s.has_5g)],
        ['NFC', yn(s.nfc)],
        ['eSIM', yn(s.esim)],
        ['Stereo speakers', yn(s.stereo)],
        ['Headphone jack', yn(s.jack)],
        ['microSD slot', yn(s.card_slot)],
        ['UWB', yn(s.uwb)],
        ['IR blaster', yn(s.ir)],
        ['Ultrasonic fingerprint / 3D face unlock', yn(s.secure_unlock)],
      ],
    },
  ];
  return (
    <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
      {groups.map((g) => {
        const rows = g.rows.filter(([, v]) => v != null && v !== '');
        if (!rows.length) return null;
        return (
          <div key={g.title}>
            <h4 className="mb-1.5 text-sm font-semibold text-ink">{g.title}</h4>
            <dl className="text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-1 last:border-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="tnum text-right text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
