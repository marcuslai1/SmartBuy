// SmartBuy: Lazada official-store crawl, run in your own Chrome.
// Paste into the DevTools console (F12 -> Console) on any www.lazada.sg page.
// It searches the Mobiles category, keeps official brand stores only, reads each
// listing's storage options, then downloads smartbuy-lazada-<date>.json.
// Progress is saved in this browser, so re-pasting after a stop resumes it.
(async () => {
  const QUERIES = __QUERIES__;   // search text -> brand it covers
  const SELLERS = __SELLERS__;   // official store name -> brand
  const DATE = "__DATE__";
  const MAX_PAGES = __MAX_PAGES__;
  const CAPTCHA_WAIT_MIN = 20;
  const KEY = "smartbuy-lazada-" + DATE;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pause = () => sleep(2500 + Math.random() * 2500);
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;z-index:2147483647;right:16px;bottom:16px;max-width:380px;padding:12px 14px;" +
    "background:#111;color:#fff;font:13px/1.45 system-ui,sans-serif;border-radius:10px;box-shadow:0 4px 20px #0006";
  document.body.appendChild(box);
  const say = (html) => { box.innerHTML = "<b>SmartBuy crawl</b><br>" + html; console.log("[SmartBuy] " + box.innerText); };

  let state = { done: [], items: {}, pdp: {} };
  try { state = JSON.parse(localStorage.getItem(KEY)) || state; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  // Fetch a page; if Lazada answers with its captcha, wait for it to be solved in another tab
  async function get(url) {
    const start = Date.now();
    for (let shown = false; ; ) {
      let text = "";
      try {
        const res = await fetch(url, { credentials: "include" });
        text = await res.text();
        if (!res.url.includes("punish") && !text.slice(0, 5000).includes("_____tmd_____/punish")) return text;
      } catch (e) {}
      if (Date.now() - start > CAPTCHA_WAIT_MIN * 60000) return null;
      if (!shown) {
        say('Lazada wants a captcha. <a style="color:#7cf" href="' + url + '" target="_blank">Open this link in a new tab</a>, ' +
            "solve the slider there, then come back to this tab. The crawl carries on by itself.");
        shown = true;
      }
      await sleep(10000);
    }
  }

  let stopped = false;
  const queries = Object.keys(QUERIES);
  for (const [qi, q] of queries.entries()) {
    if (state.done.includes(q)) continue;
    for (let page = 1; page <= MAX_PAGES; page++) {
      say("Searching " + (qi + 1) + "/" + queries.length + ": \"" + q + "\" page " + page +
          "<br>" + Object.keys(state.items).length + " official listings so far");
      const text = await get("/shop-mobiles/?ajax=true&q=" + encodeURIComponent(q) + "&page=" + page + "&service=official");
      if (text === null) { stopped = true; break; }
      let items = [];
      try { items = (JSON.parse(text).mods || {}).listItems || []; } catch (e) {}
      await pause();
      if (!items.length) break;
      for (const it of items) {
        const brand = SELLERS[(it.sellerName || "").trim()];
        if (brand && !state.items[it.itemId]) {
          state.items[it.itemId] = {
            brand, itemId: String(it.itemId), name: it.name, price: it.price, originalPrice: it.originalPrice,
            sellerName: (it.sellerName || "").trim(), itemUrl: it.itemUrl, inStock: it.inStock,
          };
        }
      }
    }
    if (stopped) break;
    state.done.push(q);
    save();
  }

  // Storage options (and per-SKU prices) from each in-stock listing's product page
  const todo = Object.values(state.items).filter((it) => it.inStock !== false && !(it.itemId in state.pdp));
  for (const [i, it] of todo.entries()) {
    if (stopped) break;
    say("Reading product pages " + (i + 1) + "/" + todo.length);
    const url = (it.itemUrl.startsWith("//") ? "https:" : "") + it.itemUrl;
    const html = await get(url);
    if (html === null) { stopped = true; break; }
    const m = html.match(/__moduleData__\s*=\s*(\{[\s\S]*?\});\s*\n/);
    let pdp = { ok: false };
    if (m) {
      try {
        const f = JSON.parse(m[1]).data.root.fields;
        const base = (f.productOption || {}).skuBase || {};
        pdp = {
          ok: true,
          properties: (base.properties || []).map((p) => ({
            name: p.name, values: (p.values || []).map((v) => ({ vid: v.vid, name: v.name })) })),
          skus: (base.skus || []).map((s) => ({ skuId: s.skuId, propPath: s.propPath })),
          skuInfos: f.skuInfos || null,
        };
      } catch (e) {}
    }
    state.pdp[it.itemId] = pdp;
    save();
    await pause();
  }

  const complete = !stopped && queries.every((q) => state.done.includes(q));
  const out = {
    date: DATE, crawled_at: new Date().toISOString(), complete, queries_done: state.done,
    listings: Object.values(state.items).map((it) => ({ ...it, pdp: state.pdp[it.itemId] || null })),
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" }));
  a.download = "smartbuy-lazada-" + DATE + ".json";
  document.body.appendChild(a);
  a.click();
  say((complete ? "Done" : "Stopped early (paste again to resume)") + ": " + out.listings.length +
      " listings saved to your Downloads folder as " + a.download + ". You can close this tab.");
})();
