import { Info, Moon, Sun } from 'lucide-react';
import { fmtDate } from '../lib/data';

export default function Header({ priceDate, theme, onToggleTheme, count, incompleteBrands = [], awaitingCount = 0 }) {
  return (
    <header className="mx-auto max-w-[1360px] px-4 pb-5 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-[1.6rem] font-bold leading-none tracking-tight text-ink sm:text-[2rem]">
              Smart<span className="text-accent-ink">Buy</span>
            </h1>
            <p className="text-[0.95rem] text-ink-2 sm:text-base">
              Which phone gives you the most for your money in Singapore.
            </p>
          </div>
          <p className="mt-2 text-xs text-muted sm:text-[0.8125rem]">
            {count ? `${count} ranked phones · ` : ''}Prices from official SG stores · updated{' '}
            <time dateTime={priceDate || undefined} className="font-medium text-ink-2">
              {fmtDate(priceDate)}
            </time>
          </p>
          {incompleteBrands.length > 0 && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted sm:text-[0.8125rem]">
              <Info size={13} className="mt-[3px] shrink-0" aria-hidden="true" />
              <span>
                <span title={incompleteBrands.join(', ')}>
                  Prices are partial for {incompleteBrands.length} brand{incompleteBrands.length === 1 ? '' : 's'} this
                  crawl (* on brand filters).
                </span>{' '}
                {awaitingCount > 0 && (
                  <a className="link whitespace-nowrap" href="#awaiting">
                    {awaitingCount} phones awaiting prices
                  </a>
                )}
              </span>
            </p>
          )}
        </div>
        <nav
          className="hidden items-center gap-1 text-[0.8125rem] font-medium text-ink-2 md:flex"
          aria-label="Sections"
        >
          <a className="rounded-md px-2.5 py-1.5 hover:bg-surface-2 hover:text-ink" href="#rankings">
            Rankings
          </a>
          {awaitingCount > 0 && (
            <a className="rounded-md px-2.5 py-1.5 hover:bg-surface-2 hover:text-ink" href="#awaiting">
              Awaiting prices
            </a>
          )}
          <a className="rounded-md px-2.5 py-1.5 hover:bg-surface-2 hover:text-ink" href="#changes">
            Since Jul 2025
          </a>
          <a className="rounded-md px-2.5 py-1.5 hover:bg-surface-2 hover:text-ink" href="#how">
            How it works
          </a>
        </nav>
        <button
          type="button"
          onClick={onToggleTheme}
          className="btn h-9 w-9 shrink-0 p-0"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
