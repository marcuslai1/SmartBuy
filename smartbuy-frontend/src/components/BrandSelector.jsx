/**
 * BrandSelector - Premium brand selection with refined card design
 *
 * Allows users to filter by brand or select all brands.
 * Features brand-specific colors and polished visual feedback.
 */
import { motion } from "framer-motion";
import { Sparkles, ChevronRight, Check, Layers } from "lucide-react";

// Brand configuration with refined colors
const BRANDS = [
  { id: "All", label: "All Brands", color: "zinc", description: "Explore every available phone" },
  { id: "Apple", label: "Apple", color: "slate" },
  { id: "Samsung", label: "Samsung", color: "blue" },
  { id: "Google", label: "Google", color: "red" },
  { id: "Xiaomi", label: "Xiaomi", color: "orange" },
  { id: "Realme", label: "Realme", color: "yellow" },
  { id: "Oppo", label: "Oppo", color: "green" },
  { id: "Vivo", label: "Vivo", color: "sky" },
  { id: "Honor", label: "Honor", color: "cyan" },
  { id: "Nothing", label: "Nothing", color: "white" },
  { id: "OnePlus", label: "OnePlus", color: "rose" },
];

// Enhanced color mapping
const colorClasses = {
  zinc: {
    bg: "bg-zinc-500/10",
    bgHover: "hover:bg-zinc-500/20",
    bgSelected: "bg-zinc-500/20",
    border: "border-zinc-500/20",
    borderSelected: "border-zinc-400/60",
    text: "text-zinc-300",
    glow: "shadow-zinc-500/30",
    dot: "bg-zinc-400",
  },
  slate: {
    bg: "bg-slate-500/10",
    bgHover: "hover:bg-slate-500/20",
    bgSelected: "bg-slate-500/20",
    border: "border-slate-500/20",
    borderSelected: "border-slate-400/60",
    text: "text-slate-300",
    glow: "shadow-slate-500/30",
    dot: "bg-slate-400",
  },
  blue: {
    bg: "bg-blue-500/10",
    bgHover: "hover:bg-blue-500/20",
    bgSelected: "bg-blue-500/20",
    border: "border-blue-500/20",
    borderSelected: "border-blue-400/60",
    text: "text-blue-300",
    glow: "shadow-blue-500/30",
    dot: "bg-blue-400",
  },
  red: {
    bg: "bg-red-500/10",
    bgHover: "hover:bg-red-500/20",
    bgSelected: "bg-red-500/20",
    border: "border-red-500/20",
    borderSelected: "border-red-400/60",
    text: "text-red-300",
    glow: "shadow-red-500/30",
    dot: "bg-red-400",
  },
  orange: {
    bg: "bg-orange-500/10",
    bgHover: "hover:bg-orange-500/20",
    bgSelected: "bg-orange-500/20",
    border: "border-orange-500/20",
    borderSelected: "border-orange-400/60",
    text: "text-orange-300",
    glow: "shadow-orange-500/30",
    dot: "bg-orange-400",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    bgHover: "hover:bg-yellow-500/20",
    bgSelected: "bg-yellow-500/20",
    border: "border-yellow-500/20",
    borderSelected: "border-yellow-400/60",
    text: "text-yellow-300",
    glow: "shadow-yellow-500/30",
    dot: "bg-yellow-400",
  },
  green: {
    bg: "bg-green-500/10",
    bgHover: "hover:bg-green-500/20",
    bgSelected: "bg-green-500/20",
    border: "border-green-500/20",
    borderSelected: "border-green-400/60",
    text: "text-green-300",
    glow: "shadow-green-500/30",
    dot: "bg-green-400",
  },
  sky: {
    bg: "bg-sky-500/10",
    bgHover: "hover:bg-sky-500/20",
    bgSelected: "bg-sky-500/20",
    border: "border-sky-500/20",
    borderSelected: "border-sky-400/60",
    text: "text-sky-300",
    glow: "shadow-sky-500/30",
    dot: "bg-sky-400",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    bgHover: "hover:bg-cyan-500/20",
    bgSelected: "bg-cyan-500/20",
    border: "border-cyan-500/20",
    borderSelected: "border-cyan-400/60",
    text: "text-cyan-300",
    glow: "shadow-cyan-500/30",
    dot: "bg-cyan-400",
  },
  white: {
    bg: "bg-white/10",
    bgHover: "hover:bg-white/20",
    bgSelected: "bg-white/20",
    border: "border-white/20",
    borderSelected: "border-white/60",
    text: "text-white",
    glow: "shadow-white/30",
    dot: "bg-white",
  },
  rose: {
    bg: "bg-rose-500/10",
    bgHover: "hover:bg-rose-500/20",
    bgSelected: "bg-rose-500/20",
    border: "border-rose-500/20",
    borderSelected: "border-rose-400/60",
    text: "text-rose-300",
    glow: "shadow-rose-500/30",
    dot: "bg-rose-400",
  },
};

