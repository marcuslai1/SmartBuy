/**
 * FilterBar - Filter controls for phone search
 *
 * Provides mode, brand, price, and search filters.
 */
import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check } from "lucide-react";
import SearchInput from "./SearchInput";

const BRANDS = [
  "Any", "Apple", "Samsung", "Google", "Xiaomi", "Realme", "Oppo", "Vivo", "Honor", "Nothing", "OnePlus",
];

// Price caps to offer in the dropdown (ascending)
const PRICE_CAPS = [100, 200, 300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 1800, 2000, 2400];
const formatCap = (n) => `≤ $${Number(n).toLocaleString()}`;
const MAX_PRICE_LABELS = ["Any", ...PRICE_CAPS.map(formatCap)];

// Shared input styles for fields
const baseField =
  "w-full rounded-xl border border-white/10 bg-white/5 text-white/90 " +
  "px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 " +
  "hover:bg-white/[0.07] hover:border-white/15 transition-all duration-200 " +
  "placeholder:text-zinc-500";

// Simple fade-up animation
const fadeUp = (delay = 0) => ({
  initial: { y: 24, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.6, delay } },
  exit: { y: -12, opacity: 0, transition: { duration: 0.3 } },
});

// Staggered container for animating children
const containerStagger = { animate: { transition: { staggerChildren: 0.06 } } };

// Close dropdown if clicking away
function useClickAway(ref, onAway) {
  useEffect(() => {
    const onClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onAway?.();
    };
    const onKey = (e) => {
      if (e.key === "Escape") onAway?.();
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onAway, ref]);
}

// Single option row inside the dropdown
function Option({ active, selected, children }) {
  return (
    <div
      className={[
        "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors",
        active ? "bg-white/10" : "",
        selected ? "text-white font-medium" : "text-zinc-300",
      ].join(" ")}
      role="option"
      aria-selected={selected}
    >
      <span className="truncate">{children}</span>
      {selected ? <Check className="shrink-0 text-blue-400" size={16} /> : null}
    </div>
  );
}

