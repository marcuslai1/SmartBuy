import { ExternalLink } from 'lucide-react';
import { fmtDate } from '../lib/data';

export function HowItWorks({ categories }) {
  const desc = {
    performance: 'Half CPU (Geekbench 6 multi-core), half GPU (3DMark Wild Life Extreme), each on a log scale.',
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
            We fit a curve of the typical spec score at every price across all phones (the line on the chart). It
            bends: past a point, extra money buys less extra phone, so flagships aren’t judged against an impossible
            bar. Value
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
