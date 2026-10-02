"""Cached page fetching through a real Chrome window.

GSMArena sits behind a Cloudflare Turnstile check that headless browsers fail,
so pages are fetched with a visible Chrome (Playwright, persistent profile so
the clearance cookie survives between runs). Every page is cached on disk;
re-running the pipeline only hits the network for pages not seen before.
"""
from __future__ import annotations

import hashlib
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = ROOT / ".cache" / "html"
PROFILE_DIR = ROOT / ".cache" / "chrome-profile"


def _cache_path(url: str) -> Path:
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", url.split("://", 1)[-1])[:120]
    digest = hashlib.sha1(url.encode()).hexdigest()[:8]
    return CACHE_DIR / f"{name}-{digest}.html"


def cached(url: str) -> str | None:
    p = _cache_path(url)
    return p.read_text(encoding="utf-8") if p.exists() else None


def cached_at(url: str) -> float | None:
    """When a page was fetched (file time), or None if it isn't cached."""
    p = _cache_path(url)
    return p.stat().st_mtime if p.exists() else None


class Browser:
    """Context manager that fetches pages via Chrome, with on-disk caching."""

    def __init__(self, delay: float = 2.5, ready_selector: str = "#specs-list, .makers, #review-body",
                 first_party: str = "gsmarena.com"):
        self.delay = delay
        self.first_party = first_party
        self.ready_selector = ready_selector
        self._pw = None
        self._ctx = None
        self._page = None
        self._last = 0.0

    def __enter__(self) -> "Browser":
        return self

    def __exit__(self, *exc) -> None:
        if self._ctx:
            self._ctx.close()
        if self._pw:
            self._pw.stop()

    def _ensure(self) -> None:
        if self._page:
            return
        from playwright.sync_api import sync_playwright

        PROFILE_DIR.mkdir(parents=True, exist_ok=True)
        self._pw = sync_playwright().start()
        self._ctx = self._pw.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
            viewport={"width": 1280, "height": 900},
        )
        self._page = self._ctx.new_page()

        # Only the HTML is needed: skip images/fonts/media and third-party scripts (ads),
        # but let Cloudflare's challenge through.
        def _route(route):
            req = route.request
            host = req.url.split("/")[2] if "://" in req.url else ""
            first_party = host.endswith(self.first_party) or "cloudflare" in host
            if req.resource_type in ("image", "media", "font") or (not first_party and req.resource_type in
                                                                   ("script", "xhr", "fetch", "stylesheet", "sub_frame")):
                return route.abort()
            return route.continue_()

        self._page.route("**/*", _route)

    def get(self, url: str, refresh: bool = False) -> str:
        path = _cache_path(url)
        if path.exists() and not refresh:
            return path.read_text(encoding="utf-8")

        self._ensure()
        wait = self.delay - (time.time() - self._last)
        if wait > 0:
            time.sleep(wait)

        for attempt in range(3):
            self._page.goto(url, wait_until="domcontentloaded", timeout=60000)
            try:
                self._page.wait_for_selector(self.ready_selector, timeout=45000)
                break
            except Exception:
                if attempt == 2:
                    raise RuntimeError(f"Page never became ready: {url} (title={self._page.title()!r})")
                time.sleep(5 * (attempt + 1))

        html = self._page.content()
        self._last = time.time()
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding="utf-8")
        return html
