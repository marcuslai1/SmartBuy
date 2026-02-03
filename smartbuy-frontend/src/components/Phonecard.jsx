/**
 * PhoneCard - Clean phone result card with visual score rings
 *
 * Displays phone details, circular score visualization, quick specs,
 * and provides access to detailed spec breakdown modal.
 */
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, Info, ExternalLink, Award, TrendingUp, Cpu, Battery, MonitorSmartphone, X } from "lucide-react";

// Circular progress ring component
function ScoreRing({ score, maxScore = 10, size = 52, strokeWidth = 4, color = "blue", label }) {
  const normalizedScore = Math.min(Math.max(score, 0), maxScore);
  const percentage = (normalizedScore / maxScore) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    blue: "#3b82f6",
    emerald: "#10b981",
    amber: "#f59e0b",
    zinc: "#71717a",
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors[color] || colors.blue}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{score.toFixed(1)}</span>
        </div>
      </div>
      {label && (
        <span className="mt-1 text-[10px] font-medium text-zinc-400 uppercase tracking-wide">{label}</span>
      )}
    </div>
  );
}

function PhoneCard({ phone, isTopPick, mode: modeProp, onCompare, isComparing }) {
  const spec = Number(phone.raw_score).toFixed(1);
  // Use value_score (0-10 normalized within tier) or fallback to smartbuy_score
  const value = Number(phone.value_score ?? phone.smartbuy_score ?? 0).toFixed(1);
  const price = Number(phone.price_sgd).toFixed(2);

  const finalRank = phone.rank_final;
  const totalCount = phone.rank_total;
  const rawRank = phone.rank_raw;
  const valueRank = phone.rank_value;
  const mode = (modeProp || "midrange").toLowerCase();

  const getScoreColor = (s) => {
    const score = Number(s);
    if (score >= 7) return "emerald";
    if (score >= 5.5) return "amber";
    return "zinc";
  };

  // Value score is now 0-10 (normalized within price tier)
  const getValueColor = (v) => {
    const val = Number(v);
    if (val >= 7) return "emerald";
    if (val >= 5) return "amber";
    return "zinc";
  };

  // Format helpers
  const fmt = {
    chipShort: (s) => {
      if (!s) return "";
      return s.toString()
        .replace("Snapdragon", "SD")
        .replace("Dimensity", "Dim")
        .replace("MediaTek", "MTK")
        .replace("Exynos", "Exyn")
        .split(" ")
        .slice(0, 4)
        .join(" ");
    },
    chip: (s) => (s || "").toString(),
    gb: (n) => (n || n === 0 ? `${Number(n)}GB` : ""),
    mah: (n) => (n ? `${Number(n)} mAh` : ""),
    w: (n) => (n ? `${Number(n)}W` : ""),
    hz: (n) => (n ? `${n}Hz` : ""),
    res: (w, h) => (w && h ? `${w}×${h}` : ""),
    ppi: (n) => (n ? `${n}ppi` : ""),
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
      return [rear, add.length ? `(${add.join(", ")})` : ""].filter(Boolean).join(" ");
    },
    display: (p) => {
      const type = p?.display_type ? p.display_type.replace(/_/g, " ").toUpperCase() : "";
      return [type, fmt.hz(p?.refresh_hz ?? p?.refresh_rate), fmt.ppi(p?.ppi ?? p?.pixel_density)].filter(Boolean).join(" • ");
    },
    durability: (p) => p?.glass_type || "-",
    protection: (p) => p?.ip_rating || "-",
  };

  const RECS = {
    budget: { soc: { target: "Mid 6+ tier" }, ram: { target: "≥ 8GB" }, storage: { target: "≥ 128GB" }, display: { target: "OLED • 90-120Hz" }, camera: { target: "Score ≥ 5.5 + OIS" }, battery: { target: "≥ 4500 mAh" }, charging: { target: "≥ 30W" }, durability: { target: "Gorilla 5+" }, protection: { target: "IP53+" }, extras: { target: "5G • NFC" } },
    midrange: { soc: { target: "7-8 tier" }, ram: { target: "≥ 12GB" }, storage: { target: "≥ 256GB" }, display: { target: "OLED • 120Hz" }, camera: { target: "Score ≥ 6.5 + OIS" }, battery: { target: "≥ 5000 mAh" }, charging: { target: "≥ 45W" }, durability: { target: "Victus+" }, protection: { target: "IP67/68" }, extras: { target: "5G • NFC • Stereo" } },
    flagship: { soc: { target: "8-9+ tier" }, ram: { target: "≥ 12-16GB" }, storage: { target: "≥ 256-512GB" }, display: { target: "OLED • 120Hz+" }, camera: { target: "Score ≥ 7.0 + OIS" }, battery: { target: "≥ 5000 mAh" }, charging: { target: "≥ 60W" }, durability: { target: "Victus 2" }, protection: { target: "IP68" }, extras: { target: "5G • NFC • Stereo" } },
  };
  const recs = RECS[mode] || RECS.midrange;

  const breakdown = phone?.breakdown || phone?.score_breakdown || null;
  const allRows = useMemo(() => {
    if (!breakdown) return [];
    const build = (key, label, meta) => ({ key, label, meta, value: Number(breakdown[key]), rec: recs[key]?.target || null });
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

  const CORE_KEYS = ["camera", "display", "soc", "ram", "storage"];
  const BUILD_KEYS = ["battery", "charging", "durability", "protection", "extras"];
  const coreRows = allRows.filter((r) => CORE_KEYS.includes(r.key));
  const buildRows = allRows.filter((r) => BUILD_KEYS.includes(r.key));

  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const warranty = phone.warranty ? `${phone.warranty}y` : null;

  const quickSpecs = useMemo(() => {
    const specs = [];
    if (phone.chipset) specs.push({ label: fmt.chipShort(phone.chipset), key: "chip", icon: Cpu });
    if (phone.ram_gb) specs.push({ label: `${phone.ram_gb}GB`, key: "ram", icon: null });
    if (phone.battery_mah) specs.push({ label: `${phone.battery_mah}mAh`, key: "batt", icon: Battery });
    if (phone.refresh_hz) specs.push({ label: `${phone.refresh_hz}Hz`, key: "hz", icon: MonitorSmartphone });
    return specs.slice(0, 4);
  }, [phone]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={[
          "relative flex flex-col rounded-2xl",
          "border bg-gradient-to-b from-white/[0.04] to-white/[0.02] backdrop-blur-sm",
          "shadow-lg hover:shadow-xl transition-all duration-300",
          "hover:-translate-y-0.5",
          isComparing
            ? "border-emerald-400/50 ring-2 ring-emerald-400/20"
            : "border-white/10 hover:border-white/15",
        ].join(" ")}
      >
        {/* Top accent for top pick */}
        {isTopPick && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-t-2xl" />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            {isTopPick && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 text-[10px] font-semibold">
                <Award className="w-3 h-3" />
                Top Pick
              </span>
            )}
            {finalRank && totalCount && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300 text-[10px] font-medium tabular-nums">
                #{finalRank}/{totalCount}
              </span>
            )}
          </div>
          {warranty && (
            <span className="px-1.5 py-0.5 rounded text-zinc-400 text-[9px]">
              {warranty} warranty
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 space-y-3">
          {/* Model name */}
          <h2 className="text-base font-semibold text-white leading-snug line-clamp-2 min-h-[2.5rem]">
            {phone.model}
          </h2>

          {/* Score rings */}
          <div className="flex items-center justify-center gap-5 py-3 rounded-xl bg-white/[0.02] border border-white/5">
            <ScoreRing score={Number(spec)} maxScore={10} size={50} strokeWidth={4} color={getScoreColor(spec)} label="Spec" />
            <div className="w-px h-10 bg-white/10" />
            <ScoreRing score={Number(value)} maxScore={10} size={50} strokeWidth={4} color={getValueColor(value)} label="Value" />
          </div>

          {/* Quick specs */}
          {quickSpecs.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quickSpecs.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded bg-white/[0.04] text-zinc-400 border border-white/5">
                  {s.icon && <s.icon className="w-3 h-3" />}
                  {s.label}
                </span>
              ))}
            </div>
          )}

          {/* Price */}
          <a
            href={phone.price_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 hover:border-blue-400/30 hover:bg-blue-500/5 transition-all group"
          >
            <span className="text-lg font-bold text-white">S${price}</span>
            <span className="flex items-center gap-1 text-xs text-zinc-400 group-hover:text-blue-400 transition-colors">
              View deal
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </a>
        </div>

        {/* Footer with action buttons */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-white/5">
          {onCompare && (
            <button
              type="button"
              onClick={() => onCompare(phone)}
              disabled={isComparing}
              className={[
                "inline-flex items-center justify-center w-8 h-8 rounded-lg text-white transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                isComparing
                  ? "bg-emerald-600 cursor-default"
                  : "bg-zinc-700 hover:bg-zinc-600 border border-white/10",
              ].join(" ")}
              aria-label={isComparing ? "Added to compare" : "Add to compare"}
            >
              {isComparing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          )}

          {allRows.length > 0 && (
            <button
              type="button"
              ref={btnRef}
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label="Show spec breakdown"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Modal portal - rendered outside the card */}
      {createPortal(
        <AnimatePresence>
          {open && allRows.length > 0 && (
            <>
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <motion.div
                key="panel"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-x-4 top-[10%] bottom-[10%] z-[101] mx-auto max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/95 backdrop-blur-xl shadow-2xl flex flex-col"
              >
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Spec Breakdown</p>
                      {rawRank && valueRank && (
                        <p className="text-[10px] text-zinc-400">Spec #{rawRank} • Value #{valueRank}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-2">Core Specs</h4>
                    <div className="space-y-1">
                      {coreRows.map((r) => <ScoreRow key={r.key} section={r.key} label={r.label} value={r.value} meta={r.meta} />)}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-2">Battery & Build</h4>
                    <div className="space-y-1">
                      {buildRows.map((r) => <ScoreRow key={r.key} section={r.key} label={r.label} value={r.value} meta={r.meta} />)}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Overall score is a weighted blend of these categories, normalized to 0-10.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

const WHAT = {
  camera: "Photo/video quality; OIS helps steady shots.",
  display: "Screen type, smoothness, and sharpness.",
  soc: "Processor power for apps and games.",
  ram: "Smooth app switching and multitasking.",
  storage: "Space for apps, photos, and videos.",
  battery: "Battery size; larger usually lasts longer.",
  charging: "Charging power; higher is faster.",
  durability: "Glass quality; scratch/drop resistance.",
  protection: "Dust and water resistance (IP rating).",
  extras: "5G, NFC, stereo speakers, etc.",
};

const LINES = {
  camera: { poor: "Struggles in low light.", needs: "Usable but noisy in low light.", good: "Dependable with OIS.", great: "Sharp with strong low-light." },
  display: { poor: "Dim or rough motion.", needs: "Okay, not very smooth.", good: "Clear and smooth.", great: "Silky OLED experience." },
  soc: { poor: "Slow with modern apps.", needs: "Fine for basics.", good: "Snappy daily use.", great: "Fast for everything." },
  ram: { poor: "Slow app switching.", needs: "Basic multitasking.", good: "Smooth multitasking.", great: "Handles everything." },
  storage: { poor: "Very limited space.", needs: "Enough for basics.", good: "Comfortable storage.", great: "Plenty of room." },
  battery: { poor: "Needs frequent charging.", needs: "Tight for a full day.", good: "Lasts a full day.", great: "Day+ easily." },
  charging: { poor: "2+ hours to full.", needs: "90-120 min to full.", good: "60-90 min to full.", great: "30-50 min to full." },
  durability: { poor: "Basic glass, case needed.", needs: "OK glass, use a case.", good: "Tough glass.", great: "Reinforced glass." },
  protection: { poor: "No water resistance.", needs: "Splash resistant only.", good: "Good IP protection.", great: "Full IP67/68/69." },
  extras: { poor: "Missing common features.", needs: "Some features missing.", good: "Useful extras.", great: "5G, NFC, stereo." },
};

const THRESH = {
  camera: { poor: 3.5, good: 6.0, great: 7.5 },
  display: { poor: 3.5, good: 6.0, great: 7.5 },
  soc: { poor: 3.5, good: 6.0, great: 7.5 },
  ram: { poor: 3.5, good: 6.5, great: 8.0 },
  storage: { poor: 3.5, good: 6.5, great: 8.0 },
  battery: { poor: 3.5, good: 6.5, great: 8.0 },
  charging: { poor: 3.5, good: 6.5, great: 8.0 },
  durability: { poor: 3.5, good: 6.5, great: 8.0 },
  protection: { poor: 3.5, good: 6.5, great: 8.0 },
  extras: { poor: 3.5, good: 6.5, great: 8.0 },
};

function statusForScore(score, t) {
  if (score <= (t.poor ?? 3.5)) return "poor";
  if (score < (t.good ?? 6.5)) return "needs";
  if (score < (t.great ?? 8.0)) return "good";
  return "great";
}

function ScoreRow({ section, label, value, meta }) {
  const safe = Math.max(0, Math.min(10, Number(value)));
  const width = `${safe * 10}%`;
  const t = THRESH[section] || { poor: 3.5, good: 6.5, great: 8.0 };
  const status = statusForScore(safe, t);
  const line = LINES[section]?.[status] || "";

  const palette = {
    great: { dot: "bg-emerald-400", bar: "bg-emerald-500", chip: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20" },
    good: { dot: "bg-sky-400", bar: "bg-sky-500", chip: "bg-sky-500/15 text-sky-300 border-sky-400/20" },
    needs: { dot: "bg-amber-400", bar: "bg-amber-500", chip: "bg-amber-500/15 text-amber-300 border-amber-400/20" },
    poor: { dot: "bg-zinc-500", bar: "bg-zinc-500", chip: "bg-white/10 text-zinc-300 border-white/15" },
  }[status];

  return (
    <div className="py-2.5 border-b border-white/5 last:border-b-0">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
            <span className="text-sm font-medium text-white">{label}</span>
          </div>
          {meta && <p className="text-[10px] text-zinc-400 mt-0.5 ml-3.5 truncate">{meta}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-sm font-bold tabular-nums text-white">{safe.toFixed(1)}</span>
          <span className={`ml-2 px-1.5 py-0.5 text-[9px] font-medium rounded border ${palette.chip}`}>
            {status === "great" ? "Great" : status === "good" ? "Good" : status === "needs" ? "OK" : "Poor"}
          </span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${palette.bar}`}
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      {line && <p className="text-[10px] text-zinc-400 mt-1.5 ml-3.5">{line}</p>}
    </div>
  );
}

export default PhoneCard;
