/**
 * FilterBar - Premium filter controls for phone search
 *
 * Provides mode, brand, price, and search filters with refined glass-morphism design.
 */
import { useEffect, useId, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check, SlidersHorizontal, Sparkles } from "lucide-react";
import SearchInput from "./SearchInput";

const BRANDS = [
  "Any", "Apple", "Samsung", "Google", "Xiaomi", "Realme", "Oppo", "Vivo", "Honor", "Nothing", "OnePlus",
];

// Price caps to offer in the dropdown (ascending)
const PRICE_CAPS = [100, 200, 300, 400, 500, 600, 700, 800, 1000, 1200, 1500, 1800, 2000, 2400];
const formatCap = (n) => `≤ $${Number(n).toLocaleString()}`;
const MAX_PRICE_LABELS = ["Any", ...PRICE_CAPS.map(formatCap)];

// Single option row inside the dropdown
function Option({ active, selected, children }) {
  return (
    <div
      className={[
        "flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150",
        active ? "bg-white/10" : "hover:bg-white/5",
        selected ? "text-white font-medium" : "text-zinc-300",
      ].join(" ")}
      role="option"
      aria-selected={selected}
    >
      <span className="truncate">{children}</span>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="shrink-0 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </motion.div>
      )}
    </div>
  );
}

// Premium Select widget with dropdown list (portal-based to avoid clipping)
function Select({ value, onChange, options, label, id, className }) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(() =>
    Math.max(0, options.findIndex((o) => o.toLowerCase() === (value ?? "").toLowerCase()))
  );
  const [dropdownStyle, setDropdownStyle] = useState({});
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  // Calculate dropdown position based on button
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Update position when opening and on scroll/resize
  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
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

  // Sync active index with current value (case-insensitive)
  useEffect(() => {
    const idx = options.findIndex(
      (o) => o.toLowerCase() === (value ?? "").toLowerCase()
    );
    if (idx >= 0) setActiveIdx(idx);
  }, [value, options]);

  // Scroll active option into view when dropdown opens
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIdx]);

  // Find the matching option (case-insensitive) to display with correct capitalization
  const matchedOption = options.find(
    (opt) => opt.toLowerCase() === (value ?? "").toLowerCase()
  );
  const display = matchedOption ?? value ?? options[0];

  return (
    <div className="relative">
      {/* Select button */}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "w-full rounded-xl border bg-white/[0.04] text-white/90",
          "px-4 py-3 outline-none transition-all duration-200",
          "flex items-center justify-between gap-2",
          open
            ? "border-blue-400/50 ring-2 ring-blue-400/20 bg-white/[0.06]"
            : "border-white/10 hover:bg-white/[0.07] hover:border-white/20",
          "focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:border-blue-400/50",
          className || "",
        ].join(" ")}
        onClick={() => setOpen((s) => !s)}
      >
        <span className="truncate font-medium">{display}</span>
        <ChevronDown
          size={18}
          className={`text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown list - rendered in portal */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={listRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.15, ease: [0.25, 0.4, 0.25, 1] } }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
              style={dropdownStyle}
              className={[
                "z-[9999] overflow-hidden rounded-xl",
                "border border-white/15 bg-zinc-900/98 backdrop-blur-xl",
                "shadow-2xl shadow-black/50",
              ].join(" ")}
              role="listbox"
              aria-labelledby={id}
            >
              <div className="max-h-[14rem] overflow-y-auto py-2 px-2 scrollbar-thin">
                {options.map((opt, i) => {
                  const selected = opt.toLowerCase() === (value ?? "").toLowerCase();
                  const active = i === activeIdx;
                  return (
                    <div
                      key={opt}
                      data-idx={i}
                      onMouseEnter={() => setActiveIdx(i)}
                      onMouseDown={(e) => {
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
        </AnimatePresence>,
        document.body
      )}
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    },
  };

  const item = {
    hidden: { y: 16, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] } },
  };

  return (
    <section className="relative px-4 sm:px-6 py-12" aria-labelledby={id.heading}>
      {/* Ambient background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-blue-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] bg-purple-500/8 rounded-full blur-[80px]" />
      </div>

      <motion.div
        className="relative z-10 mx-auto max-w-5xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Premium glass card */}
        <motion.div
          variants={item}
          className={[
            "relative rounded-2xl overflow-hidden",
            "border border-white/10 bg-white/[0.03] backdrop-blur-md",
            "shadow-xl shadow-black/20",
          ].join(" ")}
        >
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

          <div className="p-6 sm:p-8">
            {/* Header */}
            <motion.div variants={item} className="flex items-center gap-4 mb-8">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                <SlidersHorizontal className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2
                  id={id.heading}
                  className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
                >
                  Find Your{" "}
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    Perfect Phone
                  </span>
                </h2>
                <p className="text-sm sm:text-base text-zinc-400 mt-0.5">
                  Filter by your preferences and discover the best value
                </p>
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div variants={item} className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </motion.div>

            {/* Controls grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
              {/* Search */}
              <motion.div variants={item} className="flex flex-col lg:col-span-2">
                <label className="text-sm font-medium mb-2 text-zinc-300 flex items-center gap-2">
                  <Search size={14} className="text-zinc-500" />
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
              <motion.div variants={item} className="flex flex-col">
                <label htmlFor={id.mode} className="text-sm font-medium mb-2 text-zinc-300 flex items-center gap-2">
                  <Sparkles size={14} className="text-zinc-500" />
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
              <motion.div variants={item} className="flex flex-col">
                <label htmlFor={id.brand} className="text-sm font-medium mb-2 text-zinc-300">
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
              <motion.div variants={item} className="flex flex-col lg:col-span-2">
                <label htmlFor={id.maxPrice} className="text-sm font-medium mb-2 text-zinc-300">
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
            <motion.div variants={item} className="mt-8 flex justify-end">
              <motion.button
                onClick={onSearch}
                className={[
                  "group relative inline-flex items-center gap-2.5 rounded-xl px-8 py-3.5",
                  "bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold",
                  "shadow-lg shadow-blue-500/25 overflow-hidden",
                  "hover:shadow-xl hover:shadow-blue-500/30",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  "transition-all duration-200",
                ].join(" ")}
                whileTap={{ scale: 0.98 }}
                whileHover={{ scale: 1.02 }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <Search size={18} strokeWidth={2.5} className="relative z-10" />
                <span className="relative z-10">Search Phones</span>
              </motion.button>
            </motion.div>
          </div>

          {/* Bottom gradient accent */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}

export default FilterBar;
