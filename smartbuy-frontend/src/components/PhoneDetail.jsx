import { Check, ExternalLink, Plus } from 'lucide-react';
import {
  estimateNote,
  fmtDate,
  fmtMonth,
  fmtNum,
  fmtSGD,
  fmtScore,
  fmtStorage,
  isNum,
  keySpec,
  plausibleRefresh,
  scoreOf,
  scoringPrice,
  sensorFormat,
  storeLabel,
  traits,
  variantLabel,
  weightShares,
} from '../lib/data';
import { Meter, Traits } from './bits';
import Dialog from './Dialog';

export default function PhoneDetail({ phone, open, onClose, data, preset, inCompare, compareFull, onToggleCompare }) {
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
          data={data}
          preset={preset}
          inCompare={inCompare}
          compareFull={compareFull}
          onToggleCompare={onToggleCompare}
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

function DetailBody({ phone, data, preset, inCompare, compareFull, onToggleCompare }) {
  const { categories, presets } = data;
  const s = scoreOf(phone, preset);
  const shares = weightShares(presets, preset, categories);
  const price = phone.price || {};
  const { strengths, weakness } = traits(phone, categories);
  const discounted = isNum(price.list_sgd) && isNum(price.sgd) && price.list_sgd > price.sgd;
  const presetLabel = presets[preset]?.label || preset;
  const diff = isNum(s.spec) && isNum(s.expected) ? s.spec - s.expected : null;
  const hasPrice = isNum(price.sgd);
  const last = phone.last_price;
  const judgedAt = scoringPrice(phone);
  const usual = isNum(price.typical_sgd) && price.typical_crawls >= 2 && Math.abs(price.typical_sgd - price.sgd) > 1;
  const total = data.phones?.length;
  const range = Array.isArray(s.rank_range) ? s.rank_range : null;

  return (
    <div>
      {/* Price & scores */}
      <div className="grid gap-5 px-4 py-5 sm:grid-cols-[1fr_auto] sm:px-6">
        <div>
          <div className="text-xs text-muted">{variantLabel(phone.variant) || 'Variant not stated'}</div>
          {hasPrice ? (
            <>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span className="text-3xl font-semibold text-ink">{fmtSGD(price.sgd)}</span>
                {discounted && <s className="tnum text-sm text-muted">{fmtSGD(price.list_sgd)}</s>}
              </div>
              <div className="mt-0.5 text-sm text-ink-2">
                {storeLabel(price.store)}
                {price.seller && price.seller !== storeLabel(price.store) ? ` · ${price.seller}` : ''}
              </div>
              {usual && (
                <div className="tnum mt-1 text-xs text-muted">
                  {price.sgd < price.typical_sgd ? 'Below' : 'Above'} its usual {fmtSGD(price.typical_sgd)} (median of{' '}
                  {price.typical_crawls} price checks). Value is judged at the usual price.
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
            {price.url && (
              <a href={price.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                View at {storeLabel(price.store)}
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
          <div className={hasPrice ? '' : 'hidden'}>
            <div className="text-2xs font-medium uppercase tracking-wide text-muted">SmartBuy</div>
            <div className="text-4xl font-semibold leading-none text-ink">{fmtScore(s.smartbuy)}</div>
            {isNum(s.rank) && (
              <div
                className="tnum mt-1 text-xs text-ink-2"
                title="Recomputed hundreds of times with the priorities, prices and estimated specs nudged by their likely error; the middle 90% of the ranks it lands at."
              >
                #{s.rank}
                {total ? ` of ${total}` : ''}
                {range && range[0] !== range[1] && <span className="text-muted"> · likely #{range[0]}–{range[1]}</span>}
              </div>
            )}
          </div>
          <div className="tnum flex gap-4 text-sm text-ink-2">
            <div className={hasPrice ? '' : 'hidden'}>
              <div className="text-2xs uppercase tracking-wide text-muted">Value</div>
              <div className="text-lg font-semibold text-ink">{fmtScore(s.value)}</div>
            </div>
            <div>
              <div className="text-2xs uppercase tracking-wide text-muted">Spec</div>
              <div className="text-lg font-semibold text-ink">{fmtScore(s.spec)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-5 rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink-2 sm:mx-6">
        {diff != null ? (
          <>
            With a <strong className="text-ink">{presetLabel}</strong> priority it scores{' '}
            <strong className="tnum text-ink">{fmtScore(s.spec)}</strong> on specs, where a typical phone at{' '}
            <span className="tnum">{fmtSGD(judgedAt)}</span> scores{' '}
            <span className="tnum">{fmtScore(s.expected)}</span>.{' '}
            {Math.abs(diff) < 0.15
              ? 'That is right on the curve, so value is average.'
              : diff > 0
                ? `That is ${fmtScore(diff)} above typical, so it is better value than most.`
                : `That is ${fmtScore(-diff)} below typical, so you pay more than usual for what you get.`}
          </>
        ) : !hasPrice ? (
          <>
            With a <strong className="text-ink">{presetLabel}</strong> priority it scores{' '}
            <strong className="tnum text-ink">{fmtScore(s.spec)}</strong> on specs. It has no Value or SmartBuy score
            and isn’t ranked until we have a current Singapore price
            {data.priceDate ? ` (prices weren’t fully collected on ${fmtDate(data.priceDate)})` : ''}.
          </>
        ) : (
          'Not enough data to compare this phone with others at its price.'
        )}
        <div className="mt-2">
          <Traits strengths={strengths} weakness={weakness} />
        </div>
      </div>

      <Section
        title={`Score breakdown · ${presetLabel}`}
        aside={<span className="text-2xs text-muted">weight · score / 10</span>}
      >
        <ul className="space-y-3">
          {categories.map((c) => {
            const v = phone.categories?.[c.key];
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
                <div className="tnum text-right text-xs text-muted" title="Share of the spec score">
                  {isNum(shares[c.key]) ? `${Math.round(shares[c.key] * 100)}%` : '—'}
                </div>
                <div className="tnum text-right text-sm font-semibold text-ink">{fmtScore(v)}</div>
                <div className="col-span-3 -mt-0.5">
                  <Meter value={v} />
                </div>
                <div className="col-span-3 text-xs text-muted">
                  {keySpec(phone, c.key)}
                  {est && <span className="block text-ink-2">{estimateNote(phone, c.key)}.</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

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
            {hasPrice
              ? 'No current offers recorded.'
              : `No current offers: ${phone.brand} listings weren’t fully collected on ${fmtDate(data.priceDate)}, and it may not be sold officially in Singapore.`}
          </p>
        )}
        {price.variant_basis === 'assumed base' && (
          <p className="mt-2 text-xs text-muted">
            The listing didn’t state its storage size, so the base model is assumed.
          </p>
        )}
      </Section>

      <Section title="Price history">
        <PriceHistory
          history={phone.history.length ? phone.history : last && isNum(last.sgd) ? [last] : []}
        />
      </Section>

      <Section title="Specifications">
        <SpecList phone={phone} />
        {phone.gsm_url && (
          <a
            href={phone.gsm_url}
            target="_blank"
            rel="noopener noreferrer"
            className="link mt-4 inline-flex items-center gap-1 text-sm"
          >
            Full specs and tests on GSMArena
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        )}
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
              <td className="py-1.5 text-ink-2">
                {fmtDate(h.date)}
              </td>
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
          isNum(s.os_updates)
            ? `${s.os_updates} years${s.os_updates_stated ? ' (promised)' : ' (assumed)'}`
            : null,
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
