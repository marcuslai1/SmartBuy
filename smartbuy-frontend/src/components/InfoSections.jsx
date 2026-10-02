import { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus } from 'lucide-react';
import { fmtDate, fmtMonth, fmtPct, fmtSGD, fmtStorage, legacyChange } from '../lib/data';

const RETIRED_PREVIEW = 8;

export function ChangesSection({ phones, retired, legacyDate, onOpen }) {
  const [showAllRetired, setShowAllRetired] = useState(false);
  const retiredSorted = [...retired].sort((a, b) => (b.last_price?.sgd ?? 0) - (a.last_price?.sgd ?? 0));
  const retiredShown = showAllRetired ? retiredSorted : retiredSorted.slice(0, RETIRED_PREVIEW);
  const changed = phones
    .map((p) => ({ p, c: legacyChange(p, legacyDate) }))
    .filter((x) => x.c)
    .sort((a, b) => a.c.pct - b.c.pct);
  const since = fmtMonth(legacyDate);
  if (!legacyDate || (!changed.length && !retired.length)) return null;

  return (
    <section id="changes" aria-labelledby="changes-title" className="scroll-mt-28">
      <h2 id="changes-title" className="text-lg font-semibold text-ink">
        What changed since {since}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">
        SmartBuy first launched with a one-off price snapshot on {fmtDate(legacyDate)}. Most of those phones have since
        been replaced by newer models. Retired phones are listed most expensive first.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <h3 className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">
            Still on sale <span className="font-normal text-muted">· {changed.length}</span>
          </h3>
          {changed.length ? (
            <table className="tnum w-full text-sm">
              <thead>
                <tr className="text-left text-2xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Phone
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    {since}
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">
                    Now
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {changed.map(({ p, c }) => {
                  const down = c.pct < -0.005;
                  const up = c.pct > 0.005;
                  const Icon = down ? ArrowDownRight : up ? ArrowUpRight : Minus;
                  const tone = down ? 'text-good' : up ? 'text-bad' : 'text-muted';
                  return (
                    <tr key={p.id} className="border-t border-line align-top">
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          className="text-left font-medium text-ink hover:underline"
                          onClick={() => onOpen(p.id)}
                        >
                          {p.name}
                        </button>
                        {c.storageDiffers && (
                          <div className="text-xs text-muted">
                            {fmtStorage(c.old.storage_gb)} then, {fmtStorage(c.curStorage)} now: not like-for-like
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right text-ink-2">{fmtSGD(c.old.sgd)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-ink">{fmtSGD(p.price?.sgd)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`inline-flex items-center gap-0.5 font-medium ${tone}`}>
                          <Icon size={13} aria-hidden="true" />
                          {down || up ? fmtPct(c.pct) : 'Same'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-3 text-sm text-muted">None of the original phones are still listed.</p>
          )}
        </div>

        <div className="card overflow-hidden">
          <h3 className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">
            No longer sold by official stores <span className="font-normal text-muted">· {retired.length}</span>
          </h3>
          {retired.length ? (
            <>
              <ul className="divide-y divide-line text-sm">
                {retiredShown.map((r) => (
                  <li key={r.id || r.name} className="flex items-baseline gap-3 px-4 py-2">
                    <span className="min-w-0 flex-1 text-ink">
                      {r.gsm_url ? (
                        <a href={r.gsm_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {r.name}
                        </a>
                      ) : (
                        r.name
                      )}
                    </span>
                    <span className="tnum text-xs text-muted">
                      {r.last_price
                        ? `${fmtSGD(r.last_price.sgd)}${r.last_price.storage_gb ? ` · ${fmtStorage(r.last_price.storage_gb)}` : ''} in ${fmtMonth(r.last_price.date)}`
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
              {retiredSorted.length > RETIRED_PREVIEW && (
                <div className="border-t border-line px-4 py-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-accent-ink hover:underline"
                    aria-expanded={showAllRetired}
                    onClick={() => setShowAllRetired((v) => !v)}
                  >
                    {showAllRetired ? 'Show fewer' : `Show all ${retiredSorted.length}`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="px-4 py-3 text-sm text-muted">Every phone from the original list is still sold.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks({ categories }) {
  const desc = {
    performance: 'Geekbench 6 multi-core result, on a log scale.',
    camera:
      'Main sensor size, OIS, telephoto zoom and sensor, ultrawide, video and selfie. Megapixels alone don’t count.',
    battery: 'Hours in GSMArena’s measured “Active use” test.',
    display: 'Panel type, refresh rate, LTPO, HDR, measured brightness and sharpness.',
    charging: 'Wired and wireless watts, plus reverse wireless.',
    build: 'IP rating, glass, frame and EU drop-test class.',
    memory: 'RAM and storage of the exact variant priced.',
    software: 'Years of promised OS upgrades.',
    extras: '5G, NFC, stereo speakers, eSIM, headphone jack, UWB and IR blaster.',
  };
  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-28">
      <h2 id="how-title" className="text-lg font-semibold text-ink">
        How it works
      </h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <ol className="card space-y-4 p-5 text-sm text-ink-2">
          <li>
            <h3 className="font-semibold text-ink">1 · Category scores</h3>
            Each phone gets nine scores from 0 to 10 based on GSMArena specs and lab tests. Inputs that weren’t
            lab-tested are estimated and marked{' '}
            <abbr className="est" title="Estimated rather than lab-tested">
              est.
            </abbr>
          </li>
          <li>
            <h3 className="font-semibold text-ink">2 · Spec score</h3>A weighted average of the categories. The weights
            depend on the priority you pick, so “Camera first” counts the camera far more than “Balanced” does.
          </li>
          <li>
            <h3 className="font-semibold text-ink">3 · Value score</h3>
            We fit a curve of the typical spec score at every price across all phones (the line on the chart). Value
            measures how far a phone sits above or below that line: 5 is on the curve, about 7 is one standard deviation
            better than typical, 10 is exceptional. It is not “cheapest wins”.
          </li>
          <li>
            <h3 className="font-semibold text-ink">4 · SmartBuy score</h3>
            Half spec score, half value score. It’s the default ranking: good phones that are also fairly priced rise to
            the top.
          </li>
        </ol>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink">What each category measures</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
            {categories.map((c) => (
              <div key={c.key}>
                <dt className="font-medium text-ink">{c.label}</dt>
                <dd className="text-ink-2">{desc[c.key] || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

export function Footer({ generatedAt, priceDate }) {
  return (
    <footer className="mt-12 border-t border-line">
      <div className="mx-auto max-w-[1360px] px-4 py-6 text-xs text-muted sm:px-6 lg:px-8">
        <p className="max-w-3xl">
          <strong className="font-semibold text-ink-2">Data sources.</strong> Prices come only from official brand
          stores in Singapore: brand flagship stores on{' '}
          <a className="link" href="https://www.lazada.sg/" target="_blank" rel="noopener noreferrer">
            Lazada
          </a>
          ,{' '}
          <a className="link" href="https://www.apple.com/sg/" target="_blank" rel="noopener noreferrer">
            apple.com/sg
          </a>{' '}
          and{' '}
          <a className="link" href="https://store.google.com/sg/" target="_blank" rel="noopener noreferrer">
            store.google.com/sg
          </a>
          , in Singapore dollars, last checked {fmtDate(priceDate)}. Specs and lab tests come from{' '}
          <a
            className="link inline-flex items-center gap-0.5"
            href="https://www.gsmarena.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            GSMArena
            <ExternalLink size={11} aria-hidden="true" />
          </a>
          . Prices change often: check the store before you buy. SmartBuy isn’t affiliated with any brand or store.
        </p>
        <p className="mt-2">Data generated {fmtDate(generatedAt)}.</p>
      </div>
    </footer>
  );
}
