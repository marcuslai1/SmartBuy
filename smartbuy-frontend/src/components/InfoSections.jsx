import { ExternalLink } from 'lucide-react';
import { fmtDate } from '../lib/data';

export function HowItWorks({ categories }) {
  const desc = {
    performance:
      'Half CPU (Geekbench 6 multi-core), half sustained GPU: the 3DMark Wild Life Extreme peak times the share a phone keeps in Notebookcheck’s stress test, so phones that throttle hard score lower.',
    camera:
      'Main sensor size, OIS, telephoto zoom and sensor, ultrawide, video and selfie, moved halfway towards DXOMARK’s measured camera score where it has tested the phone (or an identical-camera twin). Megapixels alone don’t count.',
    battery:
      'Hours in GSMArena’s measured “Active use” test: 9 h scores 0 and 25 h scores 10, with each extra hour counting a little less than the one before.',
    display: 'Panel type, refresh rate, LTPO, HDR, measured brightness and sharpness.',
    charging: 'Wired watts (120 W gets full marks), wireless watts, plus reverse wireless.',
    build: 'IP rating, glass, frame, EU drop-test class and battery lifespan (EU-label charge cycles).',
    memory:
      'RAM and storage speed (UFS/eMMC) of the version priced. Storage size isn’t scored: it’s the minimum you pick.',
    software: 'Years of OS upgrades still to come: the promise minus the time since release.',
    extras:
      '5G, NFC, stereo speakers, eSIM, headphone jack, UWB, IR blaster, and ultrasonic fingerprint or 3D face unlock.',
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
            <h3 className="font-semibold text-ink">2 · Score</h3>A weighted average of the categories. Pick a priority,
            or answer “Find my phone” to set your own weights: “Camera first” counts the camera far more than “Balanced”
            does.
          </li>
          <li>
            <h3 className="font-semibold text-ink">3 · Your storage</h3>
            Storage size isn’t scored; you choose the minimum. Each phone is priced at its cheapest version with at
            least that much. When no store lists that size, the price is estimated from the next size down (about 15%
            more per step, at least S$50) and marked est.
          </li>
          <li>
            <h3 className="font-semibold text-ink">4 · Best buys</h3>A phone is a best buy when nothing that costs the
            same or less scores higher. Together they form a price ladder, the staircase on the chart: your budget picks
            the rung, and each step down shows what you’d save and give up. Specs, prices and priorities are uncertain,
            so the ladder is redrawn 400 times with them nudged by their likely error. A “Best buy” stays on it in at
            least half of those what-ifs, a “Close call” in at least a fifth. Prices are each phone’s usual price over
            recent checks, so a one-day sale doesn’t reshuffle anything.
          </li>
          <li>
            <h3 className="font-semibold text-ink">5 · Vs typical</h3>
            The dashed curve is the typical score at each price, fitted across every phone. It bends: past a point,
            extra money buys less extra phone. “+1.4 vs typical” means a phone scores 1.4 more than most phones at its
            price.
          </li>
          <li>
            <h3 className="font-semibold text-ink">6 · Picks</h3>
            The highest score within your budget; the cheapest phone within 0.4 of it (closer than the margin of error);
            then one worth stretching for (up to 20% over budget and clearly better) or the best from another brand.
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
