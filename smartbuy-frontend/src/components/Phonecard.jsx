// phones/components/PhoneCard.jsx
import { useMemo, useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

function PhoneCard({ phone, isTopPick, mode: modeProp }) {
  // basic numeric values
  const spec = Number(phone.raw_score).toFixed(1);
  const value = Number(phone.smartbuy_score).toFixed(2);
  const price = Number(phone.price_sgd).toFixed(2);

  // ranks
  const finalRank = phone.rank_final;
  const rawRank = phone.rank_raw;
  const valueRank = phone.rank_value;
  const totalCount = phone.rank_total;

  // mode (budget/midrange/flagship)
  const mode = (modeProp || "midrange").toLowerCase();

  // colours for score badges
  const scoreColour =
    spec >= 7
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20"
      : spec >= 6
      ? "bg-amber-500/15  text-amber-300  border-amber-400/20"
      : "bg-zinc-500/15   text-zinc-300   border-zinc-400/20";

  const smartbuyColour =
    value >= 1.5
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20"
      : value >= 1.1
      ? "bg-amber-500/15  text-amber-300  border-amber-400/20"
      : "bg-zinc-500/15   text-zinc-300   border-zinc-400/20";

  // format helpers
  const fmt = {
    hz: (n) => (n ? `${n}Hz` : ""),
    res: (w, h) => (w && h ? `${w}×${h}` : ""),
    ppi: (n) => (n ? `${n}ppi` : ""),
    gb: (n) => (n || n === 0 ? `${Number(n)}GB` : ""),
    mah: (n) => (n ? `${Number(n)} mAh` : ""),
    w: (n) => (n ? `${Number(n)}W` : ""),
    chip: (s) => (s || "").toString(),
    extras: (p) => {
      const bits = [];
      if (p?.has_5g) bits.push("5G");
      if (p?.has_nfc) bits.push("NFC");
      if (p?.has_stereo_speakers) bits.push("Stereo");
      return bits.join(" • ");
    },
    camera: (p) => {
      const rear = p?.camera_main_mp || (p?.main_mp ? `${p.main_mp} MP` : "");
      const add = [];
      if (p?.has_ois) add.push("OIS");
      if (p?.front_mp) add.push(`Front ${p.front_mp} MP`);
      return [rear, add.length ? `(${add.join(", ")})` : ""]
        .filter(Boolean)
        .join(" ");
    },
    display: (p) => {
      const type = p?.display_type
        ? p.display_type.replace(/_/g, " ").toUpperCase()
        : "";
      return [
        type,
        fmt.hz(p?.refresh_hz ?? p?.refresh_rate),
        fmt.res(p?.res_w, p?.res_h),
        fmt.ppi(p?.ppi ?? p?.pixel_density),
      ]
        .filter(Boolean)
        .join(" • ");
    },
    durability: (p) => p?.glass_type || "-",
    protection: (p) => p?.ip_rating || "-",
  };
// target recommendations
  const RECS = {
    budget: {
      soc: { target: "Mid 6+ tier" },
      ram: { target: "≥ 8GB" },
      storage: { target: "≥ 128GB" },
      display: { target: "OLED • 90-120Hz • ≥390ppi" },
      camera: { target: "Score ≥ 5.5 + OIS" },
      battery: { target: "≥ 4500 mAh" },
      charging: { target: "≥ 30W" },
      durability: { target: "Gorilla 5 / Ceramic" },
      protection: { target: "IP53+" },
      extras: { target: "5G • NFC • Stereo" },
    },
    midrange: {
      soc: { target: "7-8 tier" },
      ram: { target: "≥ 12GB" },
      storage: { target: "≥ 256GB" },
      display: { target: "OLED • 120Hz • ≥390ppi" },
      camera: { target: "Score ≥ 6.5 + OIS + UW" },
      battery: { target: "≥ 5000 mAh" },
      charging: { target: "≥ 45W" },
      durability: { target: "Victus / Ceramic Shield" },
      protection: { target: "IP67/68" },
      extras: { target: "5G • NFC • Stereo" },
    },
    flagship: {
      soc: { target: "8-9+ tier" },
      ram: { target: "≥ 12-16GB" },
      storage: { target: "≥ 256-512GB" },
      display: { target: "OLED • 120Hz+ • ≥450ppi" },
      camera: { target: "Score ≥ 7.0 + OIS + UW" },
      battery: { target: "≥ 5000 mAh" },
      charging: { target: "≥ 60W / wireless" },
      durability: { target: "Victus 2 / Ceramic" },
      protection: { target: "IP68" },
      extras: { target: "5G • NFC • Stereo" },
    },
  };
  const recs = RECS[mode] || RECS.midrange;


  // build rows for spec breakdown
  const breakdown = phone?.score_breakdown || null;
  const allRows = useMemo(() => {
    if (!breakdown) return [];
    const build = (key, label, meta) => ({
      key,
      label,
      meta,
      value: Number(breakdown[key]),
      rec: recs[key]?.target || null,
    });
    return [
      build("camera", "Camera", fmt.camera(phone)),
      build("display", "Display", fmt.display(phone)),
      build("soc", "Performance", fmt.chip(phone?.chipset)),
      build("ram", "RAM", fmt.gb(phone?.ram_gb)),
      build("storage", "Storage", fmt.gb(phone?.storage_gb)),
      build("battery", "Battery", fmt.mah(phone?.battery_mah)),
      build("charging", "Charging", fmt.w(phone?.charging_w ?? phone?.charging_speed)),
      build("durability", "Durability", fmt.durability(phone)),
      build("protection", "Protection", fmt.protection(phone)),
      build("extras", "Extras", fmt.extras(phone)),
    ].filter((r) => Number.isFinite(r.value));
  }, [breakdown, phone, recs]);

  // split rows
  const CORE_KEYS = ["camera", "display", "soc", "ram", "storage"];
  const BUILD_KEYS = ["battery", "charging", "durability", "protection", "extras"];
  const coreRows = allRows.filter((r) => CORE_KEYS.includes(r.key));
  const buildRows = allRows.filter((r) => BUILD_KEYS.includes(r.key));

  // modal state + refs
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [panelPos, setPanelPos] = useState({
    top: 0,
    left: 0,
    origin: "bottom right",
  });

  // close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // compute panel position
  const reposition = () => {
    const btn = btnRef.current,
      panel = panelRef.current;
    if (!btn || !panel) return;
    const br = btn.getBoundingClientRect();
    const ph = panel.offsetHeight || 0;
    const pw = panel.offsetWidth || 0;
    const gap = 8;
    let top = br.top - ph - gap;
    let origin = "bottom right";
    if (top < 8) {
      top = br.bottom + gap;
      origin = "top right";
    }
    let left = br.right - pw;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    const maxTop = window.innerHeight - ph - 8;
    top = Math.max(8, Math.min(top, maxTop));
    setPanelPos({ top, left, origin });
  };

  // reposition on open/resize/scroll
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onResize = () => reposition();
    const onScroll = () => reposition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const warranty = phone.warranty ? `${phone.warranty}y` : null;

  return (
    <div
      className={[
        "relative z-0 group rounded-2xl",
        "border border-white/10 bg-white/[0.03] backdrop-blur-sm",
        "shadow-sm hover:shadow-xl hover:shadow-blue-500/10",
        "hover:-translate-y-[2px] transition-all duration-200",
        "min-h-[260px] overflow-visible hover:z-30 focus-within:z-30",
      ].join(" ")}
    >
      {/* header bar */}
      <div className="rounded-[inherit] overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-b border-white/10">
          <div className="flex items-center gap-1.5">
            {isTopPick ? (
              <span className="h-5 px-2 rounded-full bg-blue-500/15 text-blue-200 border border-blue-400/20 text-[10px] font-medium">
                Top pick
              </span>
            ) : null}
            {finalRank && totalCount ? (
              <span className="h-5 px-2 rounded-full bg-white/10 text-zinc-200 border border-white/15 text-[10px] font-semibold tabular-nums">
                #{finalRank} / {totalCount}
              </span>
            ) : null}
          </div>
          {warranty ? (
            <span className="h-5 px-1.5 rounded border border-white/15 text-zinc-200 bg-white/5 text-[10px]">
              {warranty}
            </span>
          ) : null}
        </div>

        {/* body content */}
        <div className="p-4">
          <h2 className="text-[16px] leading-snug font-semibold text-white/95 line-clamp-2">
            {phone.model}
          </h2>

          {/* price link */}
          <a
            href={phone.price_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 hover:border-blue-400/30 hover:bg-blue-500/10 transition"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] font-semibold text-white">S${price}</span>
              <span className="text-[11px] text-zinc-300">View deal</span>
            </div>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4 text-zinc-300 group-hover:text-white"
              aria-hidden="true"
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          {/* scores */}
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-block px-2 py-1 text-[11px] font-semibold rounded border ${scoreColour}`}>
              Spec Score {spec}/10
            </span>
            <span className={`inline-block px-2 py-1 text-[11px] font-semibold rounded border ${smartbuyColour}`}>
              SmartBuy {value} pts/$100
            </span>
          </div>
        </div>
      </div>

      {/* button to open spec panel */}
      {allRows.length > 0 && (
        <button
          type="button"
          ref={btnRef}
          aria-haspopup="dialog"
          aria-expanded={open ? "true" : "false"}
          aria-label="Show spec breakdown"
          onClick={() => setOpen((v) => !v)}
          className="absolute bottom-2 right-2 z-40 inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600/90 text-white text-xs shadow hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black"
        >
          i
        </button>
      )}

      {/* overlay + panel */}
      {open && allRows.length > 0 &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <SpecPanel
              panelRef={panelRef}
              panelPos={panelPos}
              coreRows={coreRows}
              buildRows={buildRows}
              rawRank={rawRank}
              valueRank={valueRank}
              onClose={() => setOpen(false)}
            />
          </>,
          document.body
        )}
    </div>
  );
}

function SpecPanel({ panelRef, panelPos, coreRows, buildRows, rawRank, valueRank, onClose }) {
  return (
    <div
      role="dialog"
      aria-label="Spec breakdown"
      ref={panelRef}
      style={{
        position: "fixed",
        top: panelPos.top,
        left: panelPos.left,
        transformOrigin: panelPos.origin,
        scrollbarWidth: "thin",
      }}
      className={[
        "spec-panel",
        "z-50 w-[440px] max-w-[92vw] max-h-[80vh] overflow-auto overscroll-contain",
        "rounded-xl border border-white/10 supports-[backdrop-filter]:bg-white/10 bg-zinc-900/70",
        "shadow-2xl px-4 pb-4 pt-0 transition transform opacity-100 scale-100",
        "text-zinc-100",
      ].join(" ")}
    >
      {/* custom scrollbar */}
      <style>{`
        .spec-panel::-webkit-scrollbar{ width:8px; height:8px; }
        .spec-panel::-webkit-scrollbar-track{ background:transparent; }
        .spec-panel::-webkit-scrollbar-thumb{ background:#6b7280; border-radius:8px; }
        .spec-panel:hover::-webkit-scrollbar-thumb{ background:#818896; }
        .spec-panel::-webkit-scrollbar-thumb:active{ background:#9aa0ad; }
      `}</style>

      {/* header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 pt-2 pb-2 bg-black/30 border-b border-white/10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-zinc-200">Spec breakdown</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-400">0-10 each</span>
            <button
              aria-label="Close"
              onClick={onClose}
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-zinc-300 hover:text-white hover:bg-white/10"
            >
              ×
            </button>
          </div>
        </div>
        {rawRank && valueRank ? (
          <div className="mt-1 text-[10px] text-zinc-400">
            Spec Rank #{rawRank} • SmartBuy Rank #{valueRank}
          </div>
        ) : null}
      </div>

      {/* bottom gradient */}
      <div className="pointer-events-none sticky bottom-0 h-6 -mb-4 bg-gradient-to-t from-black/40 to-transparent" />

      {/* sections */}
      <GroupTitle title="Core specs" className="mt-3" />
      <div>
        {coreRows.map((r) => (
          <ScoreRow key={r.key} section={r.key} label={r.label} value={r.value} meta={r.meta} />
        ))}
      </div>

      <GroupTitle title="Battery & build" className="mt-4" />
      <div>
        {buildRows.map((r) => (
          <ScoreRow key={r.key} section={r.key} label={r.label} value={r.value} meta={r.meta} />
        ))}
      </div>

      <div className="mt-4 text-[11px] text-zinc-300">
        Overall Spec Score is a weighted blend of these sections.
      </div>
    </div>
  );
}

function GroupTitle({ title, className = "" }) {
  return (
    <div
      className={[
        "text-[11px] uppercase tracking-wide text-zinc-300/80 px-0",
        className,
      ].join(" ")}
    >
      {title}
    </div>
  );
}

const WHAT = {
  camera: "Photo/video quality; OIS helps steady shots and low light.",
  display: "Screen type, smoothness (Hz), resolution and sharpness (ppi).",
  soc: "Processor & graphics; affects speed, gaming and camera.",
  ram: "How smoothly you can switch between apps; more RAM keeps them ready so they don’t lag or start over.",
  storage: "Space for apps, photos and videos.",
  battery: "Battery size; larger usually lasts longer.",
  charging: "Charging power; higher is generally faster.",
  durability: "Glass family/toughness; helps with scratches and drops.",
  protection: "Dust and water resistance (IP rating).",
  extras:
    "Quality-of-life features like 5G, NFC (tap-to-pay, transit cards, quick Bluetooth pairing), and stereo speakers.",
};

const LINES = {
  camera: {
    poor: "Soft photos; struggles in low light or motion.",
    needs: "Usable, but low-light shots can be shaky or noisy.",
    good: "Dependable photos; OIS helps indoors.",
    great: "Sharp, steady photos with strong low-light results.",
  },
  display: {
    poor: "Dim or coarse-text; motion may look rough.",
    needs: "Okay screen; not very smooth or contrasty.",
    good: "Clear, smooth screen for everyday use.",
    great: "Fast, sharp OLED. Scrolling looks silky.",
  },
  soc: {
    poor: "Feels slow with modern apps and games.",
    needs: "Fine for basics; heavier apps can lag.",
    good: "Snappy in daily use and light gaming.",
    great: "Fast for apps, games and camera processing.",
  },
  ram: {
    poor: "4GB or less: feels slow; switching between apps stutters.",
    needs: "6-8GB: fine for basics; app switching feels choppy/slow.",
    good: "12GB: smooth multitasking; most games stay responsive.",
    great: "16GB+: very smooth even with many apps and games open",
  },
  storage: {
    poor: "Very limited space; fills quickly.",
    needs: "Enough for basics to watch large apps/media.",
    good: "Comfortable for photos and apps.",
    great: "Plenty of headroom for video and big apps.",
  },
  battery: {
    poor: "Needs frequent top-ups; may not last a day.",
    needs: "Daylight use is tight; expect an afternoon charge.",
    good: "Should last a full day.",
    great: "Easily a day+ for most users.",
  },
  charging: {
    poor: "Slow: full charge 2+ hours",
    needs: "Average: 90-120 min to full; 10-20% in 15 min.",
    good: "Quick: 60-90 min to full; 20-35% in 15 min.",
    great: "Very quick: 30-50 min to full; 35-50% in 15 min.",
  },
  durability: {
    poor: "Basic glass; case and protector strongly advised.",
    needs: "OK glass; use a case to avoid chips.",
    good: "Tough glass; a case still recommended.",
    great: "Reinforced glass; better protection from drops.",
  },
  protection: {
    poor: "No real water resistance, avoid rain.",
    needs: "Splash resistant; keep away from heavy rain.",
    good: "Good dust/splash protection.",
    great: "Full dust/water resistance (IP67/68/69).",
  },
  extras: {
    poor: "Missing common features like NFC or stereo.",
    needs: "Some extras present; a few omissions.",
    good: "Useful extras that improve daily use.",
    great: "Has 5G, NFC and stereo speakers.",
  },
};

const THRESH = {
  camera: { poor: 3.5, good: 6.5, great: 8.0 },
  display: { poor: 3.5, good: 6.5, great: 8.0 },
  soc: { poor: 3.5, good: 6.5, great: 8.0 },
  ram: { poor: 3.5, good: 7.0, great: 8.0 },
  storage: { poor: 3.5, good: 7.0, great: 8.0 },
  battery: { poor: 3.5, good: 7.0, great: 8.5 },
  charging: { poor: 3.5, good: 7.0, great: 8.0 },
  durability: { poor: 3.5, good: 7.0, great: 8.5 },
  protection: { poor: 3.5, good: 7.0, great: 8.5 },
  extras: { poor: 3.5, good: 7.0, great: 8.5 },
};

// map score to status
function statusForScore(score, t) {
  if (score <= (t.poor ?? 3.5)) return "poor";
  if (score < (t.good ?? 7.0)) return "needs";
  if (score < (t.great ?? 8.5)) return "good";
  return "great";
}

function ScoreRow({ section, label, value, meta }) {
  // normalize
  const safe = Math.max(0, Math.min(10, Number(value)));
  const width = `${safe * 10}%`;

  // thresholds + status
  const t = THRESH[section] || { poor: 3.5, good: 7.0, great: 8.5 };
  const status = statusForScore(safe, t);

  // extra info
  const what = WHAT[section] || "";
  const line = (LINES[section] && LINES[section][status]) || "";

  // colour palette
  const palette =
    status === "great"
      ? { dot: "bg-emerald-400", chipBg: "bg-emerald-500/10", chipText: "text-emerald-300", chipBorder: "border-emerald-400/20", bar: "bg-emerald-400" }
      : status === "good"
      ? { dot: "bg-sky-400", chipBg: "bg-sky-500/10", chipText: "text-sky-300", chipBorder: "border-sky-400/20", bar: "bg-sky-400" }
      : status === "needs"
      ? { dot: "bg-amber-400", chipBg: "bg-amber-500/10", chipText: "text-amber-300", chipBorder: "border-amber-400/20", bar: "bg-amber-400" }
      : { dot: "bg-zinc-400", chipBg: "bg-white/10", chipText: "text-zinc-300", chipBorder: "border-white/15", bar: "bg-zinc-400" };

  return (
    <div className="grid grid-cols-[188px_1fr_72px] items-center gap-x-3 gap-y-1 py-2.5 border-t border-white/10 first:border-t-0">
      {/* label + meta */}
      <div className="col-start-1">
        <div className="flex items-center gap-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${palette.dot}`} aria-hidden="true" />
          <span className="text-[13px] font-medium text-white/95 leading-tight">{label}</span>
        </div>
        {meta ? <div className="text-[11px] text-zinc-300 mt-0.5">{meta}</div> : null}
        {what ? <div className="text-[11px] text-zinc-400 leading-snug mt-1">{what}</div> : null}
        {line ? <div className="text-[11px] text-zinc-400 leading-snug mt-1">{line}</div> : null}
      </div>

      {/* bar */}
      <div
        className="col-start-2 self-center"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={Number(safe.toFixed(1))}
      >
        <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className={`absolute inset-y-0 left-0 ${palette.bar} rounded-full`} style={{ width }} />
        </div>
      </div>

      {/* numeric + status chip */}
      <div className="col-start-3 justify-self-end text-right">
        <div className="text-[12px] tabular-nums text-white/90">{safe.toFixed(1)}</div>
        <div className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] rounded border ${palette.chipBorder} ${palette.chipText} ${palette.chipBg}`}>
          {status === "great" ? "Great" : status === "good" ? "Good" : status === "needs" ? "Needs work" : "Poor"}
        </div>
      </div>
    </div>
  );
}

export default PhoneCard;