function BrandSelector({ brand, setBrand }) {
  const current = brand || "All";

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.1 }
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0, scale: 0.95 },
    show: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }
    },
  };

  const handleSelect = (b) => setBrand(b === "All" ? "" : b);

  return (
    <section
      aria-labelledby="brand-heading"
      className="min-h-screen w-screen mx-[calc(50%-50vw)] flex items-center justify-center px-4 sm:px-6 py-16
                 bg-gradient-to-b from-gray-950 via-black to-gray-950 overflow-hidden"
    >
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-cyan-500/8 rounded-full blur-[80px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-4xl mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item} className="text-center mb-12">
          <motion.div
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-sm mb-8"
            whileHover={{ scale: 1.02, borderColor: "rgba(255,255,255,0.2)" }}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xs font-bold text-white">2</span>
            </div>
            <span className="text-sm font-medium text-zinc-300">Select a brand</span>
          </motion.div>

          <h2
            id="brand-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-5 tracking-tight"
          >
            Pick a{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-500 bg-clip-text text-transparent">
              Brand
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Focus on a specific brand or explore all available phones
          </p>
        </motion.div>

        {/* "All Brands" featured card */}
        <motion.div variants={item} className="mb-8">
          {(() => {
            const allBrand = BRANDS[0];
            const selected = current === "All";

            return (
              <motion.button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect("All")}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={[
                  "w-full relative rounded-2xl p-6 text-left transition-all duration-300",
                  "border bg-white/[0.03] backdrop-blur-sm overflow-hidden",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-black",
                  selected
                    ? "border-blue-400/40 ring-2 ring-blue-400/30 shadow-2xl shadow-blue-500/20"
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.05]",
                ].join(" ")}
              >
                {/* Background gradient on selected */}
                {selected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"
                  />
                )}

                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <motion.div
                      className={[
                        "flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300",
                        selected
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30"
                          : "bg-white/10",
                      ].join(" ")}
                      animate={selected ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {selected ? (
                        <Sparkles className="w-7 h-7 text-white" />
                      ) : (
                        <Layers className="w-7 h-7 text-zinc-300" />
                      )}
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-0.5">{allBrand.label}</h3>
                      <p className="text-sm text-zinc-400">{allBrand.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {selected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 shadow-lg"
                      >
                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                    <ChevronRight
                      className={`w-5 h-5 transition-all duration-300 ${
                        selected ? "text-blue-400 translate-x-1" : "text-zinc-500"
                      }`}
                    />
                  </div>
                </div>
              </motion.button>
            );
          })()}
        </motion.div>

        {/* Divider */}
        <motion.div variants={item} className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Or choose a brand</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </motion.div>

        {/* Brand grid */}
        <motion.div
          role="radiogroup"
          aria-label="Brand filter"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
        >
          {BRANDS.slice(1).map(({ id, label, color }) => {
            const selected = current === id;
            const colors = colorClasses[color];

            return (
              <motion.button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => handleSelect(id)}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.96 }}
                className={[
                  "group relative rounded-xl px-4 py-4 text-center transition-all duration-200",
                  "border backdrop-blur-sm overflow-hidden",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-black",
                  selected
                    ? `${colors.bgSelected} ${colors.borderSelected} shadow-lg ${colors.glow}`
                    : `bg-white/[0.03] ${colors.border} ${colors.bgHover}`,
                ].join(" ")}
              >
                {/* Selection check indicator */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: selected ? 1 : 0,
                    opacity: selected ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-2 right-2"
                >
                  <div className={`w-5 h-5 rounded-full ${colors.dot} flex items-center justify-center`}>
                    <Check className="w-3 h-3 text-black" strokeWidth={3} />
                  </div>
                </motion.div>

                {/* Brand dot indicator */}
                <div className="flex justify-center mb-2">
                  <motion.div
                    className={`w-2.5 h-2.5 rounded-full ${colors.dot} transition-transform`}
                    animate={{ scale: selected ? 1.2 : 1 }}
                  />
                </div>

                {/* Brand name */}
                <span className={`font-semibold text-sm transition-colors ${selected ? colors.text : "text-zinc-300"}`}>
                  {label}
                </span>

                {/* Bottom accent on hover/selected */}
                <motion.div
                  className={`absolute bottom-0 left-3 right-3 h-0.5 rounded-full ${colors.dot}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: selected ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.button>
            );
          })}
        </motion.div>

        {/* Help text */}
        <motion.p variants={item} className="text-center text-zinc-500 text-sm mt-10">
          You can also filter by brand in the search results
        </motion.p>
      </motion.div>
    </section>
  );
}

export default BrandSelector;