// Full Select widget with dropdown list
function Select({ value, onChange, options, label, id, className }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() =>
    Math.max(0, options.findIndex((o) => o === value))
  );
  const rootRef = useRef(null);
  const listRef = useRef(null);

  useClickAway(rootRef, () => setOpen(false));

  // Keyboard navigation (arrows, enter, home/end)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!open) return;
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        setActiveIdx((idx) => {
          const last = options.length - 1;
          if (e.key === "Home") return 0;
          if (e.key === "End") return last;
          if (e.key === "ArrowDown") return Math.min(last, idx + 1);
          if (e.key === "ArrowUp") return Math.max(0, idx - 1);
          return idx;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const opt = options[activeIdx];
        if (opt) onChange(opt);
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, options, activeIdx, onChange]);

  // Sync active index with current value
  useEffect(() => {
    const idx = options.findIndex((o) => o === value);
    if (idx >= 0) setActiveIdx(idx);
  }, [value, options]);

  // Scroll active option into view when dropdown opens
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  const display = value ?? options[0];

  return (
    <div ref={rootRef} className="relative">
      {/* Select button */}
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          baseField,
          "flex items-center justify-between gap-2",
          className || "",
        ].join(" ")}
        onClick={() => setOpen((s) => !s)}
      >
        <span className="truncate">{display}</span>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown list */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, y: 6, scale: 0.95, transition: { duration: 0.12 } }}
            className={[
              "absolute z-[60] mt-2 w-full overflow-hidden rounded-xl border border-white/10",
              "bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/30",
            ].join(" ")}
            role="listbox"
            aria-labelledby={id}
          >
            <div ref={listRef} className="max-h-[12rem] overflow-y-auto py-1.5 px-1.5">
              {options.map((opt, i) => {
                const selected = opt === value;
                const active = i === activeIdx;
                return (
                  <div
                    key={opt}
                    data-idx={i}
                    onMouseEnter={() => setActiveIdx(i)}
                    onMouseDown={(e) => {
                      // prevent focus blur from closing early
                      e.preventDefault();
                      onChange(opt);
                      setOpen(false);
                    }}
                  >
                    <Option active={active} selected={selected}>
                      {opt}
                    </Option>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* FilterBar layout */

function FilterBar({
  mode,
  setMode,
  brand,
  setBrand,
  maxPrice,
  setMaxPrice,
  search,
  setSearch,
  onSearch,
}) {
  const id = { heading: useId(), mode: useId(), brand: useId(), maxPrice: useId() };

  // Clamp incoming maxPrice to bounds
  const clamp = (v) => Math.min(2400, Math.max(100, v));

  // Compute label shown in Select from numeric maxPrice
  const maxPriceLabelFromValue = (v) => {
    if (typeof v !== "number") return "Any";
    const clamped = clamp(v);
    if (clamped >= 2400) return "Any";
    const cap = PRICE_CAPS.find((c) => clamped <= c) ?? 2400;
    return cap >= 2400 ? "Any" : formatCap(cap);
  };

  const currentMaxPriceLabel = maxPriceLabelFromValue(maxPrice);

  // Handle label -> numeric value mapping on change
  const handleMaxPriceChange = (label) => {
    if (label === "Any") {
      setMaxPrice(2400);
      return;
    }
    const num = Number(label.replace(/[^\d]/g, ""));
    setMaxPrice(clamp(num || 2400));
  };

  return (
    <section className="px-6 py-8" aria-labelledby={id.heading}>
      <div className="mx-auto max-w-5xl">
        {/* Glass wrapper card */}
        <motion.div
          variants={containerStagger}
          initial="initial"
          animate="animate"
          exit="exit"
          className={[
            "group relative rounded-2xl p-6 transition-all duration-300",
            "border border-white/10 bg-white/[0.03] backdrop-blur-sm",
            "hover:shadow-xl hover:shadow-blue-500/10",
            "overflow-visible isolate",
          ].join(" ")}
        >
          {/* Subtle hover overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity
                       group-hover:opacity-100 group-hover:bg-blue-500/[0.02]"
          />

          <div className="relative z-10">
            {/* Heading */}
            <motion.div {...fadeUp(0.05)} className="mb-6 text-center sm:text-left">
              <h2
                id={id.heading}
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white"
              >
                <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                  SmartBuy
                </span>
              </h2>
              <p className="text-base sm:text-lg text-zinc-300 mt-1">
                Find the perfect phone for your needs.
              </p>
            </motion.div>

            <motion.hr {...fadeUp(0.1)} className="my-5 border-t border-white/10" />

            {/* Controls grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <motion.div className="flex flex-col lg:col-span-2" {...fadeUp(0.12)}>
                <label className="text-sm font-medium mb-1.5 text-zinc-300">
                  Search
                </label>
                <SearchInput
                  value={search || ""}
                  onChange={(v) => setSearch?.(v)}
                  placeholder="Search by model name..."
                  debounceMs={0}
                />
              </motion.div>

              {/* Mode */}
              <motion.div className="flex flex-col" {...fadeUp(0.14)}>
                <label htmlFor={id.mode} className="text-sm font-medium mb-1.5 text-zinc-300">
                  Mode
                </label>
                <Select
                  id={id.mode}
                  value={mode}
                  onChange={(v) => setMode(v)}
                  options={["Budget", "Midrange", "Flagship"]}
                />
              </motion.div>

              {/* Brand */}
              <motion.div className="flex flex-col" {...fadeUp(0.18)}>
                <label htmlFor={id.brand} className="text-sm font-medium mb-1.5 text-zinc-300">
                  Brand
                </label>
                <Select
                  id={id.brand}
                  value={brand || "Any"}
                  onChange={(v) => setBrand(v === "Any" ? "" : v)}
                  options={BRANDS}
                />
              </motion.div>

              {/* Max Price */}
              <motion.div className="flex flex-col lg:col-span-2" {...fadeUp(0.22)}>
                <label htmlFor={id.maxPrice} className="text-sm font-medium mb-1.5 text-zinc-300">
                  Max Price (SGD)
                </label>
                <Select
                  id={id.maxPrice}
                  value={currentMaxPriceLabel}
                  onChange={handleMaxPriceChange}
                  options={MAX_PRICE_LABELS}
                />
              </motion.div>
            </div>

            {/* Search action */}
            <motion.div className="mt-6 flex justify-end" {...fadeUp(0.26)}>
              <motion.button
                onClick={onSearch}
                className="inline-flex items-center gap-2.5 rounded-xl bg-blue-600 text-white font-semibold
                           px-6 py-3 shadow-lg shadow-blue-500/20
                           hover:bg-blue-500 hover:shadow-blue-500/30 transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black"
                whileTap={{ scale: 0.98 }}
                whileHover={{ y: -2 }}
              >
                <Search size={18} strokeWidth={2.5} />
                Search Phones
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default FilterBar;
